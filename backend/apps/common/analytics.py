"""PostHog analytics shim with safe defaults.

The PostHog client is optional; when `POSTHOG_API_KEY` is unset we silently
no-op. This lets dev environments run without analytics dependencies and
production opt into it via env vars.
"""
from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


_client = None
_initialized = False


def _ensure_client() -> Any:
    global _client, _initialized
    if _initialized:
        return _client

    api_key = os.getenv('POSTHOG_API_KEY', '').strip()
    if not api_key:
        _initialized = True
        return None

    try:
        from posthog import Posthog

        _client = Posthog(
            project_api_key=api_key,
            host=os.getenv('POSTHOG_HOST', 'https://eu.i.posthog.com'),
        )
    except Exception:
        logger.exception('Failed to initialize PostHog client')
        _client = None

    _initialized = True
    return _client


def track_event(distinct_id: str, event: str, properties: dict[str, Any] | None = None) -> None:
    client = _ensure_client()
    if client is None:
        return
    try:
        client.capture(distinct_id=distinct_id, event=event, properties=properties or {})
    except Exception:
        logger.warning('PostHog capture failed', exc_info=True)


def track_user(user, event: str, properties: dict[str, Any] | None = None) -> None:
    if user is None or not getattr(user, 'is_authenticated', False):
        return
    track_event(distinct_id=str(user.id), event=event, properties=properties)
