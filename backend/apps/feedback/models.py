from django.conf import settings
from django.db import models

from apps.catalog.models import Recipe
from apps.common.models import UUIDTimeStampedModel
from apps.groups.models import Group
from apps.planning.models import MealPlan


class DislikedReason(models.TextChoices):
    TOO_EXPENSIVE = 'too_expensive', 'Too expensive'
    TOO_LONG = 'too_long', 'Too long'
    NOT_TASTY = 'not_tasty', 'Not tasty'
    CHILD_REJECTED = 'child_rejected', 'Child rejected'
    ALLERGY_ISSUE = 'allergy_issue', 'Allergy issue'
    HARD_TO_FIND_INGREDIENTS = 'hard_to_find_ingredients', 'Hard to find ingredients'


class RecipeFeedback(UUIDTimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recipe_feedbacks',
    )
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='recipe_feedbacks',
    )
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name='feedbacks',
    )
    liked = models.BooleanField(null=True, blank=True)
    rating = models.PositiveSmallIntegerField(null=True, blank=True)
    disliked_reason = models.CharField(
        max_length=64,
        choices=DislikedReason.choices,
        blank=True,
        null=True,
    )
    would_repeat = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'recipe']),
            models.Index(fields=['group', 'recipe']),
            models.Index(fields=['recipe', 'created_at']),
        ]

    def __str__(self) -> str:
        return f'{self.user.email} -> {self.recipe.title}'


class PlanFeedback(UUIDTimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='plan_feedbacks',
    )
    meal_plan = models.ForeignKey(
        MealPlan,
        on_delete=models.CASCADE,
        related_name='feedbacks',
    )
    overall_rating = models.PositiveSmallIntegerField()
    budget_satisfaction = models.PositiveSmallIntegerField()
    nutrition_satisfaction = models.PositiveSmallIntegerField()
    taste_satisfaction = models.PositiveSmallIntegerField()
    variety_satisfaction = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['meal_plan', 'created_at']),
            models.Index(fields=['user', 'meal_plan']),
        ]

    def __str__(self) -> str:
        return f'{self.user.email} -> {self.meal_plan.title}'


class InteractionEvent(UUIDTimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='interaction_events',
    )
    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name='interaction_events',
        null=True,
        blank=True,
    )
    event_type = models.CharField(max_length=64)
    entity_type = models.CharField(max_length=64)
    entity_id = models.UUIDField()
    metadata_json = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['group', 'created_at']),
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['entity_type', 'entity_id']),
        ]

    def __str__(self) -> str:
        return f'{self.user.email} - {self.event_type}'
class Notification(UUIDTimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    type = models.CharField(max_length=64)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    metadata_json = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['is_read', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['type']),
        ]

    def __str__(self) -> str:
        return f'{self.user.email} - {self.title}'