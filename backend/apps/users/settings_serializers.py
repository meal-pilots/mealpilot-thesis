from rest_framework import serializers

from .models import User, UserSettings


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'full_name',
            'preferred_language',
            'avatar_url',
            'created_at',
        )


class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=False)
    preferred_language = serializers.CharField(max_length=10, required=False)
    avatar_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)


class SettingsSerializer(serializers.Serializer):
    preferred_language = serializers.CharField(max_length=10)
    notifications_enabled = serializers.BooleanField()
    measurement_system = serializers.ChoiceField(choices=['metric', 'imperial'])
    currency_code = serializers.CharField(max_length=10)


class SettingsUpdateSerializer(serializers.Serializer):
    preferred_language = serializers.CharField(max_length=10, required=False)
    notifications_enabled = serializers.BooleanField(required=False)
    measurement_system = serializers.ChoiceField(choices=['metric', 'imperial'], required=False)
    currency_code = serializers.CharField(max_length=10, required=False)


class LogoutSerializer(serializers.Serializer):
    refresh_token = serializers.CharField()