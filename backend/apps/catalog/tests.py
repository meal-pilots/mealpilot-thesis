import json
from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.management import call_command
from django.test import TestCase

from apps.catalog.models import Recipe, RecipeCategory, RecipeDifficulty, RecipeNutrition, RecipeStatus


class ImportRecipeNutritionCommandTests(TestCase):
    def test_import_recipe_nutrition_updates_existing_recipe(self):
        recipe = Recipe.objects.create(
            title="Nutrition Import Recipe",
            slug="nutrition-import-recipe-1",
            source_name="demo",
            source_recipe_id="1",
            source_url="https://example.com/recipes/1",
            canonical_url="https://example.com/recipes/1",
            short_description="demo",
            long_description="demo",
            cuisine_type="traditional_home",
            region_code="KZ",
            is_local_cuisine=True,
            category=RecipeCategory.LUNCH,
            difficulty_level=RecipeDifficulty.EASY,
            prep_time_minutes=10,
            cook_time_minutes=20,
            servings_default=4,
            status=RecipeStatus.PUBLISHED,
        )
        RecipeNutrition.objects.create(recipe=recipe)

        payload = {
            "recipe_id": "1",
            "source": "demo",
            "source_url": "https://example.com/recipes/1",
            "canonical_url": "https://example.com/recipes/1",
            "title": "Nutrition Import Recipe",
            "yields": "4 servings",
            "nutrition_per_serving": {
                "calories": 500,
                "protein_g": 20,
                "fat_g": 10,
                "carb_g": 50,
                "micronutrients": {"source_type": "usda_ingredient_aggregation"},
            },
        }

        with TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "recipes_enriched.jsonl"
            path.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
            call_command("import_recipe_nutrition", path=str(path))

        nutrition = RecipeNutrition.objects.get(recipe=recipe)
        self.assertEqual(nutrition.calories_total, 2000)
        self.assertEqual(nutrition.calories_per_serving, 500)
        self.assertEqual(nutrition.protein_total_g, 80)
        self.assertEqual(nutrition.protein_per_serving_g, 20)
        self.assertEqual(nutrition.micronutrients["source_type"], "usda_ingredient_aggregation")
