"""Feature engineering shared between training and inference.

Hard requirement: training-time features and inference-time features must
come from the same code path. Anything else leads to label leakage or
distribution shift that's hard to debug in production.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Iterable

from apps.catalog.models import Recipe
from apps.groups.models import GoalType, Group


KNOWN_GOALS = [g.value for g in GoalType]
KNOWN_TAGS = [
    'high_protein', 'low_carb', 'quick_meal', 'budget_friendly',
    'kid_friendly', 'traditional', 'healthy', 'mass_gain', 'weight_loss',
]


@dataclass(slots=True)
class FeatureVector:
    """Numeric vector ready for LightGBM's predict()."""

    values: list[float]
    names: list[str]


def _to_float(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


class RecipeGroupFeatureExtractor:
    """Builds a deterministic, ordered feature vector for a (recipe, group) pair.

    Features (16 total):
        Recipe scalars: cost, calories/serving, protein/serving, fat/serving,
            carb/serving, prep_time, cook_time, servings_default,
            quality_score, is_local_cuisine, is_child_friendly.
        Group scalars: budget, member_count, max_cooking_time, repeat_tolerance.
        Cross signals: cost_to_budget_ratio.
        Categorical one-hots: goal flags (any-member-has) for each KNOWN_GOAL.
        Recipe tag one-hots for each KNOWN_TAG.
    """

    def __init__(self, known_goals: Iterable[str] = KNOWN_GOALS, known_tags: Iterable[str] = KNOWN_TAGS) -> None:
        self.known_goals = list(known_goals)
        self.known_tags = list(known_tags)

    @property
    def feature_names(self) -> list[str]:
        recipe_scalars = [
            'recipe_cost', 'recipe_calories_per_serving', 'recipe_protein_per_serving',
            'recipe_fat_per_serving', 'recipe_carb_per_serving',
            'recipe_prep_time', 'recipe_cook_time', 'recipe_servings_default',
            'recipe_quality_score', 'recipe_is_local_cuisine', 'recipe_is_child_friendly',
        ]
        group_scalars = ['group_budget', 'group_member_count', 'group_max_cook_time', 'group_repeat_tolerance']
        cross = ['cost_to_budget_ratio']
        goal_flags = [f'goal__{goal}' for goal in self.known_goals]
        tag_flags = [f'tag__{tag}' for tag in self.known_tags]
        return recipe_scalars + group_scalars + cross + goal_flags + tag_flags

    def extract(self, recipe: Recipe, group: Group) -> FeatureVector:
        nutrition = getattr(recipe, 'nutrition', None)
        cost = _to_float(recipe.estimated_cost)
        budget = _to_float(group.budget_amount)
        member_count = group.members.count() if hasattr(group, 'members') else 0
        preferences = getattr(group, 'preferences', None)

        cost_to_budget = (cost / budget) if budget > 0 else 0.0

        goals_in_group = {member.goal_type for member in group.members.all()} if hasattr(group, 'members') else set()
        tag_keys = {rt.tag.key for rt in recipe.recipe_tags.all()} if hasattr(recipe, 'recipe_tags') else set()

        values: list[float] = [
            cost,
            _to_float(getattr(nutrition, 'calories_per_serving', 0)),
            _to_float(getattr(nutrition, 'protein_per_serving_g', 0)),
            _to_float(getattr(nutrition, 'fat_per_serving_g', 0)),
            _to_float(getattr(nutrition, 'carb_per_serving_g', 0)),
            _to_float(recipe.prep_time_minutes),
            _to_float(recipe.cook_time_minutes),
            _to_float(recipe.servings_default),
            _to_float(getattr(recipe, 'quality_score', 0)),
            1.0 if recipe.is_local_cuisine else 0.0,
            1.0 if recipe.is_child_friendly else 0.0,
            budget,
            float(member_count),
            _to_float(getattr(preferences, 'max_cooking_time_minutes', 0)) if preferences else 0.0,
            _to_float(getattr(preferences, 'repeat_tolerance', 0)) if preferences else 0.0,
            cost_to_budget,
        ]

        for goal in self.known_goals:
            values.append(1.0 if goal in goals_in_group else 0.0)

        for tag in self.known_tags:
            values.append(1.0 if tag in tag_keys else 0.0)

        return FeatureVector(values=values, names=self.feature_names)
