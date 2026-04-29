from __future__ import annotations

from pathlib import Path

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Bootstrap the backend with versioned recipes, prices, normalization fixes, and nutrition."

    def add_arguments(self, parser):
        parser.add_argument(
            "--recipes-path",
            type=str,
            default="data/recipes_enriched.jsonl",
            help="Path to recipes_enriched.jsonl",
        )
        parser.add_argument(
            "--prices-path",
            type=str,
            default="data/prices-stat.csv",
            help="Path to official price CSV",
        )
        parser.add_argument(
            "--nutrition-path",
            type=str,
            default="data/nutrition_catalog.yaml",
            help="Path to generated USDA nutrition catalog YAML",
        )

    def handle(self, *args, **options):
        recipes_path = Path(options["recipes_path"])
        prices_path = Path(options["prices_path"])
        nutrition_path = Path(options["nutrition_path"])

        for required_path in (recipes_path, prices_path, nutrition_path):
            if not required_path.exists():
                raise CommandError(f"Required file not found: {required_path}")

        self.stdout.write(self.style.SUCCESS("Step 1/8: Import recipes"))
        call_command("import_recipes_enriched", path=str(recipes_path))

        self.stdout.write(self.style.SUCCESS("Step 2/8: Import official prices"))
        call_command("import_stat_prices", path=str(prices_path))

        self.stdout.write(self.style.SUCCESS("Step 3/8: Backfill heuristic prices"))
        call_command("backfill_heuristic_prices")

        self.stdout.write(self.style.SUCCESS("Step 4/8: Normalize ingredient links"))
        call_command("normalize_priority_ingredient_links", apply=True)

        self.stdout.write(self.style.SUCCESS("Step 5/8: Repair heuristic price rows"))
        call_command("repair_heuristic_prices")

        self.stdout.write(self.style.SUCCESS("Step 6/8: Repair suspicious recipe units"))
        call_command("repair_recipe_units", apply=True)

        self.stdout.write(self.style.SUCCESS("Step 7/8: Recalculate recipe costs"))
        call_command("recalculate_recipe_costs")

        self.stdout.write(self.style.SUCCESS("Step 8/8: Backfill recipe nutrition"))
        call_command("backfill_recipe_nutrition", path=str(nutrition_path))

        self.stdout.write(self.style.SUCCESS("Bootstrap finished successfully."))
