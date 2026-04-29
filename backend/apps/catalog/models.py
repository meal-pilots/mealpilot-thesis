from django.conf import settings
from django.db import models
from django.utils.text import slugify

from apps.common.models import UUIDTimeStampedModel


class RecipeCategory(models.TextChoices):
    BREAKFAST = 'breakfast', 'Breakfast'
    LUNCH = 'lunch', 'Lunch'
    DINNER = 'dinner', 'Dinner'
    SNACK = 'snack', 'Snack'


class RecipeDifficulty(models.TextChoices):
    EASY = 'easy', 'Easy'
    MEDIUM = 'medium', 'Medium'
    HARD = 'hard', 'Hard'


class RecipeStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PUBLISHED = 'published', 'Published'
    ARCHIVED = 'archived', 'Archived'


class SubstitutionReason(models.TextChoices):
    CHEAPER = 'cheaper', 'Cheaper'
    LOW_CARB = 'low_carb', 'Low carb'
    ALLERGEN_FREE = 'allergen_free', 'Allergen free'
    CHILD_FRIENDLY = 'child_friendly', 'Child friendly'
    HIGHER_PROTEIN = 'higher_protein', 'Higher protein'


class Tag(UUIDTimeStampedModel):
    key = models.CharField(max_length=64, unique=True)
    label = models.CharField(max_length=120)

    class Meta:
        ordering = ['label']

    def __str__(self) -> str:
        return self.label


class Ingredient(UUIDTimeStampedModel):
    name = models.CharField(max_length=255)
    normalized_name = models.CharField(max_length=255, unique=True)
    category = models.CharField(max_length=64)
    default_unit = models.CharField(max_length=32)
    is_common_allergen = models.BooleanField(default=False)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['normalized_name']),
            models.Index(fields=['category']),
        ]

    def __str__(self) -> str:
        return self.name


class IngredientPrice(UUIDTimeStampedModel):
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name='prices',
    )
    store_name = models.CharField(max_length=255, blank=True, default='')
    region_code = models.CharField(max_length=32)
    price_amount = models.DecimalField(max_digits=12, decimal_places=2)
    price_unit = models.CharField(max_length=32)
    effective_from = models.DateField()
    effective_to = models.DateField(blank=True, null=True)
    source_type = models.CharField(max_length=32, default='manual')
    confidence_score = models.DecimalField(max_digits=4, decimal_places=2, default=0.80)

    class Meta:
        ordering = ['-effective_from']
        indexes = [
            models.Index(fields=['ingredient', 'region_code']),
            models.Index(fields=['region_code', 'store_name']),
        ]

    def __str__(self) -> str:
        store = self.store_name or 'Default store'
        return f'{self.ingredient.name} - {store} - {self.price_amount}/{self.price_unit}'


class IngredientSubstitution(UUIDTimeStampedModel):
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name='substitutions_from',
    )
    substitute_ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name='substitutions_to',
    )
    substitution_reason = models.CharField(max_length=32, choices=SubstitutionReason.choices)
    price_delta_estimate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    nutrition_delta_json = models.JSONField(default=dict, blank=True)
    confidence_score = models.DecimalField(max_digits=4, decimal_places=2, default=0.80)

    class Meta:
        unique_together = ('ingredient', 'substitute_ingredient', 'substitution_reason')
        indexes = [
            models.Index(fields=['ingredient', 'substitution_reason']),
        ]

    def __str__(self) -> str:
        return f'{self.ingredient.name} -> {self.substitute_ingredient.name}'


