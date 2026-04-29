from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.common.models import UUIDTimeStampedModel


class DevicePlatform(models.TextChoices):
    IOS = 'ios', 'iOS'
    ANDROID = 'android', 'Android'
    WEB = 'web', 'Web'


class Device(UUIDTimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='devices',
    )
    expo_push_token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=16, choices=DevicePlatform.choices)
    app_version = models.CharField(max_length=32, blank=True, default='')
    os_version = models.CharField(max_length=32, blank=True, default='')
    device_name = models.CharField(max_length=128, blank=True, default='')
    locale = models.CharField(max_length=16, blank=True, default='')
    timezone = models.CharField(max_length=64, blank=True, default='')
    last_seen_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ['-last_seen_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['platform', 'is_active']),
        ]

    def __str__(self) -> str:
        return f'{self.user.email} - {self.platform} - {self.expo_push_token[:24]}'
