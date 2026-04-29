from __future__ import annotations

import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    """Wrap DRF responses in the consistent {"data": ..., "errors": ...} envelope.

    Falls through to the default DRF handler first to keep validation/auth
    semantics intact, then normalizes the response body and attaches the
    inbound request_id for client-side correlation.
    """
    response = drf_exception_handler(exc, context)

    if response is None:
        logger.exception('Unhandled exception in API view', exc_info=exc)
        return Response(
            {
                'data': None,
                'errors': {
                    'detail': 'Internal server error',
                    'code': 'internal_server_error',
                },
            },
            status=500,
        )

    request = context.get('request') if context else None
    request_id = getattr(request, 'request_id', None) if request else None

    payload = {
        'data': None,
        'errors': response.data if isinstance(response.data, (dict, list)) else {'detail': str(response.data)},
    }
    if request_id:
        payload['request_id'] = request_id

    response.data = payload
    return response
