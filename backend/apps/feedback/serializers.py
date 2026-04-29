from django.db.models import Count, Max
from rest_framework import serializers

from apps.catalog.models import Recipe
from apps.groups.models import Group
from apps.planning.models import MealPlan, MealPlanItem
from .models import InteractionEvent, PlanFeedback, RecipeFeedback


class RecipeFeedbackCreateSerializer(serializers.Serializer):
    group_id = serializers.UUIDField()
    liked = serializers.BooleanField(required=False, allow_null=True)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    disliked_reason = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    would_repeat = serializers.BooleanField(default=False)

    def validate(self, attrs):
        request = self.context['request']
        recipe: Recipe = self.context['recipe']

        try:
            group = Group.objects.get(id=attrs['group_id'], owner_user=request.user)
        except Group.DoesNotExist:
            raise serializers.ValidationError({'group_id': ['Group not found.']})

        attrs['group'] = group
        attrs['recipe'] = recipe
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        return RecipeFeedback.objects.create(
            user=request.user,
            group=validated_data['group'],
            recipe=validated_data['recipe'],
            liked=validated_data.get('liked'),
            rating=validated_data.get('rating'),
            disliked_reason=validated_data.get('disliked_reason') or None,
            would_repeat=validated_data.get('would_repeat', False),
        )


class RecipeFeedbackSerializer(serializers.ModelSerializer):
    recipe_id = serializers.UUIDField(source='recipe.id', read_only=True)
    recipe_title = serializers.CharField(source='recipe.title', read_only=True)
    group_id = serializers.UUIDField(source='group.id', read_only=True)

    class Meta:
        model = RecipeFeedback
        fields = (
            'id',
            'recipe_id',
            'recipe_title',
            'group_id',
            'liked',
            'rating',
            'disliked_reason',
            'would_repeat',
            'created_at',
        )


class PlanFeedbackCreateSerializer(serializers.Serializer):
    overall_rating = serializers.IntegerField(min_value=1, max_value=5)
    budget_satisfaction = serializers.IntegerField(min_value=1, max_value=5)
    nutrition_satisfaction = serializers.IntegerField(min_value=1, max_value=5)
    taste_satisfaction = serializers.IntegerField(min_value=1, max_value=5)
    variety_satisfaction = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        request = self.context['request']
        meal_plan: MealPlan = self.context['meal_plan']

        if meal_plan.group.owner_user_id != request.user.id:
            raise serializers.ValidationError('You do not own this meal plan.')

        attrs['meal_plan'] = meal_plan
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        return PlanFeedback.objects.create(
            user=request.user,
            meal_plan=validated_data['meal_plan'],
            overall_rating=validated_data['overall_rating'],
            budget_satisfaction=validated_data['budget_satisfaction'],
            nutrition_satisfaction=validated_data['nutrition_satisfaction'],
            taste_satisfaction=validated_data['taste_satisfaction'],
            variety_satisfaction=validated_data['variety_satisfaction'],
            comment=validated_data.get('comment', ''),
        )


class PlanFeedbackSerializer(serializers.ModelSerializer):
    meal_plan_id = serializers.UUIDField(source='meal_plan.id', read_only=True)
    meal_plan_title = serializers.CharField(source='meal_plan.title', read_only=True)

    class Meta:
        model = PlanFeedback
        fields = (
            'id',
            'meal_plan_id',
            'meal_plan_title',
            'overall_rating',
            'budget_satisfaction',
            'nutrition_satisfaction',
            'taste_satisfaction',
            'variety_satisfaction',
            'comment',
            'created_at',
        )


class InteractionEventCreateSerializer(serializers.Serializer):
    group_id = serializers.UUIDField(required=False, allow_null=True)
    event_type = serializers.CharField(max_length=64)
    entity_type = serializers.CharField(max_length=64)
    entity_id = serializers.UUIDField()
    metadata = serializers.JSONField(required=False)

    def validate(self, attrs):
        request = self.context['request']
        group_id = attrs.get('group_id')

        if group_id:
            try:
                group = Group.objects.get(id=group_id, owner_user=request.user)
            except Group.DoesNotExist:
                raise serializers.ValidationError({'group_id': ['Group not found.']})
        else:
            group = None

        attrs['group'] = group
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        return InteractionEvent.objects.create(
            user=request.user,
            group=validated_data.get('group'),
            event_type=validated_data['event_type'],
            entity_type=validated_data['entity_type'],
            entity_id=validated_data['entity_id'],
            metadata_json=validated_data.get('metadata', {}),
        )


class HistoryMealPlanItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealPlan
        fields = (
            'id',
            'title',
            'start_date',
            'end_date',
            'status',
            'overall_score',
            'estimated_total_cost',
            'is_current',
            'created_at',
        )


class HistoryRecipeItemSerializer(serializers.Serializer):
    recipe_id = serializers.UUIDField()
    title = serializers.CharField()
    last_used_at = serializers.DateTimeField()
    times_used = serializers.IntegerField()