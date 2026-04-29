from rest_framework import serializers


class ShoppingListItemUpdateSerializer(serializers.Serializer):
    is_checked = serializers.BooleanField(required=False)
    total_quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    estimated_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    category_label = serializers.CharField(max_length=64, required=False)


class ShoppingListCustomItemCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2)
    unit = serializers.CharField(max_length=32)
    estimated_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    category_label = serializers.CharField(max_length=64)


class MealPlanCloneSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)


class ShareLinkCreateSerializer(serializers.Serializer):
    expires_in_days = serializers.IntegerField(min_value=1, max_value=365, default=7)