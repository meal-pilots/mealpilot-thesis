from decimal import Decimal

from rest_framework import serializers
from apps.catalog.models import Ingredient, Recipe
from apps.groups.models import GroupMember
from .models import (
    AdaptationType,
    MealItemAdaptation,
    MealPlan,
    MealPlanDay,
    MealPlanItem,
    PantryItem,
    PlanExplanation,
    ShoppingList,
    ShoppingListItem,
)

def _to_decimal(value) -> Decimal:
    if value is None:
        return Decimal('0.00')
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))

class PlanGenerationRequestSerializer(serializers.Serializer):
    optimizer = serializers.ChoiceField(
        choices=['cp_sat', 'deterministic'],
        default='cp_sat',
        required=False,
    )
    start_date = serializers.DateField()
    days_count = serializers.IntegerField(min_value=1, max_value=31)
    meals_per_day = serializers.IntegerField(min_value=1, max_value=4)
    include_snacks = serializers.BooleanField(default=False)
    budget_strictness = serializers.ChoiceField(
        choices=['strict', 'medium', 'flexible'],
        default='medium',
    )
    cooking_time_strictness = serializers.ChoiceField(
        choices=['strict', 'medium', 'flexible'],
        default='medium',
    )
    variety_level = serializers.ChoiceField(
        choices=['low', 'medium', 'high'],
        default='medium',
    )
    repetition_allowed = serializers.IntegerField(min_value=0, max_value=7, default=2)
    optimization_focus = serializers.ListField(
        child=serializers.ChoiceField(choices=['budget', 'nutrition', 'speed', 'taste']),
        allow_empty=False,
        default=list,
    )

    def validate(self, attrs):
        meals_per_day = attrs['meals_per_day']
        include_snacks = attrs.get('include_snacks', False)

        if meals_per_day == 4 and not include_snacks:
            raise serializers.ValidationError(
                {'include_snacks': ['If meals_per_day is 4, include_snacks must be true.']}
            )

        if meals_per_day < 4 and include_snacks and meals_per_day < 3:
            raise serializers.ValidationError(
                {'meals_per_day': ['Snack support expects at least 3 meals per day.']}
            )

        return attrs


class MealPlanSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = MealPlan
        fields = (
            'id',
            'group_id',
            'title',
            'start_date',
            'end_date',
            'days_count',
            'status',
            'is_current',
            'optimizer_name',
            'optimizer_version',
            'estimated_total_cost',
            'estimated_total_calories',
            'nutrition_fit_score',
            'budget_fit_score',
            'group_fit_score',
            'diversity_score',
            'overall_score',
            'created_at',
            'updated_at',
        )


class PlanExplanationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanExplanation
        fields = (
            'id',
            'explanation_type',
            'title',
            'explanation_text',
            'priority_order',
            'explanation_json',
            'created_at',
        )


class MealItemAdaptationSerializer(serializers.ModelSerializer):
    meal_plan_item_id = serializers.UUIDField(source='meal_plan_item.id', read_only=True)
    member_id = serializers.UUIDField(source='member.id', read_only=True)
    member_name = serializers.CharField(source='member.display_name', read_only=True)

    class Meta:
        model = MealItemAdaptation
        fields = (
            'id',
            'meal_plan_item_id',
            'member_id',
            'member_name',
            'adaptation_type',
            'description',
            'price_delta',
            'calorie_delta',
            'protein_delta_g',
            'fat_delta_g',
            'carb_delta_g',
            'before_snapshot_json',
            'after_snapshot_json',
            'created_at',
        )


class MealPlanItemSerializer(serializers.ModelSerializer):
    recipe_id = serializers.UUIDField(source='recipe.id', read_only=True)
    recipe_title = serializers.CharField(source='recipe.title', read_only=True)
    adaptations = MealItemAdaptationSerializer(many=True, read_only=True)

    class Meta:
        model = MealPlanItem
        fields = (
            'id',
            'meal_type',
            'recipe_id',
            'recipe_title',
            'servings_total',
            'estimated_cost',
            'estimated_calories',
            'selection_score',
            'selection_reason_summary',
            'is_manually_replaced',
            'adaptations',
            'created_at',
        )


class MealPlanDaySerializer(serializers.ModelSerializer):
    items = MealPlanItemSerializer(many=True, read_only=True)

    class Meta:
        model = MealPlanDay
        fields = (
            'id',
            'day_index',
            'plan_date',
            'estimated_daily_cost',
            'estimated_daily_calories',
            'items',
        )


class MealPlanDetailSerializer(serializers.Serializer):
    summary = MealPlanSummarySerializer()
    days = MealPlanDaySerializer(many=True)
    top_explanations = PlanExplanationSerializer(many=True)


