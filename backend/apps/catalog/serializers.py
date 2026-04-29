from decimal import Decimal

from rest_framework import serializers

from apps.groups.models import GoalType, Group
from .models import (
    FavoriteRecipe,
    IngredientPrice,
    IngredientSubstitution,
    Recipe,
    RecipeIngredient,
    RecipeNutrition,
    RecipeStep,
    Tag,
)


def _get_active_group(user):
    if not user or not user.is_authenticated:
        return None
    return (
        Group.objects.filter(owner_user=user, is_active=True)
        .prefetch_related('members', 'preferences')
        .first()
    )


def _build_fit_score(recipe: Recipe, active_group: Group | None) -> Decimal:
    score = Decimal('0.50')

    if active_group is None:
        return score

    preferences = getattr(active_group, 'preferences', None)

    if recipe.is_local_cuisine and preferences:
        score += Decimal(str(min(float(preferences.local_cuisine_priority), 0.20)))

    if active_group.group_type == 'adults_kids' and recipe.is_child_friendly:
        score += Decimal('0.10')

    goal_types = {member.goal_type for member in active_group.members.all()}
    tag_keys = {recipe_tag.tag.key for recipe_tag in recipe.recipe_tags.all()}

    if GoalType.HIGH_PROTEIN in goal_types and 'high_protein' in tag_keys:
        score += Decimal('0.10')

    if GoalType.LOW_CARB in goal_types and 'low_carb' in tag_keys:
        score += Decimal('0.10')

    if GoalType.WEIGHT_LOSS in goal_types and 'weight_loss' in tag_keys:
        score += Decimal('0.05')

    if preferences and recipe.total_time_minutes > preferences.max_cooking_time_minutes:
        score -= Decimal('0.10')

    if recipe.estimated_cost and active_group.budget_amount:
        if recipe.estimated_cost > active_group.budget_amount:
            score -= Decimal('0.20')

    if score < Decimal('0.00'):
        return Decimal('0.00')
    if score > Decimal('0.99'):
        return Decimal('0.99')
    return score.quantize(Decimal('0.01'))


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ('id', 'key', 'label')


class RecipeNutritionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecipeNutrition
        fields = (
            'calories_total',
            'protein_total_g',
            'fat_total_g',
            'carb_total_g',
            'calories_per_serving',
            'protein_per_serving_g',
            'fat_per_serving_g',
            'carb_per_serving_g',
            'micronutrients',
        )


class RecipeStepSerializer(serializers.ModelSerializer):
    order = serializers.IntegerField(source='step_order')

    class Meta:
        model = RecipeStep
        fields = ('order', 'instruction_text', 'duration_minutes', 'is_optional')


class RecipeIngredientSerializer(serializers.ModelSerializer):
    ingredient_id = serializers.UUIDField(source='ingredient.id', read_only=True)
    name = serializers.CharField(source='ingredient.name', read_only=True)
    estimated_price = serializers.SerializerMethodField()

    class Meta:
        model = RecipeIngredient
        fields = (
            'ingredient_id',
            'name',
            'quantity',
            'unit',
            'estimated_price',
            'is_optional',
            'preparation_note',
        )

    def get_estimated_price(self, obj):
        region_code = self.context.get('region_code')
        qs = obj.ingredient.prices.all()
        if region_code:
            qs = qs.filter(region_code=region_code)
        price: IngredientPrice | None = qs.order_by('-effective_from').first()
        return str(price.price_amount) if price else None


class IngredientSubstitutionSerializer(serializers.ModelSerializer):
    ingredient_id = serializers.UUIDField(source='ingredient.id', read_only=True)
    ingredient_name = serializers.CharField(source='ingredient.name', read_only=True)
    substitute_ingredient_id = serializers.UUIDField(source='substitute_ingredient.id', read_only=True)
    substitute_name = serializers.CharField(source='substitute_ingredient.name', read_only=True)
    reason = serializers.CharField(source='substitution_reason')

    class Meta:
        model = IngredientSubstitution
        fields = (
            'ingredient_id',
            'ingredient_name',
            'substitute_ingredient_id',
            'substitute_name',
            'reason',
            'price_delta_estimate',
            'nutrition_delta_json',
            'confidence_score',
        )


