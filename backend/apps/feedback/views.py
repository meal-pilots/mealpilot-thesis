from django.db.models import Count, Max
from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.views import APIView

from apps.catalog.models import Recipe
from apps.common.response import ok
from apps.groups.models import Group
from apps.planning.models import MealPlan, MealPlanItem
from .serializers import (
    HistoryMealPlanItemSerializer,
    HistoryRecipeItemSerializer,
    InteractionEventCreateSerializer,
    PlanFeedbackCreateSerializer,
    PlanFeedbackSerializer,
    RecipeFeedbackCreateSerializer,
    RecipeFeedbackSerializer,
)


def _get_owned_group(user, group_id):
    return get_object_or_404(Group, id=group_id, owner_user=user)


def _get_owned_recipe(user, recipe_id):
    return get_object_or_404(Recipe, id=recipe_id, status='published')


def _get_owned_meal_plan(user, meal_plan_id):
    return get_object_or_404(MealPlan, id=meal_plan_id, group__owner_user=user)


class RecipeFeedbackCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, recipe_id):
        recipe = _get_owned_recipe(request.user, recipe_id)
        serializer = RecipeFeedbackCreateSerializer(
            data=request.data,
            context={'request': request, 'recipe': recipe},
        )
        serializer.is_valid(raise_exception=True)
        feedback = serializer.save()
        return ok(RecipeFeedbackSerializer(feedback).data, status_code=201)


class MealPlanFeedbackCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        serializer = PlanFeedbackCreateSerializer(
            data=request.data,
            context={'request': request, 'meal_plan': meal_plan},
        )
        serializer.is_valid(raise_exception=True)
        feedback = serializer.save()
        return ok(PlanFeedbackSerializer(feedback).data, status_code=201)


class InteractionEventCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = InteractionEventCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return ok(status_code=204)


class MealPlanHistoryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, group_id):
        group = _get_owned_group(request.user, group_id)
        queryset = (
            MealPlan.objects.filter(group=group)
            .order_by('-start_date', '-created_at')
        )
        serializer = HistoryMealPlanItemSerializer(queryset, many=True)
        return ok(serializer.data)


class RecipeHistoryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, group_id):
        group = _get_owned_group(request.user, group_id)

        usage = (
            MealPlanItem.objects.filter(meal_plan_day__meal_plan__group=group)
            .values('recipe_id', 'recipe__title')
            .annotate(
                last_used_at=Max('created_at'),
                times_used=Count('id'),
            )
            .order_by('-last_used_at')
        )

        payload = [
            {
                'recipe_id': item['recipe_id'],
                'title': item['recipe__title'],
                'last_used_at': item['last_used_at'],
                'times_used': item['times_used'],
            }
            for item in usage
        ]

        serializer = HistoryRecipeItemSerializer(payload, many=True)
        return ok(serializer.data)