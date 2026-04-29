import json
import re
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Ingredient, RecipeIngredient


RU_UNIT_MAP = {
    'г': 'g',
    'гр': 'g',
    'грамм': 'g',
    'грамма': 'g',
    'граммов': 'g',
    'кг': 'kg',
    'килограмм': 'kg',
    'килограмма': 'kg',
    'килограммов': 'kg',
    'мл': 'ml',
    'л': 'l',
    'литр': 'l',
    'литра': 'l',
    'литров': 'l',
    'шт': 'pc',
    'шт.': 'pc',
    'штука': 'pc',
    'штуки': 'pc',
    'штук': 'pc',
    'головка': 'pc',
    'головки': 'pc',
    'головок': 'pc',
    'зубчик': 'pc',
    'зубчика': 'pc',
    'зубчиков': 'pc',
    'стакан': 'cup',
    'стакана': 'cup',
    'стаканов': 'cup',
    'ч. л.': 'tsp',
    'ч.л.': 'tsp',
    'чайная ложка': 'tsp',
    'чайные ложки': 'tsp',
    'ст. л.': 'tbsp',
    'ст.л.': 'tbsp',
    'столовая ложка': 'tbsp',
    'столовые ложки': 'tbsp',
    'щепотка': 'pinch',
    'щепотки': 'pinch',
    'по вкусу': 'to_taste',
}


GENERIC_BAD_NAMES = {
    '',
    '-',
    'ингредиент',
    'ингредиенты',
}


def _to_decimal(value) -> Decimal:
    if value is None:
        return Decimal('0.00')
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _clean_spaces(value: str) -> str:
    value = value or ''
    value = value.replace('\xa0', ' ')
    value = re.sub(r'\s+', ' ', value)
    return value.strip()


def _safe_lower(value: str) -> str:
    return _clean_spaces(value).lower()

def _strip_trailing_separators(text: str) -> str:
    text = _clean_spaces(text)
    text = re.sub(r'[\s\-–—:;,]+$', '', text)
    return text.strip()

def _is_mixed_or_alternative_raw(name: str) -> bool:
    lowered = _safe_lower(name)
    patterns = [
        r'\bили\b',
        r'\bи\b',
        r'/',
        r'\([^)]*или[^)]*\)',
    ]
    return any(re.search(pattern, lowered) for pattern in patterns)

def _is_safe_clean_name(name: str) -> bool:
    cleaned = _strip_trailing_separators(name)

    if not cleaned:
        return False

    if cleaned.endswith(('-', '–', '—', ':')):
        return False

    if re.search(r'\d', cleaned):
        return False

    if len(cleaned) <= 2:
        return False

    return True

def _normalize_key(value: str) -> str:
    value = _safe_lower(value)
    value = value.replace('ё', 'е')
    value = re.sub(r'\([^)]*\)', ' ', value)
    value = re.sub(r'[^a-zA-Zа-яА-Я0-9\s\-]', ' ', value)
    value = re.sub(r'\s+', ' ', value).strip()
    return value.replace(' ', '_')

def _is_mixed_or_alternative_name(name: str) -> bool:
    lowered = _safe_lower(name)
    patterns = [
        r'\bили\b',
        r'\bи\b',
        r'/',
    ]
    return any(re.search(pattern, lowered) for pattern in patterns)

def _normalize_display_name(value: str) -> str:
    value = _clean_spaces(value)
    value = re.sub(r'\([^)]*\)', ' ', value)
    value = re.sub(r'\s+', ' ', value)
    value = value.strip(' ,.-–—:;')
    value = _strip_trailing_separators(value)
    return value

