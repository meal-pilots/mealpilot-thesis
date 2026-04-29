from __future__ import annotations

import csv
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.catalog.models import Ingredient, IngredientPrice


DEFAULT_EFFECTIVE_FROM = date(2026, 3, 18)
DEFAULT_STORE_NAME = "stat.gov.kz"
DEFAULT_REGION_CODE = "KZ"
DEFAULT_SOURCE_TYPE = "official_stat_avg"
GENERAL_PRICE_INDEX = 1


def _spec(
    normalized_name: str,
    name: str,
    category: str,
    default_unit: str,
    price_unit: str,
    *,
    is_common_allergen: bool = False,
    divide_by: int | None = None,
    confidence_score: str = "0.95",
) -> dict:
    return {
        "normalized_name": normalized_name,
        "name": name,
        "category": category,
        "default_unit": default_unit,
        "price_unit": price_unit,
        "is_common_allergen": is_common_allergen,
        "divide_by": divide_by,
        "confidence_score": Decimal(confidence_score),
    }


PRODUCT_MAP = {
    "Рис шлифованный": _spec("rice", "Rice", "grain", "kg", "kg"),
    "Крупа гречневая": _spec("buckwheat", "Buckwheat", "grain", "kg", "kg"),
    "Мука пшеничная первого сорта": _spec(
        "flour",
        "Flour",
        "grain",
        "kg",
        "kg",
        is_common_allergen=True,
    ),
    "Хлеб пшеничный из муки первого сорта": _spec(
        "wheat_bread",
        "Wheat bread",
        "bakery",
        "kg",
        "kg",
        is_common_allergen=True,
        confidence_score="0.90",
    ),
    "Рожки": _spec(
        "pasta",
        "Pasta",
        "grain",
        "kg",
        "kg",
        is_common_allergen=True,
        confidence_score="0.90",
    ),
    "Говядина с костями": _spec(
        "beef_bone_in",
        "Beef bone-in",
        "protein",
        "kg",
        "kg",
        confidence_score="0.90",
    ),
    "Говядина бескостная": _spec("beef", "Beef", "protein", "kg", "kg"),
    "Конина, включая бескостную": _spec(
        "horsemeat",
        "Horsemeat",
        "protein",
        "kg",
        "kg",
        confidence_score="0.90",
    ),
    "Баранина, включая бескостную": _spec("lamb", "Lamb", "protein", "kg", "kg"),
    "Куры": _spec(
        "chicken_whole",
        "Chicken whole",
        "protein",
        "kg",
        "kg",
        confidence_score="0.90",
    ),
    "Мясо кур (бедро, голень, окорочка куриные)": _spec(
        "chicken_dark_meat",
        "Chicken dark meat",
        "protein",
        "kg",
        "kg",
        confidence_score="0.90",
    ),
    "Мясной фарш": _spec(
        "ground_meat",
        "Ground meat",
        "protein",
        "kg",
        "kg",
        confidence_score="0.85",
    ),
    "Молоко (пастеризованное, ультрапастеризованное, стерилизованное от 2,2% до 6% жирности)": _spec(
        "milk",
        "Milk",
        "dairy",
        "l",
        "l",
        is_common_allergen=True,
    ),
    "Сыр твердый, полутвердый": _spec(
        "hard_cheese",
        "Hard cheese",
        "dairy",
        "kg",
        "kg",
        is_common_allergen=True,
        confidence_score="0.90",
    ),
    "Творог 5-9% жирности": _spec(
        "cottage_cheese",
        "Cottage cheese",
        "dairy",
        "kg",
        "kg",
        is_common_allergen=True,
    ),
    "Сметана": _spec(
        "sour_cream",
        "Sour cream",
        "dairy",
        "kg",
        "kg",
        is_common_allergen=True,
    ),
    "Кефир 2-3% жирности": _spec(
        "kefir",
        "Kefir",
        "dairy",
        "l",
        "l",
        is_common_allergen=True,
    ),
    "Яйца, 1 категории": _spec(
        "eggs",
        "Eggs",
        "protein",
        "pc",
        "pc",
        is_common_allergen=True,
        divide_by=10,
    ),
    "Масло подсолнечное": _spec(
        "sunflower_oil",
        "Sunflower oil",
        "fat",
        "l",
        "l",
    ),
    "Масло сливочное": _spec(
        "butter",
        "Butter",
        "fat",
        "kg",
        "kg",
        is_common_allergen=True,
    ),
    "Яблоки": _spec("apple", "Apple", "fruit", "kg", "kg"),
    "Капуста белокочанная": _spec("cabbage", "Cabbage", "vegetable", "kg", "kg"),
    "Огурцы": _spec("cucumber", "Cucumber", "vegetable", "kg", "kg"),
    "Помидоры": _spec("tomato", "Tomato", "vegetable", "kg", "kg"),
    "Лук репчатый": _spec("onion", "Onion", "vegetable", "kg", "kg"),
    "Морковь": _spec("carrot", "Carrot", "vegetable", "kg", "kg"),
    "Картофель": _spec("potatoes", "Potatoes", "vegetable", "kg", "kg"),
    "Сахар-песок": _spec("sugar", "Sugar", "pantry", "kg", "kg"),
    "Соль, кроме экстра": _spec("salt", "Salt", "pantry", "kg", "kg"),
    "Чай черный": _spec(
        "black_tea",
        "Black tea",
        "beverage",
        "kg",
        "kg",
        confidence_score="0.90",
    ),
}

