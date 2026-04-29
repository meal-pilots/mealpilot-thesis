from django.contrib import admin

from .models import (
    MealItemAdaptation,
    MealPlan,
    MealPlanDay,
    MealPlanItem,
    PantryItem,
    PlanExplanation,
    PlanGenerationRun,
    ShoppingList,
    ShoppingListItem,
)


class MealPlanItemInline(admin.TabularInline):
    model = MealPlanItem
    extra = 0


class MealPlanDayInline(admin.TabularInline):
    model = MealPlanDay
    extra = 0


class PlanExplanationInline(admin.TabularInline):
    model = PlanExplanation
    extra = 0


@admin.register(MealPlan)
class MealPlanAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'group',
        'status',
        'is_current',
        'start_date',
        'end_date',
        'estimated_total_cost',
        'overall_score',
    )
    list_filter = ('status', 'is_current', 'optimizer_name')
    search_fields = ('title', 'group__name')
    inlines = [MealPlanDayInline, PlanExplanationInline]


@admin.register(MealPlanDay)
class MealPlanDayAdmin(admin.ModelAdmin):
    list_display = (
        'meal_plan',
        'day_index',
        'plan_date',
        'estimated_daily_cost',
        'estimated_daily_calories',
    )
    list_filter = ('meal_plan',)
    inlines = [MealPlanItemInline]


@admin.register(MealPlanItem)
class MealPlanItemAdmin(admin.ModelAdmin):
    list_display = (
        'meal_plan_day',
        'meal_type',
        'recipe',
        'servings_total',
        'estimated_cost',
        'selection_score',
        'is_manually_replaced',
    )
    list_filter = ('meal_type', 'is_manually_replaced')
    search_fields = ('recipe__title', 'meal_plan_day__meal_plan__title')


@admin.register(MealItemAdaptation)
class MealItemAdaptationAdmin(admin.ModelAdmin):
    list_display = (
        'meal_plan_item',
        'member',
        'adaptation_type',
        'price_delta',
        'calorie_delta',
    )
    list_filter = ('adaptation_type',)
    search_fields = ('member__display_name', 'meal_plan_item__recipe__title')


class ShoppingListItemInline(admin.TabularInline):
    model = ShoppingListItem
    extra = 0


@admin.register(ShoppingList)
class ShoppingListAdmin(admin.ModelAdmin):
    list_display = ('meal_plan', 'group', 'total_estimated_cost', 'created_at')
    search_fields = ('meal_plan__title', 'group__name')
    inlines = [ShoppingListItemInline]


@admin.register(ShoppingListItem)
class ShoppingListItemAdmin(admin.ModelAdmin):
    list_display = (
        'shopping_list',
        'display_name',
        'total_quantity',
        'unit',
        'estimated_price',
        'category_label',
        'is_checked',
    )
    list_filter = ('category_label', 'is_checked')
    search_fields = ('ingredient__name', 'ingredient_name_override')


@admin.register(PlanExplanation)
class PlanExplanationAdmin(admin.ModelAdmin):
    list_display = ('meal_plan', 'explanation_type', 'title', 'priority_order')
    list_filter = ('explanation_type',)
    search_fields = ('meal_plan__title', 'title')


@admin.register(PlanGenerationRun)
class PlanGenerationRunAdmin(admin.ModelAdmin):
    list_display = (
        'group',
        'meal_plan',
        'optimizer_name',
        'optimizer_version',
        'status',
        'execution_time_ms',
        'created_at',
    )
    list_filter = ('status', 'optimizer_name')
    search_fields = ('group__name', 'meal_plan__title')


@admin.register(PantryItem)
class PantryItemAdmin(admin.ModelAdmin):
    list_display = ('group', 'ingredient', 'quantity', 'unit', 'expires_at', 'created_at')
    list_filter = ('group', 'unit')
    search_fields = ('group__name', 'ingredient__name')