def _extract_embedded_quantity_and_unit(text: str):
    """
    Tries to detect quantity/unit embedded directly in ingredient name.
    Safe behavior:
    - parses simple endings like 'Яйца 2 шт'
    - parses ranges like 'Мука 1-1,5 стакана'
    - keeps quantity for RecipeIngredient patching
    - only returns clean names suitable for Ingredient rename if they are safe
    """
    raw = _clean_spaces(text)
    lowered = _safe_lower(raw)

    if not raw:
        return {
            'clean_name': raw,
            'embedded_quantity': None,
            'embedded_unit': None,
            'confidence': 0.0,
            'reason': 'empty',
        }

    unit_pattern = '|'.join(sorted((re.escape(k) for k in RU_UNIT_MAP.keys()), key=len, reverse=True))

    # 1. special case: "по вкусу"
    if 'по вкусу' in lowered:
        cleaned = re.sub(r'\bпо вкусу\b', '', lowered, flags=re.IGNORECASE)
        cleaned = _normalize_display_name(cleaned)
        return {
            'clean_name': cleaned,
            'embedded_quantity': Decimal('1.00'),
            'embedded_unit': 'to_taste',
            'confidence': 0.95,
            'reason': 'contains_po_vkusu',
        }

    # 2. range patterns like:
    # "Мука пшеничная - 1-1,5 стакана"
    # "Вода 50-70 мл"
    range_patterns = [
        rf'^(?P<name>.*?)[,\s\-–—:]+(?P<left>\d+(?:[.,]\d+)?)\s*-\s*(?P<right>\d+(?:[.,]\d+)?)\s*(?P<unit>{unit_pattern})$',
        rf'^(?P<name>.*?)[,\s]+(?P<left>\d+(?:[.,]\d+)?)\s*-\s*(?P<right>\d+(?:[.,]\d+)?)\s*(?P<unit>{unit_pattern})$',
    ]

    for pattern in range_patterns:
        match = re.search(pattern, lowered, flags=re.IGNORECASE)
        if match:
            name = _normalize_display_name(match.group('name'))
            left = Decimal(match.group('left').replace(',', '.'))
            right = Decimal(match.group('right').replace(',', '.'))
            qty = ((left + right) / Decimal('2')).quantize(Decimal('0.01'))
            unit = RU_UNIT_MAP[match.group('unit')]
            return {
                'clean_name': name,
                'embedded_quantity': qty,
                'embedded_unit': unit,
                'confidence': 0.96,
                'reason': 'range_qty_unit',
            }

    # 3. simple tail qty + unit:
    # "Яйца 2 шт", "Лук репчатый 2 головки", "Молоко 1 стакан"
    simple_patterns = [
        rf'^(?P<name>.*?)[,\s\-–—:]+(?P<qty>\d+(?:[.,]\d+)?)\s*(?P<unit>{unit_pattern})$',
        rf'^(?P<name>.*?)[,\s]+(?P<qty>\d+(?:[.,]\d+)?)\s*(?P<unit>{unit_pattern})$',
    ]

    for pattern in simple_patterns:
        match = re.search(pattern, lowered, flags=re.IGNORECASE)
        if match:
            name = _normalize_display_name(match.group('name'))
            qty = Decimal(match.group('qty').replace(',', '.')).quantize(Decimal('0.01'))
            unit = RU_UNIT_MAP[match.group('unit')]
            return {
                'clean_name': name,
                'embedded_quantity': qty,
                'embedded_unit': unit,
                'confidence': 0.98,
                'reason': 'tail_qty_unit',
            }

    # 4. no confident extraction
    return {
        'clean_name': _normalize_display_name(raw),
        'embedded_quantity': None,
        'embedded_unit': None,
        'confidence': 0.0,
        'reason': 'none',
    }

def _canonical_category(current_category: str, clean_name: str) -> str:
    current = _safe_lower(current_category)

    if current and current != 'other':
        return current

    name = _safe_lower(clean_name)

    if any(token in name for token in ['говядина', 'баранина', 'конина', 'курица', 'индейка', 'мясо', 'рыба', 'лосось']):
        return 'protein'
    if any(token in name for token in ['картофель', 'лук', 'морковь', 'перец', 'огурец', 'помидор', 'томат', 'баклажан', 'кабачок']):
        return 'vegetable'
    if any(token in name for token in ['молоко', 'сыр', 'творог', 'сливки', 'кефир', 'йогурт', 'масло сливочное']):
        return 'dairy'
    if any(token in name for token in ['рис', 'гречка', 'мука', 'макароны', 'лапша', 'пшено', 'овсянка', 'тесто', 'хлеб']):
        return 'grain'
    if any(token in name for token in ['яблоко', 'банан', 'лимон', 'апельсин', 'виноград', 'ягод']):
        return 'fruit'
    if any(token in name for token in ['масло', 'жир']):
        return 'fat'
    if any(token in name for token in ['соль', 'сахар', 'перец черный', 'перец красный', 'зира', 'специи']):
        return 'seasoning'

    return current or 'other'


def _should_apply_embedded_quantity(recipe_ingredient: RecipeIngredient, embedded_quantity, embedded_unit) -> bool:
    """
    Only overwrite quantity/unit when current values are still generic or likely placeholders.
    """
    if embedded_quantity is None or embedded_unit is None:
        return False

    current_quantity = _to_decimal(recipe_ingredient.quantity)
    current_unit = (recipe_ingredient.unit or '').strip().lower()

    # if current parse is already specific, do not overwrite
    if current_unit not in {'', 'unit', 'to_taste'}:
        return False

    # common placeholder from import command
    if current_quantity == Decimal('1.00'):
        return True

    return False


