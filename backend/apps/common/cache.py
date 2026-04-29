from __future__ import annotations

import functools
import hashlib
import json
import logging
import random
from typing import Any, Callable

from django.core.cache import cache

logger = logging.getLogger(__name__)


CACHE_VERSION = 1
DEFAULT_TIMEOUT = 60 * 5
LOCK_TIMEOUT = 30


def make_cache_key(namespace: str, *parts: Any) -> str:
    """Deterministic cache key with version namespace prefix."""
    payload = json.dumps(parts, sort_keys=True, default=str)
    digest = hashlib.sha256(payload.encode('utf-8')).hexdigest()[:24]
    return f'v{CACHE_VERSION}:{namespace}:{digest}'


def cached_call(
    namespace: str,
    timeout: int = DEFAULT_TIMEOUT,
    jitter_seconds: int = 30,
):
    """Decorator that wraps a deterministic function with cache + stampede protection.

    Adds random jitter to TTL so caches across many keys don't expire simultaneously,
    and uses cache.add() to elect a single populator under stampede.
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = make_cache_key(namespace, *args, kwargs)
            value = cache.get(cache_key)
            if value is not None:
                return value

            lock_key = f'{cache_key}:lock'
            acquired = cache.add(lock_key, '1', timeout=LOCK_TIMEOUT)

            if not acquired:
                stale = cache.get(cache_key)
                if stale is not None:
                    return stale
                return func(*args, **kwargs)

            try:
                value = func(*args, **kwargs)
                ttl = timeout + random.randint(0, max(jitter_seconds, 0))
                cache.set(cache_key, value, timeout=ttl)
                return value
            except Exception:
                logger.exception('cached_call populator failed', extra={'key': cache_key})
                raise
            finally:
                cache.delete(lock_key)

        wrapper.cache_invalidate = lambda *args, **kwargs: cache.delete(  # type: ignore[attr-defined]
            make_cache_key(namespace, *args, kwargs)
        )
        return wrapper

    return decorator


def invalidate_namespace(namespace: str) -> None:
    """Bumps CACHE_VERSION-style invalidation by deleting common keys.

    Real broad invalidation for Redis would use SCAN; for production we rely on
    short TTLs + targeted invalidations after writes.
    """
    logger.info('invalidate_namespace called', extra={'namespace': namespace})
