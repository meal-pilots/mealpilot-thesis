from __future__ import annotations

from rest_framework import serializers

from .models import Device


class DeviceRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = (
            'expo_push_token',
            'platform',
            'app_version',
            'os_version',
            'device_name',
            'locale',
            'timezone',
            'push_enabled',
        )

    def validate_expo_push_token(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError('Push token is empty.')
        if not (cleaned.startswith('ExponentPushToken[') or cleaned.startswith('ExpoPushToken[')):
            raise serializers.ValidationError('Push token must be a valid Expo token.')
        return cleaned


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = (
            'id',
            'platform',
            'app_version',
            'device_name',
            'locale',
            'timezone',
            'is_active',
            'push_enabled',
            'last_seen_at',
            'created_at',
        )
        read_only_fields = fields
