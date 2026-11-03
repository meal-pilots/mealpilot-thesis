# Evaluation: ML scoring vs hand-crafted rules

> **Status:** planned protocol, not yet run. There is no real feedback data yet,
> so the thesis reports NDCG against real labels as "pending data" (Chapter 4).
> In this snapshot the planner scores candidates with the deterministic function;
> `predict_score` is not yet called from `apps/planning/services.py`.

The deterministic recipe scorer assigns a value in [0..1] using
hand-crafted weights (see `_score_recipe_for_group` in
[backend/apps/planning/services.py](../../backend/apps/planning/services.py)).
The ML scorer (`apps.planning.ml_scoring.predict_score`) replaces those
weights with a LightGBM listwise ranker trained on real `RecipeFeedback`
plus synthetic data.

## Offline evaluation protocol

1. Hold out 20% of distinct groups (not 20% of rows — prevents leakage).
2. Train LightGBM `LGBMRanker` with `lambdarank` objective on the remaining 80%.
3. Compute on the held-out set:
   - **NDCG@5**, **NDCG@10**
   - **MAP**
   - **Hit rate at top-3** (was the user's #1-rated recipe in the top 3?)
4. Compare against the deterministic scorer treated as a fixed model
   (no training).

Expected target: ML beats deterministic by **+5..+10 NDCG@10 points**
once we accumulate >2k real feedback rows.

## Online evaluation

A/B-flag `planner_use_ml_scoring` per group via PostHog feature flags.
50/50 split over 4 weeks. Outcome metric: `PlanFeedback.overall_rating`.

Use a t-test or Mann-Whitney U on per-group means. Significance threshold:
`p < 0.05`.

## Diagnostic checks

- **Feature importance** — log the top-10 LightGBM features after each retrain.
  Drift in this list is an early warning that the corpus shape is changing.
- **Calibration** — bucket predictions into deciles, plot mean predicted vs
  mean actual; should track the diagonal.
- **Cold-start regression** — verify that synthetic-only training produces a
  ranker no worse than the deterministic scorer (otherwise A/B harms users
  before real data accumulates).
