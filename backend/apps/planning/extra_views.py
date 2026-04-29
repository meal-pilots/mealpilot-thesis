import secrets
from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.views import APIView

from apps.common.response import ok
from .extra_serializers import (
    MealPlanCloneSerializer,
    ShareLinkCreateSerializer,
    ShoppingListCustomItemCreateSerializer,
    ShoppingListItemUpdateSerializer,
)
from .models import MealPlan, ShareLink, ShoppingListItem
from .serializers import MealPlanDaySerializer, MealPlanSummarySerializer, ShoppingListSerializer
from .services import (
    build_price_comparison,
    clone_meal_plan,
    recompute_shopping_list_total,
)


def _get_owned_meal_plan(user, meal_plan_id):
    return get_object_or_404(
        MealPlan.objects.select_related('group').prefetch_related(
            'days__items__adaptations__member',
            'days__items__recipe',
            'explanations',
        ),
        id=meal_plan_id,
        group__owner_user=user,
    )


def _get_owned_shopping_list_item(user, item_id):
    return get_object_or_404(
        ShoppingListItem.objects.select_related('shopping_list__meal_plan__group', 'ingredient'),
        id=item_id,
        shopping_list__meal_plan__group__owner_user=user,
    )


class ShoppingListItemUpdateDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, item_id):
        item = _get_owned_shopping_list_item(request.user, item_id)
        serializer = ShoppingListItemUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(item, field, value)
        item.save()

        recompute_shopping_list_total(item.shopping_list)
        return ok(
            {
                'id': item.id,
                'is_checked': item.is_checked,
                'total_quantity': item.total_quantity,
                'estimated_price': item.estimated_price,
                'category_label': item.category_label,
            }
        )

    def delete(self, request, item_id):
        item = _get_owned_shopping_list_item(request.user, item_id)
        shopping_list = item.shopping_list
        item.delete()
        recompute_shopping_list_total(shopping_list)
        return ok(status_code=status.HTTP_204_NO_CONTENT)


class ShoppingListCustomItemCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        shopping_list = getattr(meal_plan, 'shopping_list', None)
        if not shopping_list:
            return ok({'error': {'code': 'NOT_FOUND', 'message': 'Shopping list not found.'}}, status_code=404)

        serializer = ShoppingListCustomItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            ingredient=None,
            ingredient_name_override=serializer.validated_data['name'],
            total_quantity=serializer.validated_data['quantity'],
            unit=serializer.validated_data['unit'],
            estimated_price=serializer.validated_data['estimated_price'],
            category_label=serializer.validated_data['category_label'],
            is_checked=False,
            availability_status='custom',
        )
        recompute_shopping_list_total(shopping_list)

        return ok(
            {
                'id': item.id,
                'name': item.display_name,
                'quantity': item.total_quantity,
                'unit': item.unit,
                'estimated_price': item.estimated_price,
                'category_label': item.category_label,
                'is_checked': item.is_checked,
            },
            status_code=status.HTTP_201_CREATED,
        )


class MealPlanCloneAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        serializer = MealPlanCloneSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        cloned = clone_meal_plan(
            meal_plan=meal_plan,
            user=request.user,
            start_date=serializer.validated_data.get('start_date'),
        )
        return ok({'id': cloned.id, 'status': cloned.status})


class MealPlanDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        meal_plan.delete()
        return ok(status_code=status.HTTP_204_NO_CONTENT)


class MealPlanPriceComparisonAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        return ok(build_price_comparison(meal_plan))


class MealPlanShareLinkCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        serializer = ShareLinkCreateSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)

        expires_in_days = serializer.validated_data.get('expires_in_days', 7)
        share_link = ShareLink.objects.create(
            meal_plan=meal_plan,
            created_by=request.user,
            token=secrets.token_urlsafe(24),
            expires_at=timezone.now() + timedelta(days=expires_in_days),
            is_active=True,
        )

        share_url = request.build_absolute_uri(f'/api/v1/shared/meal-plans/{share_link.token}')
        return ok(
            {
                'share_url': share_url,
                'expires_at': share_link.expires_at,
            }
        )


class SharedMealPlanRetrieveAPIView(APIView):
    permission_classes = []

    def get(self, request, share_token):
        share_link = get_object_or_404(
            ShareLink.objects.select_related('meal_plan__group').prefetch_related(
                'meal_plan__days__items__adaptations__member',
                'meal_plan__days__items__recipe',
            ),
            token=share_token,
            is_active=True,
        )

        if not share_link.is_valid():
            return ok({'error': {'code': 'LINK_EXPIRED', 'message': 'Share link has expired.'}}, status_code=410)

        meal_plan = share_link.meal_plan
        return ok(
            {
                'summary': MealPlanSummarySerializer(meal_plan).data,
                'days': MealPlanDaySerializer(meal_plan.days.all(), many=True).data,
            }
        )