class RecipeCardSerializer(serializers.ModelSerializer):
    tags = serializers.SerializerMethodField()
    fit_score = serializers.SerializerMethodField()
    calories_per_serving = serializers.DecimalField(
        source='nutrition.calories_per_serving',
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    protein_per_serving_g = serializers.DecimalField(
        source='nutrition.protein_per_serving_g',
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    fat_per_serving_g = serializers.DecimalField(
        source='nutrition.fat_per_serving_g',
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    carb_per_serving_g = serializers.DecimalField(
        source='nutrition.carb_per_serving_g',
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = Recipe
        fields = (
            'id',
            'title',
            'image_url',
            'category',
            'cuisine_type',
            'total_time_minutes',
            'estimated_cost',
            'calories_per_serving',
            'protein_per_serving_g',
            'fat_per_serving_g',
            'carb_per_serving_g',
            'tags',
            'fit_score',
            'is_child_friendly',
        )

    def get_tags(self, obj):
        return [recipe_tag.tag.key for recipe_tag in obj.recipe_tags.all()]

    def get_fit_score(self, obj):
        active_group = self.context.get('active_group')
        return float(_build_fit_score(obj, active_group))


class RecipeDetailSerializer(serializers.ModelSerializer):
    nutrition = RecipeNutritionSerializer(read_only=True)
    ingredients = serializers.SerializerMethodField()
    steps = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    substitutions = serializers.SerializerMethodField()
    suitability = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = (
            'id',
            'title',
            'slug',
            'short_description',
            'long_description',
            'cuisine_type',
            'region_code',
            'is_local_cuisine',
            'category',
            'difficulty_level',
            'prep_time_minutes',
            'cook_time_minutes',
            'total_time_minutes',
            'servings_default',
            'estimated_cost',
            'is_child_friendly',
            'image_url',
            'video_url',
            'chef_note',
            'seasonality_score',
            'nutrition',
            'ingredients',
            'steps',
            'tags',
            'substitutions',
            'suitability',
        )

    def get_ingredients(self, obj):
        return RecipeIngredientSerializer(
            obj.ingredients_map.all(),
            many=True,
            context=self.context,
        ).data

    def get_steps(self, obj):
        return RecipeStepSerializer(obj.steps.all(), many=True).data

    def get_tags(self, obj):
        return [recipe_tag.tag.key for recipe_tag in obj.recipe_tags.all()]

    def get_substitutions(self, obj):
        ingredient_ids = [item.ingredient_id for item in obj.ingredients_map.all()]
        substitutions = (
            IngredientSubstitution.objects.select_related('ingredient', 'substitute_ingredient')
            .filter(ingredient_id__in=ingredient_ids)
            .order_by('ingredient__name')
        )
        return IngredientSubstitutionSerializer(substitutions, many=True).data

    def get_suitability(self, obj):
        active_group = self.context.get('active_group')
        score = _build_fit_score(obj, active_group)
        matches = []
        conflicts = []

        tag_keys = {recipe_tag.tag.key for recipe_tag in obj.recipe_tags.all()}

        if obj.is_local_cuisine:
            matches.append('local cuisine')
        if obj.is_child_friendly:
            matches.append('child-friendly')
        if 'high_protein' in tag_keys:
            matches.append('high protein')
        if 'budget_friendly' in tag_keys:
            matches.append('budget')
        if 'low_carb' in tag_keys:
            matches.append('low carb')

        if active_group and hasattr(active_group, 'preferences'):
            if obj.total_time_minutes > active_group.preferences.max_cooking_time_minutes:
                conflicts.append('long cooking time')

        return {
            'fit_score': float(score),
            'matches': matches,
            'conflicts': conflicts,
        }


class FavoriteRecipeCreateSerializer(serializers.Serializer):
    recipe_id = serializers.UUIDField()

    def validate_recipe_id(self, value):
        if not Recipe.objects.filter(id=value, status='published').exists():
            raise serializers.ValidationError('Recipe not found.')
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        favorite, _ = FavoriteRecipe.objects.get_or_create(
            user=user,
            recipe_id=validated_data['recipe_id'],
        )
        return favorite


class FavoriteRecipeListItemSerializer(serializers.ModelSerializer):
    recipe_id = serializers.UUIDField(source='recipe.id', read_only=True)
    title = serializers.CharField(source='recipe.title', read_only=True)
    image_url = serializers.CharField(source='recipe.image_url', read_only=True)
    fit_score = serializers.SerializerMethodField()

    class Meta:
        model = FavoriteRecipe
        fields = ('recipe_id', 'title', 'image_url', 'fit_score')

    def get_fit_score(self, obj):
        active_group = self.context.get('active_group')
        return float(_build_fit_score(obj.recipe, active_group))