class Command(BaseCommand):
    help = 'Normalize imported ingredients, preserve recipe quantities, merge duplicates, and optionally apply changes.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Apply changes. Without this flag, command runs in dry-run mode.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='How many sample rows to print.',
        )
        parser.add_argument(
            '--export-json',
            type=str,
            default='',
            help='Optional path to save normalization report as JSON.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        apply_changes = options['apply']
        limit = options['limit']
        export_json = options['export_json']

        ingredients = list(
            Ingredient.objects.all().order_by('name')
        )

        canonical_buckets = defaultdict(list)
        report_rows = []

        for ingredient in ingredients:
            parsed = _extract_embedded_quantity_and_unit(ingredient.name)
            clean_name = parsed['clean_name']

            # If parser produced a suspicious clean name, do not trust it for rename/merge key generation
            if not _is_safe_clean_name(clean_name):
                clean_name = _normalize_display_name(ingredient.name)
                parsed['confidence'] = 0.0
                parsed['reason'] = f"{parsed['reason']}_unsafe_name"

            normalized_key = _normalize_key(clean_name)

            if normalized_key in GENERIC_BAD_NAMES or not normalized_key:
                normalized_key = _normalize_key(ingredient.name)
            canonical_buckets[normalized_key].append(
                {
                    'ingredient': ingredient,
                    'clean_name': clean_name,
                    'normalized_key': normalized_key,
                    'embedded_quantity': parsed['embedded_quantity'],
                    'embedded_unit': parsed['embedded_unit'],
                    'confidence': parsed['confidence'],
                    'reason': parsed['reason'],
                }
            )

        merge_groups = []
        rename_candidates = []
        quantity_patch_candidates = []
        merged_ingredient_count = 0
        patched_recipe_ingredients = 0

        for normalized_key, rows in canonical_buckets.items():
            # choose canonical ingredient
            if not normalized_key or normalized_key in GENERIC_BAD_NAMES:
                continue
            if any(_is_mixed_or_alternative_name(row['clean_name']) for row in rows):
                continue
            if any(_is_mixed_or_alternative_raw(row['ingredient'].name) for row in rows):
                continue
            rows_sorted = sorted(
                rows,
                key=lambda r: (
                    0 if r['ingredient'].category not in {'', 'other'} else 1,
                    len(r['ingredient'].name or ''),
                    str(r['ingredient'].id),
                )
            )
            canonical_row = rows_sorted[0]
            canonical_ingredient = canonical_row['ingredient']
            canonical_clean_name = canonical_row['clean_name'] or canonical_ingredient.name

            if (
                    canonical_row['confidence'] >= 0.95
                    and _is_safe_clean_name(canonical_clean_name)
                    and not _is_mixed_or_alternative_name(canonical_clean_name)
                    and not _is_mixed_or_alternative_raw(canonical_ingredient.name)
                    and (
                    canonical_ingredient.name != canonical_clean_name
                    or canonical_ingredient.normalized_name != normalized_key
            )
            ):
                rename_candidates.append(
                    {
                        'ingredient_id': str(canonical_ingredient.id),
                        'old_name': canonical_ingredient.name,
                        'new_name': canonical_clean_name,
                        'old_normalized_name': canonical_ingredient.normalized_name,
                        'new_normalized_name': normalized_key,
                        'confidence': canonical_row['confidence'],
                        'reason': canonical_row['reason'],
                    }
                )

            for row in rows_sorted[1:]:
                merge_groups.append(
                    {
                        'into_ingredient_id': str(canonical_ingredient.id),
                        'into_name': canonical_clean_name,
                        'from_ingredient_id': str(row['ingredient'].id),
                        'from_name': row['ingredient'].name,
                        'normalized_key': normalized_key,
                    }
                )

            for row in rows_sorted:
                ingredient = row['ingredient']
                recipe_ingredients = list(
                    RecipeIngredient.objects.filter(ingredient=ingredient).select_related('recipe', 'ingredient')
                )

                for recipe_ingredient in recipe_ingredients:
                    embedded_quantity = row['embedded_quantity']
                    embedded_unit = row['embedded_unit']

                    if _should_apply_embedded_quantity(recipe_ingredient, embedded_quantity, embedded_unit):
                        quantity_patch_candidates.append(
                            {
                                'recipe_ingredient_id': str(recipe_ingredient.id),
                                'recipe_id': str(recipe_ingredient.recipe_id),
                                'recipe_title': recipe_ingredient.recipe.title,
                                'ingredient_before': ingredient.name,
                                'quantity_before': str(recipe_ingredient.quantity),
                                'unit_before': recipe_ingredient.unit,
                                'quantity_after': str(embedded_quantity),
                                'unit_after': embedded_unit,
                                'reason': row['reason'],
                            }
                        )

        # print summary
        self.stdout.write(self.style.SUCCESS('\n=== INGREDIENT NORMALIZATION PLAN ==='))
        self.stdout.write(f'Total ingredients scanned: {len(ingredients)}')
        self.stdout.write(f'Canonical groups: {len(canonical_buckets)}')
        self.stdout.write(f'Rename candidates: {len(rename_candidates)}')
        self.stdout.write(f'Merge candidates: {len(merge_groups)}')
        self.stdout.write(f'Quantity patch candidates: {len(quantity_patch_candidates)}')
        self.stdout.write(f'Mode: {"APPLY" if apply_changes else "DRY-RUN"}')

        def print_rows(title: str, rows: list[dict]):
            if not rows:
                return
            self.stdout.write(self.style.WARNING(f'\n=== {title} ==='))
            for row in rows[:limit]:
                self.stdout.write(json.dumps(row, ensure_ascii=False))

        print_rows('SAMPLE RENAME CANDIDATES', rename_candidates)
        print_rows('SAMPLE MERGE CANDIDATES', merge_groups)
        print_rows('SAMPLE QUANTITY PATCH CANDIDATES', quantity_patch_candidates)
        if apply_changes:
            # 1. First patch quantities on recipe ingredients if embedded values were detected
            for payload in quantity_patch_candidates:
                recipe_ingredient = RecipeIngredient.objects.get(id=payload['recipe_ingredient_id'])
                recipe_ingredient.quantity = Decimal(payload['quantity_after'])
                recipe_ingredient.unit = payload['unit_after']
                recipe_ingredient.save(update_fields=['quantity', 'unit', 'updated_at'])
                patched_recipe_ingredients += 1

            # 2. Then merge duplicate ingredients into canonical ingredient
            # Merge by re-pointing RecipeIngredient rows to canonical ingredient.
            for payload in merge_groups:
                canonical = Ingredient.objects.get(id=payload['into_ingredient_id'])
                duplicate = Ingredient.objects.get(id=payload['from_ingredient_id'])

                if canonical.id == duplicate.id:
                    continue

                recipe_links = list(RecipeIngredient.objects.filter(ingredient=duplicate).select_related('recipe'))
                for link in recipe_links:
                    existing = RecipeIngredient.objects.filter(
                        recipe=link.recipe,
                        ingredient=canonical,
                        unit=link.unit,
                        quantity=link.quantity,
                    ).first()

                    if existing:
                        if not existing.preparation_note and link.preparation_note:
                            existing.preparation_note = link.preparation_note
                            existing.save(update_fields=['preparation_note', 'updated_at'])
                        link.delete()
                    else:
                        link.ingredient = canonical
                        link.save(update_fields=['ingredient', 'updated_at'])

                duplicate.delete()
                merged_ingredient_count += 1

            # 3. Finally rename canonical ingredients AFTER duplicates are gone
            for payload in rename_candidates:
                ingredient = Ingredient.objects.get(id=payload['ingredient_id'])

                new_name = payload['new_name'] or ingredient.name
                new_normalized_name = payload['new_normalized_name'] or ingredient.normalized_name

                ingredient.name = new_name
                ingredient.category = _canonical_category(ingredient.category, ingredient.name)

                if ingredient.default_unit in {'', 'unit'}:
                    ingredient.default_unit = (
                        'g' if ingredient.category in {'grain', 'vegetable', 'protein', 'fruit'} else 'unit'
                    )

                # Safety guard: only set normalized_name if no other ingredient already has it
                conflict_exists = Ingredient.objects.filter(
                    normalized_name=new_normalized_name
                ).exclude(id=ingredient.id).exists()

                if not conflict_exists:
                    ingredient.normalized_name = new_normalized_name
                    ingredient.save(update_fields=['name', 'normalized_name', 'category', 'default_unit', 'updated_at'])
                else:
                    ingredient.save(update_fields=['name', 'category', 'default_unit', 'updated_at'])
            self.stdout.write(self.style.SUCCESS(
                f'\nApplied successfully. merged_ingredients={merged_ingredient_count}, '
                f'patched_recipe_ingredients={patched_recipe_ingredients}'
            ))

        report = {
            'mode': 'apply' if apply_changes else 'dry-run',
            'total_ingredients_scanned': len(ingredients),
            'canonical_groups': len(canonical_buckets),
            'rename_candidates': rename_candidates,
            'merge_candidates': merge_groups,
            'quantity_patch_candidates': quantity_patch_candidates,
        }

        if export_json:
            output_path = Path(export_json)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(
                json.dumps(report, ensure_ascii=False, indent=2),
                encoding='utf-8',
            )
            self.stdout.write(self.style.SUCCESS(f'Report exported to: {output_path}'))