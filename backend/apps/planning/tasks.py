from __future__ import annotations

import logging
from typing import Any

from celery import shared_task
from django.contrib.auth import get_user_model

from apps.common.push import send_push_to_user
from apps.groups.models import Group

from .models import GenerationRunStatus, MealPlan, PlanGenerationRun
from .services import generate_meal_plan_for_group

logger = logging.getLogger(__name__)
User = get_user_model()


def _mark_generation_run_failed(
    generation_run_id: str | None,
    error: Exception,
) -> PlanGenerationRun | None:
    if not generation_run_id:
        return None

    try:
        api_run = PlanGenerationRun.objects.get(id=generation_run_id)
    except PlanGenerationRun.DoesNotExist:
        return None

    api_run.status = GenerationRunStatus.FAILED
    api_run.error_message = str(error)
    api_run.save(update_fields=['status', 'error_message', 'updated_at'])
    return api_run


@shared_task(
    bind=True,
    name='apps.planning.tasks.generate_meal_plan_async',
    queue='planning',
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=120,
    max_retries=2,
)
def generate_meal_plan_async(
    self,
    group_id: str,
    user_id: str,
    validated_data: dict[str, Any],
    generation_run_id: str | None = None,
) -> dict[str, Any]:
    """Run plan generation in a worker so HTTP requests stay snappy.

    Returns a small dict suitable for storage in the Celery result backend; the
    canonical record of progress lives in `PlanGenerationRun` (which is updated
    by `generate_meal_plan_for_group` already).
    """
    from datetime import date as date_cls

    logger.info(
        'Starting async meal plan generation',
        extra={'group_id': group_id, 'user_id': user_id, 'task_id': self.request.id},
    )

    try:
        api_run = PlanGenerationRun.objects.get(id=generation_run_id) if generation_run_id else None
    except PlanGenerationRun.DoesNotExist:
        api_run = None

    try:
        group = (
            Group.objects.select_related('preferences')
            .prefetch_related('members__constraints')
            .get(id=group_id)
        )
        user = User.objects.get(id=user_id) if user_id else None
    except (Group.DoesNotExist, User.DoesNotExist) as exc:
        if api_run is not None:
            api_run.status = GenerationRunStatus.FAILED
            api_run.error_message = str(exc)
            api_run.save(update_fields=['status', 'error_message', 'updated_at'])
        logger.warning(
            'Async meal plan generation references missing data',
            extra={
                'group_id': group_id,
                'user_id': user_id,
                'generation_run_id': generation_run_id,
            },
        )
        return {
            'meal_plan_id': None,
            'generation_run_id': generation_run_id,
            'status': GenerationRunStatus.FAILED,
        }

    payload = dict(validated_data)
    raw_start = payload.get('start_date')
    if isinstance(raw_start, str):
        payload['start_date'] = date_cls.fromisoformat(raw_start)

    try:
        meal_plan = generate_meal_plan_for_group(
            group=group,
            user=user,
            validated_data=payload,
        )
    except Exception as exc:
        _mark_generation_run_failed(generation_run_id, exc)
        raise

    if api_run is not None and meal_plan is not None:
        api_run.meal_plan = meal_plan
        api_run.status = GenerationRunStatus.COMPLETED
        api_run.optimizer_name = meal_plan.optimizer_name
        api_run.optimizer_version = meal_plan.optimizer_version
        api_run.save(
            update_fields=['meal_plan', 'status', 'optimizer_name', 'optimizer_version', 'updated_at']
        )

    if meal_plan is not None and user is not None:
        try:
            send_push_to_user(
                user=user,
                title='Ваш план готов',
                body=f'План «{meal_plan.title}» сгенерирован для группы «{group.name}».',
                data={
                    'type': 'plan_generated',
                    'meal_plan_id': str(meal_plan.id),
                    'group_id': str(group.id),
                },
            )
        except Exception:
            logger.warning('Failed to send plan-ready push', exc_info=True)

    return {
        'meal_plan_id': str(meal_plan.id) if meal_plan else None,
        'generation_run_id': generation_run_id,
    }


@shared_task(name='apps.planning.tasks.notify_pantry_expiring', queue='push')
def notify_pantry_expiring() -> dict[str, int]:
    """Daily Celery beat task: notify users about pantry items expiring soon."""
    from datetime import timedelta

    from django.utils import timezone

    from .models import PantryItem

    horizon = timezone.now().date() + timedelta(days=2)
    expiring = (
        PantryItem.objects
        .filter(expires_at__lte=horizon, expires_at__gte=timezone.now().date())
        .select_related('group__owner_user', 'ingredient')
    )

    sent = 0
    for item in expiring:
        owner = item.group.owner_user
        if not owner:
            continue
        try:
            send_push_to_user(
                user=owner,
                title='Продукты скоро истекают',
                body=f'{item.ingredient.name} в кладовой «{item.group.name}» истекает {item.expires_at}.',
                data={
                    'type': 'pantry_expiring',
                    'group_id': str(item.group_id),
                    'pantry_item_id': str(item.id),
                },
            )
            sent += 1
        except Exception:
            logger.warning('Failed to send pantry expiring push', exc_info=True)

    return {'sent': sent}


@shared_task(name='apps.planning.tasks.retrain_recipe_ranker', queue='default')
def retrain_recipe_ranker(output_path: str = 'ml_models/recipe_ranker.txt') -> dict[str, str]:
    """Periodic Celery beat task: retrain the LightGBM ranker on fresh feedback."""
    from pathlib import Path

    from apps.planning.ml_scoring.training import TrainingConfig, train

    try:
        config = TrainingConfig(output_path=Path(output_path))
        path = train(config)
        return {'status': 'ok', 'model_path': str(path)}
    except Exception as exc:
        logger.exception('Recipe ranker retraining failed')
        return {'status': 'error', 'error': str(exc)}


@shared_task(name='apps.planning.tasks.recalculate_recipe_costs_task', queue='default')
def recalculate_recipe_costs_task(region_code: str | None = None) -> dict[str, int]:
    """Periodic task: refresh cached estimated_cost on every published recipe.

    Useful after a price ingest or unit normalization run.
    """
    from decimal import Decimal

    from apps.catalog.models import Recipe, RecipeStatus

    from .services import estimate_recipe_cost

    queryset = Recipe.objects.filter(status=RecipeStatus.PUBLISHED).prefetch_related(
        'ingredients_map__ingredient__prices',
    )
    updated = 0
    for recipe in queryset.iterator(chunk_size=200):
        new_cost = estimate_recipe_cost(recipe, region_code=region_code)
        if recipe.estimated_cost != new_cost:
            recipe.estimated_cost = new_cost
            recipe.save(update_fields=['estimated_cost', 'updated_at'])
            updated += 1
    return {'updated': updated}
