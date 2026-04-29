"""Inference-time entry point for the ML ranker.

Loads the LightGBM model lazily on first call and caches in process memory.
Returns a Decimal score in [0..1] suitable to drop into the existing planner
selection logic. Any failure (model missing, lib missing, exception) falls
through to the deterministic scorer so the planner never fails because of ML.
"""
from __future__ import annotations

import logging
import os
import threading
from decimal import Decimal
from pathlib import Path

from apps.catalog.models import Recipe
from apps.groups.models import Group

from .features import RecipeGroupFeatureExtractor

logger = logging.getLogger(__name__)


_MODEL_LOCK = threading.Lock()
_MODEL = None
_MODEL_LOAD_FAILED = False


def _model_path() -> Path:
    return Path(os.getenv('ML_SCORING_MODEL_PATH', '/app/ml_models/recipe_ranker.txt'))


def _load_model():
    global _MODEL, _MODEL_LOAD_FAILED
    if _MODEL is not None or _MODEL_LOAD_FAILED:
        return _MODEL

    with _MODEL_LOCK:
        if _MODEL is not None or _MODEL_LOAD_FAILED:
            return _MODEL

        path = _model_path()
        if not path.exists():
            logger.info('ml_scoring: model artifact missing at %s; using deterministic fallback', path)
            _MODEL_LOAD_FAILED = True
            return None
        try:
            import lightgbm as lgb
        except ImportError:
            logger.info('ml_scoring: lightgbm not installed; using deterministic fallback')
            _MODEL_LOAD_FAILED = True
            return None
        try:
            _MODEL = lgb.Booster(model_file=str(path))
            logger.info('ml_scoring: loaded model from %s', path)
        except Exception:
            logger.exception('ml_scoring: failed to load model; using deterministic fallback')
            _MODEL_LOAD_FAILED = True
            _MODEL = None
        return _MODEL


_extractor = RecipeGroupFeatureExtractor()


def predict_score(recipe: Recipe, group: Group, deterministic_fallback: Decimal | None = None) -> Decimal | None:
    """Predict a [0..1] preference score for the (recipe, group) pair.

    Returns ``None`` when the caller should rely on the deterministic scorer.
    Otherwise returns a Decimal rounded to two digits.
    """
    model = _load_model()
    if model is None:
        return deterministic_fallback

    try:
        vector = _extractor.extract(recipe, group)
        prediction = model.predict([vector.values])[0]
    except Exception:
        logger.exception('ml_scoring: predict failed; falling back')
        return deterministic_fallback

    score = max(0.0, min(1.0, float(prediction)))
    return Decimal(str(round(score, 2)))
