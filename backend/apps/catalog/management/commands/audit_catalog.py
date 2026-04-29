from collections import Counter
import json
import re
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db.models import Count, Q

from apps.catalog.models import Ingredient, Recipe


SUSPICIOUS_UNIT_WORDS = {
    'г', 'гр', 'кг', 'мл', 'л', 'шт', 'шт.', 'стакан', 'стакана', 'стаканов',
    'ч. л.', 'ст. л.', 'по вкусу', 'щепотка', 'ложка', 'ложки', 'ложек'
}


def is_suspicious_ingredient_name(name: str) -> list[str]:
    reasons = []
    raw = (name or '').strip()
    lower = raw.lower()

    if not raw:
        reasons.append('empty')

    if len(raw) <= 2:
        reasons.append('too_short')

    if re.search(r'\d', raw):
        reasons.append('contains_digits')

    if any(unit_word in lower for unit_word in SUSPICIOUS_UNIT_WORDS):
        reasons.append('contains_unit_word')

    if ' - ' in raw:
        reasons.append('contains_dash_quantity_pattern')

    if re.search(r'[;,:/\\]', raw):
        reasons.append('contains_special_punctuation')

    if raw != raw.strip():
        reasons.append('leading_or_trailing_spaces')

    if '  ' in raw:
        reasons.append('double_spaces')

    return reasons


