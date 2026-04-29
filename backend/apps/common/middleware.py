from __future__ import annotations

import logging
import re
import uuid
from typing import Callable

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse

logger = logging.getLogger(__name__)


REQUEST_ID_HEADER = 'HTTP_X_REQUEST_ID'
REQUEST_ID_RESPONSE_HEADER = 'X-Request-ID'


class RequestIDMiddleware:
    """Attaches a stable request_id to every request and propagates it via response header.

    Generates a new UUID4 when the inbound request does not already carry one. Used
    by structured logging to correlate a single request across services.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request_id = request.META.get(REQUEST_ID_HEADER) or uuid.uuid4().hex
        request.request_id = request_id
        response = self.get_response(request)
        response.headers[REQUEST_ID_RESPONSE_HEADER] = request_id
        return response


_VERSION_RE = re.compile(r'^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?')


def _parse_semver(value: str | None) -> tuple[int, int, int]:
    if not value:
        return (0, 0, 0)
    match = _VERSION_RE.match(value)
    if not match:
        return (0, 0, 0)
    parts = match.groups(default='0')
    return (int(parts[0]), int(parts[1]), int(parts[2]))


class AppVersionGateMiddleware:
    """Enforces a minimum mobile app version via X-App-Version + X-Platform headers.

    Returns 426 Upgrade Required when the inbound version is below the configured
    minimum for the platform. Lets web/admin requests pass freely (no headers).
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        platform = (request.headers.get('X-Platform') or '').strip().lower()
        version_header = request.headers.get('X-App-Version')

        if platform in {'ios', 'android'} and version_header:
            current = _parse_semver(version_header)
            if platform == 'ios':
                minimum = _parse_semver(settings.MIN_APP_VERSION_IOS)
            else:
                minimum = _parse_semver(settings.MIN_APP_VERSION_ANDROID)

            if current < minimum:
                return JsonResponse(
                    {
                        'detail': 'A new version of the app is required to continue.',
                        'code': 'app_version_too_old',
                        'min_version': '.'.join(str(part) for part in minimum),
                        'current_version': version_header,
                        'platform': platform,
                    },
                    status=426,
                )

        return self.get_response(request)
