from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _enable_db_access(db):
    """Allow DB access in every test by default. Individual tests can opt out."""
    yield


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        email='tester@example.com',
        password='StrongPass123!',
        full_name='Test User',
    )


@pytest.fixture
def auth_client(api_client, user):
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client
