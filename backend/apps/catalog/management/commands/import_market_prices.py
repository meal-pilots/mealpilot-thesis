"""Import real market prices (e.g. Arbuz.kz) into IngredientPrice.

Strategy:
    1. Parse the JSONL price feed produced by `etl-meals scrape-prices`.
    2. For every product, derive a "keyword" from its name (the first
       meaningful word, e.g. "сахар" from "Сахар песок Казахстан, кг").
    3. Group products by (keyword, unit) and pick the median price.
    4. For every Ingredient whose normalized_name contains the keyword, upsert
       an IngredientPrice with source_type='market' and confidence=0.95.

This is intentionally lossy: one keyword maps to multiple ingredients (e.g.
"сахар" → all sugar variants). That's acceptable for a heuristic that beats
the previous heuristic_estimate fallback.
"""
from __future__ import annotations

import json
import re
import statistics
from datetime import date
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.catalog.models import Ingredient, IngredientPrice


SOURCE_TYPE = 'market'
CONFIDENCE = Decimal('0.95')

STOPWORDS = {
    'для', 'из', 'с', 'в', 'на', 'не', 'по', 'без', 'и', 'или',
    'кг', 'гр', 'г', 'мл', 'л', 'шт', 'упак', 'упаковка', 'банк', 'бан',
}

NON_FOOD_KEYWORDS = (
    'мыло', 'шампунь', 'гель', 'крем', 'дезодорант', 'паста зубная',
    'порошок стиральный', 'кондиционер для', 'влажные салфетки',
    'средство', 'освежитель', 'стиральн', 'чистящее', 'для посуды',
    'подгузник', 'пеленк', 'прокладк', 'тампон',
)


def _tokenize(name: str) -> list[str]:
    cleaned = re.sub(r'[\d.,/%()«»"\']', ' ', name.lower().replace('ё', 'е'))
    parts = re.split(r'[\s\-]+', cleaned)
    tokens = [p for p in parts if len(p) >= 4 and p not in STOPWORDS]
    return tokens


def _is_non_food(name: str) -> bool:
    lower = name.lower()
    return any(marker in lower for marker in NON_FOOD_KEYWORDS)


def _keyword(name: str) -> str | None:
    tokens = _tokenize(name)
    return tokens[0] if tokens else None


_PACK_COUNT_RE = re.compile(r'(\d+)\s*шт\b', re.IGNORECASE)
_PACK_WORDS = (
    ('десяток', 10),
    ('дюжина', 12),
    ('пара', 2),
)


def _detect_pack_count(name: str) -> int | None:
    """Return how many physical units are in a piece-priced SKU."""
    if not name:
        return None
    lowered = name.lower()
    match = _PACK_COUNT_RE.search(lowered)
    if match:
        try:
            value = int(match.group(1))
            if 1 < value <= 60:
                return value
        except ValueError:
            return None
    for word, value in _PACK_WORDS:
        if word in lowered:
            return value
    return None


