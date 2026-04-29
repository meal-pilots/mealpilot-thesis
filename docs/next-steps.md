# Что делать дальше

Roadmap дальнейших улучшений Intelligent Meal Planner.

Каждая секция упорядочена по убыванию ROI (impact / effort).
Снизу есть «выбранные дорожки» с разной длительностью.

---

## P0 — Wow для защиты диплома

Самый высокий impact на оценку защиты.

### 1. Натренировать LightGBM ranker

- Что: ML-слой `apps/planning/ml_scoring/` написан полностью, но модель не обучена.
- Команда: `docker exec meal_planner_backend python manage.py train_recipe_ranker`
- Получишь: артефакт модели + JSON с метриками (NDCG@5, NDCG@10) → готовая глава evaluation.
- В защите: можно показать «ML scoring active» и сравнить с детерминистическим scorer.
- Время: ~1 час.

### 2. Quality score для рецептов

- Что: поле `Recipe.quality_score` есть в схеме, миграция применена, но всё нули.
- Скрипт: уже написан в `etl-meals/src/etl_meals/normalization/quality.py` (8-компонентный score: nutrition / ingredient_match / total_time / yields / image / steps / parsed_units / price_coverage).
- Действия:
  1. Прогнать на `recipes_enriched.jsonl` → построить per-recipe score.
  2. Расширить `import_recipes_enriched` чтобы писал quality_score + breakdown.
  3. Запустить ре-импорт (upsert).
  4. `_build_candidate_pool` уже фильтрует по `quality_score__gte=PLANNER_MIN_QUALITY_SCORE`.
- В защите: «алгоритм отсекает мусорные рецепты на этапе подготовки данных».
- Время: 2 часа.

### 3. MinHash дедупликация

- Что: в 5288 рецептах точно есть дубли «Бешбармак» / «Борщ классический» / «Куырдак» из разных источников.
- Код: уже написан в `etl-meals/src/etl_meals/normalization/dedup.py` (MinHash LSH через datasketch).
- Действия:
  1. Запустить на `recipes_enriched.jsonl`.
  2. Помеченные как duplicate → status='draft' в backend.
- В защите: показать % дубликатов, хорошая глава evaluation.
- Время: 1 час.

### 4. Видео-демо 2-3 минуты

- Сценарий: Welcome → Sign Up → Onboarding (mode → household → members → preferences → budget → summary) → Generate Plan → Weekly view → Day details → Shopping list → Budget analytics → "Why this plan".
- Запись: QuickTime + iOS Simulator (Cmd+Shift+5 → запись окна симулятора).
- Монтаж: iMovie / DaVinci Resolve free.
- Время: 2-3 часа с подбором демо-данных и кадрированием.

### 5. Слайды презентации

