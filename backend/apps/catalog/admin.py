from django.contrib import admin

from .models import (
    FavoriteRecipe,
    Ingredient,
    IngredientPrice,
    IngredientSubstitution,
    Recipe,
    RecipeIngredient,
    RecipeNutrition,
    RecipeStep,
    RecipeTag,
    RecipeVersion,
    Tag,
)


class RecipeStepInline(admin.TabularInline):
    model = RecipeStep
    extra = 1


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 1


class RecipeTagInline(admin.TabularInline):
    model = RecipeTag
    extra = 1


class RecipeNutritionInline(admin.StackedInline):
    model = RecipeNutrition
    extra = 0
    max_num = 1


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'category',
        'cuisine_type',
        'status',
        'estimated_cost',
        'total_time_minutes',
        'is_child_friendly',
    )
    list_filter = ('status', 'category', 'cuisine_type', 'is_local_cuisine', 'is_child_friendly')
    search_fields = ('title', 'slug', 'short_description')
    inlines = [RecipeNutritionInline, RecipeStepInline, RecipeIngredientInline, RecipeTagInline]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('key', 'label')
    search_fields = ('key', 'label')


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'default_unit', 'is_common_allergen')
    list_filter = ('category', 'is_common_allergen')
    search_fields = ('name', 'normalized_name')


@admin.register(IngredientPrice)
class IngredientPriceAdmin(admin.ModelAdmin):
    list_display = ('ingredient', 'store_name', 'region_code', 'price_amount', 'price_unit', 'effective_from')
    list_filter = ('region_code', 'source_type', 'store_name')
    search_fields = ('ingredient__name', 'store_name')


@admin.register(IngredientSubstitution)
class IngredientSubstitutionAdmin(admin.ModelAdmin):
    list_display = ('ingredient', 'substitute_ingredient', 'substitution_reason', 'price_delta_estimate')
    list_filter = ('substitution_reason',)
    search_fields = ('ingredient__name', 'substitute_ingredient__name')


@admin.register(FavoriteRecipe)
class FavoriteRecipeAdmin(admin.ModelAdmin):
    list_display = ('user', 'recipe', 'created_at')
    search_fields = ('user__email', 'recipe__title')


@admin.register(RecipeVersion)
class RecipeVersionAdmin(admin.ModelAdmin):
    list_display = ('recipe', 'version_number', 'created_by', 'created_at')
    search_fields = ('recipe__title', 'created_by__email')