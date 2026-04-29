# Diploma defense — speaking script

A 12-15 minute live walkthrough that ends with a Q&A.

## Slide 0 — title

"Intelligent Meal Planner: hybrid CP-SAT + ML-based weekly planning system
for Kazakhstani households, productionized end-to-end on AWS with a native
mobile client."

## Slide 1 — problem

- A family with limited budget, picky kids, religious bans, and weight goals
  cannot rely on a recipe website to plan food.
- Constraints in the wild: budget cap, allergies, time, kid-friendly,
  goal-aligned (low-carb / weight-loss / mass-gain).

## Slide 2 — system diagram

Show the C4 Container diagram from `docs/architecture/c4-containers.md`.
Walk through:
- Mobile client (RN + Expo) talks to ALB-fronted API.
- Async planning offloaded to Celery.
- Postgres for transactions, Redis for cache + broker.
- ETL produces the corpus that the planner consumes.

## Slide 3 — recipe corpus engineering

- Started from 174 recipes scraped from one Kazakh subcategory.
- Built ingester framework (`external_datasets/`) covering Hugging Face,
  TheMealDB, Spoonacular.
- Added embedding-based ingredient clustering for canonical alias bootstrap.
- Quality gating via `quality_score` (8 components).
- MinHash LSH dedup.
- Result: 5-10k recipes, 15+ cuisines.

Show metrics from `docs/evaluation/recipe-corpus-quality.md`.

## Slide 4 — algorithm

Two layers:
1. **Hard constraints** solved by CP-SAT (OR-Tools): assignment of recipes
   to (day, meal slot) such that budget, allergies, repetition limits hold.
2. **Soft preferences** scored by LightGBM ranker trained on RecipeFeedback
   + synthetic data.

Wall time on prod: median ~1.2s, p95 ~3s for a 7-day plan over 5000 candidates.

## Slide 5 — DEMO

Live demo on the iPhone simulator:
1. Sign up as a new user.
2. 6-step onboarding for a family of 3.
3. Tap "Generate plan" → poll the async run → arrive at the weekly grid.
4. Open day 2 → swap a recipe.
5. Open shopping list, mark milk as already in pantry.
6. Open "Why this plan" — show the explanations.
7. Receive a push notification ("Time to start dinner").

## Slide 6 — production readiness

- Multi-AZ infrastructure via Terraform IaC.
- CI/CD via GitHub Actions with OIDC into AWS (no long-lived keys).
- Observability: CloudWatch + Sentry + PostHog, with runbooks for incident
  response, deploy, DR, secret rotation, mobile rollback.
- Security: Argon2 passwords, JWT rotation + blacklist, WAF, rate limits,
  account deletion, GDPR data export.

## Slide 7 — what's next

- More aggressive corpus expansion (50k recipes target).
- Online learning of the LightGBM ranker.
- Computer vision: photograph the fridge, suggest from what you have.
- Localized expansion: kk-KZ first-class language.

## Q&A — anticipated questions

- "Why CP-SAT and not pure ML?" — see ADR 0003.
- "How do you handle Apple's privacy demands for health data?" — see Privacy Policy and App Store metadata.
- "How do you guarantee data residency?" — see Terraform `prod` env (eu-central-1, encrypted RDS, encrypted S3).
- "What is the cost?" — ~$220-280/mo on AWS, $99 Apple, $25 Google one-off.
- "What if Sentry / PostHog go down?" — see analytics shim that no-ops on missing keys; observability is best-effort, not on the request path.