class ShoppingListItemSerializer(serializers.ModelSerializer):
    ingredient_id = serializers.UUIDField(source='ingredient.id', read_only=True, allow_null=True)
    ingredient_name = serializers.SerializerMethodField()
    store_prices = serializers.SerializerMethodField()

    class Meta:
        model = ShoppingListItem
        fields = (
            'id',
            'ingredient_id',
            'ingredient_name',
            'total_quantity',
            'unit',
            'estimated_price',
            'category_label',
            'is_checked',
            'availability_status',
            'store_prices',
            'created_at',
        )

    def get_ingredient_name(self, obj):
        return obj.display_name

    def get_store_prices(self, obj):
        if not obj.ingredient:
            return []

        region_code = self.context.get('region_code')
        qs = obj.ingredient.prices.all()
        if region_code:
            qs = qs.filter(region_code=region_code)

        qs = qs.order_by('store_name', '-effective_from')
        seen_stores = set()
        result = []

        for price in qs:
            store_name = price.store_name or 'Default store'
            if store_name in seen_stores:
                continue
            seen_stores.add(store_name)
            result.append(
                {
                    'store_name': store_name,
                    'price_amount': price.price_amount,
                    'price_unit': price.price_unit,
                }
            )
        return result


class ShoppingListSerializer(serializers.ModelSerializer):
    items = ShoppingListItemSerializer(many=True, read_only=True)

    class Meta:
        model = ShoppingList
        fields = (
            'id',
            'meal_plan_id',
            'group_id',
            'total_estimated_cost',
            'items',
            'generated_at',
        )

    generated_at = serializers.DateTimeField(source='created_at', read_only=True)


class BudgetAnalyticsSerializer(serializers.Serializer):
    budget_limit = serializers.DecimalField(max_digits=12, decimal_places=2)
    planned_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    remaining = serializers.DecimalField(max_digits=12, decimal_places=2)
    cost_by_day = serializers.ListField()
    most_expensive_meals = serializers.ListField()
    savings_opportunities = serializers.ListField()


class NutritionAnalyticsSerializer(serializers.Serializer):
    weekly_target_fit = serializers.DecimalField(max_digits=4, decimal_places=2)
    macro_balance = serializers.DictField()
    member_fit = serializers.ListField()
    micronutrients = serializers.DictField()


class ReplaceMealPlanItemSerializer(serializers.Serializer):
    replacement_recipe_id = serializers.UUIDField()

    def validate_replacement_recipe_id(self, value):
        if not Recipe.objects.filter(id=value, status='published').exists():
            raise serializers.ValidationError('Replacement recipe not found.')
        return value


class MealItemAdaptationCreateSerializer(serializers.Serializer):
    member_id = serializers.UUIDField()
    adaptation_type = serializers.ChoiceField(choices=AdaptationType.choices)

    def validate(self, attrs):
        item: MealPlanItem = self.context['meal_plan_item']
        member_id = attrs['member_id']

        try:
            member = GroupMember.objects.get(id=member_id)
        except GroupMember.DoesNotExist:
            raise serializers.ValidationError({'member_id': ['Member not found.']})

        if member.group_id != item.meal_plan_day.meal_plan.group_id:
            raise serializers.ValidationError(
                {'member_id': ['Member does not belong to this meal plan group.']}
            )

        attrs['member'] = member
        return attrs


class MealItemAdaptationUpdateSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=255, required=False)
    price_delta = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    calorie_delta = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    protein_delta_g = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    fat_delta_g = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    carb_delta_g = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    before_snapshot_json = serializers.JSONField(required=False)
    after_snapshot_json = serializers.JSONField(required=False)


class ApproveMealPlanSerializer(serializers.Serializer):
    approve = serializers.BooleanField(default=True)


class RegenerateShoppingListSerializer(serializers.Serializer):
    regenerate = serializers.BooleanField(default=True)


class PlanListItemSerializer(serializers.ModelSerializer):
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

class PantryItemSerializer(serializers.ModelSerializer):
    ingredient_id = serializers.UUIDField(source='ingredient.id', read_only=True)
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)

    class Meta:
        model = PantryItem
        fields = (
            'id',
            'group_id',
            'ingredient_id',
            'ingredient_name',
            'quantity',
            'unit',
            'expires_at',
            'created_at',
            'updated_at',
        )


class PantryItemCreateSerializer(serializers.Serializer):
    ingredient_id = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    unit = serializers.CharField(max_length=32)
    expires_at = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        request = self.context['request']
        group = self.context['group']

        try:
            ingredient = Ingredient.objects.get(id=attrs['ingredient_id'])
        except Ingredient.DoesNotExist:
            raise serializers.ValidationError({'ingredient_id': ['Ingredient not found.']})

        if group.owner_user_id != request.user.id:
            raise serializers.ValidationError('You do not own this group.')

        attrs['ingredient'] = ingredient
        return attrs

    def create(self, validated_data):
        group = self.context['group']

        pantry_item, created = PantryItem.objects.get_or_create(
            group=group,
            ingredient=validated_data['ingredient'],
            unit=validated_data['unit'],
            defaults={
                'quantity': validated_data['quantity'],
                'expires_at': validated_data.get('expires_at'),
            },
        )

        if not created:
            pantry_item.quantity = _to_decimal(pantry_item.quantity) + _to_decimal(validated_data['quantity'])
            pantry_item.expires_at = validated_data.get('expires_at', pantry_item.expires_at)
            pantry_item.save(update_fields=['quantity', 'expires_at', 'updated_at'])

        return pantry_item


class PantryItemUpdateSerializer(serializers.Serializer):
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    unit = serializers.CharField(max_length=32, required=False)
    expires_at = serializers.DateField(required=False, allow_null=True)


class ShoppingListWithPantryAdjustmentSerializer(serializers.Serializer):
    total_estimated_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    items = serializers.ListField()