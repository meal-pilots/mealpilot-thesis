# Evaluation: ETL throughput before/after async migration

## Setup

Compare the synchronous fetcher (`Fetcher` in
[etl-meals/src/etl_meals/pipeline.py](../../etl-meals/src/etl_meals/pipeline.py))
against the new async fetcher
([etl-meals/src/etl_meals/async_fetcher.py](../../etl-meals/src/etl_meals/async_fetcher.py))
on a fixed batch of 500 recipe URLs from `russianfood.com`.

## Method

```bash
# Cold cache
rm -rf data/cache/http_cache.sqlite

# Sync baseline
time python -m etl_meals run --config config/sources.yaml --source russianfood --limit 500

# Async (new pipeline once integrated)
time python -m etl_meals run-async --config config/sources.yaml --source russianfood --limit 500
```

## Reportable numbers

| Run | Wall time | Recipes/min | Errors |
|---|---|---|---|
| Sync (baseline) | TBD | TBD | TBD |
| Async (new) | TBD | TBD | TBD |
| Async (warm cache) | TBD | TBD | TBD |

## Defense talking points

- Async + per-host concurrency 4 + per-host rate limiting should give
  ~5-10x speedup on a single source while still respecting `request_delay`.
- ETag-based conditional GET cuts bandwidth on subsequent runs by >90%
  for unchanged recipes.
- Resume checkpoints (SQLite) make the pipeline restart-safe — important
  for crawls that span hours.