- Основа: `docs/diploma-defense-script.md` (готовый script на 12-15 минут).
- C4 диаграммы (`docs/architecture/c4-*.md`) — экспортировать Mermaid в PNG через [mermaid.live](https://mermaid.live) или CLI `mmdc`.
- Метрики из evaluation глав.
- Время: 4-5 часов.

### 6. Real evaluation chapter с реальными цифрами

- На основе текущей базы (5288 рецептов, 5022 цены Arbuz, 98% nutrition coverage).
- Что включить:
  - **Recipe corpus quality**: % с nutrition, % с image, % с estimated_cost > 0, дедуп rate (после P0.3), median quality_score.
  - **Planner solve rate**: % планов которые CP-SAT решает vs детерминистский fallback на разных бюджетах.
  - **ML vs rules scoring**: offline NDCG@5, NDCG@10 на synthetic split.
  - **ETL throughput**: до/после async fetcher (если будет реализовано).
  - **Cost normalization accuracy**: % рецептов где estimated_cost попадает в реальный диапазон Arbuz.
- Время: 3-4 часа сбора и оформления.

---

## P1 — Видимые UX-улучшения в мобильном

### Replace meal flow

- Сейчас в `mobile/src/screens/plans/DayDetailsScreen.tsx` есть кнопка "Открыть рецепт", но нет полноценного "Заменить" с picker'ом.
- Backend endpoint: `POST /api/v1/meal-plan-items/<id>/replace` — готов.
- Хук `useReplaceMealItem` в `features/plans/hooks.ts` — готов.
- Что нужно: новый screen `ReplaceMealPickerScreen` с поиском рецептов и подтверждением.

### Pantry UI

- Backend: `PantryItem` модель + endpoints `/api/v1/groups/<id>/pantry-items` уже работают.
- Что нужно в mobile: новый tab или вложенный screen с CRUD для pantry items + expires_at.
- Бонус: использовать в shopping list — отметить «уже есть дома».

### Settings screen — реальный

- Сейчас Profile → Settings показывает 3 placeholder-строки.
- Backend: `/api/v1/settings` (`UserSettings`) — notifications_enabled, measurement_system, currency_code.
- Что нужно: switch'и + select'ы + сохранение через PATCH.

### Notifications screen

- Backend: `apps.feedback.Notification` + endpoints `/api/v1/notifications` (есть в `notification_views.py`).
- Что нужно: список с pull-to-refresh, mark as read, badge counter в табах.

### Pull-to-refresh

- На всех list screens: Recipes, Plans, ShoppingList, Notifications.
- React Native `RefreshControl` + `queryClient.invalidateQueries`.

### Skeleton loaders

- Заменить `<ActivityIndicator>` на анимированные skeleton-карточки в `QueryBoundary`.
- Профессиональнее выглядит и не «прыгает» layout.

### Recipe favorites

- Backend `/api/v1/favorites/recipes` готов.
- Хук `useToggleFavorite` в `features/recipes/hooks.ts` готов.
- Что нужно: ⭐ кнопка в `RecipeDetailsScreen` справа от заголовка.

### Search autocomplete

- Backend `/api/v1/recipes/search-suggestions?query=...` готов.
- Что нужно: debounced input в `RecipesScreen` + dropdown с предложениями.

### Share meal plan

- Backend share-link API: `POST /api/v1/meal-plans/<id>/share-links` + `/api/v1/shared/meal-plans/<token>` (есть в `extra_views.py`).
- React Native: `import { Share } from 'react-native'` → `Share.share({ url: 'mealplanner://meal-plans/<id>' })`.
- Заодно: deep link handler уже сконфигурирован в `RootNavigator.linking`.

### Toast/snackbar вместо Alert.alert

- Установить `react-native-toast-message` или сделать свой компонент.
- Заменить все `Alert.alert` для не-критичных уведомлений.

---

## P2 — Алгоритмические улучшения планировщика

### Pantry-aware planning

- Идея: рецепты использующие ingredient'ы из pantry получают +0.10 к scoring.
- Где править: `_score_recipe_for_group` в `apps/planning/services.py:335`.
- Дополнительно: при расчёте shopping list уменьшать `total_quantity` на `pantry.quantity` (есть `ShoppingListWithPantryAdjustmentAPIView`, но мобильный не использует).

### Leftovers planning

- Если рецепт на 4 порции, а семья из 3 — оставшаяся порция добавляется в lunch следующего дня.
- Снижает реальную стоимость недели на 15-20%.
- Где: расширить `_persist_meal_plan_selection`.

### Portion scaling по типу члена

- Сейчас `servings_total` = constant.
- Лучше: ребёнок ест 0.5 порции, взрослый 1.0, подросток 1.2 (использовать `priority_weight`).
- Где: `_suggest_servings_total` в `services.py`.

### Nutrition target enforcement в CP-SAT

- Сейчас target_calories — soft scoring weight.
- Сделать hard constraint: сумма дневных калорий = ±15% от group.daily_calorie_target.
- Где: добавить constraint в `_build_cp_sat_selection`.

### Substitution suggestions при просмотре рецепта

- Модель `IngredientSubstitution` существует (`cheaper`, `low_carb`, `child_friendly`, `higher_protein`...).
- В `RecipeDetailsScreen` добавить блок "Замены" под каждый ингредиент.
- Backend serializer уже отдаёт `substitutions` в `RecipeDetailSerializer`.

### Cost-effective Pareto frontier

- При генерации показать 3 варианта: cheapest / balanced / premium.
- Юзер выбирает понравившийся.
- Реализуется как 3 отдельных CP-SAT прогона с разными `optimization_focus`.

---

## P3 — Расширение данных

### USDA nutrition sync для новых ингредиентов

- Сейчас 100 канонических в `nutrition_catalog.yaml`, у нас 7600 ingredient.
- Регистрация бесплатная: <https://fdc.nal.usda.gov/api-key-signup> (1000 req/hour).
- Команда: `etl-meals sync-usda-nutrition --api-key $USDA_API_KEY` — уже написана.
- Получишь: реальные микронутриенты (vitamin C, iron, fiber и т.д.) для всех ingredient.

### Astana prices

- Команда: `etl-meals scrape-prices --store arbuz --city astana --output data/exports/prices_arbuz_astana.jsonl`.
- Импорт с другим `--region-code KZ-AST`.
- В планировщике использовать `region_code` группы для выбора цен.

### HF dataset rerun

- У нас 5k из 92k. `etl-meals ingest-dataset --dataset ru_recipes_93k --limit 30000` — это +25k рецептов за час.
- Перед этим лучше запустить deduplication (P0.3).

### Cuisine detection через LLM

- Сейчас 95% рецептов = `local_modern` потому что `_detect_cuisine` ищет только явные ключи в названии.
- Можно через локальный Ollama (Qwen 2.5) — для каждого title+description вернуть один из {kazakh, russian, uzbek, ukrainian, italian, asian, european, american, ...}.
- Reuse `etl-meals/normalization/llm_normalize.py` — там есть Ollama integration.

### Image fallback

- Некоторые `image_url` отдают 404.
- В `RecipeCard` (mobile) обработать `<Image onError>` → emoji 🍳 placeholder.
- В backend management command — проверять HEAD запросом и помечать `image_url=null` если 404.

### Pseudo-recipe permanent filter

- `services.py:64` имеет `PSEUDO_RECIPE_TITLE_PATTERNS` (чай, тесто, соус, маринад).
- Сейчас фильтруется только в planner candidate pool.
- Лучше: одноразовый management command который пометит status='draft' все pseudo рецепты в БД.

---

## P4 — Backend архитектурные

### Раздробить services.py

- 1763 строки, плохо читается.
- План раздробления (см. фаза 2.1 в `docs/diploma-defense-script.md` или плане):
  - `services/candidate_pool.py`
  - `services/scoring.py` (включая ML scoring)
  - `services/cp_sat_solver.py`
  - `services/deterministic_solver.py`
  - `services/cost_normalization.py`
  - `services/shopping_list.py`
  - `services/nutrition_aggregator.py`
  - `services/explanations.py`
  - `services/orchestrator.py`

### Tests до 70% coverage

- Pytest infra готова (`pytest.ini`, `conftest.py`).
- Параметрические тесты `_normalize_ingredient_cost` — самые ценные.
- Integration тесты `POST /meal-plans/generate` end-to-end.
- CP-SAT тесты под разные strictness levels.

### PostHog analytics активация

- Код есть в `apps/common/analytics.py`.
- Регистрация: <https://eu.posthog.com> (free 1M events/мес).
- Добавить `track_event` в ключевые view'ы: signup, plan_generated, recipe_viewed, plan_approved.
- Получишь: dashboards с DAU, conversion rate, funnel.

### Sentry интеграция

- Конфиг есть в `settings/base.py:159`.
- Регистрация: <https://sentry.io> (5k errors/мес free).
- Подставить DSN в `.env`.
- Бонус: front-end Sentry для mobile (пакет уже в `package.json`).

### Image proxy / CDN

- Сейчас `image_url` ведёт на russianfood.com — они могут убрать ссылки в любой момент.
- Решение:
  1. Скачать все image_url через ETL.
  2. Загрузить в S3 / CloudFront (или MinIO локально).
  3. Заменить `image_url` в БД на own URL.

### DB indexes review

- Запустить `EXPLAIN ANALYZE` на медленных query из `_build_candidate_pool`.
- Особо: index по (status, quality_score, category) для planner.

### Healthcheck для Celery worker / beat

- Сейчас они unhealthy в `docker compose ps` потому что используют web-healthcheck.
- В docker-compose.yml для worker / beat сменить healthcheck на:
  ```
  test: ["CMD", "celery", "-A", "config", "inspect", "ping", "--timeout=5"]
  ```

---

## P5 — Mobile-specific фичи

### Реальные push-триггеры

- Backend `apps/planning/tasks.py` уже отправляет push при `plan_generated`.
- Добавить:
  - Время готовки: за 30 минут до lunch / dinner — Celery beat task.
  - Pantry expiring: за 2 дня до expires_at (есть `notify_pantry_expiring` task, но не в beat schedule).
  - Новый план для семьи: когда другой member group сгенерировал.

### Offline cache

- TanStack Query persistor + AsyncStorage.
- Hot recipes откроются даже без интернета.
- Пакет: `@tanstack/query-async-storage-persister`.

### Onboarding tooltip / hints

- На первом Generate Plan — подсказки "выберите фокус".
- React Native: `react-native-walkthrough` или свой Modal с overlay.

### App rating prompt

- После 3 успешных планов попросить оценить.
- Пакет: `expo-store-review`.

### Локализация ru / kz / en

- Сейчас всё захардкожено по-русски.
- Пакет: `i18n-js` + `expo-localization`.
- Strings перенести в `src/shared/lib/i18n/{ru,kz,en}.json`.

### Light / dark theme detection

- `useColorScheme()` от React Native.
- Theme tokens в `shared/ui/theme.ts`.

### Haptic feedback

- `expo-haptics` уже в зависимостях.
- На swipe / tap / replace / favorite.

---

## P6 — Production deploy

Если хочешь публичную версию (~3 месяца + $150 регистраций):

1. **Регистрации** (1-7 дней ожиданий):
   - Apple Developer ($99/год)
   - Google Play Console ($25 единоразово)
   - AWS account (бесплатные $200 кредитов через GitHub Student Pack)
2. **Apply Terraform** в `infrastructure/terraform/environments/prod/`:
   - `terraform init && terraform apply`
   - Реальный prod стек: VPC + RDS Multi-AZ + ECS Fargate + ALB + CloudFront + WAF.
   - Стоимость: ~$220-280/мес.
3. **Privacy Policy + ToS** заполнить с реальным адресом (`docs/legal/`).
4. **App icons + splash screen** для App Store / Play Market (1024×1024 master).
5. **Demo account** для App Store reviewers.
6. **TestFlight + Internal Testing** beta фаза 1-2 недели.
7. **Phased rollout** 5% → 100%.

Подробный чек-лист в `docs/store/app-store-metadata.md` и `docs/store/google-play-metadata.md`.

---

## P7 — Документация для диплома

| Что | Как сделать |
|---|---|
| C4 в PDF | Mermaid → PNG через `mmdc -i c4-containers.md -o c4-containers.png` |
| API docs | Скриншоты Swagger на `/api/v1/docs/` |
| Database schema diagram | `pip install django-extensions` + `manage.py graph_models -a -o schema.png` |
| Sequence diagram планирования | Mermaid sequence "user generates plan" в `docs/architecture/sequences/` |
| Comparison table алгоритмов | CP-SAT vs greedy vs ML, метрики на наших данных |
| ADR для новых решений | По шаблону `docs/adr/0001-*.md` |
| Demo video | Запись + раскадровка для презентации |

---

## Дорожки в зависимости от времени

### 1-2 недели до защиты

1. ML scoring + evaluation (P0.1, P0.6) — 1 день
2. MinHash дедуп + Quality score (P0.2, P0.3) — 1 день
3. Видео-демо + слайды (P0.4, P0.5) — 2-3 дня
4. Pantry + Settings + Replace meal в mobile (P1) — 2-3 дня
5. PostHog + Sentry активация (P4) — полдня

### 1-2 месяца

всё из 1-2 недель плюс:

6. Real-time updates + offline cache (P5)
7. Pantry-aware planning + Nutrition target enforcement (P2)
8. Locale ru / kz / en (P5)
9. USDA nutrition full sync (P3)
10. Раздробить services.py + tests до 70% (P4)
11. Image proxy через S3 (P4)

### Полгода+

всё из 1-2 месяцев плюс:

12. Production deploy (P6) полностью
13. Cost-effective Pareto frontier (P2)
14. Substitution suggestions UI (P2)
15. Computer vision: фото холодильника (отдельная глава)
16. Voice cooking assistant (отдельная глава)
17. Real-time collaborative планирование через WebSocket
18. RuStore публикация (после Apple/Google)

---

## Текущее состояние системы (на момент написания)

| Компонент | Статус |
|---|---|
| Backend (Django + DRF + Celery + JWT + throttling) | Production-ready |
| Mobile (Expo + TanStack Query + 18 экранов) | MVP-ready |
| База: 5288 опубликованных рецептов | 8 кухонь СНГ + локальная микс |
| Цены (5022 рыночных Arbuz + 2614 эвристических) | 65% покрытие реальных |
| Nutrition (98% recipes с калориями) | Median 374 ккал/порция |
| ETL pipeline (scraping + HF datasets + price scrapers) | Работает |
| Infrastructure (Terraform 12 модулей) | Готово, не deployed |
| CI/CD (GitHub Actions 7 workflows) | Готово, не активировано |
| Документация (C4, ADR, runbooks) | Полная |

---

_Last updated: 2026-04-28._
