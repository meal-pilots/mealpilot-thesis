from __future__ import annotations

import re
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

import yaml
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.catalog.models import Recipe, RecipeNutrition


ZERO = Decimal("0.00")
APPROX_CUP_G = Decimal("200")
APPROX_FLOUR_CUP_G = Decimal("160")
APPROX_CUP_ML = Decimal("240")
APPROX_TBSP_G = Decimal("15")
APPROX_TSP_G = Decimal("5")
APPROX_TBSP_ML = Decimal("15")
APPROX_TSP_ML = Decimal("5")
APPROX_PINCH_G = Decimal("0.30")
APPROX_TO_TASTE_G = Decimal("2.00")
EGG_WEIGHT_G = Decimal("50")
MAX_INGREDIENT_CALORIES = Decimal("800")  # cap per single ingredient
MAX_INGREDIENT_PROTEIN = Decimal("60")
MAX_INGREDIENT_FAT = Decimal("80")
MAX_INGREDIENT_CARB = Decimal("150")
PIECE_WEIGHTS_G = {
    "onion": Decimal("100"),
    "carrot": Decimal("100"),
    "potatoes": Decimal("150"),
    "apple": Decimal("180"),
    "banana": Decimal("120"),
    "cucumber": Decimal("180"),
    "tomato": Decimal("120"),
    "bell_pepper": Decimal("150"),
    "garlic": Decimal("5"),
    "radish": Decimal("350"),
    "pumpkin": Decimal("300"),
    "beet": Decimal("250"),
}


