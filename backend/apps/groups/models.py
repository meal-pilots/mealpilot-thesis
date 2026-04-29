from django.conf import settings
from django.db import models

from apps.common.models import UUIDTimeStampedModel


class GroupType(models.TextChoices):
    SOLO = 'solo', 'Solo'
    TWO_ADULTS = 'two_adults', 'Two adults'
    ADULTS_KIDS = 'adults_kids', 'Adults + kids'
    CUSTOM = 'custom', 'Custom'


class BudgetPeriodType(models.TextChoices):
    DAILY = 'daily', 'Daily'
    WEEKLY = 'weekly', 'Weekly'


class MemberType(models.TextChoices):
    ADULT = 'adult', 'Adult'
    CHILD = 'child', 'Child'
    TEEN = 'teen', 'Teen'
    CUSTOM = 'custom', 'Custom'


class GoalType(models.TextChoices):
    WEIGHT_LOSS = 'weight_loss', 'Weight loss'
    MASS_GAIN = 'mass_gain', 'Mass gain'
    MAINTENANCE = 'maintenance', 'Maintenance'
    LOW_CARB = 'low_carb', 'Low carb'
    HEALTHY = 'healthy', 'Healthy'
    HIGH_PROTEIN = 'high_protein', 'High protein'


class ConstraintType(models.TextChoices):
    ALLERGY = 'allergy', 'Allergy'
    INTOLERANCE = 'intolerance', 'Intolerance'
    RELIGIOUS = 'religious', 'Religious'
    DIETARY = 'dietary', 'Dietary'
    DISLIKED = 'disliked', 'Disliked'
    PREFERRED = 'preferred', 'Preferred'


class SeverityLevel(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'


class SpiceTolerance(models.TextChoices):
    NONE = 'none', 'None'
    MILD = 'mild', 'Mild'
    MEDIUM = 'medium', 'Medium'
    HOT = 'hot', 'Hot'


class VarietyPreference(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'


class Group(UUIDTimeStampedModel):
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_groups',
    )
    name = models.CharField(max_length=255)
    group_type = models.CharField(max_length=32, choices=GroupType.choices)
    planning_days_default = models.PositiveSmallIntegerField(default=7)
    meals_per_day_default = models.PositiveSmallIntegerField(default=3)
    currency_code = models.CharField(max_length=10, default='KZT')
    region_code = models.CharField(max_length=32, default='KZ-AST')
    budget_period_type = models.CharField(
        max_length=16,
        choices=BudgetPeriodType.choices,
        default=BudgetPeriodType.WEEKLY,
    )
    budget_amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.name


class GroupMember(UUIDTimeStampedModel):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='members')
    display_name = models.CharField(max_length=255)
    member_type = models.CharField(max_length=16, choices=MemberType.choices)
    sex = models.CharField(max_length=16, blank=True)
    age = models.PositiveSmallIntegerField()
    activity_level = models.CharField(max_length=32)
    goal_type = models.CharField(max_length=32, choices=GoalType.choices)
    priority_weight = models.DecimalField(max_digits=4, decimal_places=2, default=1.00)
    height_cm = models.PositiveSmallIntegerField(blank=True, null=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    daily_calorie_target = models.PositiveIntegerField(blank=True, null=True)
    protein_target_g = models.PositiveIntegerField(blank=True, null=True)
    fat_target_g = models.PositiveIntegerField(blank=True, null=True)
    carb_target_g = models.PositiveIntegerField(blank=True, null=True)

    def __str__(self) -> str:
        return f'{self.display_name} ({self.group.name})'


class MemberConstraint(UUIDTimeStampedModel):
    member = models.ForeignKey(GroupMember, on_delete=models.CASCADE, related_name='constraints')
    constraint_type = models.CharField(max_length=16, choices=ConstraintType.choices)
    ingredient_id = models.UUIDField(blank=True, null=True)
    tag_key = models.CharField(max_length=64, blank=True, null=True)
    value_text = models.CharField(max_length=255, blank=True, null=True)
    severity_level = models.CharField(
        max_length=16,
        choices=SeverityLevel.choices,
        default=SeverityLevel.MEDIUM,
    )

    def __str__(self) -> str:
        return f'{self.member.display_name}: {self.constraint_type}'


class GroupPreference(UUIDTimeStampedModel):
    group = models.OneToOneField(Group, on_delete=models.CASCADE, related_name='preferences')
    spice_tolerance = models.CharField(
        max_length=16,
        choices=SpiceTolerance.choices,
        default=SpiceTolerance.MILD,
    )
    max_cooking_time_minutes = models.PositiveSmallIntegerField(default=45)
    repeat_tolerance = models.PositiveSmallIntegerField(default=2)
    variety_preference = models.CharField(
        max_length=16,
        choices=VarietyPreference.choices,
        default=VarietyPreference.MEDIUM,
    )
    local_cuisine_priority = models.DecimalField(max_digits=3, decimal_places=2, default=0.80)
    price_priority_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.35)
    nutrition_priority_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.30)
    taste_priority_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.20)
    speed_priority_weight = models.DecimalField(max_digits=4, decimal_places=2, default=0.15)
    preferred_cuisines = models.JSONField(default=list, blank=True)

    def __str__(self) -> str:
        return f'Preferences for {self.group.name}'