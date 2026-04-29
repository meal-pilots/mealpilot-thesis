from __future__ import annotations

import logging

from django.core.cache import cache
from django.db import connection
from drf_spectacular.utils import extend_schema
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


@extend_schema(
    operation_id='health_live',
    description='Liveness probe. Returns 200 as long as the process is up.',
    responses={200: {'type': 'object', 'properties': {'status': {'type': 'string'}}}},
    tags=['health'],
)
class LivenessAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []
    throttle_classes: list = []

    def get(self, request):
        return Response({'status': 'live'})


@extend_schema(
    operation_id='health_ready',
    description='Readiness probe. Returns 200 only when DB and cache are reachable.',
    responses={200: {'type': 'object'}, 503: {'type': 'object'}},
    tags=['health'],
)
class ReadinessAPIView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []
    throttle_classes: list = []

    def get(self, request):
        checks: dict[str, str] = {}
        ok = True

        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            checks['database'] = 'ok'
        except Exception as exc:
            ok = False
            checks['database'] = f'error: {exc.__class__.__name__}'
            logger.warning('Readiness DB check failed', exc_info=exc)

        try:
            cache.set('health:readiness', '1', timeout=5)
            value = cache.get('health:readiness')
            checks['cache'] = 'ok' if value == '1' else 'degraded'
        except Exception as exc:
            ok = False
            checks['cache'] = f'error: {exc.__class__.__name__}'
            logger.warning('Readiness cache check failed', exc_info=exc)

        body = {'status': 'ready' if ok else 'not_ready', 'checks': checks}
        return Response(body, status=200 if ok else 503)
