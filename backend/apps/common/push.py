from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Iterable

import requests
from django.conf import settings

from apps.devices.models import Device

logger = logging.getLogger(__name__)

EXPO_BATCH_SIZE = 100


@dataclass(slots=True)
class PushMessage:
    """Single Expo push message destined to one device."""

    token: str
    title: str
    body: str
    data: dict[str, Any] | None = None
    sound: str | None = 'default'
    badge: int | None = None
    channel_id: str = 'default'
    priority: str = 'high'

    def to_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            'to': self.token,
            'title': self.title,
            'body': self.body,
            'priority': self.priority,
            'channelId': self.channel_id,
        }
        if self.data is not None:
            payload['data'] = self.data
        if self.sound:
            payload['sound'] = self.sound
        if self.badge is not None:
            payload['badge'] = self.badge
        return payload


def _chunk(items: list[PushMessage], size: int) -> Iterable[list[PushMessage]]:
    for index in range(0, len(items), size):
        yield items[index : index + size]


def send_push_messages(messages: list[PushMessage]) -> dict[str, int]:
    """Send a batch of push messages via the Expo Push API.

    Returns a small summary dict so callers can attach it to logs/metrics.
    Honors EXPO_ACCESS_TOKEN if configured (recommended for production).
    """
    if not messages:
        return {'sent': 0, 'failed': 0}

    headers = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
    }
    if settings.EXPO_ACCESS_TOKEN:
        headers['Authorization'] = f'Bearer {settings.EXPO_ACCESS_TOKEN}'

    sent = 0
    failed = 0
    invalid_tokens: list[str] = []

    for batch in _chunk(messages, EXPO_BATCH_SIZE):
        payload = [message.to_payload() for message in batch]
        try:
            response = requests.post(
                settings.EXPO_PUSH_API_URL,
                json=payload,
                headers=headers,
                timeout=15,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            failed += len(batch)
            logger.warning('Expo push batch failed', extra={'error': str(exc)})
            continue

        try:
            data = response.json().get('data', [])
        except ValueError:
            failed += len(batch)
            continue

        for message, ticket in zip(batch, data):
            if not isinstance(ticket, dict):
                failed += 1
                continue
            if ticket.get('status') == 'ok':
                sent += 1
            else:
                failed += 1
                error_code = ticket.get('details', {}).get('error') if isinstance(ticket.get('details'), dict) else None
                if error_code in {'DeviceNotRegistered', 'InvalidCredentials'}:
                    invalid_tokens.append(message.token)

    if invalid_tokens:
        Device.objects.filter(expo_push_token__in=invalid_tokens).update(is_active=False)

    return {'sent': sent, 'failed': failed, 'invalidated': len(invalid_tokens)}


def send_push_to_user(user, title: str, body: str, data: dict[str, Any] | None = None) -> dict[str, int]:
    devices = list(
        Device.objects.filter(user=user, is_active=True, push_enabled=True).values_list('expo_push_token', flat=True)
    )
    if not devices:
        return {'sent': 0, 'failed': 0}

    messages = [PushMessage(token=token, title=title, body=body, data=data) for token in devices]
    return send_push_messages(messages)
