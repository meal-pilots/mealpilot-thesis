from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.catalog.models import Ingredient, Recipe
from apps.common.models import UUIDTimeStampedModel
from apps.groups.models import Group, GroupMember


class MealPlanStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    GENERATED = 'generated', 'Generated'
    APPROVED = 'approved', 'Approved'
    MODIFIED = 'modified', 'Modified'
    ARCHIVED = 'archived', 'Archived'


class MealType(models.TextChoices):
    BREAKFAST = 'breakfast', 'Breakfast'
    LUNCH = 'lunch', 'Lunch'
    DINNER = 'dinner', 'Dinner'
    SNACK = 'snack', 'Snack'


class AdaptationType(models.TextChoices):
    PORTION_CHANGE = 'portion_change', 'Portion change'
    INGREDIENT_REMOVE = 'ingredient_remove', 'Ingredient remove'
    INGREDIENT_REPLACE = 'ingredient_replace', 'Ingredient replace'
    LOW_CARB = 'low_carb', 'Low carb'
    HIGH_PROTEIN = 'high_protein', 'High protein'
    CHILD_FRIENDLY = 'child_friendly', 'Child friendly'
    ALLERGEN_FREE = 'allergen_free', 'Allergen free'
    CHEAPER_VERSION = 'cheaper_version', 'Cheaper version'


class ExplanationType(models.TextChoices):
    BUDGET = 'budget', 'Budget'
    NUTRITION = 'nutrition', 'Nutrition'
    DIVERSITY = 'diversity', 'Diversity'
    GROUP_FIT = 'group_fit', 'Group fit'
    TRADEOFF = 'tradeoff', 'Tradeoff'


class GenerationRunStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'


class MealPlan(UUIDTimeStampedModel):
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='meal_plans',
    )
    title = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    days_count = models.PositiveSmallIntegerField()

    status = models.CharField(
        max_length=16,
        choices=MealPlanStatus.choices,
        default=MealPlanStatus.DRAFT,
    )
    is_current = models.BooleanField(default=False)

    optimizer_name = models.CharField(max_length=120, default='deterministic_planner')
    optimizer_version = models.CharField(max_length=32, default='v1')

    estimated_total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estimated_total_calories = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    nutrition_fit_score = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    budget_fit_score = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    group_fit_score = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    diversity_score = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    overall_score = models.DecimalField(max_digits=4, decimal_places=2, default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='created_meal_plans',
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ['-start_date', '-created_at']
        indexes = [
            models.Index(fields=['group', 'status']),
            models.Index(fields=['group', 'is_current']),
            models.Index(fields=['start_date', 'end_date']),
        ]

    def __str__(self) -> str:
        return f'{self.title} ({self.group.name})'


class MealPlanDay(UUIDTimeStampedModel):
    meal_plan = models.ForeignKey(
        MealPlan,
        on_delete=models.CASCADE,
        related_name='days',
    )
    day_index = models.PositiveSmallIntegerField()
    plan_date = models.DateField()
    estimated_daily_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estimated_daily_calories = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ['day_index']
        unique_together = ('meal_plan', 'day_index')
        indexes = [
            models.Index(fields=['meal_plan', 'day_index']),
            models.Index(fields=['meal_plan', 'plan_date']),
        ]

    def __str__(self) -> str:
        return f'{self.meal_plan.title} - Day {self.day_index}'


class MealPlanItem(UUIDTimeStampedModel):
    meal_plan_day = models.ForeignKey(
        MealPlanDay,
        on_delete=models.CASCADE,
        related_name='items',
    )
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.PROTECT,
        related_name='meal_plan_items',
    )
    meal_type = models.CharField(max_length=16, choices=MealType.choices)
    servings_total = models.DecimalField(max_digits=8, decimal_places=2, default=1)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estimated_calories = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selection_score = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    selection_reason_summary = models.CharField(max_length=255, blank=True)
    is_manually_replaced = models.BooleanField(default=False)

    class Meta:
        ordering = ['meal_type', 'created_at']
        unique_together = ('meal_plan_day', 'meal_type')
        indexes = [
            models.Index(fields=['meal_plan_day', 'meal_type']),
            models.Index(fields=['recipe']),
        ]

    def __str__(self) -> str:
        return f'{self.meal_plan_day} - {self.meal_type}'


