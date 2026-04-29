"""Tests for App Store + GDPR account management endpoints."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


def test_account_delete_requires_password_match(db):
    user = User.objects.create_user(
        email='delete@example.com',
        password='OriginalPass123!',
        full_name='Delete Me',
    )
    client = APIClient()
    client.force_authenticate(user=user)

    url = reverse('account-delete')
    response = client.delete(url, {'confirm': True, 'password': 'wrong'}, format='json')

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert User.objects.filter(id=user.id).exists()


def test_account_delete_succeeds_with_correct_password(db):
    user = User.objects.create_user(
        email='delete-ok@example.com',
        password='CorrectPass123!',
        full_name='Delete OK',
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.delete(
        reverse('account-delete'),
        {'confirm': True, 'password': 'CorrectPass123!'},
        format='json',
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not User.objects.filter(id=user.id).exists()


def test_account_export_returns_attachment(db):
    user = User.objects.create_user(
        email='export@example.com',
        password='ExportPass123!',
        full_name='Export Me',
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse('account-export'))

    assert response.status_code == status.HTTP_200_OK
    assert response['Content-Type'].startswith('application/json')
    assert 'attachment' in response['Content-Disposition']
    body = response.content.decode('utf-8')
    assert 'export@example.com' in body


def test_account_endpoints_require_authentication(db):
    client = APIClient()
    response = client.delete(reverse('account-delete'), {'confirm': True, 'password': 'x'}, format='json')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

    response = client.get(reverse('account-export'))
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
