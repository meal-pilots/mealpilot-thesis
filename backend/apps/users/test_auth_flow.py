from __future__ import annotations

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


def test_signup_normalizes_email_and_login_accepts_mixed_case(db):
    client = APIClient()

    response = client.post(
        reverse('sign-up'),
        {
            'email': ' Mixed.Case@Example.COM ',
            'password': 'StrongPass123!',
            'full_name': 'Mixed Case',
        },
        format='json',
    )

    assert response.status_code == status.HTTP_201_CREATED
    user = User.objects.get()
    assert user.email == 'mixed.case@example.com'

    login_response = client.post(
        reverse('log-in'),
        {
            'email': 'MIXED.CASE@example.com',
            'password': 'StrongPass123!',
        },
        format='json',
    )

    assert login_response.status_code == status.HTTP_200_OK
    assert login_response.data['data']['user']['email'] == 'mixed.case@example.com'


def test_signup_rejects_case_insensitive_duplicate_email(db):
    User.objects.create_user(
        email='duplicate@example.com',
        password='StrongPass123!',
        full_name='Existing User',
    )
    client = APIClient()

    response = client.post(
        reverse('sign-up'),
        {
            'email': 'DUPLICATE@example.com',
            'password': 'StrongPass123!',
            'full_name': 'Duplicate User',
        },
        format='json',
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'email' in response.data['errors']


def test_signup_applies_configured_password_validators(db):
    client = APIClient()

    response = client.post(
        reverse('sign-up'),
        {
            'email': 'numeric-password@example.com',
            'password': '12345678',
            'full_name': 'Numeric Password',
        },
        format='json',
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'password' in response.data['errors']
