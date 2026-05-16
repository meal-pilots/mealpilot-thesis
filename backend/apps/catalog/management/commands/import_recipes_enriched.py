import json
import re
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify
from apps.catalog.models import (
    Ingredient,
    Recipe,
    RecipeCategory,
    RecipeDifficulty,
    RecipeIngredient,
    RecipeNutrition,
    RecipeStatus,
    RecipeStep,
    RecipeTag,
    Tag,
)


CATEGORY_MAP = {
    'завтрак': RecipeCategory.BREAKFAST,
    'обед': RecipeCategory.LUNCH,
    'ужин': RecipeCategory.DINNER,
    'перекус': RecipeCategory.SNACK,
}


LOCAL_CUISINE_KEYWORDS = {
    'казах',
    'киргиз',
    'узбек',
    'туркмен',
    'центральноазиат',
    'азиатская кухня',
}


KEYWORD_TO_TAG = {
    'казахская кухня': ('traditional', 'Traditional'),
    'на праздничный стол': ('holiday', 'Holiday'),
    'баранина': ('lamb', 'Lamb'),
    'мясные блюда': ('meat_based', 'Meat Based'),
    'блюда из картофеля': ('potato_based', 'Potato Based'),
    'блюда из молока': ('dairy_based', 'Dairy Based'),
    'азиатская кухня': ('asian_cuisine', 'Asian Cuisine'),
}


UNIT_MAP = {
    'г': 'g',
    'гр': 'g',
    'кг': 'kg',
    'мл': 'ml',
    'л': 'l',
    'шт': 'pc',
    'шт.': 'pc',
    'стакан': 'cup',
    'стакана': 'cup',
    'стаканов': 'cup',
    'ч. л.': 'tsp',
    'ч.л.': 'tsp',
    'ч. ложка': 'tsp',
    'ч. ложки': 'tsp',
    'ч. ложек': 'tsp',
    'чайная ложка': 'tsp',
    'чайные ложки': 'tsp',
    'чайных ложек': 'tsp',
    'ст. л.': 'tbsp',
    'ст.л.': 'tbsp',
    'ст. ложка': 'tbsp',
    'ст. ложки': 'tbsp',
    'ст. ложек': 'tbsp',
    'столовая ложка': 'tbsp',
    'столовые ложки': 'tbsp',
    'столовых ложек': 'tbsp',
    'щепотка': 'pinch',
    'щепотки': 'pinch',
    'щепоток': 'pinch',
    'пучок': 'pc',
    'пучка': 'pc',
    'пучков': 'pc',
    'зубчик': 'pc',
    'зубчика': 'pc',
    'зубчиков': 'pc',
    'долька': 'pc',
    'дольки': 'pc',
    'долек': 'pc',
    'банка': 'pc',
    'банки': 'pc',
    'банок': 'pc',
}

# Pre-sorted longest-first so that "ст. л." matches before bare "л".
_UNIT_MAP_SORTED = sorted(UNIT_MAP.items(), key=lambda kv: -len(kv[0]))

# Marker keywords that indicate the ingredient is a dry spice / herb. When
# combined with a volume unit ("l") it almost certainly means "ст. л." or
# "ч. л." mis-parsed as litres — convert to tsp (5 ml) instead.
DRY_SPICE_KEYWORDS = (
    'перец', 'паприка', 'кумин', 'зира', 'кориандр', 'имбирь_молот',
    'куркум', 'корица', 'гвоздик', 'мускат', 'кардамон', 'тимьян',
    'розмарин', 'базилик_сух', 'орегано', 'тмин', 'ваниль', 'ванилин',
    'разрыхлитель', 'сода', 'дрожжи_сух', 'крахмал', 'специи', 'специя',
    'приправа', 'приправы', 'смесь', 'хмели-сунели', 'карри', 'асафетида',
    'шафран',
    # Fresh herbs — same magnitude problem if "1.5 л зелени" gets parsed.
    'зелень', 'укроп', 'петруш', 'кинза', 'базилик', 'мята', 'эстрагон',
    'черемша', 'руккола', 'шпинат',
)

FRESH_HERB_VOLUME_OK: tuple[str, ...] = ()  # nothing should be measured in litres for spices/herbs


_IMAGE_HOST_REWRITES = {
    # russianfood.com's image subdomain has been returning 502 since spring '26;
    # the main domain serves the exact same /dycontent/images_upl/... paths.
    'img1.russianfood.com': 'www.russianfood.com',
    'img2.russianfood.com': 'www.russianfood.com',
}


