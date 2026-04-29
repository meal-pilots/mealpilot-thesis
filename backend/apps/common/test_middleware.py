"""Tests for request_id and app version gate middleware."""
from __future__ import annotations

from django.test import RequestFactory, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.common.middleware import (
    AppVersionGateMiddleware,
    RequestIDMiddleware,
    _parse_semver,
)


def test_request_id_propagates_in_response_header():
    client = APIClient()
    response = client.get(reverse('health-live'), HTTP_X_REQUEST_ID='req-1234')
    assert response.headers.get('X-Request-ID') == 'req-1234'


def test_request_id_generated_when_absent():
    client = APIClient()
    response = client.get(reverse('health-live'))
    request_id = response.headers.get('X-Request-ID')
    assert request_id and len(request_id) >= 16


def test_parse_semver_handles_messy_strings():
    assert _parse_semver('1.2.3') == (1, 2, 3)
    assert _parse_semver('v1.2') == (1, 2, 0)
    assert _parse_semver('') == (0, 0, 0)
    assert _parse_semver(None) == (0, 0, 0)
    assert _parse_semver('garbage') == (0, 0, 0)


@override_settings(MIN_APP_VERSION_IOS='2.0.0', MIN_APP_VERSION_ANDROID='2.0.0')
def test_app_version_gate_blocks_old_clients():
    client = APIClient()
    response = client.get(
        reverse('health-live'),
        HTTP_X_APP_VERSION='1.5.0',
        HTTP_X_PLATFORM='ios',
    )
    assert response.status_code == 426


@override_settings(MIN_APP_VERSION_IOS='2.0.0', MIN_APP_VERSION_ANDROID='2.0.0')
def test_app_version_gate_passes_new_clients():
    client = APIClient()
    response = client.get(
        reverse('health-live'),
        HTTP_X_APP_VERSION='2.1.0',
        HTTP_X_PLATFORM='android',
    )
    assert response.status_code == 200


def test_app_version_gate_ignores_web_requests():
    client = APIClient()
    response = client.get(reverse('health-live'))
    assert response.status_code == 200
