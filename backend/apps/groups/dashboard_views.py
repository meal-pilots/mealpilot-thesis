from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.views import APIView

from apps.catalog.models import Recipe, RecipeStatus
from apps.catalog.serializers import RecipeCardSerializer, _get_active_group
from apps.common.response import ok
from apps.planning.models import MealPlan
from apps.groups.models import Group


def _get_owned_group(user, group_id):
    return get_object_or_404(
        Group.objects.prefetch_related('members', 'preferences'),
        id=group_id,
        owner_user=user,
    )


def _calculate_setup_completeness(group: Group) -> float:
    checks = [
        bool(group.name),
        group.budget_amount is not None,
        group.members.exists(),
        hasattr(group, 'preferences'),
    ]
    score = sum(1 for value in checks if value) / len(checks)
    return round(score, 2)


class GroupDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, group_id):
        group = _get_owned_group(request.user, group_id)

        current_plan = (
            MealPlan.objects.filter(group=group, is_current=True)
            .order_by('-start_date', '-created_at')
            .first()
        )

        current_plan_summary = None
        budget_status = None
        nutrition_status = None

        if current_plan:
            current_plan_summary = {
                'id': current_plan.id,
                'title': current_plan.title,
                'start_date': current_plan.start_date,
                'end_date': current_plan.end_date,
                'estimated_total_cost': current_plan.estimated_total_cost,
                'nutrition_fit_score': current_plan.nutrition_fit_score,
                'budget_fit_score': current_plan.budget_fit_score,
                'overall_score': current_plan.overall_score,
            }

            budget_limit = Decimal(str(group.budget_amount))
            planned = Decimal(str(current_plan.estimated_total_cost))
            budget_status = {
                'limit': budget_limit,
                'planned': planned,
                'remaining': (budget_limit - planned).quantize(Decimal('0.01')),
            }

            nutrition_status = {
                'weekly_target_fit': current_plan.nutrition_fit_score,
                'protein_fit': Decimal('0.91'),
                'carb_fit': Decimal('0.84'),
                'fat_fit': Decimal('0.87'),
            }

        recommendations = (
            Recipe.objects.filter(status=RecipeStatus.PUBLISHED)
            .select_related('nutrition')
            .prefetch_related('recipe_tags__tag')
            .order_by('title')[:3]
        )
        recommendation_preview = RecipeCardSerializer(
            recommendations,
            many=True,
            context={'active_group': group},
        ).data

        payload = {
            'active_group': {
                'id': group.id,
                'name': group.name,
                'group_type': group.group_type,
            },
            'current_plan_summary': current_plan_summary,
            'budget_status': budget_status,
            'nutrition_status': nutrition_status,
            'recommendation_preview': recommendation_preview,
            'setup_completeness': _calculate_setup_completeness(group),
        }

        return ok(payload)


class GroupDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, group_id):
        group = _get_owned_group(request.user, group_id)
        group.delete()
        return ok(status_code=status.HTTP_204_NO_CONTENT)