def _normalize_image_url(value: str | None) -> str | None:
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None
    match = re.match(r'^(https?://)([^/]+)(/.*)?$', raw, flags=re.IGNORECASE)
    if not match:
        return raw
    scheme, host, path = match.group(1), match.group(2).lower(), match.group(3) or ''
    replacement = _IMAGE_HOST_REWRITES.get(host)
    if replacement:
        return f'{scheme}{replacement}{path}'
    return raw


def _clean_text(value: str) -> str:
    return re.sub(r'\s+', ' ', (value or '')).strip()


def _safe_lower(value: str) -> str:
    return _clean_text(value).lower()


def _normalize_ingredient_name(raw_name: str) -> str:
    name = _safe_lower(raw_name)
    name = re.sub(r'\([^)]*\)', '', name).strip()
    name = re.sub(r'[^0-9a-zA-Zа-яА-ЯёЁ\s\-]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def _normalized_key(raw_name: str) -> str:
    name = _normalize_ingredient_name(raw_name)
    return name.replace(' ', '_')


def _parse_servings(yields_text: str) -> int:
    if not yields_text:
        return 1

    text = _safe_lower(yields_text)
    match = re.search(r'(\d+)', text)
    if match:
        return max(int(match.group(1)), 1)

    return 1

def _build_recipe_slug(title: str, source_recipe_id: str | int | None) -> str:
    source_recipe_id = str(source_recipe_id or '').strip()
    base = slugify(title, allow_unicode=True)

    if not base:
        base = f'recipe-{source_recipe_id}' if source_recipe_id else 'recipe'

    if source_recipe_id:
        slug = f'{base}-{source_recipe_id}'
    else:
        slug = base

    return slug[:255]

def _map_category(raw_category: str) -> str:
    if not raw_category:
        return RecipeCategory.LUNCH
    return CATEGORY_MAP.get(_safe_lower(raw_category), RecipeCategory.LUNCH)


def _is_local_cuisine(raw_cuisine: str, keywords: list[str] | None = None) -> bool:
    joined = _safe_lower(raw_cuisine)
    if keywords:
        joined += ' ' + ' '.join(_safe_lower(k) for k in keywords)

    return any(token in joined for token in LOCAL_CUISINE_KEYWORDS)


def _map_cuisine(raw_cuisine: str) -> str:
    text = _safe_lower(raw_cuisine)

    if 'казах' in text:
        return 'kazakh'
    if 'узбек' in text:
        return 'uzbek'
    if 'киргиз' in text:
        return 'kyrgyz'
    if 'туркмен' in text:
        return 'turkmen'
    if 'азиат' in text:
        return 'asian'
    if 'турец' in text:
        return 'turkish'
    if 'венгер' in text:
        return 'hungarian'
    if 'чеш' in text:
        return 'czech'

    return 'local_modern'


def _extract_quantity_and_unit(raw_qty: str) -> tuple[Decimal, str, bool]:
    """Parse quantity + unit from the right-hand side of an ingredient line.

    Returns (quantity, unit, is_optional).

    The unit lookup walks UNIT_MAP entries longest-first so that "ст. л." is
    matched before bare "л" (single Cyrillic letter). Without this ordering
    Python dict iteration would map "1 ст. л." → unit='l' (litres), which
    later cascades into 12-litre quantities for spices and ruins both cost
    and calorie estimation downstream.
    """
    if not raw_qty:
        return Decimal('1.00'), 'unit', False

    text = _safe_lower(raw_qty)

    if 'по вкусу' in text:
        return Decimal('1.00'), 'to_taste', True

    text = text.replace(',', '.')

    range_match = re.search(r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)', text)
    if range_match:
        left = Decimal(range_match.group(1))
        right = Decimal(range_match.group(2))
        quantity = (left + right) / Decimal('2')
    else:
        num_match = re.search(r'(\d+(?:\.\d+)?)', text)
        quantity = Decimal(num_match.group(1)) if num_match else Decimal('1.00')

    unit = 'unit'
    for raw_unit, mapped in _UNIT_MAP_SORTED:
        if raw_unit in text:
            unit = mapped
            break

    return quantity.quantize(Decimal('0.01')), unit, False


def _post_normalize_unit(name: str, quantity: Decimal, unit: str) -> tuple[Decimal, str]:
    """Apply ingredient-aware corrections to the parsed (quantity, unit).

    Catches three classes of obvious bugs from upstream parsing:

    1. Dry spice with volume unit → coerce to tsp/tbsp. "1 л паприки" makes
       no physical sense; the original recipe almost surely said "1 ч.л.".
    2. Implausibly small quantity for kg → convert to grams ("0.5 г говядины"
       → "500 г говядины").
    3. Quantity == 0 → reset to 1 unit so the ingredient is not silently
       dropped from cost / nutrition aggregations.
    """
    name_lower = (name or '').lower().replace('ё', 'е')

    if quantity <= 0:
        quantity = Decimal('1.00')

    is_dry_spice = any(token in name_lower for token in DRY_SPICE_KEYWORDS)
    is_excused = any(token in name_lower for token in FRESH_HERB_VOLUME_OK)

    if is_dry_spice and not is_excused and unit in {'l', 'ml', 'unit'}:
        # Treat as teaspoons regardless of the literal value. Spices and fresh
        # herbs measured in litres or unspecified `unit` would otherwise pull
        # in 100g chunks at premium per-kg prices and dominate the recipe cost.
        return quantity, 'tsp'

    if unit == 'kg' and quantity < Decimal('0.05'):
        # 0.01 kg, 0.03 kg etc. are almost always typos. Convert to grams.
        return (quantity * Decimal('1000')).quantize(Decimal('0.01')), 'g'

    return quantity, unit


PSEUDO_INGREDIENT_KEYS = {
    'тесто', 'начинка', 'заправка', 'маринад', 'соус', 'крем',
    'глазурь', 'пропитка', 'сироп', 'основа', 'желе',
    'приправы', 'специи', 'специя_для_*', 'все_по_вкусу',
    'или', 'и', 'для', 'по', 'без', 'на', 'не',
}

PSEUDO_INGREDIENT_PREFIXES = (
    'для_', 'продукты_', 'ингредиенты_', 'дополнительно_',
    'специи_для_', 'приправа_для_', 'соус_для_', 'тесто_для_',
    'начинка_для_', 'крем_для_', 'глазурь_для_', 'маринад_для_',
)


def _is_pseudo_ingredient(normalized_key: str, name: str) -> bool:
    """Filter out narrative / instruction tokens captured by the line parser.

    Examples it kills:
    - "тесто" / "начинка" — labels of recipe sections
    - "для бешбармака" — section headers
    - "или" / "и" — connectives mistakenly tokenized as ingredients
    Real ingredients always survive this filter.
    """
    key = (normalized_key or '').strip().lower()
    if not key:
        return True
    if key in PSEUDO_INGREDIENT_KEYS:
        return True
    if any(key.startswith(prefix) for prefix in PSEUDO_INGREDIENT_PREFIXES):
        return True
    if len(key) <= 2:
        return True
    return False


_TRAILING_QTY_RE = re.compile(
    r'\s*[\(\[]?\s*'
    r'(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)\s*'
    r'(кг|г|гр|мл|л|шт\.?|стак[а-я]*|ст\.?\s*л\.?|ч\.?\s*л\.?|столов[а-я]+\s*ложк[а-я]+|чайн[а-я]+\s*ложк[а-я]+|щепотк[а-я]*|пуч[а-я]+|зубчик[а-я]*|долек?|долька|дольки|банк[а-я]*|голов[а-я]+|кусоч[а-я]+|горош[а-я]+)'
    r'[\)\]]?\s*$',
    re.IGNORECASE,
)


def _split_name_and_qty(raw: str) -> tuple[str, str]:
    """Return (name_part, qty_part) from a raw ingredient line.

    The historical scraper used a " - " separator. Lots of upstream sources
    (HF dataset, alternative scrapers) instead bake the quantity into the
    name itself, e.g. "Мука пшеничная 320 г" or "Лук репчатый (5 головок)".
    Without splitting these, every ingredient ends up with quantity=1 and
    unit='unit' → contribution to cost / nutrition becomes zero.

    Strategy:
      1. If " - " is present — use the legacy split.
      2. Otherwise try to peel a trailing "<number> <unit>" off the name.
    """
    if ' - ' in raw:
        name_part, qty_part = raw.split(' - ', 1)
        return name_part, qty_part

    match = _TRAILING_QTY_RE.search(raw)
    if match:
        qty_part = match.group(0).strip()
        name_part = raw[: match.start()].rstrip(' .,;:()-')
        return name_part, qty_part

    return raw, ''


def _parse_ingredient_line(line: str) -> dict:
    raw = _clean_text(line)
    name_part, qty_part = _split_name_and_qty(raw)

    name = _clean_text(name_part)
    quantity, unit, is_optional = _extract_quantity_and_unit(qty_part)
    quantity, unit = _post_normalize_unit(name, quantity, unit)

    return {
        'raw': raw,
        'name': name,
        'normalized_name': _normalize_ingredient_name(name),
        'normalized_key': _normalized_key(name),
        'quantity': quantity,
        'unit': unit,
        'is_optional': is_optional,
        'preparation_note': '',
    }


def _get_or_create_tag(key: str, label: str) -> Tag:
    tag, _ = Tag.objects.get_or_create(
        key=key,
        defaults={'label': label},
    )
    return tag


def _keyword_tags(keywords: list[str] | None) -> list[Tag]:
    result = []
    if not keywords:
        return result

    for keyword in keywords:
        key = _safe_lower(keyword)
        mapping = KEYWORD_TO_TAG.get(key)
        if mapping:
            result.append(_get_or_create_tag(mapping[0], mapping[1]))

    return result


def _extract_nutrition_per_serving(payload: dict, servings_default: int) -> dict:
    nutrition_payload = payload.get('nutrition_per_serving') or {}
    if not isinstance(nutrition_payload, dict):
        nutrition_payload = {}

    calories_per_serving = Decimal(str(nutrition_payload.get('calories') or '0'))
    protein_per_serving = Decimal(str(nutrition_payload.get('protein_g') or '0'))
    fat_per_serving = Decimal(str(nutrition_payload.get('fat_g') or '0'))
    carb_per_serving = Decimal(str(nutrition_payload.get('carb_g') or '0'))
    servings_decimal = Decimal(str(max(servings_default, 1)))

    return {
        'calories_total': (calories_per_serving * servings_decimal).quantize(Decimal('0.01')),
        'protein_total_g': (protein_per_serving * servings_decimal).quantize(Decimal('0.01')),
        'fat_total_g': (fat_per_serving * servings_decimal).quantize(Decimal('0.01')),
        'carb_total_g': (carb_per_serving * servings_decimal).quantize(Decimal('0.01')),
        'calories_per_serving': calories_per_serving.quantize(Decimal('0.01')),
        'protein_per_serving_g': protein_per_serving.quantize(Decimal('0.01')),
        'fat_per_serving_g': fat_per_serving.quantize(Decimal('0.01')),
        'carb_per_serving_g': carb_per_serving.quantize(Decimal('0.01')),
        'micronutrients': nutrition_payload.get('micronutrients') or {},
    }


class Command(BaseCommand):
    help = 'Import recipes from recipes_enriched.jsonl into canonical catalog tables.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--path',
            type=str,
            required=True,
            help='Path to recipes_enriched.jsonl',
        )
        parser.add_argument(
            '--status',
            type=str,
            default=RecipeStatus.PUBLISHED,
            choices=[choice[0] for choice in RecipeStatus.choices],
            help='Recipe status for imported records',
        )
        parser.add_argument(
            '--difficulty',
            type=str,
            default=RecipeDifficulty.EASY,
            choices=[choice[0] for choice in RecipeDifficulty.choices],
            help='Default difficulty for imported records',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        input_path = Path(options['path'])
        if not input_path.exists():
            raise CommandError(f'File not found: {input_path}')

        created_recipes = 0
        updated_recipes = 0
        created_ingredients = 0

        # Ensure core tags exist
        traditional_tag = _get_or_create_tag('traditional', 'Traditional')
        local_tag = _get_or_create_tag('local_cuisine', 'Local Cuisine')

        with input_path.open('r', encoding='utf-8') as f:
            for line_number, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue

                try:
                    payload = json.loads(line)
                except json.JSONDecodeError as exc:
                    self.stdout.write(self.style.WARNING(
                        f'[line {line_number}] skipped invalid json: {exc}'
                    ))
                    continue

                title = _clean_text(payload.get('title', ''))
                if not title:
                    self.stdout.write(self.style.WARNING(
                        f'[line {line_number}] skipped because title is empty'
                    ))
                    continue

                keywords = payload.get('keywords') or []
                is_local = _is_local_cuisine(payload.get('cuisine', ''), keywords)
                cuisine_type = _map_cuisine(payload.get('cuisine', ''))
                category = _map_category(payload.get('category', ''))
                servings_default = _parse_servings(payload.get('yields', ''))

                short_description = _clean_text(payload.get('description', ''))[:500]
                long_description = _clean_text(payload.get('description', ''))

                recipe_defaults = {
                    'title': title,
                    'source_name': _clean_text(payload.get('source', '')),
                    'source_recipe_id': str(payload.get('recipe_id', '')),
                    "slug": _build_recipe_slug(title, payload.get("recipe_id")),
                    'source_url': payload.get('source_url') or None,
                    'canonical_url': payload.get('canonical_url') or None,
                    'language': payload.get('language') or 'ru',
                    'source_metadata': {
                        'raw_category': payload.get('category'),
                        'raw_cuisine': payload.get('cuisine'),
                        'keywords': keywords,
                        'raw_yields': payload.get('yields'),
                    },
                    'short_description': short_description or title[:500],
                    'long_description': long_description,
                    'cuisine_type': cuisine_type,
                    'region_code': 'KZ',
                    'is_local_cuisine': is_local,
                    'category': category,
                    'difficulty_level': options['difficulty'],
                    'prep_time_minutes': int(payload.get('prep_time_minutes') or 0),
                    'cook_time_minutes': int(payload.get('cook_time_minutes') or 0),
                    'servings_default': servings_default,
                    'is_child_friendly': category in {RecipeCategory.BREAKFAST, RecipeCategory.SNACK},
                    'image_url': _normalize_image_url(payload.get('image_url')),
                    'video_url': payload.get('video_url') or None,
                    'status': options['status'],
                }

                lookup_kwargs = {}
                if payload.get('canonical_url'):
                    lookup_kwargs['canonical_url'] = payload['canonical_url']
                elif payload.get('source_url'):
                    lookup_kwargs['source_url'] = payload['source_url']
                else:
                    lookup_kwargs['source_recipe_id'] = str(payload.get('recipe_id', ''))

                recipe, created = Recipe.objects.update_or_create(
                    defaults=recipe_defaults,
                    **lookup_kwargs,
                )

                if created:
                    created_recipes += 1
                else:
                    updated_recipes += 1

                # reset children for idempotent import
                recipe.steps.all().delete()
                recipe.ingredients_map.all().delete()
                recipe.recipe_tags.all().delete()

                instructions = payload.get('instructions') or []
                if instructions:
                    for order, instruction_text in enumerate(instructions, start=1):
                        text = _clean_text(instruction_text)
                        if not text:
                            continue
                        RecipeStep.objects.create(
                            recipe=recipe,
                            step_order=order,
                            instruction_text=text,
                        )
                elif long_description:
                    RecipeStep.objects.create(
                        recipe=recipe,
                        step_order=1,
                        instruction_text=long_description,
                    )

                ingredients = payload.get('ingredients') or []
                for ingredient_line in ingredients:
                    parsed = _parse_ingredient_line(ingredient_line)
                    safe_name = (parsed['name'] or '').strip()[:240]
                    safe_key = (parsed['normalized_key'] or '').strip()[:240]
                    if not safe_key or not safe_name:
                        continue
                    if _is_pseudo_ingredient(safe_key, safe_name):
                        continue
                    ingredient, ingredient_created = Ingredient.objects.get_or_create(
                        normalized_name=safe_key,
                        defaults={
                            'name': safe_name,
                            'category': 'other',
                            'default_unit': parsed['unit'],
                            'is_common_allergen': False,
                        },
                    )
                    if ingredient_created:
                        created_ingredients += 1

                    RecipeIngredient.objects.create(
                        recipe=recipe,
                        ingredient=ingredient,
                        quantity=parsed['quantity'],
                        unit=parsed['unit'],
                        is_optional=parsed['is_optional'],
                        preparation_note=parsed['preparation_note'],
                    )

                nutrition_defaults = _extract_nutrition_per_serving(payload, servings_default)
                RecipeNutrition.objects.update_or_create(
                    recipe=recipe,
                    defaults=nutrition_defaults,
                )

                tag_objects = []

                if is_local:
                    tag_objects.extend([traditional_tag, local_tag])

                raw_title = _safe_lower(title)
                if 'баурсак' in raw_title or 'шельпек' in raw_title:
                    tag_objects.append(_get_or_create_tag('traditional_pastry', 'Traditional Pastry'))

                tag_objects.extend(_keyword_tags(keywords))

                # lightweight heuristics
                total_time = int(payload.get('total_time_minutes') or 0)
                if total_time and total_time <= 30:
                    tag_objects.append(_get_or_create_tag('quick_meal', 'Quick Meal'))

                if category in {RecipeCategory.BREAKFAST, RecipeCategory.SNACK}:
                    tag_objects.append(_get_or_create_tag('kid_friendly', 'Kid Friendly'))

                deduped = {}
                for tag in tag_objects:
                    deduped[tag.key] = tag

                for tag in deduped.values():
                    RecipeTag.objects.get_or_create(recipe=recipe, tag=tag)

        self.stdout.write(self.style.SUCCESS(
            f'Import finished. created_recipes={created_recipes}, '
            f'updated_recipes={updated_recipes}, created_ingredients={created_ingredients}'
        ))