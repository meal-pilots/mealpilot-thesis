from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.catalog.models import Recipe, RecipeCategory, RecipeDifficulty, RecipeNutrition, RecipeStatus
from apps.groups.models import BudgetPeriodType, Group, GroupType

from . import services
from .services import _build_candidate_pool, _build_cp_sat_selection, _suggest_servings_total


class PlanningCandidatePoolTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="planner@example.com",
            password="StrongPass123",
            full_name="Planner Test User",
        )

    def _make_group(self, group_type: str) -> Group:
        return Group.objects.create(
            owner_user=self.user,
            name=f"{group_type} group",
            group_type=group_type,
            planning_days_default=3,
            meals_per_day_default=3,
            currency_code="KZT",
            region_code="KZ",
            budget_period_type=BudgetPeriodType.WEEKLY,
            budget_amount="40000.00",
        )

    def _make_recipe(
        self,
        *,
        title: str,
        category: str,
        estimated_cost: str = "1200.00",
        is_child_friendly: bool = False,
    ) -> Recipe:
        return Recipe.objects.create(
            title=title,
            short_description=title,
            long_description=title,
            cuisine_type="traditional_home",
            region_code="KZ",
            is_local_cuisine=True,
            category=category,
            difficulty_level=RecipeDifficulty.EASY,
            prep_time_minutes=10,
            cook_time_minutes=20,
            servings_default=2,
            estimated_cost=estimated_cost,
            is_child_friendly=is_child_friendly,
            status=RecipeStatus.PUBLISHED,
        )

    def test_non_child_friendly_dinner_remains_eligible_for_adults_kids(self):
        group = self._make_group(GroupType.ADULTS_KIDS)
        dinner = self._make_recipe(
            title="Шашлык по-казахски",
            category=RecipeCategory.DINNER,
            is_child_friendly=False,
        )

        candidate_pool = _build_candidate_pool(
            group=group,
            meal_types=[RecipeCategory.DINNER],
            budget_strictness="medium",
            cooking_time_strictness="medium",
            optimization_focus=["budget"],
        )

        self.assertIn(dinner, candidate_pool[RecipeCategory.DINNER])

    def test_candidate_pool_excludes_pseudo_recipes(self):
        group = self._make_group(GroupType.TWO_ADULTS)
        real_lunch = self._make_recipe(
            title="Сорпа",
            category=RecipeCategory.LUNCH,
        )
        self._make_recipe(
            title="Тесто для бешбармак",
            category=RecipeCategory.LUNCH,
            estimated_cost="300.00",
        )
        real_dinner = self._make_recipe(
            title="Шашлык по-казахски",
            category=RecipeCategory.DINNER,
        )
        self._make_recipe(
            title="Чай по-казахски",
            category=RecipeCategory.DINNER,
            estimated_cost="50.00",
        )

        candidate_pool = _build_candidate_pool(
            group=group,
            meal_types=[RecipeCategory.LUNCH, RecipeCategory.DINNER],
            budget_strictness="medium",
            cooking_time_strictness="medium",
            optimization_focus=["budget", "speed"],
        )

        self.assertEqual(candidate_pool[RecipeCategory.LUNCH], [real_lunch])
        self.assertEqual(candidate_pool[RecipeCategory.DINNER], [real_dinner])

    def test_cp_sat_selection_respects_no_repeat_when_alternative_exists(self):
        if services.cp_model is None:
            self.skipTest("ortools is not installed")

        group = self._make_group(GroupType.TWO_ADULTS)
        recipe_one = self._make_recipe(
            title="Сорпа",
            category=RecipeCategory.LUNCH,
            estimated_cost="800.00",
        )
        recipe_two = self._make_recipe(
            title="Кеспе с мясом",
            category=RecipeCategory.LUNCH,
            estimated_cost="900.00",
        )
        RecipeNutrition.objects.create(recipe=recipe_one, calories_total="600", protein_total_g="30", fat_total_g="20", carb_total_g="40", calories_per_serving="300", protein_per_serving_g="15", fat_per_serving_g="10", carb_per_serving_g="20")
        RecipeNutrition.objects.create(recipe=recipe_two, calories_total="620", protein_total_g="28", fat_total_g="18", carb_total_g="50", calories_per_serving="310", protein_per_serving_g="14", fat_per_serving_g="9", carb_per_serving_g="25")

        candidate_pool = _build_candidate_pool(
            group=group,
            meal_types=[RecipeCategory.LUNCH],
            budget_strictness="medium",
            cooking_time_strictness="medium",
            optimization_focus=["budget", "nutrition"],
        )
        selection = _build_cp_sat_selection(
            group=group,
            days_count=2,
            meal_types=[RecipeCategory.LUNCH],
            candidate_pool=candidate_pool,
            repetition_allowed=0,
            optimization_focus=["budget", "nutrition"],
            budget_strictness="medium",
        )

        self.assertIsNotNone(selection)
        selected_titles = {
            selection[(1, RecipeCategory.LUNCH)].title,
            selection[(2, RecipeCategory.LUNCH)].title,
        }
        self.assertEqual(selected_titles, {recipe_one.title, recipe_two.title})

    def test_low_calorie_recipe_gets_scaled_servings(self):
        group = self._make_group(GroupType.SOLO)
        low_calorie = self._make_recipe(
            title="Легкий салат",
            category=RecipeCategory.BREAKFAST,
            estimated_cost="300.00",
        )
        RecipeNutrition.objects.create(
            recipe=low_calorie,
            calories_total="400",
            protein_total_g="10",
            fat_total_g="5",
            carb_total_g="20",
            calories_per_serving="100",
            protein_per_serving_g="2.5",
            fat_per_serving_g="1.25",
            carb_per_serving_g="5",
        )

        servings = _suggest_servings_total(
            low_calorie,
            group=group,
            meal_types=[RecipeCategory.BREAKFAST, RecipeCategory.LUNCH, RecipeCategory.DINNER],
            meal_type=RecipeCategory.BREAKFAST,
        )

        self.assertGreater(servings, 1)
