from __future__ import annotations

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.response import ok

from .models import Device
from .serializers import DeviceRegisterSerializer, DeviceSerializer


@extend_schema(tags=['devices'])
class DeviceRegisterAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DeviceRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        device, _created = Device.objects.update_or_create(
            expo_push_token=validated['expo_push_token'],
            defaults={
                'user': request.user,
                'platform': validated['platform'],
                'app_version': validated.get('app_version', ''),
                'os_version': validated.get('os_version', ''),
                'device_name': validated.get('device_name', ''),
                'locale': validated.get('locale', ''),
                'timezone': validated.get('timezone', ''),
                'push_enabled': validated.get('push_enabled', True),
                'is_active': True,
            },
        )
        return ok(DeviceSerializer(device).data, status_code=status.HTTP_200_OK)


@extend_schema(tags=['devices'])
class DeviceListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        devices = Device.objects.filter(user=request.user, is_active=True)
        return ok(DeviceSerializer(devices, many=True).data)


@extend_schema(tags=['devices'])
class DeviceUnregisterAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, device_id):
        device = get_object_or_404(Device, id=device_id, user=request.user)
        device.is_active = False
        device.save(update_fields=['is_active', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)
