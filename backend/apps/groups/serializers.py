from rest_framework import serializers

from .models import Group, GroupMember, GroupPreference, MemberConstraint
from .services import derive_macro_targets


class GroupSerializer(serializers.ModelSerializer):
    owner_user_id = serializers.UUIDField(source='owner_user.id', read_only=True)

    class Meta:
        model = Group
        fields = (
            'id',
            'owner_user_id',
            'name',
            'group_type',
            'planning_days_default',
            'meals_per_day_default',
            'currency_code',
            'region_code',
            'budget_period_type',
            'budget_amount',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'owner_user_id', 'created_at', 'updated_at', 'is_active')


class GroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = (
            'name',
            'group_type',
            'planning_days_default',
            'meals_per_day_default',
            'currency_code',
            'region_code',
            'budget_period_type',
            'budget_amount',
        )

    def create(self, validated_data):
        user = self.context['request'].user
        return Group.objects.create(owner_user=user, **validated_data)


class GroupMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupMember
        fields = (
            'id',
            'group_id',
            'display_name',
            'member_type',
            'sex',
            'age',
            'activity_level',
            'goal_type',
            'priority_weight',
            'height_cm',
            'weight_kg',
            'daily_calorie_target',
            'protein_target_g',
            'fat_target_g',
            'carb_target_g',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'group_id',
            'daily_calorie_target',
            'protein_target_g',
            'fat_target_g',
            'carb_target_g',
            'created_at',
            'updated_at',
        )

    def create(self, validated_data):
        group = self.context['group']
        macro_targets = derive_macro_targets(validated_data['goal_type'], validated_data.get('weight_kg'))
        return GroupMember.objects.create(group=group, **validated_data, **macro_targets)

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if 'goal_type' in validated_data or 'weight_kg' in validated_data:
            macro_targets = derive_macro_targets(instance.goal_type, instance.weight_kg)
            for key, value in macro_targets.items():
                setattr(instance, key, value)
        instance.save()
        return instance


class MemberConstraintSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberConstraint
        fields = (
            'id',
            'member_id',
            'constraint_type',
            'ingredient_id',
            'tag_key',
            'value_text',
            'severity_level',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'member_id', 'created_at', 'updated_at')

    def create(self, validated_data):
        member = self.context['member']
        return MemberConstraint.objects.create(member=member, **validated_data)


class GroupPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupPreference
        fields = (
            'id',
            'group_id',
            'spice_tolerance',
            'max_cooking_time_minutes',
            'repeat_tolerance',
            'variety_preference',
            'local_cuisine_priority',
            'price_priority_weight',
            'nutrition_priority_weight',
            'taste_priority_weight',
            'speed_priority_weight',
            'preferred_cuisines',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'group_id', 'created_at', 'updated_at')

    def create(self, validated_data):
        group = self.context['group']
        return GroupPreference.objects.create(group=group, **validated_data)


class SetupSummarySerializer(serializers.Serializer):
    group = GroupSerializer()
    members = GroupMemberSerializer(many=True)
    constraints_by_member = serializers.DictField(child=MemberConstraintSerializer(many=True))
    preferences = GroupPreferenceSerializer(allow_null=True)
    readiness_score = serializers.FloatField()
