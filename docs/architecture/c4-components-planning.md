# C4 — Components: Planning service (Level 3)

```mermaid
flowchart LR
    GenerateAPI["MealPlanGenerateAPIView"]
    Throttle["PlanGenerationThrottle"]
    AsyncTask["Celery: generate_meal_plan_async"]
    Orchestrator["generate_meal_plan_for_group"]
    CandidatePool["_build_candidate_pool"]
    Fits["_recipe_fits_group"]
    Scorer["_score_recipe_for_group"]
    MLScorer["ml_scoring.predict_score<br/>(LightGBM)"]
    CPSAT["_build_cp_sat_selection<br/>(OR-Tools)"]
    Deterministic["Deterministic fallback"]
    ShoppingList["_build_shopping_list"]
    Explanations["_build_plan_explanations"]
    PushTrigger["send_push_to_user(plan ready)"]
    Models[("Catalog + Groups + Planning models")]

    GenerateAPI --> Throttle
    Throttle --> AsyncTask
    AsyncTask --> Orchestrator
    Orchestrator --> CandidatePool
    CandidatePool --> Fits
    CandidatePool --> Scorer
    Scorer --> MLScorer
    MLScorer -.fallback.-> Scorer
    Orchestrator --> CPSAT
    CPSAT -.fallback.-> Deterministic
    Orchestrator --> ShoppingList
    Orchestrator --> Explanations
    Orchestrator --> Models
    Orchestrator --> PushTrigger
```

## Notes

- `MealPlanGenerateAPIView` either runs synchronously (legacy / test mode) or
  enqueues a `PlanGenerationRun` with `Celery.delay`.
- `predict_score` consults a LightGBM model; on any failure falls through to
  the deterministic scorer so the planner is never blocked by ML stack issues.
- CP-SAT solver has a hard-coded 5s wall clock. If unsatisfiable or unavailable,
  the deterministic greedy is used.
- Plan generation success triggers an Expo push to the requesting user.
