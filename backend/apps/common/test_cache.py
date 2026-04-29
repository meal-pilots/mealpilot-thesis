"""Tests for the cache helper with stampede protection."""
from __future__ import annotations

from django.core.cache import cache

from apps.common.cache import cached_call, make_cache_key


def test_make_cache_key_is_deterministic():
    key_a = make_cache_key('test', 1, 'foo')
    key_b = make_cache_key('test', 1, 'foo')
    key_c = make_cache_key('test', 2, 'foo')
    assert key_a == key_b
    assert key_a != key_c


def test_cached_call_only_invokes_func_once_per_key():
    call_count = {'value': 0}

    @cached_call('test_namespace', timeout=60)
    def expensive_op(x):
        call_count['value'] += 1
        return x * 2

    cache.clear()

    result_a = expensive_op(5)
    result_b = expensive_op(5)
    result_c = expensive_op(5)

    assert result_a == result_b == result_c == 10
    assert call_count['value'] == 1


def test_cached_call_distinguishes_arguments():
    call_count = {'value': 0}

    @cached_call('test_namespace_args', timeout=60)
    def square(x):
        call_count['value'] += 1
        return x * x

    cache.clear()
    square(2)
    square(3)
    square(2)
    square(3)
    assert call_count['value'] == 2