class MealItemAdaptation(UUIDTimeStampedModel):
    meal_plan_item = models.ForeignKey(
        MealPlanItem,
        on_delete=models.CASCADE,
        related_name='adaptations',
    )
    member = models.ForeignKey(
        GroupMember,
        on_delete=models.CASCADE,
        related_name='meal_adaptations',
    )
    adaptation_type = models.CharField(max_length=32, choices=AdaptationType.choices)
    description = models.CharField(max_length=255)

    price_delta = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    calorie_delta = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    protein_delta_g = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fat_delta_g = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    carb_delta_g = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    before_snapshot_json = models.JSONField(default=dict, blank=True)
    after_snapshot_json = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['meal_plan_item', 'member']),
            models.Index(fields=['adaptation_type']),
        ]

    def __str__(self) -> str:
        return f'{self.member.display_name} - {self.adaptation_type}'


class ShoppingList(UUIDTimeStampedModel):
    meal_plan = models.OneToOneField(
        MealPlan,
        on_delete=models.CASCADE,
        related_name='shopping_list',
    )
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='shopping_lists',
    )
    total_estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['group']),
        ]

    def __str__(self) -> str:
        return f'Shopping list for {self.meal_plan.title}'


class ShoppingListItem(UUIDTimeStampedModel):
    shopping_list = models.ForeignKey(
        ShoppingList,
        on_delete=models.CASCADE,
        related_name='items',
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.SET_NULL,
        related_name='shopping_list_items',
        null=True,
        blank=True,
    )
    ingredient_name_override = models.CharField(max_length=255, blank=True)
    total_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit = models.CharField(max_length=32)
    estimated_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    category_label = models.CharField(max_length=64)
    is_checked = models.BooleanField(default=False)
    availability_status = models.CharField(max_length=32, default='available')

    class Meta:
        ordering = ['category_label', 'created_at']
        indexes = [
            models.Index(fields=['shopping_list', 'category_label']),
            models.Index(fields=['ingredient']),
        ]

    @property
    def display_name(self) -> str:
        if self.ingredient_name_override:
            return self.ingredient_name_override
        if self.ingredient:
            return self.ingredient.name
        return 'Unknown item'

    def __str__(self) -> str:
        return self.display_name


class PlanExplanation(UUIDTimeStampedModel):
    meal_plan = models.ForeignKey(
        MealPlan,
        on_delete=models.CASCADE,
        related_name='explanations',
    )
    explanation_type = models.CharField(max_length=32, choices=ExplanationType.choices)
    title = models.CharField(max_length=255)
    explanation_text = models.TextField()
    priority_order = models.PositiveSmallIntegerField(default=1)
    explanation_json = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['priority_order', 'created_at']
        indexes = [
            models.Index(fields=['meal_plan', 'explanation_type']),
            models.Index(fields=['meal_plan', 'priority_order']),
        ]

    def __str__(self) -> str:
        return f'{self.meal_plan.title} - {self.title}'


class PlanGenerationRun(UUIDTimeStampedModel):
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='plan_generation_runs',
    )
    meal_plan = models.ForeignKey(
        MealPlan,
        on_delete=models.SET_NULL,
        related_name='generation_runs',
        null=True,
        blank=True,
    )
    input_snapshot_json = models.JSONField(default=dict, blank=True)
    constraints_snapshot_json = models.JSONField(default=dict, blank=True)
    optimizer_name = models.CharField(max_length=120, default='deterministic_planner')
    optimizer_version = models.CharField(max_length=32, default='v1')
    execution_time_ms = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=16,
        choices=GenerationRunStatus.choices,
        default=GenerationRunStatus.PENDING,
    )
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['group', 'status']),
            models.Index(fields=['meal_plan']),
        ]

    def __str__(self) -> str:
        return f'{self.group.name} - {self.status}'

class PantryItem(UUIDTimeStampedModel):
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='pantry_items',
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.CASCADE,
        related_name='pantry_items',
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unit = models.CharField(max_length=32)
    expires_at = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['ingredient__name', 'created_at']
        indexes = [
            models.Index(fields=['group', 'ingredient']),
            models.Index(fields=['group', 'expires_at']),
        ]

    def __str__(self) -> str:
        return f'{self.group.name} - {self.ingredient.name}'

class ShareLink(UUIDTimeStampedModel):
    meal_plan = models.ForeignKey(
        MealPlan,
        on_delete=models.CASCADE,
        related_name='share_links',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_share_links',
    )
    token = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['meal_plan', 'is_active']),
        ]

    def is_valid(self) -> bool:
        return self.is_active and self.expires_at > timezone.now()

    def __str__(self) -> str:
        return f'Share link for {self.meal_plan.title}'