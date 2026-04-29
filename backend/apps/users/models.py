from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.common.models import UUIDTimeStampedModel
from .managers import UserManager
from django.conf import settings

class User(UUIDTimeStampedModel, AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    preferred_language = models.CharField(max_length=10, default='en')
    avatar_url = models.URLField(blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    objects = UserManager()

    def __str__(self) -> str:
        return self.email

class MeasurementSystem(models.TextChoices):
    METRIC = 'metric', 'Metric'
    IMPERIAL = 'imperial', 'Imperial'


class UserSettings(UUIDTimeStampedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='settings',
    )
    notifications_enabled = models.BooleanField(default=True)
    measurement_system = models.CharField(
        max_length=16,
        choices=MeasurementSystem.choices,
        default=MeasurementSystem.METRIC,
    )
    currency_code = models.CharField(max_length=10, default='KZT')

    def __str__(self) -> str:
        return f'Settings for {self.user.email}'