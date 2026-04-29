# Intelligent Meal Planner

End-to-end production-grade meal planning system for households.

## Layout

```
diploma-work/
  backend/          Django + DRF API, Celery, CP-SAT planner, LightGBM ranker
  frontend/         Legacy React + Vite landing/web client (kept for marketing pages)
  mobile/           React Native + Expo client targeting App Store + Play Market
  infrastructure/   Terraform modules + per-environment configs
  docs/             Architecture, ADRs, runbooks, evaluation chapters, legal templates
  .github/          CI/CD workflows (backend, etl, terraform, mobile)
```

The recipe ETL pipeline lives in a sibling repository: `~/etl-meals`.

## Where to start

1. Read the architecture overview: [docs/architecture/c4-containers.md](docs/architecture/c4-containers.md)
2. Skim the diploma defense script: [docs/diploma-defense-script.md](docs/diploma-defense-script.md)
3. To boot the backend locally:
   ```bash
   cd backend
   cp .env.example .env
   docker compose up --build -d
   docker exec meal_planner_backend python manage.py migrate
   docker exec meal_planner_backend python manage.py bootstrap_demo_data
   ```
   Swagger UI: http://localhost:8000/api/v1/docs/

4. To boot the mobile client:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```

## Documentation map

- **Architecture**: [docs/architecture/](docs/architecture/) (C4 levels 1-3)
- **ADRs**: [docs/adr/](docs/adr/) (5 records covering monorepo, ECS, CP-SAT+ML, Expo, Postgres)
- **Runbooks**: [docs/runbooks/](docs/runbooks/) (deploy, incident, DR, rotate secrets, mobile rollback)
- **Observability**: [docs/observability/cloudwatch-dashboards.md](docs/observability/cloudwatch-dashboards.md)
- **Legal**: [docs/legal/](docs/legal/) (privacy policy, terms of service)
- **Store metadata**: [docs/store/](docs/store/) (App Store + Google Play submissions)
- **Evaluation**: [docs/evaluation/](docs/evaluation/) (corpus quality, ML vs rules, ETL throughput)

## Cost guardrails

Annual production budget (assuming Multi-AZ everywhere):

- AWS: ~$2,640-3,360
- Apple Developer Program: $99
- Google Play Console: $25 one-off
- Domain: ~$30
- Sentry / PostHog / EAS: free tier sufficient initially

Total first year ~$3,000-3,800.
