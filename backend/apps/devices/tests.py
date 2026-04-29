"""Tests for the device registration endpoints used by the mobile app."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from .models import Device, DevicePlatform

User = get_user_model()


def _auth_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_register_device_creates_record(db):
    user = User.objects.create_user(email='dev@example.com', password='Pass123!', full_name='Dev')
    client = _auth_client(user)

    response = client.post(
        reverse('device-register'),
        {
            'expo_push_token': 'ExponentPushToken[abcdef0123456789]',
            'platform': DevicePlatform.IOS,
            'app_version': '1.0.0',
            'device_name': 'iPhone 15 Sim',
            'locale': 'ru-KZ',
            'timezone': 'Asia/Almaty',
        },
        format='json',
    )

    assert response.status_code == status.HTTP_200_OK
    assert Device.objects.filter(user=user).count() == 1
    device = Device.objects.get(user=user)
    assert device.platform == 'ios'
    assert device.is_active is True


def test_register_device_is_idempotent_for_same_token(db):
    user = User.objects.create_user(email='dev2@example.com', password='Pass123!', full_name='Dev2')
    client = _auth_client(user)
    payload = {
        'expo_push_token': 'ExponentPushToken[abcdef0123456789]',
        'platform': DevicePlatform.ANDROID,
    }

    first = client.post(reverse('device-register'), payload, format='json')
    second = client.post(reverse('device-register'), payload, format='json')

    assert first.status_code == status.HTTP_200_OK
    assert second.status_code == status.HTTP_200_OK
    assert Device.objects.filter(user=user).count() == 1


def test_register_device_rejects_non_expo_token(db):
    user = User.objects.create_user(email='dev3@example.com', password='Pass123!', full_name='Dev3')
    client = _auth_client(user)
    response = client.post(
        reverse('device-register'),
        {'expo_push_token': 'random-token', 'platform': DevicePlatform.IOS},
        format='json',
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_unregister_device_marks_inactive(db):
    user = User.objects.create_user(email='dev4@example.com', password='Pass123!', full_name='Dev4')
    device = Device.objects.create(
        user=user,
        expo_push_token='ExponentPushToken[xxx]',
        platform=DevicePlatform.IOS,
    )
    client = _auth_client(user)

    response = client.delete(reverse('device-unregister', args=[str(device.id)]))

    assert response.status_code == status.HTTP_204_NO_CONTENT
    device.refresh_from_db()
    assert device.is_active is False
