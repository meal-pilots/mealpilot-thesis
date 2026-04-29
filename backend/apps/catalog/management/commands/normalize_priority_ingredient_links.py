from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.catalog.models import Ingredient, IngredientPrice, RecipeIngredient


def d(value: str | int | float) -> Decimal:
    return Decimal(str(value))


def _round_quantity(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


TODAY = date.today()
TARGET_REGION_CODE = "KZ"
TARGET_STORE_NAME = "heuristic_estimate"
TARGET_SOURCE_TYPE = "heuristic_estimate"


@dataclass(frozen=True, slots=True)
class Rule:
    source_names: tuple[str, ...]
    target_normalized_name: str
    expected_unit: str
    target_unit: str | None = None
    quantity_multiplier: Decimal | None = None
    note: str = "direct"


@dataclass(frozen=True, slots=True)
class TargetSpec:
    name: str
    category: str
    default_unit: str
    is_common_allergen: bool
    price_amount: Decimal
    price_unit: str
    confidence_score: Decimal = d("0.70")


TARGET_SPECS = {
    "bell_pepper": TargetSpec(
        name="Bell pepper",
        category="vegetable",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("1100.00"),
        price_unit="kg",
        confidence_score=d("0.75"),
    ),
    "greek_yogurt": TargetSpec(
        name="Greek yogurt",
        category="dairy",
        default_unit="kg",
        is_common_allergen=True,
        price_amount=d("2800.00"),
        price_unit="kg",
        confidence_score=d("0.75"),
    ),
    "olive_oil": TargetSpec(
        name="Olive oil",
        category="fat",
        default_unit="l",
        is_common_allergen=False,
        price_amount=d("3500.00"),
        price_unit="l",
        confidence_score=d("0.75"),
    ),
    "garlic": TargetSpec(
        name="Garlic",
        category="vegetable",
        default_unit="pc",
        is_common_allergen=False,
        price_amount=d("35.00"),
        price_unit="pc",
        confidence_score=d("0.80"),
    ),
    "fresh_herbs": TargetSpec(
        name="Fresh herbs",
        category="herb",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("2000.00"),
        price_unit="kg",
        confidence_score=d("0.70"),
    ),
    "black_pepper": TargetSpec(
        name="Black pepper",
        category="seasoning",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("6000.00"),
        price_unit="kg",
        confidence_score=d("0.70"),
    ),
    "bay_leaf": TargetSpec(
        name="Bay leaf",
        category="seasoning",
        default_unit="pc",
        is_common_allergen=False,
        price_amount=d("5.00"),
        price_unit="pc",
        confidence_score=d("0.70"),
    ),
    "mayonnaise": TargetSpec(
        name="Mayonnaise",
        category="pantry",
        default_unit="kg",
        is_common_allergen=True,
        price_amount=d("1600.00"),
        price_unit="kg",
        confidence_score=d("0.70"),
    ),
    "rendered_fat": TargetSpec(
        name="Rendered fat",
        category="fat",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("3000.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
    "offal": TargetSpec(
        name="Offal",
        category="protein",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("1800.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
    "water": TargetSpec(
        name="Water",
        category="pantry",
        default_unit="l",
        is_common_allergen=False,
        price_amount=d("25.00"),
        price_unit="l",
        confidence_score=d("0.60"),
    ),
    "broth": TargetSpec(
        name="Broth",
        category="pantry",
        default_unit="l",
        is_common_allergen=False,
        price_amount=d("120.00"),
        price_unit="l",
        confidence_score=d("0.60"),
    ),
    "spice_mix": TargetSpec(
        name="Spice mix",
        category="seasoning",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("6000.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
    "hot_pepper": TargetSpec(
        name="Hot pepper",
        category="vegetable",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("1500.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
    "pickled_cucumber": TargetSpec(
        name="Pickled cucumber",
        category="vegetable",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("900.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
    "pickled_tomato": TargetSpec(
        name="Pickled tomato",
        category="vegetable",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("1000.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
    "sauerkraut": TargetSpec(
        name="Sauerkraut",
        category="vegetable",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("300.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
    "tomato_paste": TargetSpec(
        name="Tomato paste",
        category="pantry",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("1500.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
    "radish": TargetSpec(
        name="Radish",
        category="vegetable",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("250.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
    "pumpkin": TargetSpec(
        name="Pumpkin",
        category="vegetable",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("220.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
    "beet": TargetSpec(
        name="Beet",
        category="vegetable",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("220.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
    "green_peas": TargetSpec(
        name="Green peas",
        category="vegetable",
        default_unit="kg",
        is_common_allergen=False,
        price_amount=d("800.00"),
        price_unit="kg",
        confidence_score=d("0.65"),
    ),
}


RULES = [
    Rule(("лук_репчатый",), "onion", expected_unit="g", note="onion_g_direct"),
    Rule(("лук",), "onion", expected_unit="pc", target_unit="g", quantity_multiplier=d("100"), note="onion_pc_to_g"),
    Rule(("лук_репчатый",), "onion", expected_unit="pc", target_unit="g", quantity_multiplier=d("100"), note="onion_named_pc_to_g"),
    Rule(("лук_репчатый",), "onion", expected_unit="unit", target_unit="g", quantity_multiplier=d("100"), note="onion_named_unit_to_g"),
    Rule(("морковь",), "carrot", expected_unit="pc", target_unit="g", quantity_multiplier=d("100"), note="carrot_pc_to_g"),
    Rule(("яйца", "яйцо", "яйца_куриные", "яйцо_куриное"), "eggs", expected_unit="pc", note="eggs_pc_direct"),
    Rule(("баранина", "баранина_без_костей", "баранина_мякоть", "баранина_с_костями", "баранина_жирная"), "lamb", expected_unit="g", note="lamb_g_direct"),
    Rule(("говядина", "говядина_отварная", "говядина_жирная", "мякоть_говяжья"), "beef", expected_unit="g", note="beef_g_direct"),
    Rule(("курица", "курица_отварная"), "chicken_whole", expected_unit="g", note="chicken_g_direct"),
    Rule(("конина",), "horsemeat", expected_unit="g", note="horsemeat_g_direct"),
    Rule(("масло_сливочное", "масло_сливочное_размягчённое"), "butter", expected_unit="g", note="butter_g_direct"),
    Rule(("сметана", "cметана"), "sour_cream", expected_unit="g", note="sour_cream_g_direct"),
    Rule(("творог",), "cottage_cheese", expected_unit="g", note="cottage_cheese_g_direct"),
    Rule(("йогурт_греческий",), "greek_yogurt", expected_unit="g", note="greek_yogurt_g_direct"),
    Rule(("рис", "рис_басмати"), "rice", expected_unit="g", note="rice_g_direct"),
    Rule(("макароны",), "pasta", expected_unit="g", note="pasta_g_direct"),
    Rule(("мука", "мука_пшеничная"), "flour", expected_unit="cup", target_unit="g", quantity_multiplier=d("160"), note="flour_cup_to_g"),
    Rule(("мука", "мука_пшеничная"), "flour", expected_unit="g", note="flour_g_direct"),
    Rule(("мука",), "flour", expected_unit="kg", note="flour_kg_direct"),
    Rule(("молоко",), "milk", expected_unit="cup", target_unit="ml", quantity_multiplier=d("240"), note="milk_cup_to_ml"),
    Rule(("молоко",), "milk", expected_unit="g", target_unit="ml", quantity_multiplier=d("1"), note="milk_g_to_ml"),
    Rule(("молоко",), "milk", expected_unit="ml", note="milk_ml_direct"),
    Rule(("молоко",), "milk", expected_unit="l", note="milk_l_direct"),
    Rule(("кефир", "простокваша"), "kefir", expected_unit="cup", target_unit="ml", quantity_multiplier=d("240"), note="kefir_cup_to_ml"),
    Rule(("масло_подсолнечное",), "sunflower_oil", expected_unit="ml", note="sunflower_oil_ml_direct"),
    Rule(("масло_оливковое",), "olive_oil", expected_unit="ml", note="olive_oil_ml_direct"),
    Rule(("масло_растительное",), "sunflower_oil", expected_unit="g", target_unit="ml", quantity_multiplier=d("1.09"), note="sunflower_oil_g_to_ml"),
    Rule(("масло_растительное",), "sunflower_oil", expected_unit="ml", note="sunflower_oil_ml_direct"),
    Rule(("масло_растительное",), "sunflower_oil", expected_unit="l", note="sunflower_oil_l_direct"),
    Rule(("масло_растительное",), "sunflower_oil", expected_unit="cup", target_unit="ml", quantity_multiplier=d("240"), note="sunflower_oil_cup_to_ml"),
    Rule(("масло_растительное",), "sunflower_oil", expected_unit="unit", target_unit="ml", quantity_multiplier=d("15"), note="sunflower_oil_unit_to_ml"),
    Rule(("масло_растительное",), "sunflower_oil", expected_unit="to_taste", target_unit="ml", quantity_multiplier=d("15"), note="sunflower_oil_taste_to_ml"),
    Rule(("помидоры", "помидоры_свежие", "помидоры_свежий", "помидоры_зрелый_свежий"), "tomato", expected_unit="g", note="tomato_g_direct"),
    Rule(("картофель", "картофель_отварной"), "potatoes", expected_unit="g", note="potatoes_g_direct"),
    Rule(("яблоко", "яблоко_свежее"), "apple", expected_unit="g", note="apple_g_direct"),
    Rule(("перец",), "bell_pepper", expected_unit="g", note="bell_pepper_g_direct"),
    Rule(("перец_болгарский", "перец_болгарский_зелёный"), "bell_pepper", expected_unit="pc", target_unit="g", quantity_multiplier=d("150"), note="bell_pepper_pc_to_g"),
    Rule(("перец_болгарский_красный",), "bell_pepper", expected_unit="g", note="bell_pepper_g_direct"),
    Rule(("капуста_белокочанная",), "cabbage", expected_unit="g", note="cabbage_g_direct"),
    Rule(("соль",), "salt", expected_unit="g", note="salt_g_direct"),
    Rule(("соль",), "salt", expected_unit="pinch", target_unit="g", quantity_multiplier=d("0.30"), note="salt_pinch_to_g"),
    Rule(("соль",), "salt", expected_unit="tsp", target_unit="g", quantity_multiplier=d("5"), note="salt_tsp_to_g"),
    Rule(("соль",), "salt", expected_unit="to_taste", target_unit="g", quantity_multiplier=d("2"), note="salt_taste_to_g"),
    Rule(("соль",), "salt", expected_unit="unit", target_unit="g", quantity_multiplier=d("5"), note="salt_unit_to_g"),
    Rule(("соль",), "salt", expected_unit="l", target_unit="g", quantity_multiplier=d("5"), note="salt_l_assumed_spoon_to_g"),
    Rule(("сахар",), "sugar", expected_unit="g", note="sugar_g_direct"),
    Rule(("сахар",), "sugar", expected_unit="cup", target_unit="g", quantity_multiplier=d("200"), note="sugar_cup_to_g"),
    Rule(("сахар",), "sugar", expected_unit="tsp", target_unit="g", quantity_multiplier=d("5"), note="sugar_tsp_to_g"),
    Rule(("сахар",), "sugar", expected_unit="l", target_unit="g", quantity_multiplier=d("12"), note="sugar_l_assumed_tbsp_to_g"),
    Rule(("чеснок",), "garlic", expected_unit="pc", note="garlic_pc_direct"),
    Rule(("чеснок",), "garlic", expected_unit="g", target_unit="pc", quantity_multiplier=d("0.20"), note="garlic_g_to_pc"),
    Rule(("чеснок",), "garlic", expected_unit="unit", target_unit="pc", quantity_multiplier=d("1"), note="garlic_unit_to_pc"),
    Rule(("чеснок",), "garlic", expected_unit="to_taste", target_unit="pc", quantity_multiplier=d("1"), note="garlic_taste_to_pc"),
    Rule(("чеснок",), "garlic", expected_unit="l", target_unit="pc", quantity_multiplier=d("3"), note="garlic_l_assumed_tbsp_to_pc"),
    Rule(("зелень",), "fresh_herbs", expected_unit="to_taste", target_unit="g", quantity_multiplier=d("5"), note="fresh_herbs_taste_to_g"),
    Rule(("зелень",), "fresh_herbs", expected_unit="g", note="fresh_herbs_g_direct"),
    Rule(("зелень_петрушки", "зелень_укропа"), "fresh_herbs", expected_unit="unit", target_unit="g", quantity_multiplier=d("20"), note="fresh_herbs_unit_to_g"),
    Rule(("перец_черный_молотый",), "black_pepper", expected_unit="to_taste", target_unit="g", quantity_multiplier=d("1"), note="black_pepper_taste_to_g"),
    Rule(("перец_черный_молотый",), "black_pepper", expected_unit="g", note="black_pepper_g_direct"),
    Rule(("перец_черный_молотый",), "black_pepper", expected_unit="l", target_unit="g", quantity_multiplier=d("2"), note="black_pepper_l_assumed_spoon_to_g"),
    Rule(("перец_чёрный",), "black_pepper", expected_unit="unit", target_unit="g", quantity_multiplier=d("1"), note="black_pepper_unit_to_g"),
    Rule(("перец_черный_горошком", "перец_чёрный_горошком"), "black_pepper", expected_unit="pc", target_unit="g", quantity_multiplier=d("0.20"), note="black_peppercorn_pc_to_g"),
    Rule(("лавровый_лист",), "bay_leaf", expected_unit="pc", note="bay_leaf_pc_direct"),
    Rule(("майонез",), "mayonnaise", expected_unit="l", target_unit="g", quantity_multiplier=d("15"), note="mayonnaise_l_assumed_tbsp_to_g"),
    Rule(("сало_курдючное", "сало_баранье"), "rendered_fat", expected_unit="g", note="rendered_fat_g_direct"),
    Rule(("жир", "масло", "масло_топленое", "сало_топленое"), "rendered_fat", expected_unit="unit", target_unit="g", quantity_multiplier=d("15"), note="rendered_fat_unit_to_g"),
    Rule(("масло_сливочное_1_ст_ложка",), "butter", expected_unit="unit", target_unit="g", quantity_multiplier=d("15"), note="butter_unit_tbsp_to_g"),
    Rule(("масло_сливочное_3_ст_ложки",), "butter", expected_unit="unit", target_unit="g", quantity_multiplier=d("45"), note="butter_unit_3tbsp_to_g"),
    Rule(("масло_топлёное_1_ст_ложка",), "rendered_fat", expected_unit="unit", target_unit="g", quantity_multiplier=d("15"), note="rendered_fat_1tbsp_to_g"),
    Rule(("масло_топлёное_2_ст_ложки",), "rendered_fat", expected_unit="unit", target_unit="g", quantity_multiplier=d("30"), note="rendered_fat_2tbsp_to_g"),
    Rule(("масло_растительное_1_ст_ложка",), "sunflower_oil", expected_unit="unit", target_unit="ml", quantity_multiplier=d("15"), note="sunflower_oil_1tbsp_to_ml"),
    Rule(("масло_растительное_1_ч_ложка",), "sunflower_oil", expected_unit="unit", target_unit="ml", quantity_multiplier=d("5"), note="sunflower_oil_1tsp_to_ml"),
    Rule(("масло_растительное_сколько_уйдет",), "sunflower_oil", expected_unit="unit", target_unit="ml", quantity_multiplier=d("15"), note="sunflower_oil_needed_to_ml"),
    Rule(("печень", "сердце", "легкое"), "offal", expected_unit="g", note="offal_g_direct"),
    Rule(("печень_говяжья", "язык_говяжий", "язык", "мозги"), "offal", expected_unit="unit", target_unit="g", quantity_multiplier=d("250"), note="offal_unit_to_g"),
    Rule(("вода",), "water", expected_unit="ml", note="water_ml_direct"),
    Rule(("вода_по_вкусу", "вода_для_замеса_теста"), "water", expected_unit="unit", target_unit="ml", quantity_multiplier=d("100"), note="water_unit_to_ml"),
    Rule(("вода_0_5_стакана",), "water", expected_unit="unit", target_unit="ml", quantity_multiplier=d("120"), note="water_half_cup_to_ml"),
    Rule(("вода_1_стакан",), "water", expected_unit="unit", target_unit="ml", quantity_multiplier=d("240"), note="water_1cup_to_ml"),
    Rule(("вода_2_стакана",), "water", expected_unit="unit", target_unit="ml", quantity_multiplier=d("480"), note="water_2cup_to_ml"),
    Rule(("вода_3_ст_ложки",), "water", expected_unit="unit", target_unit="ml", quantity_multiplier=d("45"), note="water_3tbsp_to_ml"),
    Rule(("вода_1_л",), "water", expected_unit="unit", target_unit="ml", quantity_multiplier=d("1000"), note="water_1l_to_ml"),
    Rule(("вода_1_5_л",), "water", expected_unit="unit", target_unit="ml", quantity_multiplier=d("1500"), note="water_1_5l_to_ml"),
    Rule(("вода_горячая",), "water", expected_unit="cup", target_unit="ml", quantity_multiplier=d("240"), note="water_hot_cup_to_ml"),
    Rule(("бульон", "бульон_мясной", "бульон_костный"), "broth", expected_unit="unit", target_unit="ml", quantity_multiplier=d("250"), note="broth_unit_to_ml"),
    Rule(("специи",), "spice_mix", expected_unit="unit", target_unit="g", quantity_multiplier=d("2"), note="spice_mix_unit_to_g"),
    Rule(("перец_красный_молотый",), "spice_mix", expected_unit="g", note="spice_mix_g_direct"),
    Rule(("перец_острый_красный",), "hot_pepper", expected_unit="g", note="hot_pepper_g_direct"),
    Rule(("огурцы_соленые", "огурцы_маринованные"), "pickled_cucumber", expected_unit="unit", target_unit="g", quantity_multiplier=d("100"), note="pickled_cucumber_unit_to_g"),
    Rule(("помидоры_соленые",), "pickled_tomato", expected_unit="g", note="pickled_tomato_g_direct"),
    Rule(("капуста_квашеная",), "sauerkraut", expected_unit="unit", target_unit="g", quantity_multiplier=d("100"), note="sauerkraut_unit_to_g"),
    Rule(("томатное_пюре",), "tomato_paste", expected_unit="g", note="tomato_paste_g_direct"),
    Rule(("томатное_пюре_1_ст_ложка",), "tomato_paste", expected_unit="unit", target_unit="g", quantity_multiplier=d("15"), note="tomato_paste_1tbsp_to_g"),
    Rule(("или_томатное_пюре_2_ст_ложки",), "tomato_paste", expected_unit="unit", target_unit="g", quantity_multiplier=d("30"), note="tomato_paste_2tbsp_to_g"),
    Rule(("редька",), "radish", expected_unit="pc", target_unit="g", quantity_multiplier=d("350"), note="radish_pc_to_g"),
    Rule(("тыква",), "pumpkin", expected_unit="unit", target_unit="g", quantity_multiplier=d("300"), note="pumpkin_unit_to_g"),
    Rule(("свекла",), "beet", expected_unit="pc", target_unit="g", quantity_multiplier=d("250"), note="beet_pc_to_g"),
    Rule(("горошек_зеленый",), "green_peas", expected_unit="unit", target_unit="g", quantity_multiplier=d("100"), note="green_peas_unit_to_g"),
    Rule(("горошек_зелёный_1_ст_ложка",), "green_peas", expected_unit="unit", target_unit="g", quantity_multiplier=d("15"), note="green_peas_tbsp_to_g"),
]


def _ensure_target(normalized_name: str, apply_changes: bool) -> tuple[Ingredient | None, bool, bool]:
    ingredient = Ingredient.objects.filter(normalized_name=normalized_name).first()
    spec = TARGET_SPECS.get(normalized_name)
    created_ingredient = False
    created_price = False

    if ingredient is None and spec is None:
        return None, False, False

    if ingredient is None and apply_changes and spec is not None:
        ingredient = Ingredient.objects.create(
            normalized_name=normalized_name,
            name=spec.name,
            category=spec.category,
            default_unit=spec.default_unit,
            is_common_allergen=spec.is_common_allergen,
        )
        created_ingredient = True

    if ingredient is not None and apply_changes and spec is not None:
        _, created_price = IngredientPrice.objects.get_or_create(
            ingredient=ingredient,
            store_name=TARGET_STORE_NAME,
            region_code=TARGET_REGION_CODE,
            effective_from=TODAY,
            defaults={
                "price_amount": spec.price_amount,
                "price_unit": spec.price_unit,
                "source_type": TARGET_SOURCE_TYPE,
                "confidence_score": spec.confidence_score,
            },
        )

    return ingredient, created_ingredient, created_price


class Command(BaseCommand):
    help = "Normalize high-impact noisy recipe ingredient links into canonical ingredients."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply changes. Without this flag, runs in dry-run mode.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=120,
            help="How many sample operations to print.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        apply_changes = options["apply"]
        limit = options["limit"]

        target_cache: dict[str, Ingredient] = {}
        target_creation_rows: list[str] = []
        created_targets = 0
        created_target_prices = 0

        for target_name in {rule.target_normalized_name for rule in RULES}:
            target, created_target, created_price = _ensure_target(target_name, apply_changes=apply_changes)
            if created_target:
                created_targets += 1
                target_creation_rows.append(f"create ingredient {target_name}")
            elif target is None and target_name in TARGET_SPECS:
                target_creation_rows.append(f"would create ingredient {target_name}")
            if created_price:
                created_target_prices += 1
                target_creation_rows.append(f"create price for {target_name}")
            elif target_name in TARGET_SPECS and target is None and not apply_changes:
                target_creation_rows.append(f"would create price for {target_name}")
            if target is not None:
                target_cache[target_name] = target

        missing_targets = [key for key in {rule.target_normalized_name for rule in RULES} if key not in target_cache and key not in TARGET_SPECS]
        if missing_targets:
            raise CommandError(
                "Missing canonical ingredients for normalization: " + ", ".join(sorted(missing_targets))
            )

        plan_rows: list[dict] = []
        retargeted = 0
        merged = 0

        for rule in RULES:
            target = target_cache.get(rule.target_normalized_name)
            links = (
                RecipeIngredient.objects.select_related("recipe", "ingredient")
                .filter(ingredient__normalized_name__in=rule.source_names, unit=rule.expected_unit)
                .order_by("recipe_id", "ingredient__normalized_name", "id")
            )
            for link in links:
                new_quantity = Decimal(str(link.quantity))
                new_unit = link.unit
                if rule.target_unit and rule.quantity_multiplier:
                    new_quantity = _round_quantity(new_quantity * rule.quantity_multiplier)
                    new_unit = rule.target_unit

                plan_rows.append(
                    {
                        "recipe_id": str(link.recipe_id),
                        "recipe_title": link.recipe.title,
                        "from_ingredient": link.ingredient.normalized_name,
                        "to_ingredient": rule.target_normalized_name,
                        "quantity_before": str(link.quantity),
                        "unit_before": link.unit,
                        "quantity_after": str(new_quantity),
                        "unit_after": new_unit,
                        "rule": rule.note,
                    }
                )

                if not apply_changes:
                    continue

                if target is None:
                    raise CommandError(f"Target ingredient was not resolved: {rule.target_normalized_name}")

                existing = (
                    RecipeIngredient.objects.filter(
                        recipe=link.recipe,
                        ingredient=target,
                        unit=new_unit,
                        is_optional=link.is_optional,
                    )
                    .exclude(id=link.id)
                    .first()
                )

                if existing:
                    existing.quantity = _round_quantity(Decimal(str(existing.quantity)) + new_quantity)
                    if not existing.preparation_note and link.preparation_note:
                        existing.preparation_note = link.preparation_note
                    existing.save(update_fields=["quantity", "preparation_note", "updated_at"])
                    link.delete()
                    merged += 1
                else:
                    link.ingredient = target
                    link.quantity = new_quantity
                    link.unit = new_unit
                    link.save(update_fields=["ingredient", "quantity", "unit", "updated_at"])
                    retargeted += 1

        self.stdout.write(self.style.SUCCESS("\n=== PRIORITY NORMALIZATION PLAN ==="))
        self.stdout.write(f"Rules: {len(RULES)}")
        self.stdout.write(f"Candidate link updates: {len(plan_rows)}")
        self.stdout.write(f"Mode: {'APPLY' if apply_changes else 'DRY-RUN'}")
        if target_creation_rows:
            self.stdout.write(f"Target ingredient/bootstrap actions: {len(target_creation_rows)}")

        for row in plan_rows[:limit]:
            self.stdout.write(
                f"{row['from_ingredient']} -> {row['to_ingredient']} | "
                f"{row['quantity_before']} {row['unit_before']} -> {row['quantity_after']} {row['unit_after']} | "
                f"{row['rule']} | {row['recipe_title']}"
            )

        for row in target_creation_rows[:limit]:
            self.stdout.write(row)

        if apply_changes:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Applied successfully. retargeted={retargeted}, merged={merged}, "
                    f"created_targets={created_targets}, created_target_prices={created_target_prices}"
                )
            )
