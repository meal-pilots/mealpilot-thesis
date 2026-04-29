from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.catalog.models import Recipe, RecipeNutrition
from .import_recipes_enriched import _build_recipe_slug, _extract_nutrition_per_serving, _parse_servings


class Command(BaseCommand):
    help = "Import only recipe nutrition from recipes_enriched.jsonl without rewriting ingredients or tags."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            type=str,
            default="data/recipes_enriched.jsonl",
            help="Path to recipes_enriched.jsonl",
        )

    def _get_recipe(self, payload: dict) -> Recipe | None:
        canonical_url = payload.get("canonical_url")
        if canonical_url:
            recipe = Recipe.objects.filter(canonical_url=canonical_url).first()
            if recipe is not None:
                return recipe

        source_url = payload.get("source_url")
        if source_url:
            recipe = Recipe.objects.filter(source_url=source_url).first()
            if recipe is not None:
                return recipe

        source_name = str(payload.get("source") or "").strip()
        source_recipe_id = str(payload.get("recipe_id") or "").strip()
        if source_name and source_recipe_id:
            recipe = Recipe.objects.filter(
                source_name=source_name,
                source_recipe_id=source_recipe_id,
            ).first()
            if recipe is not None:
                return recipe

        title = str(payload.get("title") or "").strip()
        if title:
            slug = _build_recipe_slug(title, payload.get("recipe_id"))
            return Recipe.objects.filter(slug=slug).first()
        return None

    @transaction.atomic
    def handle(self, *args, **options):
        input_path = Path(options["path"])
        if not input_path.exists():
            raise CommandError(f"File not found: {input_path}")

        updated_recipes = 0
        skipped_without_recipe = 0
        skipped_without_nutrition = 0

        with input_path.open("r", encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, start=1):
                line = line.strip()
                if not line:
                    continue

                try:
                    payload = json.loads(line)
                except json.JSONDecodeError as exc:
                    self.stdout.write(self.style.WARNING(f"[line {line_number}] skipped invalid json: {exc}"))
                    continue

                nutrition_payload = payload.get("nutrition_per_serving") or {}
                if not isinstance(nutrition_payload, dict) or not nutrition_payload:
                    skipped_without_nutrition += 1
                    continue

                recipe = self._get_recipe(payload)
                if recipe is None:
                    skipped_without_recipe += 1
                    continue

                servings_default = recipe.servings_default or _parse_servings(payload.get("yields", ""))
                defaults = _extract_nutrition_per_serving(payload, servings_default)
                RecipeNutrition.objects.update_or_create(recipe=recipe, defaults=defaults)
                updated_recipes += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Nutrition import finished. "
                f"updated_recipes={updated_recipes}, "
                f"skipped_without_recipe={skipped_without_recipe}, "
                f"skipped_without_nutrition={skipped_without_nutrition}"
            )
        )
