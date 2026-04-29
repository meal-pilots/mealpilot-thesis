from __future__ import annotations

import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.response import ok

User = get_user_model()


class AccountDeleteSerializer(serializers.Serializer):
    confirm = serializers.BooleanField(required=True)
    password = serializers.CharField(required=True, write_only=True, allow_blank=False)

    def validate(self, attrs):
        if not attrs.get('confirm'):
            raise serializers.ValidationError({'confirm': 'You must confirm account deletion.'})
        return attrs


@extend_schema(
    tags=['account'],
    description=(
        'Permanently deletes the authenticated user account and cascades to '
        'all owned data (groups, plans, recipes feedback, devices). '
        'Required by App Store guideline 5.1.1(v) and GDPR Article 17.'
    ),
)
class AccountDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        serializer = AccountDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['password']):
            return Response(
                {'detail': 'Password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            for token in user.outstandingtoken_set.all() if hasattr(user, 'outstandingtoken_set') else []:
                try:
                    token.blacklist()
                except Exception:
                    pass
            user.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=['account'],
    description='Returns a JSON dump of all data the user has stored. GDPR Article 20.',
)
class AccountDataExportAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        export_payload = _build_user_export(user)

        body = json.dumps(export_payload, ensure_ascii=False, indent=2, default=str)
        response = HttpResponse(body, content_type='application/json; charset=utf-8')
        filename = f'mealplanner-export-{user.id}-{timezone.now():%Y%m%d}.json'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


def _build_user_export(user) -> dict:
    """Serialize all user-owned domain data into a portable JSON dict."""
    profile = {
        'id': str(user.id),
        'email': user.email,
        'full_name': user.full_name,
        'preferred_language': user.preferred_language,
        'avatar_url': user.avatar_url,
        'date_joined': user.date_joined,
        'last_login': user.last_login,
    }

    groups = []
    for group in user.owned_groups.all():
        members = list(group.members.values(
            'id', 'display_name', 'member_type', 'sex', 'age', 'activity_level',
            'goal_type', 'priority_weight', 'height_cm', 'weight_kg',
            'daily_calorie_target', 'protein_target_g', 'fat_target_g', 'carb_target_g',
        ))
        groups.append({
            'id': str(group.id),
            'name': group.name,
            'group_type': group.group_type,
            'currency_code': group.currency_code,
            'region_code': group.region_code,
            'budget_period_type': group.budget_period_type,
            'budget_amount': str(group.budget_amount),
            'planning_days_default': group.planning_days_default,
            'meals_per_day_default': group.meals_per_day_default,
            'is_active': group.is_active,
            'members': members,
        })

    favorites = list(
        user.favorite_recipes.values('id', 'recipe_id', 'created_at')
    )
    feedbacks = list(
        user.recipe_feedbacks.values(
            'id', 'recipe_id', 'group_id', 'liked', 'rating',
            'disliked_reason', 'would_repeat', 'created_at',
        )
    )
    plan_feedbacks = list(
        user.plan_feedbacks.values(
            'id', 'meal_plan_id', 'overall_rating', 'budget_satisfaction',
            'nutrition_satisfaction', 'taste_satisfaction', 'variety_satisfaction',
            'comment', 'created_at',
        )
    )
    devices = list(user.devices.values('id', 'platform', 'app_version', 'last_seen_at', 'is_active'))

    return {
        'profile': profile,
        'groups': groups,
        'favorite_recipes': favorites,
        'recipe_feedbacks': feedbacks,
        'plan_feedbacks': plan_feedbacks,
        'devices': devices,
        'exported_at': timezone.now(),
        'export_window_days': (timedelta(days=365 * 10)).days,
    }