def _to_decimal(value: Any, default: Decimal = ZERO) -> Decimal:
    if value in (None, ""):
        return default
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _round_macro(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _normalize_name(value: str) -> str:
    return (value or "").casefold().replace("ё", "е").strip()


def _family_key(normalized_name: str) -> str | None:
    text = _normalize_name(normalized_name)
    if text in {"water", "broth", "salt", "sugar", "eggs", "beef", "lamb", "horsemeat", "chicken_whole", "chicken_breast", "chicken_dark_meat", "ground_meat", "milk", "kefir", "cottage_cheese", "sour_cream", "greek_yogurt", "hard_cheese", "sunflower_oil", "olive_oil", "butter", "rendered_fat", "offal", "rice", "pasta", "flour", "onion", "carrot", "potatoes", "cabbage", "tomato", "cucumber", "bell_pepper", "apple", "banana", "garlic", "fresh_herbs", "black_pepper", "bay_leaf", "mayonnaise", "tomato_paste", "green_peas", "radish", "pumpkin", "beet", "spice_mix", "hot_pepper", "cream", "yeast", "vinegar", "honey", "walnuts", "dried_fruit", "lemon", "cocoa", "starch", "wheat_bread", "buckwheat", "fresh_fish", "mushroom"}:
        return text

    if text in {"соль", "сольпищевая"}:
        return "salt"
    if text in {"сахар", "сахарпесок", "сахарный"}:
        return "sugar"
    if text in {"вода", "водапитьевая", "водакипяч"}:
        return "water"
    if text in {"бульон", "бульонкуриный", "бульонмясной", "бульоновощной"}:
        return "broth"
    if text in {"мед", "медцветочный", "медлиповый"}:
        return "honey"
    if text == "уксус" or text.startswith("уксус"):
        return "vinegar"
    if text.startswith("дрожж"):
        return "yeast"

    if "говядин" in text:
        return "beef"
    if "баран" in text:
        return "lamb"
    if "конин" in text or "казы" in text:
        return "horsemeat"
    if "куриц" in text:
        return "chicken_whole"
    if "фарш" in text:
        return "ground_meat"
    if any(token in text for token in ("печен", "сердц", "легк", "язык", "мозг", "субпродукт")):
        return "offal"
    if "молок" in text:
        return "milk"
    if any(token in text for token in ("кефир", "айран", "простокваш", "сыворотк")):
        return "kefir"
    if "йогурт" in text:
        return "greek_yogurt"
    if "творог" in text:
        return "cottage_cheese"
    if "сметан" in text:
        return "sour_cream"
    if "сыр" in text:
        return "hard_cheese"
    if any(token in text for token in ("подсолнеч", "растительн")):
        return "sunflower_oil"
    if "оливков" in text:
        return "olive_oil"
    if any(token in text for token in ("сливоч", "топлен")):
        return "butter"
    if any(token in text for token in ("сало", "жир", "курдюч")):
        return "rendered_fat"
    if any(token in text for token in ("рис", "басмати")):
        return "rice"
    if any(token in text for token in ("макарон", "лапш", "вермишел", "рожк")):
        return "pasta"
    if "мук" in text:
        return "flour"
    if "лук" in text:
        return "onion"
    if "морков" in text:
        return "carrot"
    if "картоф" in text:
        return "potatoes"
    if "капуст" in text:
        return "cabbage"
    if "помид" in text or "томат" in text:
        return "tomato"
    if "огур" in text:
        return "cucumber"
    if "перец_болгар" in text or "болгар" in text:
        return "bell_pepper"
    if "перец_черн" in text:
        return "black_pepper"
    if "перец_остр" in text or "перец_красн" in text:
        return "hot_pepper"
    if "зелень" in text or "укроп" in text or "петруш" in text or "базилик" in text:
        return "fresh_herbs"
    if "лавров" in text:
        return "bay_leaf"
    if "майонез" in text:
        return "mayonnaise"
    if "горош" in text:
        return "green_peas"
    if "редьк" in text:
        return "radish"
    if "тыкв" in text:
        return "pumpkin"
    if "свекл" in text:
        return "beet"
    if "яблок" in text:
        return "apple"
    if "банан" in text:
        return "banana"
    if "чеснок" in text:
        return "garlic"

    # Extra Russian → catalog mappings
    if "соль" in text:
        return "salt"
    if "сахар" in text:
        return "sugar"
    if "уксус" in text:
        return "vinegar"
    if "вода" in text:
        return "water"
    if "бульон" in text:
        return "broth"
    if "мед" in text:
        return "honey"
    if "дрожж" in text:
        return "yeast"
    if "крахмал" in text:
        return "starch"
    if "томатная_паст" in text or "томат-паст" in text or "томат_паст" in text:
        return "tomato_paste"
    if "сливки" in text:
        return "cream"
    if "хлеб" in text or "лаваш" in text or "лепешк" in text or "тесто" in text:
        return "wheat_bread"
    if "греч" in text:
        return "buckwheat"
    if "грибы" in text or "шампиньон" in text or "вешенк" in text or "опят" in text or "белые_гриб" in text:
        return "mushroom"
    if "рыб" in text or "лосос" in text or "минта" in text or "сёмг" in text or "семг" in text or "форель" in text or "треска" in text or "судак" in text:
        return "fresh_fish"
    if "лимон" in text:
        return "lemon"
    if "какао" in text or "шокол" in text:
        return "cocoa"
    if "грецк" in text or "миндал" in text or "фундук" in text or "арахис" in text or "орех" in text:
        return "walnuts"
    if "изюм" in text or "кураг" in text or "чернослив" in text or "финик" in text or "сухофрукт" in text:
        return "dried_fruit"
    if "филе" in text and "куриц" not in text:
        return "chicken_breast"
    if "грудк" in text:
        return "chicken_breast"
    if "пшено" in text or "пшен" in text:
        return "rice"
    if "томат" in text and "паст" in text:
        return "tomato_paste"
    if "ванилин" in text or "ванил" in text or "корица" in text or "имбир" in text or "куркум" in text or "гвоздик" in text or "мускат" in text or "паприка" in text or "куркума" in text or "приправа" in text or "специ" in text:
        return "spice_mix"
    return None


def _load_nutrition_catalog(path: Path) -> dict[str, dict[str, Any]]:
    payload = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    result = {}
    for row in payload.get("ingredients", []) or []:
        if not isinstance(row, dict):
            continue
        normalized_name = str(row.get("normalized_name", "")).strip()
        if normalized_name:
            result[normalized_name] = row
    return result


def _to_basis_quantity(
    *,
    normalized_name: str,
    quantity: Decimal,
    quantity_unit: str,
    basis_unit: str,
) -> Decimal | None:
    unit = (quantity_unit or "").lower()

    if basis_unit == "pc":
        if unit in {"pc", "pcs", "piece"}:
            return quantity
        if unit == "g":
            return quantity / EGG_WEIGHT_G
        if unit == "kg":
            return (quantity * Decimal("1000")) / EGG_WEIGHT_G
        return None

    if basis_unit == "ml":
        if unit == "ml":
            return quantity
        if unit == "l":
            return quantity * Decimal("1000")
        if unit == "g":
            return quantity
        if unit == "kg":
            return quantity * Decimal("1000")
        if unit == "cup":
            return quantity * APPROX_CUP_ML
        if unit == "tbsp":
            return quantity * APPROX_TBSP_ML
        if unit == "tsp":
            return quantity * APPROX_TSP_ML
        if unit == "to_taste":
            return quantity * APPROX_TSP_ML
        if unit == "unit":
            return quantity * APPROX_TBSP_ML
        return None

    if unit == "g":
        return quantity
    if unit == "kg":
        return quantity * Decimal("1000")
    if unit == "ml":
        return quantity
    if unit == "l":
        return quantity * Decimal("1000")
    if unit == "cup":
        if normalized_name == "flour":
            return quantity * APPROX_FLOUR_CUP_G
        if normalized_name in {"milk", "kefir", "olive_oil", "sunflower_oil", "mayonnaise"}:
            return quantity * APPROX_CUP_ML
        return quantity * APPROX_CUP_G
    if unit == "tbsp":
        if normalized_name in {"milk", "kefir", "olive_oil", "sunflower_oil", "mayonnaise"}:
            return quantity * APPROX_TBSP_ML
        return quantity * APPROX_TBSP_G
    if unit == "tsp":
        if normalized_name in {"milk", "kefir", "olive_oil", "sunflower_oil", "mayonnaise"}:
            return quantity * APPROX_TSP_ML
        return quantity * APPROX_TSP_G
    if unit == "pinch":
        return quantity * APPROX_PINCH_G
    if unit == "to_taste":
        return quantity * APPROX_TO_TASTE_G
    if unit in {"pc", "pcs", "piece"}:
        piece_weight = PIECE_WEIGHTS_G.get(normalized_name)
        if piece_weight is not None:
            return quantity * piece_weight
        if normalized_name == "eggs":
            return quantity * EGG_WEIGHT_G
    if unit == "unit":
        if normalized_name in {"salt", "sugar", "spice_mix", "black_pepper", "bay_leaf", "hot_pepper"}:
            return quantity * APPROX_TSP_G
        if normalized_name in {"milk", "kefir", "olive_oil", "sunflower_oil", "mayonnaise", "water", "broth", "vinegar", "cream"}:
            return quantity * APPROX_TBSP_ML
        if normalized_name in {"onion", "carrot", "potatoes", "apple", "banana", "cucumber", "tomato", "bell_pepper", "garlic", "radish", "pumpkin", "beet", "lemon"}:
            piece_weight = PIECE_WEIGHTS_G.get(normalized_name, Decimal("100"))
            return quantity * piece_weight
        # Fallback: assume 100g per "unit" — better than dropping the ingredient.
        return quantity * Decimal("100")

    if unit in {"pc", "pcs", "piece"}:
        # Already handled above for known piece weights. Fallback for unknown:
        return quantity * Decimal("100")

    return None


class Command(BaseCommand):
    help = "Backfill RecipeNutrition from normalized backend recipe ingredients and USDA nutrition catalog."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            type=str,
            default="data/nutrition_catalog.yaml",
            help="Path to YAML nutrition catalog generated from USDA.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        nutrition_path = Path(options["path"])
        if not nutrition_path.exists():
            raise CommandError(f"File not found: {nutrition_path}")

        nutrition_catalog = _load_nutrition_catalog(nutrition_path)
        updated = 0
        skipped = 0

        recipes = Recipe.objects.prefetch_related("ingredients_map__ingredient").all()
        for recipe in recipes:
            calories_total = ZERO
            protein_total = ZERO
            fat_total = ZERO
            carb_total = ZERO
            matched = 0

            for item in recipe.ingredients_map.all():
                family_key = _family_key(item.ingredient.normalized_name)
                if not family_key:
                    continue
                nutrition_row = nutrition_catalog.get(family_key)
                if not nutrition_row:
                    continue

                basis_unit = str(nutrition_row.get("basis_unit", "g")).strip() or "g"
                basis_qty = _to_decimal(nutrition_row.get("basis_qty", 100), default=Decimal("100"))
                normalized_quantity = _to_basis_quantity(
                    normalized_name=family_key,
                    quantity=_to_decimal(item.quantity),
                    quantity_unit=item.unit,
                    basis_unit=basis_unit,
                )
                if normalized_quantity is None:
                    continue

                factor = normalized_quantity / basis_qty

                cal_contrib = _to_decimal(nutrition_row.get("calories")) * factor
                prot_contrib = _to_decimal(nutrition_row.get("protein_g")) * factor
                fat_contrib = _to_decimal(nutrition_row.get("fat_g")) * factor
                carb_contrib = _to_decimal(nutrition_row.get("carb_g")) * factor

                # Per-ingredient sanity clamps. Without these a "12 l базилика"
                # parser bug would inflate a recipe's calories by 4000+ kcal.
                if cal_contrib > MAX_INGREDIENT_CALORIES:
                    cal_contrib = MAX_INGREDIENT_CALORIES
                if prot_contrib > MAX_INGREDIENT_PROTEIN:
                    prot_contrib = MAX_INGREDIENT_PROTEIN
                if fat_contrib > MAX_INGREDIENT_FAT:
                    fat_contrib = MAX_INGREDIENT_FAT
                if carb_contrib > MAX_INGREDIENT_CARB:
                    carb_contrib = MAX_INGREDIENT_CARB

                calories_total += cal_contrib
                protein_total += prot_contrib
                fat_total += fat_contrib
                carb_total += carb_contrib
                matched += 1

            if matched == 0:
                skipped += 1
                continue

            servings = Decimal(str(max(recipe.servings_default, 1)))
            RecipeNutrition.objects.update_or_create(
                recipe=recipe,
                defaults={
                    "calories_total": _round_macro(calories_total),
                    "protein_total_g": _round_macro(protein_total),
                    "fat_total_g": _round_macro(fat_total),
                    "carb_total_g": _round_macro(carb_total),
                    "calories_per_serving": _round_macro(calories_total / servings),
                    "protein_per_serving_g": _round_macro(protein_total / servings),
                    "fat_per_serving_g": _round_macro(fat_total / servings),
                    "carb_per_serving_g": _round_macro(carb_total / servings),
                    "micronutrients": {
                        "source_type": "usda_backend_ingredient_aggregation",
                        "matched_ingredient_count": matched,
                        "ingredient_count": recipe.ingredients_map.count(),
                        "matched_ingredient_ratio": round(matched / max(recipe.ingredients_map.count(), 1), 2),
                    },
                },
            )
            updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Recipe nutrition backfill finished. updated_recipes={updated}, skipped_recipes={skipped}"
            )
        )
