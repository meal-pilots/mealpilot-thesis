from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Count

from apps.catalog.models import Ingredient, IngredientPrice


TODAY = date.today()
TARGET_REGION_CODE = "KZ"
STORE_NAME = "heuristic_estimate"
SOURCE_TYPE = "heuristic_estimate"


def d(value: str | int | float) -> Decimal:
    return Decimal(str(value))


@dataclass(slots=True)
class PriceSpec:
    amount: Decimal
    unit: str


@dataclass(slots=True)
class Estimate:
    amount: Decimal
    unit: str
    confidence: Decimal
    reason: str


REFERENCE_KEYS = {
    "rice",
    "buckwheat",
    "flour",
    "wheat_bread",
    "pasta",
    "beef",
    "beef_bone_in",
    "horsemeat",
    "lamb",
    "chicken_whole",
    "chicken_dark_meat",
    "ground_meat",
    "milk",
    "hard_cheese",
    "cottage_cheese",
    "greek_yogurt",
    "sour_cream",
    "kefir",
    "eggs",
    "sunflower_oil",
    "olive_oil",
    "butter",
    "apple",
    "banana",
    "cabbage",
    "cucumber",
    "tomato",
    "onion",
    "carrot",
    "potatoes",
    "bell_pepper",
    "spinach",
    "dill",
    "parsley",
    "sugar",
    "salt",
    "black_tea",
}

FALLBACK_BASE_PRICES: dict[str, PriceSpec] = {
    "water": PriceSpec(d("25.00"), "l"),
    "broth": PriceSpec(d("120.00"), "l"),
    "cream": PriceSpec(d("1800.00"), "l"),
    "mayo": PriceSpec(d("1600.00"), "kg"),
    "vinegar": PriceSpec(d("450.00"), "l"),
    "spice": PriceSpec(d("6000.00"), "kg"),
    "fresh_herb": PriceSpec(d("2000.00"), "kg"),
    "dried_fruit": PriceSpec(d("2500.00"), "kg"),
    "walnuts": PriceSpec(d("5500.00"), "kg"),
    "pine_nuts": PriceSpec(d("12000.00"), "kg"),
    "starch": PriceSpec(d("700.00"), "kg"),
    "yeast": PriceSpec(d("2000.00"), "kg"),
    "baking_powder": PriceSpec(d("3000.00"), "kg"),
    "gelatin": PriceSpec(d("10000.00"), "kg"),
    "mustard": PriceSpec(d("1800.00"), "kg"),
    "ketchup": PriceSpec(d("900.00"), "kg"),
    "tomato_paste": PriceSpec(d("1500.00"), "kg"),
    "fresh_fish": PriceSpec(d("1755.00"), "kg"),
    "offal": PriceSpec(d("1800.00"), "kg"),
    "rendered_fat": PriceSpec(d("3000.00"), "kg"),
    "margarine": PriceSpec(d("3200.00"), "kg"),
    "eggplant": PriceSpec(d("700.00"), "kg"),
    "beet": PriceSpec(d("220.00"), "kg"),
    "radish": PriceSpec(d("250.00"), "kg"),
    "celery": PriceSpec(d("900.00"), "kg"),
    "pumpkin": PriceSpec(d("220.00"), "kg"),
    "peas": PriceSpec(d("800.00"), "kg"),
    "lemon": PriceSpec(d("1200.00"), "kg"),
    "vodka": PriceSpec(d("3500.00"), "l"),
    "wine": PriceSpec(d("3000.00"), "l"),
    "cognac": PriceSpec(d("7000.00"), "l"),
    "soy_sauce": PriceSpec(d("1400.00"), "l"),
    "tahini": PriceSpec(d("3500.00"), "kg"),
    "cocoa": PriceSpec(d("4500.00"), "kg"),
    "quail_eggs": PriceSpec(d("25.00"), "pc"),
}

