from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
import re
from time import perf_counter
from typing import Any

from django.db import transaction
from django.db.models import Prefetch
from datetime import date, datetime
from uuid import UUID
try:
    from ortools.sat.python import cp_model
except Exception:  # pragma: no cover - optional dependency fallback
    cp_model = None

from apps.catalog.models import (
    IngredientPrice,
    IngredientSubstitution,
    Recipe,
    RecipeIngredient,
    RecipeStatus,
)
from apps.groups.models import ConstraintType, GoalType, Group, GroupMember

from .models import (
    AdaptationType,
    ExplanationType,
    GenerationRunStatus,
    MealItemAdaptation,
    MealPlan,
    MealPlanDay,
    MealPlanItem,
    MealPlanStatus,
    MealType,
    PantryItem,
    PlanExplanation,
    PlanGenerationRun,
    ShareLink,
    ShoppingList,
    ShoppingListItem,
)


ZERO = Decimal('0.00')
APPROX_CUP_L = Decimal('0.24')
APPROX_CUP_KG = Decimal('0.20')
APPROX_TBSP_L = Decimal('0.015')
APPROX_TSP_L = Decimal('0.005')
APPROX_PINCH_KG = Decimal('0.0003')
APPROX_TO_TASTE_KG = Decimal('0.002')
PLANNER_OPTIMIZER_CP_SAT = 'cp_sat_planner'
PLANNER_OPTIMIZER_DETERMINISTIC = 'deterministic_planner'
CP_SAT_CANDIDATE_LIMIT = 20
CP_SAT_SOLVE_TIME_SECONDS = 5.0
MEAL_CALORIE_SHARE_WEIGHTS = {
    MealType.BREAKFAST: Decimal('0.25'),
    MealType.LUNCH: Decimal('0.35'),
    MealType.DINNER: Decimal('0.30'),
    MealType.SNACK: Decimal('0.10'),
}
PSEUDO_RECIPE_TITLE_PATTERNS = (
    r"\bчай\b",
    r"\bтесто\b",
    r"\bсоус\b",
    r"\bдип\b",
    r"\bзаправк",
    r"\bмаринад\b",
    r"\bнапиток\b",
)


def _to_decimal(value) -> Decimal:
    if value is None:
        return ZERO
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))

