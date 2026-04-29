from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import IngredientPrice
from .backfill_heuristic_prices import REFERENCE_KEYS, _build_base_prices, _estimate_price
from .normalize_priority_ingredient_links import TARGET_SPECS as NORMALIZATION_TARGET_SPECS


STABLE_NORMALIZED_NAMES = set(REFERENCE_KEYS) | set(NORMALIZATION_TARGET_SPECS.keys())
SUSPICIOUS_UNITS = {"unit", "cup", "to_taste", "g", "ml"}


class Command(BaseCommand):
    help = "Recompute existing heuristic_estimate price rows using the latest heuristic logic."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview heuristic price repairs without writing changes.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=120,
            help="How many sample updates to print.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        limit = options["limit"]
        base_prices = _build_base_prices()

        qs = (
            IngredientPrice.objects.filter(source_type="heuristic_estimate")
            .select_related("ingredient")
            .order_by("ingredient__normalized_name", "id")
        )

        changed_rows: list[str] = []
        changed = 0

        for price in qs:
            if price.ingredient.normalized_name in STABLE_NORMALIZED_NAMES:
                continue
            estimate = _estimate_price(price.ingredient, base_prices)

            should_repair = (
                price.price_unit in SUSPICIOUS_UNITS
                or price.price_unit != estimate.unit
            )
            if not should_repair:
                continue

            changed_fields = []
            if str(price.price_amount) != str(estimate.amount):
                changed_fields.append(f"amount {price.price_amount}->{estimate.amount}")
            if price.price_unit != estimate.unit:
                changed_fields.append(f"unit {price.price_unit}->{estimate.unit}")
            if str(price.confidence_score) != str(estimate.confidence):
                changed_fields.append(f"confidence {price.confidence_score}->{estimate.confidence}")

            if not changed_fields:
                continue

            changed_rows.append(
                f"{price.ingredient.normalized_name}\t" + ", ".join(changed_fields)
            )

            if dry_run:
                continue

            price.price_amount = estimate.amount
            price.price_unit = estimate.unit
            price.confidence_score = estimate.confidence
            price.save(update_fields=["price_amount", "price_unit", "confidence_score", "updated_at"])
            changed += 1

        if dry_run:
            self.stdout.write(self.style.WARNING(f"Dry run. would_update={len(changed_rows)}"))
            for row in changed_rows[:limit]:
                self.stdout.write(row)
            return

        self.stdout.write(self.style.SUCCESS(f"Repair finished. updated_prices={changed}"))
        for row in changed_rows[:limit]:
            self.stdout.write(row)
