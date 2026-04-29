"""Apply the unit-aware post-normalization to every RecipeIngredient already in DB.

Use case: we improved the parser (spice / fresh-herb auto-conversion to tsp,
0.05 kg → grams, etc.) but recipes imported with the old parser remain
broken. Re-running `import_recipes_enriched` only touches recipes still
present in the JSONL feed; older scraped recipes (Мясо по-казахски and
similar) keep their bad units forever.

This command sweeps every RecipeIngredient row and runs the new
`_post_normalize_unit` against the ingredient's saved name + unit. Cheap,
idempotent, fixes tens of thousands of rows in seconds.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import RecipeIngredient
from apps.catalog.management.commands.import_recipes_enriched import _post_normalize_unit


class Command(BaseCommand):
    help = 'Re-apply unit normalization to every existing RecipeIngredient row.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument('--limit', type=int, default=None)

    @transaction.atomic
    def handle(self, *args, **options):
        qs = RecipeIngredient.objects.select_related('ingredient').all()
        if options['limit']:
            qs = qs[: options['limit']]

        examined = 0
        updated = 0
        for ri in qs.iterator(chunk_size=500):
            examined += 1
            name = ri.ingredient.name or ri.ingredient.normalized_name.replace('_', ' ')
            new_qty, new_unit = _post_normalize_unit(name, ri.quantity, ri.unit)
            if new_unit != ri.unit or new_qty != ri.quantity:
                if not options['dry_run']:
                    ri.unit = new_unit
                    ri.quantity = new_qty
                    ri.save(update_fields=['unit', 'quantity', 'updated_at'])
                updated += 1

        verb = 'would_update' if options['dry_run'] else 'updated'
        self.stdout.write(
            self.style.SUCCESS(
                f'Examined {examined} rows, {verb}={updated}'
            )
        )
