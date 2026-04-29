from __future__ import annotations

from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle, UserRateThrottle


class ScopedAnonRateThrottle(AnonRateThrottle):
    """Anon throttle that defers to view-level `throttle_scope` when defined.

    This lets sensitive endpoints (login, signup, plan generation) tighten limits
    without losing the global anon protection on everything else.
    """

    def get_cache_key(self, request, view):
        scope_attr = getattr(view, 'throttle_scope', None)
        if scope_attr:
            self.scope = scope_attr
            self.rate = self.get_rate()
            self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().get_cache_key(request, view)


class ScopedUserRateThrottle(UserRateThrottle):
    """User-based throttle with optional per-view scope override."""

    def get_cache_key(self, request, view):
        scope_attr = getattr(view, 'throttle_scope', None)
        if scope_attr:
            self.scope = scope_attr
            self.rate = self.get_rate()
            self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().get_cache_key(request, view)


class AuthEndpointThrottle(ScopedRateThrottle):
    """Strict throttle for login/signup/refresh endpoints."""

    scope = 'auth'


class PlanGenerationThrottle(ScopedRateThrottle):
    """Strict throttle for the expensive plan generation endpoint."""

    scope = 'plan_generation'