SKIPPED_PRODUCTS = {
    "Рыба свежая, охлажденная, мороженая (лещ, карась, судак, карп, сазан)",
}


def _parse_price(raw_value: str) -> Decimal:
    cleaned = raw_value.replace("\xa0", "").replace(" ", "").replace(",", ".").strip()
    if not cleaned:
        raise ValueError("Price cell is empty")
    return Decimal(cleaned)


class Command(BaseCommand):
    help = "Import official Kazakhstan food prices from prices-stat.csv."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--path",
            type=str,
            default="data/prices-stat.csv",
            help="Path to CSV with official prices.",
        )
        parser.add_argument(
            "--region-code",
            type=str,
            default=DEFAULT_REGION_CODE,
            help="Region code to store on imported prices.",
        )
        parser.add_argument(
            "--store-name",
            type=str,
            default=DEFAULT_STORE_NAME,
            help="Store/source name to store on imported prices.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        csv_path = Path(options["path"])
        if not csv_path.exists():
            raise CommandError(f"File not found: {csv_path}")

        created_ingredients = 0
        created_prices = 0
        updated_prices = 0
        ignored_rows: list[str] = []

        with csv_path.open("r", encoding="utf-8") as handle:
            reader = csv.reader(handle, delimiter=";")

            for row in reader:
                if not row:
                    continue

                product_name = (row[0] or "").strip()
                if not product_name:
                    continue

                if product_name in SKIPPED_PRODUCTS:
                    ignored_rows.append(product_name)
                    continue

                spec = PRODUCT_MAP.get(product_name)
                if spec is None:
                    continue

                if len(row) <= GENERAL_PRICE_INDEX:
                    raise CommandError(
                        f"Row for '{product_name}' does not contain the general price column."
                    )

                price_amount = _parse_price(row[GENERAL_PRICE_INDEX])
                if spec["divide_by"]:
                    price_amount = price_amount / Decimal(str(spec["divide_by"]))
                price_amount = price_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                ingredient, ingredient_created = Ingredient.objects.update_or_create(
                    normalized_name=spec["normalized_name"],
                    defaults={
                        "name": spec["name"],
                        "category": spec["category"],
                        "default_unit": spec["default_unit"],
                        "is_common_allergen": spec["is_common_allergen"],
                    },
                )
                if ingredient_created:
                    created_ingredients += 1

                _, price_created = IngredientPrice.objects.update_or_create(
                    ingredient=ingredient,
                    store_name=options["store_name"].strip(),
                    region_code=options["region_code"].strip(),
                    effective_from=DEFAULT_EFFECTIVE_FROM,
                    defaults={
                        "price_amount": price_amount,
                        "price_unit": spec["price_unit"],
                        "source_type": DEFAULT_SOURCE_TYPE,
                        "confidence_score": spec["confidence_score"],
                    },
                )
                if price_created:
                    created_prices += 1
                else:
                    updated_prices += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Import finished. "
                f"created_ingredients={created_ingredients}, "
                f"created_prices={created_prices}, "
                f"updated_prices={updated_prices}"
            )
        )

        if ignored_rows:
            self.stdout.write(
                self.style.WARNING(
                    "Skipped broad product groups: " + ", ".join(sorted(ignored_rows))
                )
            )
