from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import RecipeIngredient


@dataclass(frozen=True, slots=True)
class UnitRule:
    source_names: tuple[str, ...]
    from_unit: str
    to_unit: str
    max_quantity: Decimal | None = None
    note: str = "unit_repair"


RULES = [
    UnitRule(("перец_чёрный_молотый", "паприка_молотая", "перец_душистый_молотый", "приправа_для_рыбы", "барбарис_сушеный_молотый", "чеснок_сушёный", "дрожжи_сухие", "сода", "сода_пищевая"), "l", "tsp", Decimal("5"), "powder_l_to_tsp"),
    UnitRule(("масло_сливочное", "или_масло_сливочное", "или_масло_топленое", "или_топлёное_масло", "сахарная_пудра", "зелень_свежая", "зелень_мелко_нарубленная", "укроп", "сок_лимона", "лимон", "сыр_твердый", "или_томат-паста", "водка", "вино_белое", "уксус_столовый", "уксус_или_лимонный_сок", "milk", "мед"), "l", "tbsp", Decimal("10"), "ingredient_l_to_tbsp"),
]


class Command(BaseCommand):
    help = "Repair recipe ingredient units where 'л' was likely parsed as liter instead of spoon."

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
            help="How many sample changes to print.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        apply_changes = options["apply"]
        limit = options["limit"]

        updates: list[str] = []
        changed = 0

        for rule in RULES:
            qs = (
                RecipeIngredient.objects.select_related("recipe", "ingredient")
                .filter(ingredient__normalized_name__in=rule.source_names, unit=rule.from_unit)
                .order_by("recipe__title", "ingredient__normalized_name", "id")
            )
            for link in qs:
                quantity = Decimal(str(link.quantity))
                if rule.max_quantity is not None and quantity > rule.max_quantity:
                    continue
                updates.append(
                    f"{link.ingredient.normalized_name}\t{quantity} {rule.from_unit}->{rule.to_unit}\t{link.recipe.title}\t{rule.note}"
                )
                if not apply_changes:
                    continue
                link.unit = rule.to_unit
                link.save(update_fields=["unit", "updated_at"])
                changed += 1

        self.stdout.write(self.style.SUCCESS("\n=== RECIPE UNIT REPAIR PLAN ==="))
        self.stdout.write(f"Rules: {len(RULES)}")
        self.stdout.write(f"Candidate updates: {len(updates)}")
        self.stdout.write(f"Mode: {'APPLY' if apply_changes else 'DRY-RUN'}")
        for row in updates[:limit]:
            self.stdout.write(row)

        if apply_changes:
            self.stdout.write(self.style.SUCCESS(f"Applied successfully. updated_links={changed}"))
