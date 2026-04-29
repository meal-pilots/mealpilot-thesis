from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.response import ok
from .models import UserSettings
from .settings_serializers import (
    LogoutSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer,
    SettingsSerializer,
    SettingsUpdateSerializer,
)


def _get_or_create_user_settings(user):
    settings_obj, _ = UserSettings.objects.get_or_create(user=user)
    return settings_obj


class ProfileRetrieveUpdateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return ok(ProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        user = request.user
        for field, value in serializer.validated_data.items():
            setattr(user, field, value)
        user.save()

        return ok(ProfileSerializer(user).data)


class SettingsRetrieveUpdateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        settings_obj = _get_or_create_user_settings(request.user)
        payload = {
            'preferred_language': request.user.preferred_language,
            'notifications_enabled': settings_obj.notifications_enabled,
            'measurement_system': settings_obj.measurement_system,
            'currency_code': settings_obj.currency_code,
        }
        return ok(SettingsSerializer(payload).data)

    def patch(self, request):
        serializer = SettingsUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        user = request.user
        settings_obj = _get_or_create_user_settings(user)

        if 'preferred_language' in serializer.validated_data:
            user.preferred_language = serializer.validated_data['preferred_language']
            user.save(update_fields=['preferred_language'])

        if 'notifications_enabled' in serializer.validated_data:
            settings_obj.notifications_enabled = serializer.validated_data['notifications_enabled']

        if 'measurement_system' in serializer.validated_data:
            settings_obj.measurement_system = serializer.validated_data['measurement_system']

        if 'currency_code' in serializer.validated_data:
            settings_obj.currency_code = serializer.validated_data['currency_code']

        settings_obj.save()

        payload = {
            'preferred_language': user.preferred_language,
            'notifications_enabled': settings_obj.notifications_enabled,
            'measurement_system': settings_obj.measurement_system,
            'currency_code': settings_obj.currency_code,
        }
        return ok(SettingsSerializer(payload).data)


class LogoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data['refresh_token']

        try:
            token = RefreshToken(refresh_token)
            try:
                token.blacklist()
            except Exception:
                pass
        except Exception:
            pass

        return ok(status_code=status.HTTP_204_NO_CONTENT)