"""LightGBM-based recipe-vs-group ranker layered on top of the deterministic scorer.

Public surface:
    - :func:`predict_score` — fall-through entry point that loads the model lazily,
      returns a Decimal score in [0..1], and silently falls back to the
      deterministic scorer if the model is unavailable for any reason.
    - :class:`RecipeGroupFeatureExtractor` — converts a (recipe, group) pair into
      the numeric feature vector that both training and inference share.

Design notes:
    - Model artifact lives in S3 and is mirrored to local cache on first load.
      Path is configured via env var ``ML_SCORING_MODEL_PATH``.
    - The scorer is gated by feature flag ``planner_use_ml_scoring`` (per-group)
      so we can A/B test the deterministic fallback against the ML version.
"""
from __future__ import annotations

from .features import RecipeGroupFeatureExtractor
from .scorer import predict_score

__all__ = ['RecipeGroupFeatureExtractor', 'predict_score']
