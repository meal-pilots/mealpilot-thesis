from django.urls import path

from .views import DeviceListAPIView, DeviceRegisterAPIView, DeviceUnregisterAPIView

urlpatterns = [
    path('devices/register', DeviceRegisterAPIView.as_view(), name='device-register'),
    path('devices', DeviceListAPIView.as_view(), name='device-list'),
    path('devices/<uuid:device_id>', DeviceUnregisterAPIView.as_view(), name='device-unregister'),
]
