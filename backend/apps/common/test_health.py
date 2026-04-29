"""Health endpoint smoke tests."""
from __future__ import annotations

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


def test_liveness_returns_ok():
    client = APIClient()
    response = client.get(reverse('health-live'))
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {'status': 'live'}


def test_readiness_returns_checks(db):
    client = APIClient()
    response = client.get(reverse('health-ready'))
    assert response.status_code in {status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE}
    body = response.json()
    assert 'status' in body
    assert 'checks' in body
    assert 'database' in body['checks']
    assert 'cache' in body['checks']