class Command(BaseCommand):
    help = 'Import real market prices from a JSONL feed produced by etl-meals.'

    def add_arguments(self, parser):
        parser.add_argument('--path', type=str, required=True, help='Path to prices JSONL')
        parser.add_argument('--store', type=str, default='arbuz')
        parser.add_argument('--region-code', type=str, default='KZ')
        parser.add_argument('--effective-from', type=str, default=str(date.today()))
        parser.add_argument(
            '--min-products-per-keyword',
            type=int,
            default=1,
            help='Drop keywords with fewer than N products (filters typos).',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        feed_path = Path(options['path'])
        if not feed_path.exists():
            raise CommandError(f'Feed not found: {feed_path}')

        store = options['store']
        region = options['region_code']
        effective_from = date.fromisoformat(options['effective_from'])
        min_products = options['min_products_per_keyword']

        # 1. Read feed, group by (keyword, unit)
        groups: dict[tuple[str, str], list[Decimal]] = {}
        skipped_non_food = 0
        skipped_no_keyword = 0
        total_rows = 0

        with feed_path.open(encoding='utf-8') as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue

                total_rows += 1
                name = (row.get('name') or '').strip()
                if not name or _is_non_food(name):
                    skipped_non_food += 1
                    continue

                keyword = _keyword(name)
                if not keyword:
                    skipped_no_keyword += 1
                    continue

                unit = (row.get('unit') or 'pc').lower()
                try:
                    price = Decimal(str(row.get('price_kzt'))).quantize(Decimal('0.01'))
                except Exception:
                    continue

                # Normalize package prices to per-kg / per-l using package_grams.
                package_grams = row.get('package_grams')
                if package_grams and unit in {'g', 'ml'}:
                    try:
                        grams = Decimal(str(package_grams))
                        if grams > 0:
                            price = (price * Decimal('1000') / grams).quantize(Decimal('0.01'))
                            unit = 'kg' if unit == 'g' else 'l'
                    except Exception:
                        pass

                # Egg-pack normalization. Arbuz lists eggs as "1100 ₸ /шт"
                # but the SKU is actually a 10-pack ("Яйцо С1 десяток").
                # Detect "X шт" / "десяток" / "дюжина" in the name and divide.
                if unit == 'pc':
                    pack_qty = _detect_pack_count(name)
                    if pack_qty and pack_qty > 1:
                        price = (price / Decimal(str(pack_qty))).quantize(Decimal('0.01'))

                # Sanity: a single piece > 5000₸ is almost always a parsing
                # bug (we accidentally captured a multi-pack price). Skip.
                if unit == 'pc' and price > Decimal('5000'):
                    continue

                groups.setdefault((keyword, unit), []).append(price)

        # 2. Lower-quartile (Q1) price per (keyword, unit) — biases toward
        #    the cheaper SKUs in each bucket. The naive median was being
        #    pulled up by premium variants (rib-eye, organic, imported)
        #    even when the recipe just needs a generic ingredient.
        prices_by_keyword: dict[str, dict[str, Decimal]] = {}
        for (keyword, unit), prices in groups.items():
            if len(prices) < min_products:
                continue
            sorted_prices = sorted(prices)
            if len(sorted_prices) >= 4:
                idx = max(0, len(sorted_prices) // 4)
                chosen = sorted_prices[idx]
            else:
                chosen = sorted_prices[0]
            chosen = Decimal(str(chosen)).quantize(Decimal('0.01'))
            prices_by_keyword.setdefault(keyword, {})[unit] = chosen

        self.stdout.write(
            f'Loaded {total_rows} rows. '
            f'unique keywords: {len(prices_by_keyword)}. '
            f'skipped non-food: {skipped_non_food}. '
            f'skipped no-keyword: {skipped_no_keyword}.'
        )

        # 3. Match keywords to ingredients and upsert
        created = 0
        updated = 0
        ingredients_touched = 0

        for keyword, unit_to_price in prices_by_keyword.items():
            unit, price = next(iter(unit_to_price.items()))

            matching = Ingredient.objects.filter(normalized_name__icontains=keyword)
            for ingredient in matching:
                ingredients_touched += 1
                preferred_unit = unit
                if (ingredient.default_unit or '').lower() in {'kg', 'l', 'pc', 'g', 'ml'}:
                    pref = ingredient.default_unit.lower()
                    if pref in {'g'}:
                        preferred_unit = 'kg'
                    elif pref in {'ml'}:
                        preferred_unit = 'l'

                IngredientPrice.objects.filter(
                    ingredient=ingredient,
                    region_code=region,
                    source_type='heuristic_estimate',
                ).delete()

                _, was_created = IngredientPrice.objects.update_or_create(
                    ingredient=ingredient,
                    region_code=region,
                    store_name=store,
                    source_type=SOURCE_TYPE,
                    defaults={
                        'price_amount': price,
                        'price_unit': preferred_unit,
                        'effective_from': effective_from,
                        'confidence_score': CONFIDENCE,
                    },
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. ingredients_touched={ingredients_touched}, '
                f'prices_created={created}, prices_updated={updated}'
            )
        )