class Command(BaseCommand):
    help = 'Audit imported recipe catalog quality and print data quality metrics.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=15,
            help='How many sample problematic records to print per section.',
        )
        parser.add_argument(
            '--export-json',
            type=str,
            default='',
            help='Optional path to save audit summary as JSON.',
        )

    def handle(self, *args, **options):
        limit = options['limit']
        export_json = options['export_json']

        recipes = Recipe.objects.all()
        ingredients = Ingredient.objects.all()

        total_recipes = recipes.count()
        published_recipes = recipes.filter(status='published').count()
        local_recipes = recipes.filter(is_local_cuisine=True).count()

        recipes_without_steps = (
            recipes.annotate(steps_count=Count('steps'))
            .filter(steps_count=0)
        )
        recipes_without_ingredients = (
            recipes.annotate(ingredients_count=Count('ingredients_map'))
            .filter(ingredients_count=0)
        )
        recipes_without_image = recipes.filter(Q(image_url__isnull=True) | Q(image_url=''))
        recipes_without_source_url = recipes.filter(Q(source_url__isnull=True) | Q(source_url=''))
        recipes_zero_time = recipes.filter(total_time_minutes=0)
        recipes_zero_cost = recipes.filter(estimated_cost=0)
        recipes_zero_nutrition = recipes.filter(nutrition__calories_total=0)

        category_counts = list(
            recipes.values('category')
            .annotate(total=Count('id'))
            .order_by('-total')
        )

        cuisine_counts = list(
            recipes.values('cuisine_type')
            .annotate(total=Count('id'))
            .order_by('-total')[:20]
        )

        top_ingredients = list(
            Ingredient.objects.annotate(recipe_count=Count('recipe_links'))
            .order_by('-recipe_count', 'name')[:20]
            .values('name', 'normalized_name', 'recipe_count')
        )

        suspicious_ingredients = []
        for ingredient in ingredients.only('id', 'name', 'normalized_name'):
            reasons = is_suspicious_ingredient_name(ingredient.name)
            if reasons:
                suspicious_ingredients.append(
                    {
                        'id': str(ingredient.id),
                        'name': ingredient.name,
                        'normalized_name': ingredient.normalized_name,
                        'reasons': reasons,
                    }
                )

        suspicious_ingredients = suspicious_ingredients[: max(limit, 30)]

        duplicate_titles = list(
            recipes.values('title')
            .annotate(total=Count('id'))
            .filter(total__gt=1)
            .order_by('-total', 'title')[:20]
        )

        sample_without_steps = list(
            recipes_without_steps.values('id', 'title', 'category', 'source_url')[:limit]
        )
        sample_without_ingredients = list(
            recipes_without_ingredients.values('id', 'title', 'category', 'source_url')[:limit]
        )
        sample_without_image = list(
            recipes_without_image.values('id', 'title', 'category', 'source_url')[:limit]
        )
        sample_zero_cost = list(
            recipes_zero_cost.values('id', 'title', 'category', 'estimated_cost')[:limit]
        )
        sample_zero_nutrition = list(
            recipes_zero_nutrition.values('id', 'title', 'category')[:limit]
        )
        sample_zero_time = list(
            recipes_zero_time.values('id', 'title', 'category', 'prep_time_minutes', 'cook_time_minutes', 'total_time_minutes')[:limit]
        )

        summary = {
            'totals': {
                'total_recipes': total_recipes,
                'published_recipes': published_recipes,
                'local_recipes': local_recipes,
                'total_ingredients': ingredients.count(),
            },
            'quality_flags': {
                'recipes_without_steps': recipes_without_steps.count(),
                'recipes_without_ingredients': recipes_without_ingredients.count(),
                'recipes_without_image': recipes_without_image.count(),
                'recipes_without_source_url': recipes_without_source_url.count(),
                'recipes_zero_time': recipes_zero_time.count(),
                'recipes_zero_cost': recipes_zero_cost.count(),
                'recipes_zero_nutrition': recipes_zero_nutrition.count(),
                'duplicate_titles': len(duplicate_titles),
                'suspicious_ingredients': len(suspicious_ingredients),
            },
            'category_counts': category_counts,
            'cuisine_counts_top': cuisine_counts,
            'top_ingredients': top_ingredients,
            'duplicate_titles_top': duplicate_titles,
            'samples': {
                'without_steps': sample_without_steps,
                'without_ingredients': sample_without_ingredients,
                'without_image': sample_without_image,
                'zero_cost': sample_zero_cost,
                'zero_nutrition': sample_zero_nutrition,
                'zero_time': sample_zero_time,
                'suspicious_ingredients': suspicious_ingredients[:limit],
            },
        }

        self.stdout.write(self.style.SUCCESS('\n=== CATALOG AUDIT SUMMARY ==='))
        self.stdout.write(f'Total recipes: {total_recipes}')
        self.stdout.write(f'Published recipes: {published_recipes}')
        self.stdout.write(f'Local cuisine recipes: {local_recipes}')
        self.stdout.write(f'Total ingredients: {ingredients.count()}')

        self.stdout.write(self.style.WARNING('\n=== QUALITY FLAGS ==='))
        self.stdout.write(f'Recipes without steps: {recipes_without_steps.count()}')
        self.stdout.write(f'Recipes without ingredients: {recipes_without_ingredients.count()}')
        self.stdout.write(f'Recipes without image: {recipes_without_image.count()}')
        self.stdout.write(f'Recipes without source_url: {recipes_without_source_url.count()}')
        self.stdout.write(f'Recipes with zero total_time_minutes: {recipes_zero_time.count()}')
        self.stdout.write(f'Recipes with zero estimated_cost: {recipes_zero_cost.count()}')
        self.stdout.write(f'Recipes with zero nutrition calories_total: {recipes_zero_nutrition.count()}')
        self.stdout.write(f'Duplicate titles: {len(duplicate_titles)}')
        self.stdout.write(f'Suspicious ingredients: {len(suspicious_ingredients)}')

        self.stdout.write(self.style.SUCCESS('\n=== CATEGORY COUNTS ==='))
        for row in category_counts:
            self.stdout.write(f"{row['category']}: {row['total']}")

        self.stdout.write(self.style.SUCCESS('\n=== TOP CUISINES ==='))
        for row in cuisine_counts:
            self.stdout.write(f"{row['cuisine_type']}: {row['total']}")

        self.stdout.write(self.style.SUCCESS('\n=== TOP INGREDIENTS ==='))
        for row in top_ingredients:
            self.stdout.write(
                f"{row['name']} ({row['normalized_name']}): used in {row['recipe_count']} recipes"
            )

        if duplicate_titles:
            self.stdout.write(self.style.WARNING('\n=== DUPLICATE TITLES ==='))
            for row in duplicate_titles[:limit]:
                self.stdout.write(f"{row['title']}: {row['total']}")

        def print_sample_block(title: str, rows: list[dict]):
            if not rows:
                return
            self.stdout.write(self.style.WARNING(f'\n=== {title} ==='))
            for row in rows:
                self.stdout.write(json.dumps(row, ensure_ascii=False, default=str))

        print_sample_block('SAMPLE RECIPES WITHOUT STEPS', sample_without_steps)
        print_sample_block('SAMPLE RECIPES WITHOUT INGREDIENTS', sample_without_ingredients)
        print_sample_block('SAMPLE RECIPES WITHOUT IMAGE', sample_without_image)
        print_sample_block('SAMPLE RECIPES WITH ZERO COST', sample_zero_cost)
        print_sample_block('SAMPLE RECIPES WITH ZERO NUTRITION', sample_zero_nutrition)
        print_sample_block('SAMPLE RECIPES WITH ZERO TIME', sample_zero_time)
        print_sample_block('SUSPICIOUS INGREDIENTS', suspicious_ingredients[:limit])

        if export_json:
            output_path = Path(export_json)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(
                json.dumps(summary, ensure_ascii=False, indent=2, default=str),
                encoding='utf-8',
            )
            self.stdout.write(self.style.SUCCESS(f'\nAudit JSON exported to: {output_path}'))