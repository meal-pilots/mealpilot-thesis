# Intelligent Meal Planner Backend

Django + DRF backend for a meal planning system with:

- JWT auth
- groups / households
- member constraints
- recipe catalog
- pricing
- recipe nutrition
- shopping list generation
- CP-SAT meal plan optimization

## Repo Contents

This repository is self-contained for backend development. It includes:

- application code
- Docker setup for backend + Postgres + Redis
- recipe import data in `data/recipes_enriched.jsonl` (not included in the public repository; rebuild with `etl-meals`)
- official price input in `data/prices-stat.csv`
- generated nutrition catalog in `data/nutrition_catalog.yaml`
- management commands to rebuild a fresh dev database

## Quick Start

Recommended path:

```bash
cp .env.example .env
docker compose up --build -d
docker exec meal_planner_backend python manage.py bootstrap_demo_data
```

Then open:

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/api/v1/docs/`
- OpenAPI schema: `http://localhost:8000/api/v1/schema/`

## What `bootstrap_demo_data` Does

The bootstrap command rebuilds the working catalog from the versioned files in `data/`:

1. imports recipes from `data/recipes_enriched.jsonl`
2. imports official Kazakhstan prices from `data/prices-stat.csv`
3. backfills missing ingredient prices heuristically
4. normalizes noisy ingredient links
5. repairs suspicious heuristic price rows
6. repairs suspicious recipe units
7. recalculates cached recipe costs
8. backfills recipe nutrition from `data/nutrition_catalog.yaml`

Run it manually at any time:

```bash
docker exec meal_planner_backend python manage.py bootstrap_demo_data
```

## Rebuild From Zero

If you want a completely fresh local database:

```bash
docker compose down -v
docker compose up --build -d
docker exec meal_planner_backend python manage.py bootstrap_demo_data
```

## Environment

Create `.env` from `.env.example`.

Important variables:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `REDIS_HOST`
- `REDIS_PORT`
- `ACCESS_TOKEN_MINUTES`
- `REFRESH_TOKEN_DAYS`
- `BACKEND_PORT`

## Useful Commands

Run tests:

```bash
docker exec meal_planner_backend python manage.py test
```

Recalculate cached recipe costs after changing prices:

```bash
docker exec meal_planner_backend python manage.py recalculate_recipe_costs
```

Import only nutrition into an existing database:

```bash
docker exec meal_planner_backend python manage.py import_recipe_nutrition --path data/recipes_enriched.jsonl
```

Backfill nutrition from the local USDA-derived catalog:

```bash
docker exec meal_planner_backend python manage.py backfill_recipe_nutrition --path data/nutrition_catalog.yaml
```