class Recipe(UUIDTimeStampedModel):
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)

    source_name = models.CharField(max_length=120, blank=True, default='')
    source_recipe_id = models.CharField(max_length=120, blank=True, default='')
    source_url = models.URLField(blank=True, null=True)
    canonical_url = models.URLField(blank=True, null=True)
    language = models.CharField(max_length=16, blank=True, default='')
    source_metadata = models.JSONField(default=dict, blank=True)

    short_description = models.CharField(max_length=500)
    long_description = models.TextField(blank=True)
    cuisine_type = models.CharField(max_length=64)
    region_code = models.CharField(max_length=32, default='KZ')
    is_local_cuisine = models.BooleanField(default=False)
    category = models.CharField(max_length=16, choices=RecipeCategory.choices)
    difficulty_level = models.CharField(
        max_length=16,
        choices=RecipeDifficulty.choices,
        default=RecipeDifficulty.EASY,
    )
    prep_time_minutes = models.PositiveSmallIntegerField(default=0)
    cook_time_minutes = models.PositiveSmallIntegerField(default=0)
    total_time_minutes = models.PositiveSmallIntegerField(default=0)
    servings_default = models.PositiveSmallIntegerField(default=1)
    estimated_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Denormalized cached cost for fast filtering and feed rendering.',
    )
    is_child_friendly = models.BooleanField(default=False)
    image_url = models.URLField(blank=True, null=True)
    video_url = models.URLField(blank=True, null=True)
    chef_note = models.TextField(blank=True)
    seasonality_score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        blank=True,
        null=True,
    )
    quality_score = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=0,
        help_text='ETL-derived quality score [0..1]; planner only consumes recipes above the configured threshold.',
    )
    quality_breakdown = models.JSONField(
        default=dict,
        blank=True,
        help_text='Component scores explaining quality_score (nutrition coverage, ingredient match, etc).',
    )
    status = models.CharField(
        max_length=16,
        choices=RecipeStatus.choices,
        default=RecipeStatus.DRAFT,
    )

    class Meta:
        ordering = ['title']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['cuisine_type']),
            models.Index(fields=['status']),
            models.Index(fields=['total_time_minutes']),
            models.Index(fields=['estimated_cost']),
            models.Index(fields=['status', 'quality_score']),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title, allow_unicode=True)
            self.slug = base_slug or f'recipe-{self.source_recipe_id or "manual"}'
        self.total_time_minutes = (self.prep_time_minutes or 0) + (self.cook_time_minutes or 0)
        super().save(*args, **kwargs)
    def __str__(self) -> str:
        return self.title


class RecipeTag(UUIDTimeStampedModel):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='recipe_tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='recipe_tags')

    class Meta:
        unique_together = ('recipe', 'tag')
        indexes = [
            models.Index(fields=['recipe', 'tag']),
        ]

    def __str__(self) -> str:
        return f'{self.recipe.title} - {self.tag.label}'


class RecipeStep(UUIDTimeStampedModel):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='steps')
    step_order = models.PositiveSmallIntegerField()
    instruction_text = models.TextField()
    duration_minutes = models.PositiveSmallIntegerField(blank=True, null=True)
    is_optional = models.BooleanField(default=False)

    class Meta:
        ordering = ['step_order']
        unique_together = ('recipe', 'step_order')

    def __str__(self) -> str:
        return f'{self.recipe.title} - Step {self.step_order}'


class RecipeIngredient(UUIDTimeStampedModel):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='ingredients_map')
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name='recipe_links')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=32)
    is_optional = models.BooleanField(default=False)
    preparation_note = models.CharField(max_length=255, blank=True)
    substitution_group_id = models.UUIDField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['recipe', 'ingredient']),
        ]

    def __str__(self) -> str:
        return f'{self.recipe.title} - {self.ingredient.name}'


class RecipeNutrition(UUIDTimeStampedModel):
    recipe = models.OneToOneField(Recipe, on_delete=models.CASCADE, related_name='nutrition')
    calories_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    protein_total_g = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fat_total_g = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    carb_total_g = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    calories_per_serving = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    protein_per_serving_g = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fat_per_serving_g = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    carb_per_serving_g = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    micronutrients = models.JSONField(default=dict, blank=True)

    def __str__(self) -> str:
        return f'Nutrition for {self.recipe.title}'


class FavoriteRecipe(UUIDTimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorite_recipes',
    )
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name='favorited_by',
    )

    class Meta:
        unique_together = ('user', 'recipe')
        indexes = [
            models.Index(fields=['user', 'recipe']),
        ]

    def __str__(self) -> str:
        return f'{self.user.email} -> {self.recipe.title}'


class RecipeVersion(UUIDTimeStampedModel):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    snapshot = models.JSONField(default=dict)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_recipe_versions',
    )

    class Meta:
        unique_together = ('recipe', 'version_number')
        ordering = ['-version_number']

    def __str__(self) -> str:
        return f'{self.recipe.title} v{self.version_number}'