GRAM_AMOUNT_PATTERNS = [
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_г"), "g", True),
    (re.compile(r"(\d+(?:_\d+)?)_г"), "g", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_мл"), "ml", True),
    (re.compile(r"(\d+(?:_\d+)?)_мл"), "ml", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_кг"), "kg", True),
    (re.compile(r"(\d+(?:_\d+)?)_кг"), "kg", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_л"), "l", True),
    (re.compile(r"(\d+(?:_\d+)?)_л"), "l", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_стакан"), "cup", True),
    (re.compile(r"(\d+(?:_\d+)?)_стакан"), "cup", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_ст_лож"), "tbsp", True),
    (re.compile(r"(\d+(?:_\d+)?)_ст_лож"), "tbsp", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_ч_лож"), "tsp", True),
    (re.compile(r"(\d+(?:_\d+)?)_ч_лож"), "tsp", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_пуч"), "bunch", True),
    (re.compile(r"(\d+(?:_\d+)?)_пуч"), "bunch", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_бан"), "jar", True),
    (re.compile(r"(\d+(?:_\d+)?)_бан"), "jar", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_голов"), "head", True),
    (re.compile(r"(\d+(?:_\d+)?)_голов"), "head", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_доль"), "clove", True),
    (re.compile(r"(\d+(?:_\d+)?)_доль"), "clove", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_кусоч"), "piece", True),
    (re.compile(r"(\d+(?:_\d+)?)_кусоч"), "piece", False),
    (re.compile(r"(\d+(?:_\d+)?)-(\d+(?:_\d+)?)_горош"), "peppercorn", True),
    (re.compile(r"(\d+(?:_\d+)?)_горош"), "peppercorn", False),
]

PIECE_WEIGHTS_KG: dict[str, Decimal] = {
    "onion": d("0.10"),
    "carrot": d("0.10"),
    "potatoes": d("0.15"),
    "apple": d("0.18"),
    "lemon": d("0.12"),
    "cucumber": d("0.18"),
    "tomato": d("0.12"),
    "bell_pepper": d("0.15"),
    "eggplant": d("0.30"),
    "cabbage": d("1.00"),
    "beet": d("0.25"),
    "radish": d("0.35"),
    "garlic": d("0.05"),
    "protein_piece": d("0.10"),
}


def _round_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _latest_price_for_normalized_name(normalized_name: str) -> PriceSpec | None:
    ingredient = Ingredient.objects.filter(normalized_name=normalized_name).first()
    if not ingredient:
        return None
    price = (
        ingredient.prices.filter(region_code=TARGET_REGION_CODE).order_by("-effective_from").first()
        or ingredient.prices.order_by("-effective_from").first()
    )
    if not price:
        return None
    return PriceSpec(Decimal(str(price.price_amount)), price.price_unit)


def _build_base_prices() -> dict[str, PriceSpec]:
    result = dict(FALLBACK_BASE_PRICES)
    for normalized_name in REFERENCE_KEYS:
        price = _latest_price_for_normalized_name(normalized_name)
        if price is not None:
            result[normalized_name] = price
    return result


def _normalize_text(ingredient: Ingredient) -> str:
    return f"{ingredient.normalized_name} {ingredient.name}".lower().replace("ё", "е")


def _contains_any(text: str, tokens: tuple[str, ...] | list[str]) -> bool:
    return any(token in text for token in tokens)


def _mean_token(left: str, right: str) -> Decimal:
    return (_parse_amount_token(left) + _parse_amount_token(right)) / d("2")


def _parse_amount_token(token: str) -> Decimal:
    return Decimal(token.replace("_", "."))


def _parse_embedded_amount(text: str) -> tuple[Decimal, str] | None:
    for pattern, unit, is_range in GRAM_AMOUNT_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        if is_range:
            amount = _mean_token(match.group(1), match.group(2))
        else:
            amount = _parse_amount_token(match.group(1))
        return amount, unit
    return None


def _family_key(text: str) -> str:
    if _contains_any(text, ("вода", "кипяток")):
        return "water"
    if "бульон" in text:
        return "broth"
    if _contains_any(text, ("перепел",)):
        return "quail_eggs"
    if _contains_any(text, ("яиц", "яйц", "яичн", "белок")):
        return "eggs"
    if "оливков" in text:
        return "olive_oil"
    if _contains_any(text, ("подсолнеч", "растительное", "хлопков")):
        return "sunflower_oil"
    if "маргарин" in text:
        return "margarine"
    if _contains_any(text, ("сливоч", "топлен", "топленое")):
        return "butter"
    if _contains_any(text, ("жир", "сало", "курдюч", "комбижир")):
        return "rendered_fat"
    if _contains_any(text, ("сметан", "cметан")):
        return "sour_cream"
    if "творог" in text:
        return "cottage_cheese"
    if "йогурт" in text:
        return "greek_yogurt"
    if _contains_any(text, ("кефир", "айран", "простокваш", "сыворотк")):
        return "kefir"
    if _contains_any(text, ("сливки",)):
        return "cream"
    if "молоко" in text:
        return "milk"
    if "сыр" in text:
        return "hard_cheese"
    if _contains_any(text, ("говядин", "телятин", "грудинка_говяж", "вырезка_говяж")):
        if "кость" in text:
            return "beef_bone_in"
        return "beef"
    if _contains_any(text, ("конин", "каз", "конск")):
        return "horsemeat"
    if _contains_any(text, ("баранин", "баран")):
        return "lamb"
    if _contains_any(text, ("куриц", "окороч", "бедро", "голень")):
        if _contains_any(text, ("бедро", "голень", "окороч")):
            return "chicken_dark_meat"
        return "chicken_whole"
    if "фарш" in text:
        return "ground_meat"
    if _contains_any(text, ("печен", "сердц", "легк", "язык", "мозг", "субпродукт")):
        return "offal"
    if _contains_any(text, ("рыб", "карп", "сазан", "минта")):
        return "fresh_fish"
    if _contains_any(text, ("рис", "басмати")):
        return "rice"
    if _contains_any(text, ("макарон", "рожк", "лапш", "вермишел")):
        return "pasta"
    if "мука" in text:
        return "flour"
    if _contains_any(text, ("хлеб", "булочк", "тесто")):
        return "wheat_bread"
    if "крахмал" in text:
        return "starch"
    if "дрожж" in text:
        return "yeast"
    if "разрыхл" in text:
        return "baking_powder"
    if _contains_any(text, ("желатин", "загуститель")):
        return "gelatin"
    if _contains_any(text, ("зира", "паприка", "кардамон", "тимьян", "тмин", "перец_черн", "перец_душист", "перец_красн_молот", "лавров", "специ", "приправа", "ванилин")):
        return "spice"
    if "какао" in text:
        return "cocoa"
    if _contains_any(text, ("майонез",)):
        return "mayo"
    if "горчиц" in text:
        return "mustard"
    if "уксус" in text:
        return "vinegar"
    if "кетчуп" in text:
        return "ketchup"
    if _contains_any(text, ("томатная_паста", "томатное_пюре", "томат-паста")):
        return "tomato_paste"
    if "тахини" in text:
        return "tahini"
    if "чай" in text:
        return "black_tea"
    if "сахар" in text:
        return "sugar"
    if "соль" in text:
        return "salt"
    if _contains_any(text, ("укроп", "петруш", "кинз", "базилик", "черемш", "салат", "зелень")):
        return "fresh_herb"
    if _contains_any(text, ("лук",)):
        return "onion"
    if _contains_any(text, ("морков",)):
        return "carrot"
    if _contains_any(text, ("картоф",)):
        return "potatoes"
    if _contains_any(text, ("капуст",)):
        return "cabbage"
    if _contains_any(text, ("огур",)):
        return "cucumber"
    if _contains_any(text, ("помид", "томат")):
        return "tomato"
    if _contains_any(text, ("перец_болгар", "перец_красный", "баклаж")):
        if "баклаж" in text:
            return "eggplant"
        return "bell_pepper"
    if "свекл" in text:
        return "beet"
    if "редьк" in text:
        return "radish"
    if "сельдер" in text:
        return "celery"
    if "тыкв" in text:
        return "pumpkin"
    if "горошек" in text:
        return "peas"
    if "лимон" in text:
        return "lemon"
    if "яблок" in text:
        return "apple"
    if "банан" in text:
        return "banana"
    if _contains_any(text, ("кураг", "изюм")):
        return "dried_fruit"
    if "кедров" in text:
        return "pine_nuts"
    if _contains_any(text, ("грецк", "миндал", "орех")):
        return "walnuts"
    if "водка" in text:
        return "vodka"
    if "коньяк" in text:
        return "cognac"
    if "вино" in text:
        return "wine"
    if "соев" in text:
        return "soy_sauce"
    return "generic"


def _apply_modifier(text: str, family_key: str, amount: Decimal) -> Decimal:
    result = amount
    if _contains_any(text, ("копчен", "вялен")):
        result *= d("1.20")
    if _contains_any(text, ("басмати",)):
        result *= d("1.15")
    if _contains_any(text, ("консерв", "маринован", "солен", "соленые", "квашен")):
        result *= d("1.10")
    if _contains_any(text, ("цветная", "краснокочан")) and family_key == "cabbage":
        result *= d("1.35")
    if family_key == "greek_yogurt":
        result *= d("1.00")
    return _round_money(result)


def _cup_mass(base_key: str, base_unit: str) -> Decimal:
    if base_unit == "l":
        return d("0.24")
    if base_key in {"flour"}:
        return d("0.16")
    if base_key in {"rice", "pasta", "buckwheat", "sugar", "salt", "starch", "spice", "dried_fruit", "walnuts", "pine_nuts", "cocoa"}:
        return d("0.20")
    if base_key in {"sour_cream", "cottage_cheese", "cream", "mayo", "tomato_paste", "ketchup"}:
        return d("0.23")
    return d("0.20")


def _spoon_mass(unit: str, base_unit: str) -> Decimal:
    if base_unit == "l":
        return d("0.015") if unit == "tbsp" else d("0.005")
    return d("0.015") if unit == "tbsp" else d("0.005")


def _piece_price(base_key: str, base: PriceSpec, text: str, amount: Decimal) -> Decimal:
    if base.unit == "pc":
        return amount * base.amount
    if base_key == "fresh_herb":
        return amount * d("80.00")
    if base_key == "spice":
        return amount * d("10.00")
    if base_key == "bay_leaf":
        return amount * d("5.00")
    if base_key == "quail_eggs":
        return amount * d("25.00")
    if base_key == "garlic":
        return amount * d("35.00")
    if "горош" in text:
        return amount * d("1.00")
    if "дольк" in text:
        return amount * d("6.00")
    weight = PIECE_WEIGHTS_KG.get(base_key)
    if weight is None:
        if base_key in {"beef", "beef_bone_in", "horsemeat", "lamb", "chicken_whole", "chicken_dark_meat", "ground_meat", "offal"}:
            weight = PIECE_WEIGHTS_KG["protein_piece"]
        else:
            weight = d("0.10")
    if base.unit == "kg":
        return amount * weight * base.amount
    if base.unit == "l":
        return amount * d("0.10") * base.amount
    return amount * base.amount


def _estimate_from_embedded_amount(
    ingredient: Ingredient,
    base_key: str,
    base: PriceSpec,
) -> Estimate | None:
    parsed = _parse_embedded_amount(ingredient.normalized_name.lower().replace("ё", "е"))
    if parsed is None:
        return None

    amount, source_unit = parsed
    result: Decimal | None = None

    if source_unit == "kg" and base.unit == "kg":
        result = amount * base.amount
    elif source_unit == "g" and base.unit == "kg":
        result = (amount / d("1000")) * base.amount
    elif source_unit == "l" and base.unit == "l":
        result = amount * base.amount
    elif source_unit == "ml" and base.unit == "l":
        result = (amount / d("1000")) * base.amount
    elif source_unit == "cup":
        mass = _cup_mass(base_key, base.unit)
        result = amount * mass * base.amount
    elif source_unit in {"tbsp", "tsp"}:
        mass = _spoon_mass(source_unit, base.unit)
        result = amount * mass * base.amount
    elif source_unit == "bunch":
        result = amount * d("80.00")
    elif source_unit == "jar":
        result = amount * d("180.00")
    elif source_unit in {"head", "clove", "piece", "peppercorn"}:
        result = _piece_price(base_key, base, ingredient.normalized_name, amount)

    if result is None:
        return None

    return Estimate(
        amount=_round_money(result),
        unit="unit",
        confidence=d("0.72"),
        reason=f"embedded_{source_unit}",
    )


def _estimate_direct_price(ingredient: Ingredient, base_key: str, base: PriceSpec) -> Estimate:
    unit = (ingredient.default_unit or "").lower()
    if unit in {"g", "kg"} and base.unit == "kg":
        return Estimate(
            amount=_round_money(base.amount),
            unit="kg",
            confidence=d("0.68"),
            reason="matched_kg_family",
        )
    if unit in {"ml", "l"} and base.unit == "l":
        return Estimate(
            amount=_round_money(base.amount),
            unit="l",
            confidence=d("0.68"),
            reason="matched_l_family",
        )
    if base.unit == "kg" and unit in {"ml", "l"}:
        return Estimate(
            amount=_round_money(base.amount),
            unit="kg",
            confidence=d("0.55"),
            reason="family_override_to_kg",
        )
    if base.unit == "l" and unit in {"g", "kg"}:
        return Estimate(
            amount=_round_money(base.amount),
            unit="l",
            confidence=d("0.55"),
            reason="family_override_to_l",
        )
    if unit == "pc":
        return Estimate(
            amount=_round_money(_piece_price(base_key, base, ingredient.normalized_name, d("1"))),
            unit="pc",
            confidence=d("0.60"),
            reason="matched_piece_family",
        )
    if unit == "cup":
        return Estimate(
            amount=_round_money(_cup_mass(base_key, base.unit) * base.amount),
            unit="cup",
            confidence=d("0.60"),
            reason="matched_cup_family",
        )
    if unit == "to_taste":
        nominal = d("12.00")
        if base_key in {"fresh_herb"}:
            nominal = d("20.00")
        elif base_key in {"salt"}:
            nominal = d("3.00")
        elif base_key in {"spice"}:
            nominal = d("8.00")
        elif base_key in {"sunflower_oil", "olive_oil", "butter"}:
            nominal = d("15.00")
        return Estimate(
            amount=nominal,
            unit="to_taste",
            confidence=d("0.50"),
            reason="matched_taste_family",
        )
    if unit == "unit":
        embedded = _estimate_from_embedded_amount(ingredient, base_key, base)
        if embedded is not None:
            return embedded
        nominal = d("50.00")
        if base_key in {"water"}:
            nominal = d("5.00")
        elif base_key in {"broth"}:
            nominal = d("20.00")
        elif base_key in {"fresh_herb"}:
            nominal = d("80.00")
        elif base_key in {"spice", "salt", "sugar"}:
            nominal = d("10.00")
        elif base_key in {"milk", "kefir", "cream", "sour_cream", "cottage_cheese", "greek_yogurt"}:
            nominal = d("80.00")
        elif base_key in {"sunflower_oil", "olive_oil", "butter", "rendered_fat"}:
            nominal = d("40.00")
        elif base_key in {"beef", "beef_bone_in", "horsemeat", "lamb", "chicken_whole", "chicken_dark_meat", "ground_meat", "offal"}:
            nominal = d("250.00")
        elif base_key in {"onion", "carrot", "potatoes", "cabbage", "tomato", "cucumber", "bell_pepper", "eggplant", "beet", "radish", "celery", "pumpkin"}:
            nominal = d("60.00")
        elif base_key in {"apple", "banana", "lemon"}:
            nominal = d("90.00")
        elif base_key in {"wheat_bread", "pasta", "rice", "flour"}:
            nominal = d("40.00")
        elif base_key in {"vodka", "wine", "cognac", "vinegar", "mayo", "mustard", "soy_sauce", "ketchup", "tomato_paste", "tahini"}:
            nominal = d("35.00")
        elif base_key in {"eggs", "quail_eggs"}:
            nominal = base.amount
        if base.unit == "kg":
            return Estimate(
                amount=_round_money(base.amount),
                unit="kg",
                confidence=d("0.52"),
                reason="family_override_unit_to_kg",
            )
        if base.unit == "l":
            return Estimate(
                amount=_round_money(base.amount),
                unit="l",
                confidence=d("0.52"),
                reason="family_override_unit_to_l",
            )
        if base.unit == "pc":
            return Estimate(
                amount=_round_money(base.amount),
                unit="pc",
                confidence=d("0.52"),
                reason="family_override_unit_to_pc",
            )
        return Estimate(
            amount=nominal,
            unit="unit",
            confidence=d("0.42"),
            reason="matched_unit_family",
        )
    return Estimate(
        amount=d("50.00"),
        unit=unit or "unit",
        confidence=d("0.35"),
        reason="generic_unit_fallback",
    )


def _generic_fallback(ingredient: Ingredient) -> Estimate:
    unit = (ingredient.default_unit or "unit").lower()
    category = (ingredient.category or "other").lower()
    if unit in {"g", "kg"}:
        amount = d("600.00")
        if category == "protein":
            amount = d("2500.00")
        elif category == "vegetable":
            amount = d("300.00")
        elif category == "fruit":
            amount = d("900.00")
        elif category == "grain":
            amount = d("500.00")
        elif category == "dairy":
            amount = d("1800.00")
        elif category == "fat":
            amount = d("3200.00")
        return Estimate(amount=amount, unit="kg", confidence=d("0.30"), reason="category_kg_fallback")
    if unit in {"ml", "l"}:
        amount = d("700.00")
        if category == "dairy":
            amount = d("650.00")
        elif category == "fat":
            amount = d("900.00")
        return Estimate(amount=amount, unit="l", confidence=d("0.30"), reason="category_l_fallback")
    if unit == "pc":
        return Estimate(amount=d("35.00"), unit="pc", confidence=d("0.30"), reason="category_pc_fallback")
    if unit == "cup":
        return Estimate(amount=d("90.00"), unit="cup", confidence=d("0.30"), reason="category_cup_fallback")
    if unit == "to_taste":
        return Estimate(amount=d("8.00"), unit="to_taste", confidence=d("0.25"), reason="taste_fallback")
    return Estimate(amount=d("40.00"), unit="unit", confidence=d("0.25"), reason="unit_fallback")


def _estimate_price(ingredient: Ingredient, base_prices: dict[str, PriceSpec]) -> Estimate:
    text = _normalize_text(ingredient)
    family = _family_key(text)
    base = base_prices.get(family)
    if base is not None:
        estimate = _estimate_direct_price(ingredient, family, base)
        estimate.amount = _apply_modifier(text, family, estimate.amount)
        return estimate
    return _generic_fallback(ingredient)


class Command(BaseCommand):
    help = "Backfill missing ingredient prices with heuristic estimates."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show planned backfill without writing to the database.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Only process the first N missing ingredients.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        base_prices = _build_base_prices()
        missing_qs = (
            Ingredient.objects.annotate(price_count=Count("prices"))
            .filter(price_count=0)
            .order_by("category", "normalized_name")
        )
        if options["limit"]:
            missing_qs = missing_qs[: options["limit"]]

        created = 0
        preview_rows: list[str] = []

        for ingredient in missing_qs:
            estimate = _estimate_price(ingredient, base_prices)
            preview_rows.append(
                f"{ingredient.normalized_name}\t{estimate.amount}\t{estimate.unit}\t{estimate.confidence}\t{estimate.reason}"
            )
            if options["dry_run"]:
                continue

            IngredientPrice.objects.create(
                ingredient=ingredient,
                store_name=STORE_NAME,
                region_code=TARGET_REGION_CODE,
                price_amount=estimate.amount,
                price_unit=estimate.unit,
                effective_from=TODAY,
                source_type=SOURCE_TYPE,
                confidence_score=estimate.confidence,
            )
            created += 1

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING(f"Dry run. would_create={len(preview_rows)}"))
            for row in preview_rows[:80]:
                self.stdout.write(row)
            return

        self.stdout.write(self.style.SUCCESS(f"Backfill finished. created_prices={created}"))
