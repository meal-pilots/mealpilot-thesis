# Intelligent Meal Planner

End-to-end production-grade meal planning system for households.

## Layout

```
diploma-work/
  backend/          Django + DRF API, Celery, CP-SAT planner, LightGBM ranker
  frontend/         Vite SPA (web client)
  mobile/           React Native + Expo client targeting App Store + Play Market
  infrastructure/   Terraform modules + per-environment configs
  docs/             Architecture, ADRs, runbooks, evaluation chapters, legal templates
  .github/          CI/CD workflows (backend, etl, terraform, mobile)
```

The recipe ETL pipeline lives in a sibling repository: [`meal-pilots/etl-meals`](https://github.com/meal-pilots/etl-meals).

---

## Quick start (handoff for new developers)

### 0. Prereqs

- Docker Desktop + Docker Compose v2
- Node 20+ and npm
- Xcode (iOS sim) and/or Android Studio (Android emulator)
- Expo Go on a physical device for hot-reload testing
- macOS or Linux (Windows works via WSL2)

### 1. Clone and configure env

```bash
git clone git@github.com:meal-pilots/meal-gateway.git diploma-work
cd diploma-work

cp backend/.env.example backend/.env
cp mobile/.env.example mobile/.env
```

Defaults work out of the box for local dev. Reach out to the owner for any prod credentials (Sentry DSN, Expo push token, AWS keys).

### 2. Boot backend stack (Postgres + Redis + Django + Celery)

```bash
cd backend
docker compose up -d --build
docker compose logs -f backend   # wait for "Listening at: http://0.0.0.0:8000"
```

Swagger UI: http://localhost:8000/api/v1/docs/
Django admin: http://localhost:8000/admin/ (create a superuser with `docker exec -it meal_planner_backend python manage.py createsuperuser`)

### 3. Restore the recipe database (~90k recipes)

The Postgres volume ships empty. Restore the production-shaped dump so the mobile app has real data:

```bash
# 1. Download the dump (link will be shared via secure channel)
# Replace <DUMP_URL> below with the actual link from your team lead
curl -L "<DUMP_URL>" -o ~/Downloads/meal_planner.dump

# 2. Copy into the Postgres container and restore
docker cp ~/Downloads/meal_planner.dump meal_planner_postgres:/tmp/dump
docker exec meal_planner_postgres pg_restore \
  -U meal_user -d meal_planner \
  --clean --if-exists --no-owner --no-privileges \
  /tmp/dump

# 3. Verify
docker exec meal_planner_postgres \
  psql -U meal_user -d meal_planner -c "SELECT COUNT(*) FROM catalog_recipe;"
# Expected: ~90639
```

Alternative (slower, rebuilds from source datasets): clone `etl-meals`, run the pipeline, then `python manage.py import_recipes_enriched`.

### 4. Mobile (React Native + Expo)

```bash
cd mobile
npm install
npx expo start
# Press `i` for iOS simulator, `a` for Android, or scan QR with Expo Go
```

If you see stale bundles after pulling: `npx expo start -c` (clear Metro cache) or `rm -rf node_modules .expo && npm install`.

> Do NOT run with `CI=1` in your shell — Metro won't enable hot reload.

### 5. Web (Vite SPA, optional)

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

---

## Tech stack cheat sheet

| Layer       | Stack                                                                                         |
|-------------|-----------------------------------------------------------------------------------------------|
| Backend     | Django 5 + DRF, Celery (worker + beat), PostgreSQL 16, Redis 7, Gunicorn                      |
| Planner     | OR-Tools CP-SAT, LightGBM ranker, custom cost/nutrition normalization                         |
| Mobile      | Expo SDK 51, React Navigation, React Query, React Hook Form, Lucide icons, Reanimated         |
| Web         | Vite + React (legacy landing/marketing)                                                       |
| Infra       | Docker Compose (local), Terraform → AWS ECS/ECR/S3 + GitHub OIDC (prod, work in progress)     |
| ETL         | Python + httpx + BeautifulSoup, exports JSONL bundle to `diploma-work/backend`                |

---

## Mobile architecture quick notes

Critical files a new frontend dev should read first:

- `mobile/App.tsx` — root, fonts (Inter), splash, error boundary.
- `mobile/src/core/providers/AppProviders.tsx` — React Query, Auth, Toast, BottomSheet providers.
- `mobile/src/core/navigation/RootNavigator.tsx` — deep-linking config (`exp://` and `mealplanner://`).
- `mobile/src/shared/ui/theme.ts` — design tokens (palette, spacing, radii, typography, shadows, motion).
- `mobile/src/shared/lib/use-palette.ts` — `usePalette()` hook (light/dark mode).
- `mobile/src/shared/lib/formatters.ts` — Russian localization helpers (`pluralRu`, `tagLabel`, `unitLabel`, `cuisineLabel`, …). **All UI strings must go through these helpers — do not hardcode RU strings in screens.**
- `mobile/src/shared/lib/image-proxy.ts` — wraps recipe images via `images.weserv.nl` to bypass hotlink blocks.
- `mobile/src/shared/lib/haptics.ts` — `expo-haptics` wrappers; use on every primary touch.
- `mobile/src/shared/ui/TouchableSurface.tsx` — animated press-feedback container, use instead of plain `Pressable`.
- `mobile/src/shared/ui/Icon.tsx` — Lucide wrapper; never use emoji icons.
- `mobile/src/shared/ui/Text.tsx` / `Button.tsx` / `Card.tsx` / `Input.tsx` — atomic components, all theme-aware.

### Conventions

1. New colors → add to `theme.ts` palette, never inline hex.
2. New text → variant from `<Text variant="..." />`, never raw `<RNText>`.
3. New UI strings → add to `formatters.ts` (with `pluralRu` for any countable noun).
4. New tappable element → wrap in `TouchableSurface` + add haptic feedback.
5. New screen → import `Screen` wrapper for safe-area + scroll defaults.
6. New API call → add to `mobile/src/shared/api/` with React Query, surface errors via `<QueryBoundary>`.

---

## Backend architecture quick notes

- `backend/apps/accounts/` — JWT auth, profile, household members.
- `backend/apps/catalog/` — Recipe / Ingredient / Tag catalog (90k+ recipes after restore).
- `backend/apps/planning/` — meal plan engine (`services.py` is the entry point), shopping list, adaptations.
  - Localization (RU strings) lives directly in `services.py` and `tasks.py`. If you migrate to gettext later, that's a separate refactor.
- `backend/apps/notifications/` — Expo push, scheduling.
- `backend/apps/observability/` — Sentry, structured logging.

CLI utilities you will use a lot:

```bash
# enter Django shell
docker exec -it meal_planner_backend python manage.py shell

# run tests
docker exec -it meal_planner_backend pytest

# import bundle from etl-meals
docker exec -it meal_planner_backend python manage.py import_recipes_enriched \
  --bundle /path/to/exports/diploma_work
```

---

## Documentation map

- **Architecture**: [docs/architecture/](docs/architecture/) (C4 levels 1-3)
- **ADRs**: [docs/adr/](docs/adr/) (5 records covering monorepo, ECS, CP-SAT+ML, Expo, Postgres)
- **Runbooks**: [docs/runbooks/](docs/runbooks/) (deploy, incident, DR, rotate secrets, mobile rollback)
- **Observability**: [docs/observability/cloudwatch-dashboards.md](docs/observability/cloudwatch-dashboards.md)
- **Legal**: [docs/legal/](docs/legal/) (privacy policy, terms of service)
- **Store metadata**: [docs/store/](docs/store/) (App Store + Google Play submissions)
- **Evaluation**: [docs/evaluation/](docs/evaluation/) (corpus quality, ML vs rules, ETL throughput)

---

## Cost guardrails

Annual production budget (assuming Multi-AZ everywhere):

- AWS: ~$2,640-3,360
- Apple Developer Program: $99
- Google Play Console: $25 one-off
- Domain: ~$30
- Sentry / PostHog / EAS: free tier sufficient initially

Total first year ~$3,000-3,800.

---

## Troubleshooting

| Symptom                                   | Fix                                                                          |
|-------------------------------------------|------------------------------------------------------------------------------|
| Mobile bundle shows old strings           | `npx expo start -c` to clear Metro cache, then reload (Cmd+R in sim)         |
| Backend container can't connect to DB     | `docker compose down` then `docker compose up -d` (waits for healthchecks)   |
| `pg_restore` errors on existing tables    | Add `--clean --if-exists` flags (already in the snippet above)               |
| Recipe images don't load                  | Already proxied via `image-proxy.ts`; check that the source URL is HTTPS     |
| Push notifications not delivered          | Set `EXPO_ACCESS_TOKEN` in `backend/.env` and re-deploy worker               |
| ESLint complains about `ban-types`        | Already disabled in `mobile/.eslintrc.js` (rule removed in ESLint 8)         |
