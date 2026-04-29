from django.contrib import admin

from .models import InteractionEvent, PlanFeedback, RecipeFeedback


@admin.register(RecipeFeedback)
class RecipeFeedbackAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'group',
        'recipe',
        'liked',
        'rating',
        'would_repeat',
        'created_at',
    )
    list_filter = ('liked', 'would_repeat', 'disliked_reason')
    search_fields = ('user__email', 'group__name', 'recipe__title')


@admin.register(PlanFeedback)
class PlanFeedbackAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'meal_plan',
        'overall_rating',
        'budget_satisfaction',
        'nutrition_satisfaction',
        'taste_satisfaction',
        'variety_satisfaction',
        'created_at',
    )
    search_fields = ('user__email', 'meal_plan__title')


@admin.register(InteractionEvent)
class InteractionEventAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'group',
        'event_type',
        'entity_type',
        'entity_id',
        'created_at',
    )
    list_filter = ('event_type', 'entity_type')
    search_fields = ('user__email', 'group__name', 'event_type', 'entity_type')