def _json_safe(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


def _as_optional_decimal(value) -> Decimal | None:
    if value in (None, ""):
        return None
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception:
        return None


def _is_aggregate_micronutrient_key(key: str) -> bool:
    normalized_key = (key or "").strip().lower()
    return normalized_key.endswith(("_mg", "_ug", "_g"))

def _latest_price_for_ingredient(ingredient, region_code: str | None = None) -> IngredientPrice | None:
    qs = ingredient.prices.all()
    if region_code:
        qs = qs.filter(region_code=region_code)

    price = qs.order_by('-effective_from').first()
    if price:
        return price

    return ingredient.prices.order_by('-effective_from').first()


MAX_INGREDIENT_COST_KZT = Decimal('2500.00')
MAX_RECIPE_COST_KZT = Decimal('25000.00')


def estimate_recipe_cost(recipe: Recipe, region_code: str | None = None) -> Decimal:
    """Sum recipe ingredient costs in KZT with sanity clamps.

    A single ingredient is capped at MAX_INGREDIENT_COST_KZT to prevent
    parser bugs (e.g. "12 l базилика") or extreme per-kg prices for spices
    (~50000 KZT/kg, normally used by the teaspoon) from blowing up the
    total. The recipe total is additionally clamped to MAX_RECIPE_COST_KZT.
    """
    total = ZERO
    ingredients_map = recipe.ingredients_map.all()

    for item in ingredients_map:
        price = _latest_price_for_ingredient(item.ingredient, region_code=region_code)
        if not price:
            continue

        quantity = _to_decimal(item.quantity)
        price_amount = _to_decimal(price.price_amount)

        normalized_cost = _normalize_ingredient_cost(
            quantity=quantity,
            quantity_unit=item.unit,
            price_amount=price_amount,
            price_unit=price.price_unit,
        )
        if normalized_cost > MAX_INGREDIENT_COST_KZT:
            normalized_cost = MAX_INGREDIENT_COST_KZT
        total += normalized_cost

    if total > MAX_RECIPE_COST_KZT:
        total = MAX_RECIPE_COST_KZT
    return total.quantize(Decimal('0.01'))


def _normalize_ingredient_cost(
    quantity: Decimal,
    quantity_unit: str,
    price_amount: Decimal,
    price_unit: str,
) -> Decimal:
    quantity_unit = (quantity_unit or '').lower()
    price_unit = (price_unit or '').lower()
    piece_units = {'pc', 'pcs', 'piece'}

    # Same unit
    if quantity_unit == price_unit:
        return quantity * price_amount

    # grams vs kilograms
    if quantity_unit == 'g' and price_unit == 'kg':
        return (quantity / Decimal('1000')) * price_amount

    if quantity_unit == 'kg' and price_unit == 'g':
        return (quantity * Decimal('1000')) * price_amount

    # ml vs l
    if quantity_unit == 'ml' and price_unit == 'l':
        return (quantity / Decimal('1000')) * price_amount

    if quantity_unit == 'l' and price_unit == 'ml':
        return (quantity * Decimal('1000')) * price_amount

    # approximate density-1 fallback for liquids measured in grams
    if quantity_unit == 'g' and price_unit == 'l':
        return (quantity / Decimal('1000')) * price_amount

    if quantity_unit == 'kg' and price_unit == 'l':
        return quantity * price_amount

    if quantity_unit == 'ml' and price_unit == 'kg':
        return (quantity / Decimal('1000')) * price_amount

    if quantity_unit == 'l' and price_unit == 'kg':
        return quantity * price_amount

    # kitchen volume measures
    if quantity_unit == 'cup' and price_unit == 'l':
        return quantity * APPROX_CUP_L * price_amount

    if quantity_unit == 'cup' and price_unit == 'kg':
        return quantity * APPROX_CUP_KG * price_amount

    if quantity_unit == 'tbsp' and price_unit == 'l':
        return quantity * APPROX_TBSP_L * price_amount

    if quantity_unit == 'tbsp' and price_unit == 'kg':
        return quantity * APPROX_TBSP_L * price_amount

    if quantity_unit == 'tsp' and price_unit == 'l':
        return quantity * APPROX_TSP_L * price_amount

    if quantity_unit == 'tsp' and price_unit == 'kg':
        return quantity * APPROX_TSP_L * price_amount

    if quantity_unit == 'pinch' and price_unit == 'kg':
        return quantity * APPROX_PINCH_KG * price_amount

    if quantity_unit == 'to_taste' and price_unit == 'kg':
        return quantity * APPROX_TO_TASTE_KG * price_amount

    if quantity_unit == 'to_taste' and price_unit == 'l':
        return quantity * APPROX_TSP_L * price_amount

    if quantity_unit == 'ml' and price_unit == 'cup':
        return (quantity / Decimal('240')) * price_amount

    if quantity_unit == 'l' and price_unit == 'cup':
        return (quantity / APPROX_CUP_L) * price_amount

    if quantity_unit == 'g' and price_unit == 'cup':
        return (quantity / Decimal('200')) * price_amount

    if quantity_unit == 'kg' and price_unit == 'cup':
        return (quantity / APPROX_CUP_KG) * price_amount

    if quantity_unit in piece_units and price_unit in piece_units:
        return quantity * price_amount

    if quantity_unit == 'unit' and price_unit == 'unit':
        return quantity * price_amount

    # `unit` is the catch-all bucket the parser falls back to when the
    # ingredient line did not yield a recognizable measurement. Without a
    # contribution here a huge slice of recipes ends up with cost=0.
    # Heuristic: assume one "unit" is 100g / 100ml / 1 piece against the
    # recorded price. Better than dropping the line, similar magnitude to
    # the heuristic_estimate fallback prices.
    if quantity_unit == 'unit':
        if price_unit == 'kg':
            return (quantity * Decimal('0.100')) * price_amount
        if price_unit == 'g':
            return (quantity * Decimal('100')) * price_amount
        if price_unit == 'l':
            return (quantity * Decimal('0.100')) * price_amount
        if price_unit == 'ml':
            return (quantity * Decimal('100')) * price_amount
        if price_unit in piece_units:
            return quantity * price_amount
        if price_unit == 'cup':
            return quantity * price_amount * Decimal('0.5')
        if price_unit in {'tbsp', 'tsp', 'to_taste'}:
            return quantity * price_amount

    # Unknown cross-unit pairs are treated as zero to avoid exploding costs.
    return ZERO


def _get_meal_types(meals_per_day: int, include_snacks: bool) -> list[str]:
    if meals_per_day <= 1:
        return [MealType.LUNCH]
    if meals_per_day == 2:
        return [MealType.LUNCH, MealType.DINNER]
    if meals_per_day == 3:
        return [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
    if meals_per_day >= 4 and include_snacks:
        return [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER, MealType.SNACK]
    return [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]


def _recipe_tag_keys(recipe: Recipe) -> set[str]:
    return {recipe_tag.tag.key for recipe_tag in recipe.recipe_tags.all()}


def _normalize_recipe_lookup_text(value: str) -> str:
    return (value or '').casefold().replace('ё', 'е').strip()


def _is_pseudo_recipe(recipe: Recipe) -> bool:
    title = _normalize_recipe_lookup_text(recipe.title)
    if not title:
        return False
    return any(re.search(pattern, title) for pattern in PSEUDO_RECIPE_TITLE_PATTERNS)


def _blocked_constraints(group: Group):
    """Returns the union of blocked ingredient ids/tag keys/value texts for the group.

    Cached per-request via `_GROUP_PLANNING_CACHE` so a single plan generation
    does not requery member constraints for each candidate recipe.
    """
    cached = getattr(group, '_planning_blocked_cache', None)
    if cached is not None:
        return cached

    blocked_ingredient_ids = set()
    blocked_tag_keys = set()
    blocked_value_texts = set()

    members = group.members.all()
    for member in members:
        for constraint in member.constraints.all():
            if constraint.constraint_type in {
                ConstraintType.ALLERGY,
                ConstraintType.INTOLERANCE,
                ConstraintType.RELIGIOUS,
                ConstraintType.DIETARY,
                ConstraintType.DISLIKED,
            }:
                if constraint.ingredient_id:
                    blocked_ingredient_ids.add(constraint.ingredient_id)
                if constraint.tag_key:
                    blocked_tag_keys.add(constraint.tag_key)
                if constraint.value_text:
                    blocked_value_texts.add(constraint.value_text.strip().lower())

    cached = (blocked_ingredient_ids, blocked_tag_keys, blocked_value_texts)
    try:
        group._planning_blocked_cache = cached
    except Exception:
        pass
    return cached


def _group_member_goals(group: Group) -> set[str]:
    """Cached set of goals across all members; used by scoring + planner."""
    cached = getattr(group, '_planning_goals_cache', None)
    if cached is not None:
        return cached
    goals = {member.goal_type for member in group.members.all()}
    try:
        group._planning_goals_cache = goals
    except Exception:
        pass
    return goals


def _recipe_fits_group(
    recipe: Recipe,
    group: Group,
    cooking_time_strictness: str,
    budget_strictness: str,
) -> bool:
    preferences = getattr(group, 'preferences', None)
    blocked_ingredient_ids, blocked_tag_keys, blocked_value_texts = _blocked_constraints(group)
    recipe_tag_keys = _recipe_tag_keys(recipe)

    recipe_ingredient_ids = {item.ingredient_id for item in recipe.ingredients_map.all()}
    recipe_ingredient_names = {
        (item.ingredient.normalized_name or '').lower()
        for item in recipe.ingredients_map.all()
    }

    if blocked_ingredient_ids.intersection(recipe_ingredient_ids):
        return False

    if blocked_tag_keys.intersection(recipe_tag_keys):
        return False

    if blocked_value_texts.intersection(recipe_ingredient_names):
        return False

    if preferences:
        max_time = preferences.max_cooking_time_minutes
        if cooking_time_strictness == 'strict' and recipe.total_time_minutes > max_time:
            return False
        if cooking_time_strictness == 'medium' and recipe.total_time_minutes > max_time + 15:
            return False
        if cooking_time_strictness == 'flexible' and recipe.total_time_minutes > max_time + 30:
            return False

        budget_limit = _to_decimal(group.budget_amount)
        recipe_cost = _to_decimal(recipe.estimated_cost)
        if budget_strictness == 'strict' and recipe_cost > budget_limit:
            return False
        if budget_strictness == 'medium' and recipe_cost > budget_limit * Decimal('1.20'):
            return False
        if budget_strictness == 'flexible' and recipe_cost > budget_limit * Decimal('1.40'):
            return False

    return True


def _score_recipe_for_group(recipe: Recipe, group: Group, optimization_focus: list[str]) -> Decimal:
    score = Decimal('0.50')
    preferences = getattr(group, 'preferences', None)
    tag_keys = _recipe_tag_keys(recipe)
    goals = _group_member_goals(group)

    if recipe.is_local_cuisine and preferences:
        score += _to_decimal(preferences.local_cuisine_priority) * Decimal('0.20')

    if GoalType.HIGH_PROTEIN in goals and 'high_protein' in tag_keys:
        score += Decimal('0.10')

    if GoalType.LOW_CARB in goals and 'low_carb' in tag_keys:
        score += Decimal('0.10')

    if GoalType.WEIGHT_LOSS in goals and 'weight_loss' in tag_keys:
        score += Decimal('0.07')

    if GoalType.MASS_GAIN in goals and 'mass_gain' in tag_keys:
        score += Decimal('0.07')

    if 'budget_friendly' in tag_keys and 'budget' in optimization_focus:
        score += Decimal('0.10')

    if 'speed' in optimization_focus and recipe.total_time_minutes <= 30:
        score += Decimal('0.07')

    if 'nutrition' in optimization_focus and ('healthy' in tag_keys or 'high_protein' in tag_keys):
        score += Decimal('0.07')

    if preferences:
        if recipe.total_time_minutes <= preferences.max_cooking_time_minutes:
            score += Decimal('0.05')

    estimated_cost = _to_decimal(recipe.estimated_cost)
    if estimated_cost <= Decimal('2500'):
        score += Decimal('0.03')

    if score < Decimal('0.00'):
        return Decimal('0.00')
    if score > Decimal('0.99'):
        return Decimal('0.99')
    return score.quantize(Decimal('0.01'))


def _choose_recipe(
    pool: list[Recipe],
    used_counts: dict[str, int],
    repetition_allowed: int,
    category: str,
) -> Recipe | None:
    category_pool = [recipe for recipe in pool if recipe.category == category]
    if not category_pool:
        return None

    not_overused = [recipe for recipe in category_pool if used_counts[str(recipe.id)] <= repetition_allowed]
    if not_overused:
        return not_overused[0]

    return category_pool[0]


def _build_candidate_pool(
    group: Group,
    meal_types: list[str],
    budget_strictness: str,
    cooking_time_strictness: str,
    optimization_focus: list[str],
) -> dict[str, list[Recipe]]:
    # Warm caches once for this generation so per-recipe checks stay O(1) on member data.
    if not hasattr(group, '_planning_blocked_cache'):
        # Touching the prefetched paths here loads them eagerly if available.
        for member in group.members.all():
            list(member.constraints.all())
    _blocked_constraints(group)
    _group_member_goals(group)

    import os

    quality_threshold = Decimal(os.getenv('PLANNER_MIN_QUALITY_SCORE', '0.0'))
    base_qs = (
        Recipe.objects.filter(
            status=RecipeStatus.PUBLISHED,
            category__in=meal_types,
            quality_score__gte=quality_threshold,
        )
        .select_related('nutrition')
        .prefetch_related(
            'recipe_tags__tag',
            'ingredients_map__ingredient__prices',
        )
    )

    by_category: dict[str, list[Recipe]] = defaultdict(list)

    for recipe in base_qs.iterator(chunk_size=200):
        if _is_pseudo_recipe(recipe):
            continue

        if not recipe.estimated_cost or recipe.estimated_cost == ZERO:
            recipe.estimated_cost = estimate_recipe_cost(recipe, region_code=group.region_code)

        if not _recipe_fits_group(
            recipe=recipe,
            group=group,
            budget_strictness=budget_strictness,
            cooking_time_strictness=cooking_time_strictness,
        ):
            continue

        score = _score_recipe_for_group(recipe, group, optimization_focus)
        recipe._planning_score = score
        by_category[recipe.category].append(recipe)

    for category, items in by_category.items():
        by_category[category] = sorted(
            items,
            key=lambda r: (
                getattr(r, '_planning_score', Decimal('0.00')),
                -_to_decimal(r.estimated_cost),
            ),
            reverse=True,
        )

    return by_category


def _group_servings_total(group: Group) -> Decimal:
    return Decimal(str(max(group.members.count(), 1)))


def _meal_type_shares(meal_types: list[str]) -> dict[str, Decimal]:
    total_weight = sum((MEAL_CALORIE_SHARE_WEIGHTS.get(meal_type, Decimal('0.25')) for meal_type in meal_types), Decimal('0.00'))
    if total_weight <= ZERO:
        even_share = (Decimal('1.00') / Decimal(str(max(len(meal_types), 1)))).quantize(Decimal('0.0001'))
        return {meal_type: even_share for meal_type in meal_types}
    return {
        meal_type: (MEAL_CALORIE_SHARE_WEIGHTS.get(meal_type, Decimal('0.25')) / total_weight).quantize(Decimal('0.0001'))
        for meal_type in meal_types
    }


def _quantize_servings(value: Decimal) -> Decimal:
    if value <= ZERO:
        return Decimal('1.00')
    return ((value * Decimal('2')).quantize(Decimal('1'), rounding=ROUND_HALF_UP) / Decimal('2')).quantize(Decimal('0.01'))


def _suggest_servings_total(recipe: Recipe, group: Group, meal_types: list[str], meal_type: str) -> Decimal:
    base_servings = _group_servings_total(group)
    nutrition = getattr(recipe, 'nutrition', None)
    calories_per_serving = _to_decimal(getattr(nutrition, 'calories_per_serving', ZERO))
    if calories_per_serving <= ZERO:
        return base_servings

    daily_target_calories = _group_macro_targets(group, 1)['calories']
    shares = _meal_type_shares(meal_types)
    slot_target_calories = daily_target_calories * shares.get(meal_type, Decimal('0.25'))
    suggested = slot_target_calories / calories_per_serving
    minimum = base_servings
    maximum = max(base_servings * Decimal('2.50'), base_servings)
    suggested = max(minimum, min(suggested, maximum))
    return _quantize_servings(suggested)


def _recipe_serving_ratio(recipe: Recipe, servings_total: Decimal) -> Decimal:
    default_servings = _to_decimal(recipe.servings_default or 1)
    if default_servings <= ZERO:
        return Decimal('1.00')
    return servings_total / default_servings


def _planned_item_metrics(recipe: Recipe, servings_total: Decimal) -> dict[str, Decimal]:
    ratio = _recipe_serving_ratio(recipe, servings_total)
    nutrition = getattr(recipe, 'nutrition', None)
    return {
        'servings_total': servings_total,
        'ratio': ratio,
        'estimated_cost': (_to_decimal(recipe.estimated_cost or ZERO) * ratio).quantize(Decimal('0.01')),
        'estimated_calories': (
            _to_decimal(getattr(nutrition, 'calories_total', ZERO)) * ratio
        ).quantize(Decimal('0.01')),
        'protein_total_g': (
            _to_decimal(getattr(nutrition, 'protein_total_g', ZERO)) * ratio
        ).quantize(Decimal('0.01')),
        'fat_total_g': (
            _to_decimal(getattr(nutrition, 'fat_total_g', ZERO)) * ratio
        ).quantize(Decimal('0.01')),
        'carb_total_g': (
            _to_decimal(getattr(nutrition, 'carb_total_g', ZERO)) * ratio
        ).quantize(Decimal('0.01')),
    }


def _planned_item_metrics_for_slot(recipe: Recipe, group: Group, meal_types: list[str], meal_type: str) -> dict[str, Decimal]:
    servings_total = _suggest_servings_total(recipe, group, meal_types, meal_type)
    return _planned_item_metrics(recipe, servings_total)


def _plan_budget_limit(group: Group, days_count: int, budget_strictness: str) -> Decimal:
    base_budget = _to_decimal(group.budget_amount)
    if group.budget_period_type == 'daily':
        base_budget *= Decimal(str(days_count))

    multiplier_map = {
        'strict': Decimal('1.00'),
        'medium': Decimal('1.20'),
        'flexible': Decimal('1.40'),
    }
    return (base_budget * multiplier_map.get(budget_strictness, Decimal('1.00'))).quantize(Decimal('0.01'))


def _group_macro_targets(group: Group, days_count: int) -> dict[str, Decimal]:
    total_calories = ZERO
    total_protein = ZERO
    total_fat = ZERO
    total_carb = ZERO

    members = list(group.members.all())
    if not members:
        return {
            'calories': Decimal('2000') * Decimal(str(days_count)),
            'protein_g': Decimal('90') * Decimal(str(days_count)),
            'fat_g': Decimal('70') * Decimal(str(days_count)),
            'carb_g': Decimal('220') * Decimal(str(days_count)),
        }

    for member in members:
        total_calories += _to_decimal(member.daily_calorie_target or 2000)
        total_protein += _to_decimal(member.protein_target_g or 90)
        total_fat += _to_decimal(member.fat_target_g or 70)
        total_carb += _to_decimal(member.carb_target_g or 220)

    multiplier = Decimal(str(days_count))
    return {
        'calories': (total_calories * multiplier).quantize(Decimal('0.01')),
        'protein_g': (total_protein * multiplier).quantize(Decimal('0.01')),
        'fat_g': (total_fat * multiplier).quantize(Decimal('0.01')),
        'carb_g': (total_carb * multiplier).quantize(Decimal('0.01')),
    }


def _int_metric(value: Decimal, *, scale: int = 1) -> int:
    scaled = value * Decimal(str(scale))
    return int(scaled.quantize(Decimal('1'), rounding=ROUND_HALF_UP))


_RU_MONTHS_GENITIVE = {
    1: 'января',
    2: 'февраля',
    3: 'марта',
    4: 'апреля',
    5: 'мая',
    6: 'июня',
    7: 'июля',
    8: 'августа',
    9: 'сентября',
    10: 'октября',
    11: 'ноября',
    12: 'декабря',
}


def _format_plan_title(start_date: date) -> str:
    """Russian-localised default title for a generated plan."""
    return f'План недели с {start_date.day} {_RU_MONTHS_GENITIVE[start_date.month]}'


def _selection_reason_summary(optimizer_name: str) -> str:
    if optimizer_name == PLANNER_OPTIMIZER_CP_SAT:
        return (
            'CP-SAT планировщик подобрал этот рецепт с учётом бюджета, '
            'нутриентов, разнообразия и предпочтений семьи.'
        )
    return 'Детерминистический планировщик подобрал рецепт по соответствию, стоимости и времени.'


def _build_deterministic_selection(
    *,
    days_count: int,
    meal_types: list[str],
    candidate_pool: dict[str, list[Recipe]],
    repetition_allowed: int,
) -> dict[tuple[int, str], Recipe]:
    used_counts: dict[str, int] = defaultdict(int)
    selection: dict[tuple[int, str], Recipe] = {}

    for day_index in range(1, days_count + 1):
        for meal_type in meal_types:
            recipe = _choose_recipe(
                pool=candidate_pool.get(meal_type, []),
                used_counts=used_counts,
                repetition_allowed=repetition_allowed,
                category=meal_type,
            )
            if not recipe:
                continue
            used_counts[str(recipe.id)] += 1
            selection[(day_index, meal_type)] = recipe
    return selection


def _build_cp_sat_selection(
    *,
    group: Group,
    days_count: int,
    meal_types: list[str],
    candidate_pool: dict[str, list[Recipe]],
    repetition_allowed: int,
    optimization_focus: list[str],
    budget_strictness: str,
) -> dict[tuple[int, str], Recipe] | None:
    if cp_model is None:
        return None

    shortlisted_pool = {
        category: recipes[:CP_SAT_CANDIDATE_LIMIT]
        for category, recipes in candidate_pool.items()
        if recipes
    }
    slots = [
        (day_index, meal_type)
        for day_index in range(1, days_count + 1)
        for meal_type in meal_types
        if shortlisted_pool.get(meal_type)
    ]
    if not slots:
        return {}

    model = cp_model.CpModel()
    servings_total = _group_servings_total(group)
    recipe_metrics: dict[str, dict[str, int | Recipe]] = {}
    slot_vars: dict[tuple[int, str, str], Any] = {}
    recipe_ids_by_category: dict[str, list[str]] = defaultdict(list)

    for meal_type, recipes in shortlisted_pool.items():
        for recipe in recipes:
            recipe_id = str(recipe.id)
            if recipe_id not in recipe_metrics:
                metrics = _planned_item_metrics_for_slot(recipe, group, meal_types, meal_type)
                recipe_metrics[recipe_id] = {
                    'recipe': recipe,
                    'score': max(_int_metric(_to_decimal(getattr(recipe, '_planning_score', Decimal('0.50'))), scale=100), 1),
                    'cost': _int_metric(metrics['estimated_cost']),
                    'cost_objective': max(_int_metric(metrics['estimated_cost']) // 10, 1),
                    'calories': _int_metric(metrics['estimated_calories'], scale=1),
                    'protein_g': _int_metric(metrics['protein_total_g'], scale=1),
                    'fat_g': _int_metric(metrics['fat_total_g'], scale=1),
                    'carb_g': _int_metric(metrics['carb_total_g'], scale=1),
                    'servings_total': metrics['servings_total'],
                }
            recipe_ids_by_category[meal_type].append(recipe_id)

    for day_index, meal_type in slots:
        recipe_vars = []
        for recipe in shortlisted_pool[meal_type]:
            recipe_id = str(recipe.id)
            var = model.NewBoolVar(f"x_{day_index}_{meal_type}_{recipe_id.replace('-', '')[:10]}")
            slot_vars[(day_index, meal_type, recipe_id)] = var
            recipe_vars.append(var)
        model.AddExactlyOne(recipe_vars)

    max_uses = max(repetition_allowed + 1, 1)
    used_any_vars = {}
    repeat_excess_vars = {}
    for recipe_id, metrics in recipe_metrics.items():
        recipe_vars = [var for (day, meal, rid), var in slot_vars.items() if rid == recipe_id]
        if not recipe_vars:
            continue

        count_var = model.NewIntVar(0, len(recipe_vars), f"use_count_{recipe_id.replace('-', '')[:10]}")
        model.Add(count_var == sum(recipe_vars))
        model.Add(count_var <= max_uses)

        used_any = model.NewBoolVar(f"used_any_{recipe_id.replace('-', '')[:10]}")
        model.Add(count_var >= 1).OnlyEnforceIf(used_any)
        model.Add(count_var == 0).OnlyEnforceIf(used_any.Not())
        used_any_vars[recipe_id] = used_any

        repeat_excess = model.NewIntVar(0, max(len(recipe_vars) - 1, 0), f"repeat_excess_{recipe_id.replace('-', '')[:10]}")
        model.Add(repeat_excess == count_var - used_any)
        repeat_excess_vars[recipe_id] = repeat_excess

    for meal_type, recipe_ids in recipe_ids_by_category.items():
        if len(recipe_ids) <= 1:
            continue
        for day_index in range(1, days_count):
            for recipe_id in recipe_ids:
                first = slot_vars.get((day_index, meal_type, recipe_id))
                second = slot_vars.get((day_index + 1, meal_type, recipe_id))
                if first is not None and second is not None:
                    model.Add(first + second <= 1)

    total_cost_expr = sum(
        var * int(recipe_metrics[recipe_id]['cost'])
        for (_, _, recipe_id), var in slot_vars.items()
    )
    budget_limit = _plan_budget_limit(group, days_count, budget_strictness)
    model.Add(total_cost_expr <= _int_metric(budget_limit))

    macro_targets = _group_macro_targets(group, days_count)
    total_calories_expr = sum(
        var * int(recipe_metrics[recipe_id]['calories'])
        for (_, _, recipe_id), var in slot_vars.items()
    )
    total_protein_expr = sum(
        var * int(recipe_metrics[recipe_id]['protein_g'])
        for (_, _, recipe_id), var in slot_vars.items()
    )
    total_fat_expr = sum(
        var * int(recipe_metrics[recipe_id]['fat_g'])
        for (_, _, recipe_id), var in slot_vars.items()
    )
    total_carb_expr = sum(
        var * int(recipe_metrics[recipe_id]['carb_g'])
        for (_, _, recipe_id), var in slot_vars.items()
    )

    slot_max = lambda key: sum(max(int(recipe_metrics[str(recipe.id)][key]) for recipe in shortlisted_pool[meal_type]) for _, meal_type in slots)
    calories_upper = max(slot_max('calories'), _int_metric(macro_targets['calories']), 1)
    protein_upper = max(slot_max('protein_g'), _int_metric(macro_targets['protein_g']), 1)
    fat_upper = max(slot_max('fat_g'), _int_metric(macro_targets['fat_g']), 1)
    carb_upper = max(slot_max('carb_g'), _int_metric(macro_targets['carb_g']), 1)

    calories_target = _int_metric(macro_targets['calories'])
    protein_target = _int_metric(macro_targets['protein_g'])
    fat_target = _int_metric(macro_targets['fat_g'])
    carb_target = _int_metric(macro_targets['carb_g'])

    calories_shortfall = model.NewIntVar(0, calories_upper, "calories_shortfall")
    calories_over = model.NewIntVar(0, calories_upper, "calories_over")
    model.Add(calories_shortfall >= calories_target - total_calories_expr)
    model.Add(calories_shortfall >= 0)
    model.Add(calories_over >= total_calories_expr - calories_target)
    model.Add(calories_over >= 0)

    protein_shortfall = model.NewIntVar(0, protein_upper, "protein_shortfall")
    protein_over = model.NewIntVar(0, protein_upper, "protein_over")
    model.Add(protein_shortfall >= protein_target - total_protein_expr)
    model.Add(protein_shortfall >= 0)
    model.Add(protein_over >= total_protein_expr - protein_target)
    model.Add(protein_over >= 0)

    fat_shortfall = model.NewIntVar(0, fat_upper, "fat_shortfall")
    fat_over = model.NewIntVar(0, fat_upper, "fat_over")
    model.Add(fat_shortfall >= fat_target - total_fat_expr)
    model.Add(fat_shortfall >= 0)
    model.Add(fat_over >= total_fat_expr - fat_target)
    model.Add(fat_over >= 0)

    carb_shortfall = model.NewIntVar(0, carb_upper, "carb_shortfall")
    carb_over = model.NewIntVar(0, carb_upper, "carb_over")
    model.Add(carb_shortfall >= carb_target - total_carb_expr)
    model.Add(carb_shortfall >= 0)
    model.Add(carb_over >= total_carb_expr - carb_target)
    model.Add(carb_over >= 0)

    focus = set(optimization_focus)
    score_weight = 20
    unique_bonus_weight = 120
    repeat_penalty_weight = 300
    calorie_shortfall_weight = 4 if 'nutrition' in focus else 0
    calorie_over_weight = 1 if 'nutrition' in focus else 0
    protein_shortfall_weight = 12 if 'nutrition' in focus else 0
    protein_over_weight = 1 if 'nutrition' in focus else 0
    fat_over_weight = 6 if 'nutrition' in focus else 0
    carb_shortfall_weight = 2 if 'nutrition' in focus else 0
    carb_over_weight = 2 if 'nutrition' in focus else 0
    cost_weight = 1 if 'budget' in focus else 0

    objective = (
        sum(
            var * int(recipe_metrics[recipe_id]['score']) * score_weight
            for (_, _, recipe_id), var in slot_vars.items()
        )
        + sum(used_any * unique_bonus_weight for used_any in used_any_vars.values())
        - sum(repeat_excess * repeat_penalty_weight for repeat_excess in repeat_excess_vars.values())
        - sum(
            var * int(recipe_metrics[recipe_id]['cost_objective']) * cost_weight
            for (_, _, recipe_id), var in slot_vars.items()
        )
        - calories_shortfall * calorie_shortfall_weight
        - calories_over * calorie_over_weight
        - protein_shortfall * protein_shortfall_weight
        - protein_over * protein_over_weight
        - fat_over * fat_over_weight
        - carb_shortfall * carb_shortfall_weight
        - carb_over * carb_over_weight
    )
    model.Maximize(objective)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = CP_SAT_SOLVE_TIME_SECONDS
    solver.parameters.num_search_workers = 8
    status = solver.Solve(model)
    if status not in {cp_model.OPTIMAL, cp_model.FEASIBLE}:
        return None

    selection: dict[tuple[int, str], Recipe] = {}
    for day_index, meal_type in slots:
        for recipe in shortlisted_pool[meal_type]:
            recipe_id = str(recipe.id)
            if solver.BooleanValue(slot_vars[(day_index, meal_type, recipe_id)]):
                selection[(day_index, meal_type)] = recipe
                break
    return selection


def _persist_meal_plan_selection(
    *,
    meal_plan: MealPlan,
    group: Group,
    start_date,
    days_count: int,
    meal_types: list[str],
    selection: dict[tuple[int, str], Recipe],
):
    for day_index in range(1, days_count + 1):
        plan_date = start_date + timedelta(days=day_index - 1)
        day = MealPlanDay.objects.create(
            meal_plan=meal_plan,
            day_index=day_index,
            plan_date=plan_date,
        )

        for meal_type in meal_types:
            recipe = selection.get((day_index, meal_type))
            if not recipe:
                continue

            metrics = _planned_item_metrics_for_slot(recipe, group, meal_types, meal_type)
            selection_score = getattr(recipe, '_planning_score', Decimal('0.50'))
            item = MealPlanItem.objects.create(
                meal_plan_day=day,
                recipe=recipe,
                meal_type=meal_type,
                servings_total=metrics['servings_total'],
                estimated_cost=metrics['estimated_cost'],
                estimated_calories=metrics['estimated_calories'],
                selection_score=_to_decimal(selection_score),
                selection_reason_summary=_selection_reason_summary(meal_plan.optimizer_name),
                is_manually_replaced=False,
            )
            _build_member_adaptations_for_item(item, group)

        _aggregate_day_totals(day)


def _deactivate_current_plans(group: Group):
    MealPlan.objects.filter(group=group, is_current=True).update(is_current=False)


def _build_member_adaptations_for_item(item: MealPlanItem, group: Group):
    recipe_tags = _recipe_tag_keys(item.recipe)
    adaptations_to_create = []

    for member in group.members.all():
        if member.goal_type == GoalType.HIGH_PROTEIN and 'high_protein' not in recipe_tags:
            adaptations_to_create.append(
                MealItemAdaptation(
                    meal_plan_item=item,
                    member=member,
                    adaptation_type=AdaptationType.HIGH_PROTEIN,
                    description='Увеличена порция нежирного белка для этого члена семьи.',
                    price_delta=Decimal('120.00'),
                    calorie_delta=Decimal('90.00'),
                    protein_delta_g=Decimal('12.00'),
                    fat_delta_g=Decimal('2.00'),
                    carb_delta_g=Decimal('0.00'),
                )
            )

        elif member.goal_type == GoalType.LOW_CARB and 'low_carb' not in recipe_tags:
            adaptations_to_create.append(
                MealItemAdaptation(
                    meal_plan_item=item,
                    member=member,
                    adaptation_type=AdaptationType.LOW_CARB,
                    description='Reduce grains and increase vegetables for this member.',
                    price_delta=Decimal('-50.00'),
                    calorie_delta=Decimal('-140.00'),
                    protein_delta_g=Decimal('2.00'),
                    fat_delta_g=Decimal('1.00'),
                    carb_delta_g=Decimal('-24.00'),
                )
            )

        elif member.member_type in {'child', 'teen'} and not item.recipe.is_child_friendly:
            adaptations_to_create.append(
                MealItemAdaptation(
                    meal_plan_item=item,
                    member=member,
                    adaptation_type=AdaptationType.CHILD_FRIENDLY,
                    description='Use milder seasoning and simpler plating for this member.',
                    price_delta=ZERO,
                    calorie_delta=ZERO,
                    protein_delta_g=ZERO,
                    fat_delta_g=ZERO,
                    carb_delta_g=ZERO,
                )
            )

    if adaptations_to_create:
        MealItemAdaptation.objects.bulk_create(adaptations_to_create)


def _aggregate_day_totals(day: MealPlanDay):
    totals = day.items.aggregate_cost_and_calories() if hasattr(day.items, 'aggregate_cost_and_calories') else None
    if totals:
        day.estimated_daily_cost = totals['cost']
        day.estimated_daily_calories = totals['calories']
        day.save(update_fields=['estimated_daily_cost', 'estimated_daily_calories', 'updated_at'])
        return

    cost = ZERO
    calories = ZERO
    for item in day.items.all():
        cost += _to_decimal(item.estimated_cost)
        calories += _to_decimal(item.estimated_calories)

    day.estimated_daily_cost = cost
    day.estimated_daily_calories = calories
    day.save(update_fields=['estimated_daily_cost', 'estimated_daily_calories', 'updated_at'])


def _build_shopping_list(meal_plan: MealPlan):
    shopping_list, _ = ShoppingList.objects.get_or_create(
        meal_plan=meal_plan,
        defaults={
            'group': meal_plan.group,
            'total_estimated_cost': ZERO,
        },
    )
    shopping_list.items.all().delete()

    aggregated: dict[tuple[str | None, str, str], dict] = {}

    items = (
        MealPlanItem.objects.filter(meal_plan_day__meal_plan=meal_plan)
        .select_related('recipe')
        .prefetch_related(
            'recipe__ingredients_map__ingredient',
            'recipe__ingredients_map__ingredient__prices',
        )
    )

    for plan_item in items:
        recipe = plan_item.recipe
        ratio = Decimal('1.00')
        if recipe.servings_default:
            ratio = _to_decimal(plan_item.servings_total) / _to_decimal(recipe.servings_default)

        for recipe_ingredient in recipe.ingredients_map.all():
            ingredient = recipe_ingredient.ingredient
            key = (str(ingredient.id) if ingredient else None, recipe_ingredient.unit, ingredient.category if ingredient else 'Other')

            if key not in aggregated:
                aggregated[key] = {
                    'ingredient': ingredient,
                    'ingredient_name_override': ingredient.name if ingredient else '',
                    'total_quantity': ZERO,
                    'unit': recipe_ingredient.unit,
                    'estimated_price': ZERO,
                    'category_label': (ingredient.category.title() if ingredient and ingredient.category else 'Other'),
                }

            quantity = _to_decimal(recipe_ingredient.quantity) * ratio
            aggregated[key]['total_quantity'] += quantity

            price = _latest_price_for_ingredient(ingredient, region_code=meal_plan.group.region_code) if ingredient else None
            if price:
                aggregated[key]['estimated_price'] += _normalize_ingredient_cost(
                    quantity=quantity,
                    quantity_unit=recipe_ingredient.unit,
                    price_amount=_to_decimal(price.price_amount),
                    price_unit=price.price_unit,
                )

    items_to_create = []
    total_estimated_cost = ZERO

    for payload in aggregated.values():
        total_estimated_cost += payload['estimated_price']
        items_to_create.append(
            ShoppingListItem(
                shopping_list=shopping_list,
                ingredient=payload['ingredient'],
                ingredient_name_override=payload['ingredient_name_override'],
                total_quantity=payload['total_quantity'].quantize(Decimal('0.01')),
                unit=payload['unit'],
                estimated_price=payload['estimated_price'].quantize(Decimal('0.01')),
                category_label=payload['category_label'],
                is_checked=False,
                availability_status='available',
            )
        )

    if items_to_create:
        ShoppingListItem.objects.bulk_create(items_to_create)

    shopping_list.total_estimated_cost = total_estimated_cost.quantize(Decimal('0.01'))
    shopping_list.save(update_fields=['total_estimated_cost', 'updated_at'])

    return shopping_list


def _build_plan_explanations(meal_plan: MealPlan):
    meal_plan.explanations.all().delete()

    explanations = []

    remaining = _to_decimal(meal_plan.group.budget_amount) - _to_decimal(meal_plan.estimated_total_cost)
    explanations.append(
        PlanExplanation(
            meal_plan=meal_plan,
            explanation_type=ExplanationType.BUDGET,
            title='Уложились в бюджет недели' if remaining >= ZERO else 'Превышение бюджета',
            explanation_text=(
                f'План {"ниже" if remaining >= ZERO else "выше"} заданного бюджета на '
                f'{abs(remaining)} ₸.'
            ),
            priority_order=1,
        )
    )

    explanations.append(
        PlanExplanation(
            meal_plan=meal_plan,
            explanation_type=ExplanationType.NUTRITION,
            title='Сбалансированные нутриенты',
            explanation_text=(
                'План отдаёт приоритет рецептам, которые согласуются с целями семьи: '
                'высокий белок, низкие углеводы и здоровое питание там, где это уместно.'
            ),
            priority_order=2,
        )
    )

    explanations.append(
        PlanExplanation(
            meal_plan=meal_plan,
            explanation_type=ExplanationType.GROUP_FIT,
            title='Подходит составу семьи',
            explanation_text=(
                'Рецепты отфильтрованы по ограничениям членов семьи и адаптированы '
                'под индивидуальные цели там, где это нужно.'
            ),
            priority_order=3,
        )
    )

    explanations.append(
        PlanExplanation(
            meal_plan=meal_plan,
            explanation_type=ExplanationType.TRADEOFF,
            title='Баланс цены, скорости и разнообразия',
            explanation_text=(
                'Планировщик выбрал рецепты, которые удобно готовить в будние дни, '
                'сохраняя разнообразие меню.'
            ),
            priority_order=4,
        )
    )

    PlanExplanation.objects.bulk_create(explanations)


def _compute_plan_scores(meal_plan: MealPlan):
    items = MealPlanItem.objects.filter(meal_plan_day__meal_plan=meal_plan).select_related('recipe__nutrition')
    unique_recipe_ids = set()
    total_selection_score = ZERO
    total_items = 0

    total_cost = ZERO
    total_calories = ZERO

    for item in items:
        total_items += 1
        unique_recipe_ids.add(item.recipe_id)
        total_selection_score += _to_decimal(item.selection_score)
        total_cost += _to_decimal(item.estimated_cost)
        total_calories += _to_decimal(item.estimated_calories)

    diversity_score = ZERO
    if total_items:
        diversity_score = (_to_decimal(len(unique_recipe_ids)) / _to_decimal(total_items)).quantize(Decimal('0.01'))

    nutrition_fit_score = Decimal('0.85')
    budget_limit = _to_decimal(meal_plan.group.budget_amount)
    budget_fit_score = Decimal('0.95') if total_cost <= budget_limit else Decimal('0.70')
    group_fit_score = Decimal('0.90') if total_items else Decimal('0.00')

    if total_items:
        avg_selection_score = (total_selection_score / _to_decimal(total_items)).quantize(Decimal('0.01'))
    else:
        avg_selection_score = ZERO

    overall_score = (
        (nutrition_fit_score + budget_fit_score + group_fit_score + diversity_score + avg_selection_score)
        / Decimal('5')
    ).quantize(Decimal('0.01'))

    meal_plan.estimated_total_cost = total_cost.quantize(Decimal('0.01'))
    meal_plan.estimated_total_calories = total_calories.quantize(Decimal('0.01'))
    meal_plan.nutrition_fit_score = nutrition_fit_score
    meal_plan.budget_fit_score = budget_fit_score
    meal_plan.group_fit_score = group_fit_score
    meal_plan.diversity_score = diversity_score
    meal_plan.overall_score = overall_score
    meal_plan.save(
        update_fields=[
            'estimated_total_cost',
            'estimated_total_calories',
            'nutrition_fit_score',
            'budget_fit_score',
            'group_fit_score',
            'diversity_score',
            'overall_score',
            'updated_at',
        ]
    )


def _build_constraints_snapshot(group: Group) -> dict:
    blocked_ingredient_ids, blocked_tag_keys, blocked_value_texts = _blocked_constraints(group)
    preferences = getattr(group, 'preferences', None)

    return {
        'group_type': group.group_type,
        'budget_amount': str(group.budget_amount),
        'region_code': group.region_code,
        'max_cooking_time_minutes': (
            preferences.max_cooking_time_minutes if preferences else None
        ),
        'repeat_tolerance': preferences.repeat_tolerance if preferences else None,
        'blocked_ingredient_ids': [str(value) for value in blocked_ingredient_ids],
        'blocked_tag_keys': sorted(list(blocked_tag_keys)),
        'blocked_value_texts': sorted(list(blocked_value_texts)),
    }


@transaction.atomic
def generate_meal_plan_for_group(*, group: Group, user, validated_data: dict) -> MealPlan:
    start_ts = perf_counter()
    requested_optimizer = validated_data.get('optimizer', 'cp_sat')

    group = (
        Group.objects.filter(id=group.id)
        .prefetch_related(
            Prefetch('members', queryset=GroupMember.objects.prefetch_related('constraints')),
            'preferences',
        )
        .get()
    )

    generation_run = PlanGenerationRun.objects.create(
        group=group,
        input_snapshot_json=_json_safe(validated_data),
        constraints_snapshot_json=_json_safe(_build_constraints_snapshot(group)),
        optimizer_name=(
            PLANNER_OPTIMIZER_CP_SAT
            if requested_optimizer == 'cp_sat'
            else PLANNER_OPTIMIZER_DETERMINISTIC
        ),
        optimizer_version='v2' if requested_optimizer == 'cp_sat' else 'v1',
        status=GenerationRunStatus.PENDING,
    )

    try:
        start_date = validated_data['start_date']
        days_count = validated_data['days_count']
        meals_per_day = validated_data['meals_per_day']
        include_snacks = validated_data.get('include_snacks', False)
        budget_strictness = validated_data['budget_strictness']
        cooking_time_strictness = validated_data['cooking_time_strictness']
        repetition_allowed = validated_data['repetition_allowed']
        optimization_focus = validated_data['optimization_focus']

        meal_types = _get_meal_types(meals_per_day=meals_per_day, include_snacks=include_snacks)
        candidate_pool = _build_candidate_pool(
            group=group,
            meal_types=meal_types,
            budget_strictness=budget_strictness,
            cooking_time_strictness=cooking_time_strictness,
            optimization_focus=optimization_focus,
        )
        actual_optimizer_name = PLANNER_OPTIMIZER_DETERMINISTIC
        actual_optimizer_version = 'v1'
        selection = None
        if requested_optimizer == 'cp_sat':
            selection = _build_cp_sat_selection(
                group=group,
                days_count=days_count,
                meal_types=meal_types,
                candidate_pool=candidate_pool,
                repetition_allowed=repetition_allowed,
                optimization_focus=optimization_focus,
                budget_strictness=budget_strictness,
            )
            if selection is not None:
                actual_optimizer_name = PLANNER_OPTIMIZER_CP_SAT
                actual_optimizer_version = 'v2'

        if selection is None:
            selection = _build_deterministic_selection(
                days_count=days_count,
                meal_types=meal_types,
                candidate_pool=candidate_pool,
                repetition_allowed=repetition_allowed,
            )

        end_date = start_date + timedelta(days=days_count - 1)

        _deactivate_current_plans(group)

        meal_plan = MealPlan.objects.create(
            group=group,
            title=_format_plan_title(start_date),
            start_date=start_date,
            end_date=end_date,
            days_count=days_count,
            status=MealPlanStatus.GENERATED,
            is_current=True,
            created_by=user,
            optimizer_name=actual_optimizer_name,
            optimizer_version=actual_optimizer_version,
        )

        _persist_meal_plan_selection(
            meal_plan=meal_plan,
            group=group,
            start_date=start_date,
            days_count=days_count,
            meal_types=meal_types,
            selection=selection,
        )

        _compute_plan_scores(meal_plan)
        _build_shopping_list(meal_plan)
        _build_plan_explanations(meal_plan)

        generation_run.meal_plan = meal_plan
        generation_run.optimizer_name = actual_optimizer_name
        generation_run.optimizer_version = actual_optimizer_version
        generation_run.status = GenerationRunStatus.COMPLETED
        generation_run.execution_time_ms = int((perf_counter() - start_ts) * 1000)
        generation_run.save(
            update_fields=['meal_plan', 'optimizer_name', 'optimizer_version', 'status', 'execution_time_ms', 'updated_at']
        )
        try:
            from apps.feedback.models import Notification

            Notification.objects.create(
                user=user,
                type='plan_ready',
                title='Ваш план недели готов',
                message=f'Сгенерирован новый план для группы «{group.name}».',
                metadata_json={
                    'meal_plan_id': str(meal_plan.id),
                    'group_id': str(group.id),
                },
            )
        except Exception:
            pass
        return meal_plan

    except Exception as exc:
        generation_run.status = GenerationRunStatus.FAILED
        generation_run.error_message = str(exc)
        generation_run.execution_time_ms = int((perf_counter() - start_ts) * 1000)
        generation_run.save(
            update_fields=['status', 'error_message', 'execution_time_ms', 'updated_at']
        )
        raise


@transaction.atomic
def replace_meal_plan_item(*, item: MealPlanItem, replacement_recipe: Recipe) -> MealPlanItem:
    metrics = _planned_item_metrics(replacement_recipe, _to_decimal(item.servings_total or 1))

    item.recipe = replacement_recipe
    item.estimated_calories = metrics['estimated_calories']
    item.estimated_cost = metrics['estimated_cost']
    item.selection_score = Decimal('0.86')
    item.selection_reason_summary = 'Заменено вручную.'
    item.is_manually_replaced = True
    item.save(
        update_fields=[
            'recipe',
            'estimated_calories',
            'estimated_cost',
            'selection_score',
            'selection_reason_summary',
            'is_manually_replaced',
            'updated_at',
        ]
    )

    item.adaptations.all().delete()
    _build_member_adaptations_for_item(item, item.meal_plan_day.meal_plan.group)
    _aggregate_day_totals(item.meal_plan_day)
    _compute_plan_scores(item.meal_plan_day.meal_plan)
    _build_shopping_list(item.meal_plan_day.meal_plan)
    _build_plan_explanations(item.meal_plan_day.meal_plan)

    return item


@transaction.atomic
def create_meal_item_adaptation(*, item: MealPlanItem, member: GroupMember, adaptation_type: str) -> MealItemAdaptation:
    description_map = {
        AdaptationType.LOW_CARB: 'Меньше круп, больше овощей.',
        AdaptationType.HIGH_PROTEIN: 'Увеличена порция нежирного белка.',
        AdaptationType.CHILD_FRIENDLY: 'Менее острые специи и упрощённая подача для ребёнка.',
        AdaptationType.ALLERGEN_FREE: 'Убраны или заменены аллергенные ингредиенты.',
        AdaptationType.CHEAPER_VERSION: 'Заменены ингредиенты на более бюджетные.',
        AdaptationType.INGREDIENT_REMOVE: 'Убран один из необязательных ингредиентов.',
        AdaptationType.INGREDIENT_REPLACE: 'Заменён ингредиент на более подходящий.',
        AdaptationType.PORTION_CHANGE: 'Размер порции скорректирован под члена семьи.',
    }

    delta_map = {
        AdaptationType.LOW_CARB: {
            'price_delta': Decimal('-50.00'),
            'calorie_delta': Decimal('-140.00'),
            'protein_delta_g': Decimal('2.00'),
            'fat_delta_g': Decimal('1.00'),
            'carb_delta_g': Decimal('-24.00'),
        },
        AdaptationType.HIGH_PROTEIN: {
            'price_delta': Decimal('120.00'),
            'calorie_delta': Decimal('90.00'),
            'protein_delta_g': Decimal('12.00'),
            'fat_delta_g': Decimal('2.00'),
            'carb_delta_g': Decimal('0.00'),
        },
        AdaptationType.CHILD_FRIENDLY: {
            'price_delta': ZERO,
            'calorie_delta': ZERO,
            'protein_delta_g': ZERO,
            'fat_delta_g': ZERO,
            'carb_delta_g': ZERO,
        },
        AdaptationType.ALLERGEN_FREE: {
            'price_delta': Decimal('80.00'),
            'calorie_delta': Decimal('-20.00'),
            'protein_delta_g': ZERO,
            'fat_delta_g': ZERO,
            'carb_delta_g': ZERO,
        },
        AdaptationType.CHEAPER_VERSION: {
            'price_delta': Decimal('-150.00'),
            'calorie_delta': Decimal('-30.00'),
            'protein_delta_g': Decimal('-2.00'),
            'fat_delta_g': ZERO,
            'carb_delta_g': ZERO,
        },
        AdaptationType.INGREDIENT_REMOVE: {
            'price_delta': Decimal('-40.00'),
            'calorie_delta': Decimal('-25.00'),
            'protein_delta_g': ZERO,
            'fat_delta_g': ZERO,
            'carb_delta_g': Decimal('-4.00'),
        },
        AdaptationType.INGREDIENT_REPLACE: {
            'price_delta': Decimal('30.00'),
            'calorie_delta': ZERO,
            'protein_delta_g': Decimal('1.00'),
            'fat_delta_g': ZERO,
            'carb_delta_g': ZERO,
        },
        AdaptationType.PORTION_CHANGE: {
            'price_delta': Decimal('0.00'),
            'calorie_delta': Decimal('120.00'),
            'protein_delta_g': Decimal('6.00'),
            'fat_delta_g': Decimal('3.00'),
            'carb_delta_g': Decimal('10.00'),
        },
    }

    payload = delta_map[adaptation_type]

    adaptation = MealItemAdaptation.objects.create(
        meal_plan_item=item,
        member=member,
        adaptation_type=adaptation_type,
        description=description_map[adaptation_type],
        price_delta=payload['price_delta'],
        calorie_delta=payload['calorie_delta'],
        protein_delta_g=payload['protein_delta_g'],
        fat_delta_g=payload['fat_delta_g'],
        carb_delta_g=payload['carb_delta_g'],
    )

    return adaptation


def build_budget_analytics(meal_plan: MealPlan) -> dict:
    meal_plan = (
        MealPlan.objects.filter(id=meal_plan.id)
        .prefetch_related('days__items__recipe')
        .select_related('group')
        .get()
    )

    budget_limit = _to_decimal(meal_plan.group.budget_amount)
    planned_cost = _to_decimal(meal_plan.estimated_total_cost)
    remaining = (budget_limit - planned_cost).quantize(Decimal('0.01'))

    cost_by_day = []
    for day in meal_plan.days.all():
        cost_by_day.append(
            {
                'day_index': day.day_index,
                'plan_date': day.plan_date,
                'cost': day.estimated_daily_cost,
            }
        )

    items = (
        MealPlanItem.objects.filter(meal_plan_day__meal_plan=meal_plan)
        .select_related('recipe', 'meal_plan_day')
        .prefetch_related('recipe__ingredients_map__ingredient')
    )
    most_expensive = sorted(items, key=lambda x: _to_decimal(x.estimated_cost), reverse=True)[:5]
    most_expensive_meals = [
        {
            'meal_plan_item_id': str(item.id),
            'recipe_title': item.recipe.title,
            # Mobile client expects `cost` / `meal_type` / `day_index` —
            # keep `estimated_cost` for backwards compatibility.
            'cost': item.estimated_cost,
            'estimated_cost': item.estimated_cost,
            'meal_type': item.meal_type,
            'day_index': item.meal_plan_day.day_index,
        }
        for item in most_expensive
    ]

    savings_opportunities = []
    for item in items[:10]:
        for recipe_ingredient in item.recipe.ingredients_map.all():
            substitution = (
                IngredientSubstitution.objects.filter(
                    ingredient=recipe_ingredient.ingredient,
                    substitution_reason__in=['cheaper', 'child_friendly', 'higher_protein'],
                )
                .select_related('substitute_ingredient')
                .first()
            )
            if substitution and substitution.price_delta_estimate < 0:
                savings = abs(substitution.price_delta_estimate)
                savings_opportunities.append(
                    {
                        'meal_plan_item_id': str(item.id),
                        # Human-readable hint shown in the mobile UI.
                        'suggestion': (
                            f'Замените «{recipe_ingredient.ingredient.name}» на '
                            f'«{substitution.substitute_ingredient.name}» — '
                            f'сэкономите ~{savings} ₸ в рецепте «{item.recipe.title}».'
                        ),
                        'ingredient_name': recipe_ingredient.ingredient.name,
                        'suggested_substitute': substitution.substitute_ingredient.name,
                        'estimated_savings': savings,
                    }
                )
                if len(savings_opportunities) >= 5:
                    break
        if len(savings_opportunities) >= 5:
            break

    return {
        'budget_limit': budget_limit.quantize(Decimal('0.01')),
        'planned_cost': planned_cost.quantize(Decimal('0.01')),
        'remaining': remaining,
        'cost_by_day': cost_by_day,
        'most_expensive_meals': most_expensive_meals,
        'savings_opportunities': savings_opportunities,
    }


def build_nutrition_analytics(meal_plan: MealPlan) -> dict:
    meal_plan = (
        MealPlan.objects.filter(id=meal_plan.id)
        .prefetch_related('days__items__recipe__nutrition', 'group__members')
        .select_related('group')
        .get()
    )

    protein_total = ZERO
    fat_total = ZERO
    carb_total = ZERO
    micronutrients = defaultdict(Decimal)

    items = (
        MealPlanItem.objects.filter(meal_plan_day__meal_plan=meal_plan)
        .select_related('recipe', 'recipe__nutrition')
    )
    for item in items:
        nutrition = getattr(item.recipe, 'nutrition', None)
        if not nutrition:
            continue

        ratio = Decimal('1.00')
        if item.recipe.servings_default:
            ratio = _to_decimal(item.servings_total) / _to_decimal(item.recipe.servings_default)

        protein_total += _to_decimal(nutrition.protein_total_g) * ratio
        fat_total += _to_decimal(nutrition.fat_total_g) * ratio
        carb_total += _to_decimal(nutrition.carb_total_g) * ratio

        for key, value in (nutrition.micronutrients or {}).items():
            if not _is_aggregate_micronutrient_key(key):
                continue
            numeric_value = _as_optional_decimal(value)
            if numeric_value is None:
                continue
            micronutrients[key] += numeric_value * ratio

    member_fit = []
    group_members = meal_plan.group.members.all()
    members_count = max(group_members.count(), 1)
    days_count_dec = Decimal(str(max(meal_plan.days_count, 1)))

    # Per-day-per-member calories so we can compare with the daily target
    # (member.daily_calorie_target is daily, not weekly).
    total_calories_per_member_per_day = (
        _to_decimal(meal_plan.estimated_total_calories) / Decimal(str(members_count)) / days_count_dec
    )

    # Macro ratios across the week (independent from per-member breakdown)
    macro_grams_total = (protein_total + fat_total + carb_total) or Decimal('1')
    protein_ratio = (protein_total / macro_grams_total).quantize(Decimal('0.01'))
    fat_ratio = (fat_total / macro_grams_total).quantize(Decimal('0.01'))
    carb_ratio = (carb_total / macro_grams_total).quantize(Decimal('0.01'))

    for member in group_members:
        target_calories = Decimal(str(member.daily_calorie_target or 2000))
        calorie_fit = min(
            total_calories_per_member_per_day / target_calories, Decimal('1.00')
        ).quantize(Decimal('0.01'))
        member_fit.append(
            {
                'member_id': str(member.id),
                # Mobile expects `display_name` and the four numeric fields below;
                # `member_name` / *_fit kept for backwards compatibility.
                'display_name': member.display_name or 'Без имени',
                'member_name': member.display_name or 'Без имени',
                'target_calories': float(target_calories),
                'actual_calories': float(total_calories_per_member_per_day.quantize(Decimal('0.01'))),
                'protein_ratio': float(protein_ratio),
                'fat_ratio': float(fat_ratio),
                'carb_ratio': float(carb_ratio),
                'calorie_fit': calorie_fit,
                'protein_fit': Decimal('0.90'),
                'fat_fit': Decimal('0.85'),
                'carb_fit': Decimal('0.87'),
            }
        )

    return {
        'weekly_target_fit': meal_plan.nutrition_fit_score.quantize(Decimal('0.01')),
        # Mobile pie chart consumes 0-1 ratios; gram totals stay in `*_g_total`
        # for any analytics surface that needs absolute values.
        'macro_balance': {
            'protein': float(protein_ratio),
            'fat': float(fat_ratio),
            'carb': float(carb_ratio),
        },
        'macro_grams': {
            'protein_g': float(protein_total.quantize(Decimal('0.01'))),
            'fat_g': float(fat_total.quantize(Decimal('0.01'))),
            'carb_g': float(carb_total.quantize(Decimal('0.01'))),
        },
        'member_fit': member_fit,
        'micronutrients': {
            key: float(value.quantize(Decimal('0.01')))
            for key, value in micronutrients.items()
        },
    }

def build_shopping_list_with_pantry_adjustment(meal_plan: MealPlan) -> dict:
    shopping_list = getattr(meal_plan, 'shopping_list', None)
    if not shopping_list:
        shopping_list = _build_shopping_list(meal_plan)

    pantry_items = PantryItem.objects.filter(group=meal_plan.group).select_related('ingredient')

    pantry_map: dict[tuple[str, str], Decimal] = {}
    for pantry_item in pantry_items:
        key = (str(pantry_item.ingredient_id), pantry_item.unit.lower())
        pantry_map[key] = pantry_map.get(key, ZERO) + _to_decimal(pantry_item.quantity)

    adjusted_items = []
    total_estimated_cost = ZERO

    for item in shopping_list.items.select_related('ingredient').all():
        ingredient_id = str(item.ingredient_id) if item.ingredient_id else None
        if not ingredient_id:
            adjusted_items.append(
                {
                    'ingredient_name': item.display_name,
                    'required_quantity': item.total_quantity,
                    'pantry_quantity': ZERO,
                    'to_buy_quantity': item.total_quantity,
                    'unit': item.unit,
                    'estimated_price': item.estimated_price,
                }
            )
            total_estimated_cost += _to_decimal(item.estimated_price)
            continue

        key = (ingredient_id, item.unit.lower())
        pantry_quantity = pantry_map.get(key, ZERO)
        required_quantity = _to_decimal(item.total_quantity)
        to_buy_quantity = required_quantity - pantry_quantity
        if to_buy_quantity < ZERO:
            to_buy_quantity = ZERO

        adjusted_price = ZERO
        if required_quantity > ZERO and _to_decimal(item.estimated_price) > ZERO:
            adjusted_price = (
                (_to_decimal(item.estimated_price) * to_buy_quantity) / required_quantity
            ).quantize(Decimal('0.01'))

        total_estimated_cost += adjusted_price

        adjusted_items.append(
            {
                'ingredient_name': item.display_name,
                'required_quantity': required_quantity.quantize(Decimal('0.01')),
                'pantry_quantity': pantry_quantity.quantize(Decimal('0.01')),
                'to_buy_quantity': to_buy_quantity.quantize(Decimal('0.01')),
                'unit': item.unit,
                'estimated_price': adjusted_price,
            }
        )

    return {
        'total_estimated_cost': total_estimated_cost.quantize(Decimal('0.01')),
        'items': adjusted_items,
    }
def recompute_shopping_list_total(shopping_list: ShoppingList):
    total = ZERO
    for item in shopping_list.items.all():
        total += _to_decimal(item.estimated_price)
    shopping_list.total_estimated_cost = total.quantize(Decimal('0.01'))
    shopping_list.save(update_fields=['total_estimated_cost', 'updated_at'])
    return shopping_list


def build_price_comparison(meal_plan: MealPlan) -> dict:
    shopping_list = getattr(meal_plan, 'shopping_list', None)
    if not shopping_list:
        shopping_list = _build_shopping_list(meal_plan)

    items = shopping_list.items.select_related('ingredient').all()
    region_code = meal_plan.group.region_code

    stores = set()
    ingredient_store_prices = {}

    for item in items:
        if not item.ingredient:
            continue

        prices_qs = item.ingredient.prices.all()
        if region_code:
            prices_qs = prices_qs.filter(region_code=region_code)

        prices_qs = prices_qs.order_by('store_name', '-effective_from')
        latest_by_store = {}

        for price in prices_qs:
            store_name = price.store_name or 'Default store'
            if store_name not in latest_by_store:
                latest_by_store[store_name] = price
                stores.add(store_name)

        ingredient_store_prices[str(item.ingredient_id)] = latest_by_store

    if not stores:
        return {
            'stores': [],
            'best_option': None,
        }

    store_totals = []

    for store_name in sorted(stores):
        total = ZERO

        for item in items:
            if not item.ingredient:
                total += _to_decimal(item.estimated_price)
                continue

            price_map = ingredient_store_prices.get(str(item.ingredient_id), {})
            store_price = price_map.get(store_name)

            if not store_price:
                total += _to_decimal(item.estimated_price)
                continue

            total += _normalize_ingredient_cost(
                quantity=_to_decimal(item.total_quantity),
                quantity_unit=item.unit,
                price_amount=_to_decimal(store_price.price_amount),
                price_unit=store_price.price_unit,
            )

        store_totals.append(
            {
                'store_name': store_name,
                'total_estimated_cost': total.quantize(Decimal('0.01')),
            }
        )

    best_option = min(store_totals, key=lambda x: _to_decimal(x['total_estimated_cost'])) if store_totals else None

    return {
        'stores': store_totals,
        'best_option': best_option,
    }


@transaction.atomic
def clone_meal_plan(*, meal_plan: MealPlan, user, start_date=None) -> MealPlan:
    if start_date is None:
        start_date = meal_plan.start_date

    end_date = start_date + (meal_plan.end_date - meal_plan.start_date)

    cloned = MealPlan.objects.create(
        group=meal_plan.group,
        title=f'Копия — {meal_plan.title}',
        start_date=start_date,
        end_date=end_date,
        days_count=meal_plan.days_count,
        status=MealPlanStatus.DRAFT,
        is_current=False,
        optimizer_name=meal_plan.optimizer_name,
        optimizer_version=meal_plan.optimizer_version,
        created_by=user,
    )

    old_days = list(meal_plan.days.prefetch_related('items__adaptations').all())
    day_map = {}

    for day in old_days:
        new_day = MealPlanDay.objects.create(
            meal_plan=cloned,
            day_index=day.day_index,
            plan_date=start_date + (day.plan_date - meal_plan.start_date),
            estimated_daily_cost=day.estimated_daily_cost,
            estimated_daily_calories=day.estimated_daily_calories,
        )
        day_map[day.id] = new_day

    item_map = {}

    for day in old_days:
        new_day = day_map[day.id]
        for item in day.items.all():
            new_item = MealPlanItem.objects.create(
                meal_plan_day=new_day,
                recipe=item.recipe,
                meal_type=item.meal_type,
                servings_total=item.servings_total,
                estimated_cost=item.estimated_cost,
                estimated_calories=item.estimated_calories,
                selection_score=item.selection_score,
                selection_reason_summary=item.selection_reason_summary,
                is_manually_replaced=item.is_manually_replaced,
            )
            item_map[item.id] = new_item

    for day in old_days:
        for item in day.items.all():
            for adaptation in item.adaptations.all():
                MealItemAdaptation.objects.create(
                    meal_plan_item=item_map[item.id],
                    member=adaptation.member,
                    adaptation_type=adaptation.adaptation_type,
                    description=adaptation.description,
                    price_delta=adaptation.price_delta,
                    calorie_delta=adaptation.calorie_delta,
                    protein_delta_g=adaptation.protein_delta_g,
                    fat_delta_g=adaptation.fat_delta_g,
                    carb_delta_g=adaptation.carb_delta_g,
                    before_snapshot_json=adaptation.before_snapshot_json,
                    after_snapshot_json=adaptation.after_snapshot_json,
                )

    for explanation in meal_plan.explanations.all():
        PlanExplanation.objects.create(
            meal_plan=cloned,
            explanation_type=explanation.explanation_type,
            title=explanation.title,
            explanation_text=explanation.explanation_text,
            priority_order=explanation.priority_order,
            explanation_json=explanation.explanation_json,
        )

    _compute_plan_scores(cloned)
    _build_shopping_list(cloned)

    return cloned