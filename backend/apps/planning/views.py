from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, serializers, status
from rest_framework.views import APIView

from apps.common.response import ok
from apps.common.throttling import PlanGenerationThrottle
from apps.catalog.models import Recipe
from apps.groups.models import Group
from .models import GenerationRunStatus, MealItemAdaptation, MealPlan, MealPlanItem, PantryItem, PlanGenerationRun
from .serializers import (
    ApproveMealPlanSerializer,
    BudgetAnalyticsSerializer,
    MealItemAdaptationCreateSerializer,
    MealItemAdaptationSerializer,
    MealItemAdaptationUpdateSerializer,
    MealPlanDaySerializer,
    MealPlanDetailSerializer,
    MealPlanSummarySerializer,
    NutritionAnalyticsSerializer,
    PantryItemCreateSerializer,
    PantryItemSerializer,
    PantryItemUpdateSerializer,
    PlanExplanationSerializer,
    PlanGenerationRequestSerializer,
    PlanListItemSerializer,
    RegenerateShoppingListSerializer,
    ReplaceMealPlanItemSerializer,
    ShoppingListSerializer,
    ShoppingListWithPantryAdjustmentSerializer,
)

from .services import (
    _build_plan_explanations,
    _build_shopping_list,
    build_budget_analytics,
    build_nutrition_analytics,
    build_shopping_list_with_pantry_adjustment,
    create_meal_item_adaptation,
    generate_meal_plan_for_group,
    replace_meal_plan_item,
)


def _get_owned_group(user, group_id):
    return get_object_or_404(
        Group.objects.prefetch_related('members', 'preferences'),
        id=group_id,
        owner_user=user,
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


def _get_owned_meal_plan_item(user, item_id):
    return get_object_or_404(
        MealPlanItem.objects.select_related(
            'meal_plan_day__meal_plan__group',
            'recipe',
        ).prefetch_related(
            'adaptations__member',
        ),
        id=item_id,
        meal_plan_day__meal_plan__group__owner_user=user,
    )


def _get_owned_adaptation(user, item_id, adaptation_id):
    return get_object_or_404(
        MealItemAdaptation.objects.select_related(
            'meal_plan_item__meal_plan_day__meal_plan__group',
            'member',
        ),
        id=adaptation_id,
        meal_plan_item_id=item_id,
        meal_plan_item__meal_plan_day__meal_plan__group__owner_user=user,
    )


class MealPlanGenerateAPIView(APIView):
    """Triggers plan generation.

    Synchronous mode (`?async=0`) keeps the legacy behavior for short calls and
    deterministic tests. Async mode (default) enqueues a Celery task and returns
    a `PlanGenerationRun` id that the client polls via `MealPlanGenerationRunAPIView`.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PlanGenerationThrottle]
    throttle_scope = 'plan_generation'

    def post(self, request, group_id):
        group = _get_owned_group(request.user, group_id)
        serializer = PlanGenerationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        run_async = (request.query_params.get('async', '1').lower() not in {'0', 'false', 'no'})

        if not run_async:
            meal_plan = generate_meal_plan_for_group(
                group=group,
                user=request.user,
                validated_data=serializer.validated_data,
            )
            top_explanations = meal_plan.explanations.order_by('priority_order')[:3]
            return ok(
                {
                    'mode': 'sync',
                    'meal_plan_id': meal_plan.id,
                    'summary': MealPlanSummarySerializer(meal_plan).data,
                    'top_explanations': PlanExplanationSerializer(top_explanations, many=True).data,
                },
                status_code=status.HTTP_201_CREATED,
            )

        from .services import _json_safe
        from .tasks import generate_meal_plan_async

        json_safe_payload = _json_safe(dict(serializer.validated_data))

        run = PlanGenerationRun.objects.create(
            group=group,
            input_snapshot_json=json_safe_payload or {},
            status=GenerationRunStatus.PENDING,
        )
        generate_meal_plan_async.delay(
            group_id=str(group.id),
            user_id=str(request.user.id),
            validated_data=json_safe_payload,
            generation_run_id=str(run.id),
        )

        return ok(
            {
                'mode': 'async',
                'generation_run_id': str(run.id),
                'status': run.status,
                'poll_url': f'/api/v1/meal-plans/generation-run/{run.id}',
            },
            status_code=status.HTTP_202_ACCEPTED,
        )


class GenerationRunStatusAPIView(APIView):
    """Polling endpoint for an async generation request."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, run_id):
        run = get_object_or_404(
            PlanGenerationRun.objects.select_related('group', 'meal_plan'),
            id=run_id,
            group__owner_user=request.user,
        )
        body = {
            'generation_run_id': str(run.id),
            'status': run.status,
            'execution_time_ms': run.execution_time_ms,
            'error_message': run.error_message,
            'meal_plan_id': str(run.meal_plan.id) if run.meal_plan_id else None,
        }
        return ok(body)


class GroupMealPlanListAPIView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PlanListItemSerializer

    def get_queryset(self):
        group = _get_owned_group(self.request.user, self.kwargs['group_id'])
        queryset = MealPlan.objects.filter(group=group).select_related('group').order_by('-start_date', '-created_at')

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return ok(serializer.data)


class CurrentMealPlanAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, group_id):
        group = _get_owned_group(request.user, group_id)
        meal_plan = (
            MealPlan.objects.filter(group=group, is_current=True)
            .select_related('group')
            .order_by('-start_date', '-created_at')
            .first()
        )

        if not meal_plan:
            return ok(None)

        return ok(PlanListItemSerializer(meal_plan).data)


class MealPlanDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)

        summary = MealPlanSummarySerializer(meal_plan).data
        days = MealPlanDaySerializer(meal_plan.days.all(), many=True).data
        top_explanations = PlanExplanationSerializer(
            meal_plan.explanations.order_by('priority_order')[:5],
            many=True,
        ).data

        serializer = MealPlanDetailSerializer(
            {
                'summary': summary,
                'days': days,
                'top_explanations': top_explanations,
            }
        )
        return ok(serializer.data)


class MealPlanDayDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, meal_plan_id, day_index):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        day = get_object_or_404(
            meal_plan.days.prefetch_related('items__adaptations__member', 'items__recipe'),
            day_index=day_index,
        )
        return ok(MealPlanDaySerializer(day).data)


class ReplaceMealPlanItemAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, item_id):
        item = _get_owned_meal_plan_item(request.user, item_id)
        serializer = ReplaceMealPlanItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        replacement_recipe = get_object_or_404(
            Recipe.objects.select_related('nutrition').prefetch_related(
                'ingredients_map__ingredient__prices',
                'recipe_tags__tag',
            ),
            id=serializer.validated_data['replacement_recipe_id'],
            status='published',
        )

        item = replace_meal_plan_item(item=item, replacement_recipe=replacement_recipe)
        return ok(
            {
                'id': item.id,
                'meal_type': item.meal_type,
                'recipe_id': item.recipe_id,
                'recipe_title': item.recipe.title,
                'servings_total': item.servings_total,
                'estimated_cost': item.estimated_cost,
                'estimated_calories': item.estimated_calories,
                'selection_score': item.selection_score,
                'selection_reason_summary': item.selection_reason_summary,
                'is_manually_replaced': item.is_manually_replaced,
                'adaptations': MealItemAdaptationSerializer(item.adaptations.all(), many=True).data,
            }
        )


class MealItemAdaptationListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, item_id):
        item = _get_owned_meal_plan_item(request.user, item_id)
        serializer = MealItemAdaptationCreateSerializer(
            data=request.data,
            context={'meal_plan_item': item},
        )
        serializer.is_valid(raise_exception=True)

        adaptation = create_meal_item_adaptation(
            item=item,
            member=serializer.validated_data['member'],
            adaptation_type=serializer.validated_data['adaptation_type'],
        )

        return ok(
            MealItemAdaptationSerializer(adaptation).data,
            status_code=status.HTTP_201_CREATED,
        )


class MealItemAdaptationUpdateDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, item_id, adaptation_id):
        adaptation = _get_owned_adaptation(request.user, item_id, adaptation_id)
        serializer = MealItemAdaptationUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(adaptation, field, value)
        adaptation.save()

        return ok(MealItemAdaptationSerializer(adaptation).data)

    def delete(self, request, item_id, adaptation_id):
        adaptation = _get_owned_adaptation(request.user, item_id, adaptation_id)
        adaptation.delete()
        return ok(status_code=status.HTTP_204_NO_CONTENT)


class ShoppingListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        shopping_list = getattr(meal_plan, 'shopping_list', None)

        if not shopping_list:
            shopping_list = _build_shopping_list(meal_plan)

        serializer = ShoppingListSerializer(
            shopping_list,
            context={'region_code': meal_plan.group.region_code},
        )
        return ok(serializer.data)


class ShoppingListRegenerateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        serializer = RegenerateShoppingListSerializer(data=request.data or {'regenerate': True})
        serializer.is_valid(raise_exception=True)

        shopping_list = _build_shopping_list(meal_plan)
        serializer = ShoppingListSerializer(
            shopping_list,
            context={'region_code': meal_plan.group.region_code},
        )
        return ok(serializer.data)


class BudgetAnalyticsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        data = build_budget_analytics(meal_plan)
        serializer = BudgetAnalyticsSerializer(data)
        return ok(serializer.data)


class NutritionAnalyticsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        data = build_nutrition_analytics(meal_plan)
        serializer = NutritionAnalyticsSerializer(data)
        return ok(serializer.data)


class MealPlanExplanationsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        explanations = meal_plan.explanations.order_by('priority_order')
        return ok(PlanExplanationSerializer(explanations, many=True).data)


class MealPlanGenerationRunAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        generation_run = (
            PlanGenerationRun.objects.filter(meal_plan=meal_plan)
            .order_by('-created_at')
            .first()
        )

        if not generation_run:
            return ok(None)

        return ok(
            {
                'id': generation_run.id,
                'optimizer_name': generation_run.optimizer_name,
                'optimizer_version': generation_run.optimizer_version,
                'execution_time_ms': generation_run.execution_time_ms,
                'status': generation_run.status,
                'input_snapshot': generation_run.input_snapshot_json,
                'constraints_snapshot': generation_run.constraints_snapshot_json,
                'error_message': generation_run.error_message,
                'created_at': generation_run.created_at,
            }
        )


class MealPlanApproveAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        serializer = ApproveMealPlanSerializer(data=request.data or {'approve': True})
        serializer.is_valid(raise_exception=True)

        MealPlan.objects.filter(group=meal_plan.group, is_current=True).exclude(id=meal_plan.id).update(
            is_current=False
        )
        meal_plan.status = 'approved'
        meal_plan.is_current = True
        meal_plan.save(update_fields=['status', 'is_current', 'updated_at'])

        return ok({'id': meal_plan.id, 'status': meal_plan.status})


class MealPlanArchiveAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        meal_plan.status = 'archived'
        meal_plan.is_current = False
        meal_plan.save(update_fields=['status', 'is_current', 'updated_at'])
        return ok({'id': meal_plan.id, 'status': meal_plan.status})


class PantryItemListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, group_id):
        group = _get_owned_group(request.user, group_id)
        pantry_items = (
            PantryItem.objects.filter(group=group)
            .select_related('ingredient')
            .order_by('ingredient__name', 'created_at')
        )
        return ok(PantryItemSerializer(pantry_items, many=True).data)

    def post(self, request, group_id):
        group = _get_owned_group(request.user, group_id)
        serializer = PantryItemCreateSerializer(
            data=request.data,
            context={'request': request, 'group': group},
        )
        serializer.is_valid(raise_exception=True)
        pantry_item = serializer.save()
        return ok(PantryItemSerializer(pantry_item).data, status_code=status.HTTP_201_CREATED)


class PantryItemUpdateDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pantry_item_id):
        pantry_item = get_object_or_404(
            PantryItem.objects.select_related('group', 'ingredient'),
            id=pantry_item_id,
            group__owner_user=request.user,
        )
        serializer = PantryItemUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        for field, value in serializer.validated_data.items():
            setattr(pantry_item, field, value)
        pantry_item.save()

        return ok(PantryItemSerializer(pantry_item).data)

    def delete(self, request, pantry_item_id):
        pantry_item = get_object_or_404(
            PantryItem.objects.select_related('group'),
            id=pantry_item_id,
            group__owner_user=request.user,
        )
        pantry_item.delete()
        return ok(status_code=status.HTTP_204_NO_CONTENT)


class ShoppingListWithPantryAdjustmentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, meal_plan_id):
        meal_plan = _get_owned_meal_plan(request.user, meal_plan_id)
        data = build_shopping_list_with_pantry_adjustment(meal_plan)
        serializer = ShoppingListWithPantryAdjustmentSerializer(data)
        return ok(serializer.data)