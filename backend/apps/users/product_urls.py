from django.urls import path

from .settings_views import (
    LogoutAPIView,
    ProfileRetrieveUpdateAPIView,
    SettingsRetrieveUpdateAPIView,
)

urlpatterns = [
    path('profile', ProfileRetrieveUpdateAPIView.as_view(), name='profile'),
    path('settings', SettingsRetrieveUpdateAPIView.as_view(), name='settings'),
    path('auth/log-out', LogoutAPIView.as_view(), name='auth-log-out'),
]