from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Recipe
from apps.planning.services import estimate_recipe_cost


class Command(BaseCommand):
    help = "Recalculate cached recipe estimated_cost values from current ingredient prices."

    @transaction.atomic
    def handle(self, *args, **options):
        updated = 0
        recipes = Recipe.objects.prefetch_related("ingredients_map__ingredient__prices").all()
        for recipe in recipes:
            recipe.estimated_cost = estimate_recipe_cost(recipe, region_code=recipe.region_code or "KZ")
            recipe.save(update_fields=["estimated_cost"])
            updated += 1
        self.stdout.write(self.style.SUCCESS(f"Recipe cost recalculation finished. updated_recipes={updated}"))
