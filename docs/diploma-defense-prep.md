# Расширенная подготовка к защите диплома

Этот файл дополняет `diploma-defense-presentation-plan.md` (где есть текст на каждый слайд) и `diploma-defense-script.md` (короткий английский скрипт). Здесь — то, что нужно держать в голове во время самого выступления и Q&A.

Состав:

1. Карточка фактов и чисел для запоминания
2. Тайминг 12–15 минут по слайдам
3. Расширенный Q&A банк
4. «Трудные» вопросы и заранее заготовленные ответы
5. Demo storyboard с тайм-кодами
6. Чек-лист день-до / утро защиты

---

## 1. Карточка фактов и чисел (учить наизусть)

Эти числа должны проговариваться без пауз, потому что комиссия проверяет владение проектом по тому, насколько уверенно ты называешь конкретные значения.

### Данные и корпус

- ETL silver layer: **90 605 рецептов**.
- Export bundle (`diploma_work`): **5 605 рецептов**, 48 703 recipe-ingredient row, 33 880 recipe-step row, 2 307 canonical ingredients, 10 тегов, 103 975 audit-issue рядов в `manifest.json`.
- Backend demo sample (для воспроизводимого bootstrap): **5 000 рецептов**.
- Arbuz price snapshot: **7 030 SKU рядов**, единицы — g 5186, kg 755, ml 557, pc 357, l 175.
- Stat-price reference: **42 строки** по 20 казахским городам, дата март 2026.
- USDA nutrition catalog: **107 entries** (соль, сахар, мука, мясо, молочное, специи и тд).
- Coverage в 5k bootstrap: image 100%, total_time 100%, медиана total_time = **60 мин**, top cuisines: GE 36 / UZ 35 / KZ 31 / UA 30 / AM 18.
- Category distribution (5k): Dinner 2838, Snack 1085, Breakfast 952, Lunch 125.
- Качество: composite `quality_score` ∈ [0,1] из **8 компонентов** — nutrition coverage, ingredient match ratio, total-time presence, yields presence, image presence, step count, parsed-unit ratio, price-coverage ratio.
- Дедуп: **MinHash + LSH** через `datasketch`, дубли -> `status='draft'`.
- Кластеризация ингредиентов: **sentence-transformers + k-means**, далее human-review.

### Алгоритм планирования

- 5 стадий: candidate pool -> hard constraints -> scoring (det / ML) -> CP-SAT assignment -> deterministic fallback -> post-processing.
- Кандидаты обрезаются до **top 20 на категорию** перед CP-SAT.
- Решатель: **OR-Tools CP-SAT**, бюджет — **5 секунд wall-clock, 8 search workers**.
- Производственная статистика статусов CP-SAT: **OPTIMAL ≈ 70%**, FEASIBLE ≈ 28%, UNKNOWN/INFEASIBLE ≈ 2% (срабатывает fallback).
- Решающие переменные: $x_{d,m,r} \in \{0,1\}$ — рецепт r в день d слот m. Ещё: $u_r$ (use-count), $y_r$ (used-any), $e_r = u_r - y_r$ (repeat excess), slack-переменные по 4 макро.
- Веса в objective (для score, unique, repeat): **wscore = 20, wunique = 120, wrepeat = 300**. Diversity domiрует score в 6 и 15 раз.
- Асимметрия по белку: shortfall weight = **12**, overshoot = **1** (12× — потому что под-белок хуже, чем чуть-перебор).
- Калории: shortfall = 4, overshoot = 1. Углеводы: 2 и 2.
- Размер модели: 45–130 binary переменных, 50–200 линейных/логических ограничений в зависимости от горизонта (3/7/14 дней) и meals-per-day (3–5).
- Presolve срезает 20–40% переменных.
- Полинг клиента: каждые ~2 секунды.

### Результаты алгоритма (representative scenario: 2 adults, 7 days, 3 meals/day)

- Calorie gap: **2616.72 → 47.72 ккал** (CP-SAT vs deterministic).
- Protein gap: **317.22 → 4.71 г**.
- Diversity score: **1.00 → 1.00** (не пострадал).
- Total cost: **+3 321.80 KZT** в пределах flexible budget.
- Overall score: 0.89 → 0.88 (минус 0.01 — намеренный trade-off).

### Sensitivity analysis (S1)

- Сокращение бюджета на 20% **не ухудшает macro-fit** (slack-веса доминируют).
- Cooking-time cap 30 мин на ужин -> **15% домохозяйств** получают INFEASIBLE, срабатывает fallback.
- Удвоение shortlist с 20 -> 40 на категорию: solve time **1.6с -> 2.4с** (sublinear). Бюджет 5с не нарушен.

### Дополнительные сценарии S2–S4

- S2 (пара + малыш, блок dairy/nuts): macro 62.3/6.1, cost within, overall 0.86.
- S3 (один взрослый, mass-gain): 51.1/2.9, +8% cost, overall **0.91** (лучший).
- S4 (пара, weight-loss, блок shellfish/pork, строгий бюджет): 74.5/8.2, -5% cost, overall 0.83 (худший — конъюнкция ограничений сужает feasible region).

### ML scoring (LightGBM)

- Библиотека: **LightGBM**, objective: **lambdarank**.
- Feature vector: **31 признак** = 16 dense (11 recipe scalar + 4 group scalar + 1 cross) + 15 one-hot (6 member-goal + 9 recipe-tag).
- Тот же feature extractor используется в training и inference (защита от training/serving skew по Sculley et al. NeurIPS-15, "Hidden Technical Debt").
- Labels: real `RecipeFeedback` (rating / like-dislike / replace) + synthetic (deterministic scorer проецированный в 0–4 graded relevance).
- Synthetic labels weight: **0.5** от real.
- Split: time-based train/validation, early stopping по NDCG@10, retrain — еженедельно (Celery beat).
- Cold-start: 3 защиты — `_load_model() -> None` -> детерминистический; smooth blend если sample < threshold; clamp prediction в [0,1].

### Backend

- 7 Django apps: **users, groups, catalog, planning, feedback, devices, common**.
- 32 persisted entity. Запомнить хотя бы costяк: Group, GroupMember, MemberConstraint, GroupPreference, Recipe, Ingredient, IngredientPrice, RecipeNutrition, MealPlan, MealPlanDay, MealPlanItem, ShoppingList, ShoppingListItem, PantryItem, RecipeFeedback, PlanFeedback, PlanGenerationRun, PlanExplanation, ShareLink, Device.
- API: версионирование по path **`/api/v1/`**, OpenAPI через `drf-spectacular`, Swagger UI на `/api/v1/docs/`.
- Throttle plan-generate: **20 запросов в час на пользователя**, регулируется `DRF_PLAN_THROTTLE`.
- Async stack: **Celery + Redis**, 3 очереди — `default`, `planning`, `push`.
- Auth: **Argon2** + JWT (access 60 мин, refresh с rotation + blacklist).
- Versioning DB: Django migrations, разбиение «3 шага» для zero-downtime (add nullable -> backfill -> NOT NULL).
- Idempotency для plan-replace, shopping-item check-off, pantry mutations — через header `Idempotency-Key`.

### Mobile

- **React Native + Expo SDK 51**, managed workflow.
- **27 экранов**, организация — Feature-Sliced Design адаптированный: `core / screens / features / entities / shared`.
- TanStack Query (server state) + React Hook Form (local form state).
- Lucide icons, реанимация через Reanimated.
- Deep links: **`exp://`** и **`mealplanner://`**.
- Локализация: RU UI, **KZT**, метрические единицы, pluralization в `shared/lib/formatters.ts`.
- Сборка: **EAS Build**, OTA — **EAS Update** (без store-review).

### Web

- React + Vite, scope — landing + минимальный dashboard, тот же API.

### Инфраструктура

- Terraform: **14 модулей** (vpc, alb, ecs-cluster, ecs-service, rds-postgres, elasticache-redis, ecr, secrets-manager, cloudfront-s3, acm-certificate, route53, waf, cloudwatch-alarms, iam-github-oidc).
- 3 окружения: dev / staging / prod. **Prod скомпонован**, dev/staging — скаффолд.
- VPC: **10.0.0.0/16**, 3-tier (public, private, data) × 2 AZ.
- Compute: **ECS Fargate** — web (2–10 task), worker (1–4), beat (1).
- DB: **RDS PostgreSQL 16 Multi-AZ**, PITR, daily backups 30-day retention.
- Cache + broker: **ElastiCache Redis**, разные logical DB.
- Edge: **CloudFront + WAF + ACM TLS**.
- Secrets: **AWS Secrets Manager** (DB password, Expo token, Sentry DSN, PostHog key).
- CI/CD: **8 GitHub Actions workflows** — backend-ci, backend-deploy, etl-ci, mobile-ci, mobile-eas-build, mobile-eas-update, terraform-plan, terraform-apply.
- Identity: **GitHub OIDC** -> short-lived AWS role. Никаких long-lived keys.
- **RPO 1 час, RTO 4 часа**.
- 5 runbooks: deploy / incident / DR / rotate-secrets / mobile rollback.
- Observability: **Sentry + PostHog + CloudWatch**, 4 dashboard-перспективы (API, planning engine, infra, business).
- Cost: **~$2 640–3 360/год AWS** + $99 Apple + $25 Google + $30 домен ≈ **$3 000–3 800 в год**.

### ADR

- **0001** monorepo with 4 sibling dirs + sibling repo для ETL.
- **0002** ECS Fargate (НЕ EKS / App Runner / EC2).
- **0003** CP-SAT + LightGBM scoring + deterministic fallback.
- **0004** Expo Managed (НЕ bare RN / Capacitor / Flutter).
- **0005** PostgreSQL 16 (НЕ DynamoDB / MySQL).

### Литература (нужно знать имена и тему хотя бы 5 ключевых)

- Bondevik et al. 2024 — systematic review food recommender systems.
- Mahajan & Kaur 2024 — second SR food recommender systems.
- Yang et al. 2018 — Yum-Me (nutrient-based meal recommender).
- Elsweiler & Harvey 2015 — automatic meal plan recommendations.
- Sapakova et al. 2023 — ML для прогноза цен в Казахстане (локальный контекст).
- Perron, Didier, Gay 2023 — **CP-SAT-LP solver** (тема — гибрид SAT + LP relaxation).
- Ke et al. 2017 — **LightGBM** (NeurIPS).
- Burges 2010 — **RankNet -> LambdaRank -> LambdaMART**.
- Sculley et al. 2015 — **Hidden technical debt in ML systems** (NeurIPS) — главный аргумент для feature extractor sharing.
- Nielsen — 10 usability heuristics.
- McKillop et al. — USDA FoodData Central.

### Research questions (учить близко к тексту)

- **RQ1**: Как воспроизводимо построить структурированный catalog из гетерогенных recipe + price + nutrition источников.
- **RQ2**: Как объединить hard constraints и soft preferences в одной планировочной модели с интерактивной задержкой и объяснимостью.
- **RQ3**: Как декомпозировать систему по backend / mobile / web / ETL так, чтобы алгоритмическое ядро было изолировано от delivery.
- **RQ4**: Какие инфраструктурные / observability / release-engineering решения нужны для перехода от лабораторного прототипа к deployment-ready системе.
- **RQ5**: Как честно оценить систему (corpus quality, solver characteristics, det vs learned scoring, production readiness).

---

## 2. Тайминг 12–15 минут по слайдам

Целевой темп: **в среднем 60 секунд на слайд**, плюс ~2 минуты на демо (слайд 10). Если идёшь со скоростью, при которой осталось меньше 2 мин, — сокращай 6 и 11. Если торопишься — пропусти 13 и сразу на 14.

| Слайд | Тема | Секунд | Якорная фраза в начале |
|------:|------|------:|------------------------|
| 1 | Титульный | 30 | «Мы представляем Intelligent Meal Planner — систему планирования питания для семьи». |
| 2 | Проблема | 60 | «Выбор еды на неделю — не поисковая задача, а оптимизационная». |
| 3 | Цель и задачи | 50 | «Цель — система, которая строит недельный план под ограничения; задачи разбиты на пять инженерных блоков». |
| 4 | Пользовательский сценарий | 60 | «В мобильном приложении реализован полный сценарий — от онбординга до объяснения плана». |
| 5 | Архитектура | 70 | «Архитектура — пять sibling кодовых баз, координируемых одним versioned OpenAPI контрактом». |
| 6 | Данные и ETL | 70 | «Данные — отдельный инженерный вклад: ETL silver layer на 90 605 рецептов и export bundle на 5 605». |
| 7 | Доменная модель | 60 | «Backend построен вокруг 32 entity в 7 Django app». |
| 8 | Алгоритм | 80 | «Алгоритм — три-уровневый гибрид: deterministic pre-filter, CP-SAT assignment, LightGBM scoring с fallback». |
| 9 | Результаты | 70 | «На репрезентативном сценарии CP-SAT снижает разрыв по калориям с 2617 до 47.7 ккал, по белку — с 317 до 4.71 г». |
| 10 | Демо | 120–150 | «Сейчас покажу короткий демо-ролик полного пользовательского пути». |
| 11 | Mobile | 50 | «Мобильное приложение — 27 экранов в Feature-Sliced Design, TanStack Query, EAS Build + EAS Update». |
| 12 | Production readiness | 70 | «Инфраструктура — Terraform на AWS ECS Fargate + RDS Multi-AZ + ElastiCache + CloudFront + WAF + Secrets Manager». |
| 13 | Ограничения / next steps | 50 | «Мы явно отделяем реализованное от того, что измерится только после production rollout». |
| 14 | Итог | 50 | «В результате — связанная end-to-end система; пять ADR обосновывают долгосрочные решения». |

Итого без демо: ~11 минут; с демо ~13 минут. Запас 2 минуты на переключение слайдов и неизбежные паузы.

Если демо не воспроизводится — пропускай слайд 10, не теряй время. Скажи: «Демо доступно отдельным файлом, перехожу к мобильным экранам».

---

## 3. Расширенный Q&A банк

Группы вопросов — по убыванию вероятности задавания.

### A. Методологические

**A1. В чём именно новизна работы — мы видим уже существующие компоненты (Django, RN, OR-Tools, LightGBM)?**

Новизна не в компонентах, а в их сочетании и в дисциплине доставки. Конкретно:

1. Локальный price baseline + cuisine integration для Казахстана (Arbuz 7 030 + stat-prices 20 городов + KZ кухни в top-5 cuisine).
2. Three-tier hybrid planner: deterministic candidate-pool builder + CP-SAT assignment + LightGBM-ready listwise scoring с graceful fallback chain. Большинство академических прототипов останавливаются на одном слое.
3. Reproducible bootstrap: 8-шаговый `bootstrap_demo_data` плюс versioned data files. Другой разработчик восстанавливает функционально эквивалентное состояние без приватного дампа.
4. Production-engineering layer: 14 Terraform модулей + 8 CI workflow + 5 runbook + 5 ADR. Большинство ML работ не документируют операционный слой.

**A2. Какие гипотезы вы проверяли?**

Главная гипотеза: глобальная combinatorial оптимизация под комбинацию hard constraints + multi-macro fit + diversity даёт измеримо лучший недельный план, чем greedy local choice. Проверено на repr. сценарии (calorie gap -98%, protein gap -98%) и подтверждено на 4 household scenarios (Table 4.3 в дипломе).

**A3. Почему именно household-level, а не индивидуальный?**

Потому что фактическое decision-making в семьях происходит на уровне общего бюджета, общего shopping list, общего ингредиентного pool. Индивидуальный user не отражает реальный constraint flow — например, allergy одного члена семьи может блокировать рецепт для всех. Felfernig & Burke 2008 и обзоры food recommender systems прямо указывают, что constraint-based household-aware подходы лучше для food domain.

**A4. Откуда взялась бизнес-мотивация проекта?**

Локальный контекст: в Казахстане нет meal planner, учитывающего KZT-бюджет и местные продукты. Sapakova et al. 2023 показывают, что local data важно для price prediction в Казахстане — та же логика применима к meal planning. Локальные кухни (UZ, KZ, GE) присутствуют в каталоге, что отсутствует в Mealime/Yummly/Plant Jammer.

### B. Данные и ETL

**B1. Почему 5 000 рецептов в backend bootstrap, а не 90 000?**

5k — это партизан-снимок для воспроизводимого bootstrap без многогигабайтного артефакта. Полноразмерная демонстрация делается через `pg_restore` production-shaped dump (~90k recipes). Это инженерный компромисс между размером репозитория и скоростью локального восстановления.

**B2. Откуда брали рецепты? Не нарушены ли права?**

Основной источник — публичный датасет `ru_recipes_93k` на Hugging Face (открытая лицензия). Дополнительно — TheMealDB, Spoonacular (public API), web scraping. Скрейпинг уважает per-host rate limits (1 запрос в секунду по умолчанию) и robots.txt. Provenance хранится: каждый recipe row имеет `source_url`, `source_dataset_name`, content hash.

**B3. Как работает quality score?**

Composite score в [0,1] из 8 компонентов: nutrition coverage, ingredient match ratio, total-time presence, yields presence, image presence, step count, parsed-unit ratio, price-coverage ratio. Persisted и сам scalar и breakdown (JSONField). Planner фильтрует только рецепты выше `PLANNER_MIN_QUALITY_SCORE`. То есть data-quality decisions externalised из optimisation logic.

**B4. Почему MinHash, а не embedding similarity для дедупликации?**

Для рецептов сильный сигнал — это совпадение **набора** ингредиентов, не семантика заголовка. MinHash на ingredient sets даёт O(1) сравнение через LSH, что нужно при 90k+ корпусе. Embedding-based используется для другой задачи — кластеризация alias-ов ingredient'ов (sentence-transformers + k-means + human review).

**B5. Как заполняли nutrition для рецептов? Доверяете ли вы USDA?**

Двух-путевой подход: ETL `sync-usda-nutrition` строит ingredient-level catalog (107 entries для staples) с USDA FoodData Central API. Backend через `backfill_recipe_nutrition` агрегирует per-ingredient значения и масштабирует по quantity/unit normalisation. Для region-specific ингредиентов — curated overrides под `source_type: manual_usda`. USDA — citable scientific baseline (McKillop et al.); локальная curation покрывает пробелы.

**B6. Цены — это retail snapshot или что-то более актуальное?**

Это **snapshot**, не real-time. Два источника: (1) официальный statистический reference (`prices-stat.csv`, 20 городов, март 2026) — citable baseline; (2) Arbuz.kz retail snapshot (`prices_arbuz.jsonl`, 7 030 SKU) — заполняет long tail. Heuristic backfill + repair commands добивают остаточные пробелы. Real-time tracking — в future work.

### C. Алгоритм (CP-SAT, формулировка, тюнинг)

**C1. Дайте полную математическую формулировку CP-SAT модели.**

Decision vars: $x_{d,m,r} \in \{0,1\}$ — рецепт r присвоен слоту (d, m).

Дополнительно: $u_r$ (use count), $y_r$ (used-any indicator), $e_r = u_r - y_r$ (repeat excess), $\mathrm{short}_j, \mathrm{over}_j$ для каждой макро j ∈ {calories, protein, fat, carb}.

Constraints:
- $\sum_r x_{d,m,r} = 1$ для каждого (d,m) с непустым shortlist (one per slot).
- $u_r = \sum_{d,m} x_{d,m,r}$ и $u_r \le \mathrm{max\_uses}$.
- $u_r \ge 1 \Rightarrow y_r = 1$, $u_r = 0 \Rightarrow y_r = 0$.
- $\sum_{d,m,r} c_r x_{d,m,r} \le B$ — budget cap, где B вычисляется из group budget и budget strictness.
- No back-to-back: одна и та же recipe не в двух consecutive days для одного meal type.
- Macro slack: $\mathrm{short}_j \ge T_j - \sum v_{r,j} x_{d,m,r}$ и $\mathrm{over}_j \ge \sum v_{r,j} x_{d,m,r} - T_j$.

Objective:
$$
\max\, w_{\text{score}}\sum_{d,m,r} s_r x_{d,m,r} + w_{\text{unique}}\sum_r y_r - w_{\text{repeat}}\sum_r e_r - w_{\text{cost}}\sum \tilde c_r x_{d,m,r} - \sum_j w_j \cdot \mathrm{slack}_j
$$

С persisted параметрами $w_{\text{score}}=20, w_{\text{unique}}=120, w_{\text{repeat}}=300$. Macro и cost веса включаются по `optimisation_focus`.

**C2. Как тюнили веса?**

Inspection-driven, не глобальная metric optimization. Просмотрели результаты deterministic baseline, выделили три доминирующих failure mode: protein shortfall на high-activity, low diversity (тот же завтрак), cost overshoot заметный только в shopping list. Каждый mode мапит на конкретный вес. Diversity terms (120 / 300) намеренно в **6 и 15 раз больше** score weight (20), чтобы solver предпочитал new recipe over reusing high-scoring one. Protein shortfall (12) в 12 раз больше protein overshoot (1) — асимметрия отражает инженерное наблюдение, что недокормить хуже, чем чуть перекормить.

**C3. Почему 5 секунд wall-clock?**

Чтобы суммарный perceived latency (CP-SAT + serialization + DB I/O + push) уложился в 2-секундный polling cycle мобильного UI в >90% случаев. CP-SAT — anytime solver, отдаёт best-so-far при interrupt. На production-shape: OPTIMAL ≈ 70%, FEASIBLE ≈ 28%, fallback ≈ 2%.

**C4. Что происходит, когда CP-SAT возвращает INFEASIBLE?**

Срабатывает deterministic greedy fallback: для каждого (day, meal) выбираем top-scoring recipe из соответствующего bucket, не превысившую repetition cap. Простой намеренно — цель fallback'а robustness, не optimality. Лучше выдать какой-то план, чем сообщить пользователю «не смогли». Из sensitivity analysis: 30-минутный cap на ужин triggers INFEASIBLE на ~15% домохозяйств.

**C5. Почему CP-SAT, а не ILP/PuLP/CBC?**

Три причины. (1) Naturальные ограничения в этой задаче — discrete logical (`AllDifferent`, `AtMostK`, "не одно и то же два дня подряд"), которые в ILP неестественно выражаются линейно. (2) OR-Tools CP-SAT использует lazy clause generation (Ohrimenko, Stuckey, Codish 2009) — компактнее, чем pure branch-and-bound. (3) CP-SAT гибридный — comбинирует SAT search с LP relaxation (Perron, Didier, Gay 2023, **CP 2023**), competitive с ILP на linear-friendly и явно лучше на combinatorial-structured. Плюс OR-Tools embedded в Python process — нет отдельного solver service.

**C6. Почему не end-to-end neural ranker через plan candidates?**

Три причины. (1) Дорого в обучении — нужно собрать датасет (group, plan-candidates, label) на realistic размер. (2) Теряется interpretability — не сможем сгенерировать `PlanExplanation` с per-constraint reasoning. (3) Не гарантирует feasibility под tight constraints (combinatorial completeness CP-SAT решает). Neural ranker мог бы заменить scoring внутри CP-SAT, но это другой scope.

**C7. Что такое candidate pool и зачем top-20?**

Candidate pool — фильтрация published recipes для group: status, category, quality threshold, blocked ingredients/tags/free-text, budget+time strictness. Из этого pool берём top-20 по scoring на каждую категорию перед CP-SAT — это держит решающую задачу tractable (45–130 binary vars вместо тысяч).

### D. Машинное обучение

**D1. ML работает или нет?**

Инженерно — да: feature extractor (31-d вектор), training pipeline (lambdarank по per-group группам), lazy thread-safe inference, S3 upload, weekly retrain через Celery beat, graceful fallback на deterministic. Что **не доказано** — measured NDCG-улучшение против deterministic на real labels. Causa: real `RecipeFeedback` накапливается после production rollout. Поэтому в evaluation мы отчитываемся engineering readiness criteria (Table 4.4), а не аспирационные NDCG числа из synthetic-only labels — это бы лишь подтвердило сам scorer, который их сгенерировал (Sculley et al.).

**D2. Что входит в feature vector?**

31 dimension. Dense (16): 11 recipe scalars (cost, kcal/serving, protein/serving, fat/serving, carb/serving, prep time, cook time, default servings, quality score, is-local-cuisine, is-child-friendly) + 4 group scalars (budget, member count, max cooking time, repeat tolerance) + 1 cross (cost-to-budget ratio). One-hot (15): 6 member-goal flags + 9 recipe-tag flags из fixed canonical list.

**D3. Почему LightGBM, а не XGBoost / neural?**

(1) GOSS + EFB в LightGBM — на нашей одно-hot heavy сравнительно sparse данных дают преимущество в скорости обучения. (2) Leaf-wise tree growth ловит non-linear interactions между group profile и recipe metadata. (3) Library поддерживает `LGBMRanker` с `lambdarank` objective прямо из коробки (RankNet -> LambdaRank -> LambdaMART, Burges 2010), что соответствует нашей listwise задаче. (4) Boosters сериализуются в один файл — idе для weekly artifact rotation через S3.

**D4. Что такое NDCG и почему именно @5 / @10?**

NDCG (Normalised Discounted Cumulative Gain) — метрика ранжирования, измеряет, насколько порядок предсказанных items совпадает с ideal ranking, с дисконтом за позицию. @5/@10 — потому что пользователь видит именно top-N в мобильном UI; правильное упорядочивание далеко от верха в реальности не используется. LambdaRank gradient как раз biased toward top-of-list correctness (gradient × ΔNDCG).

**D5. Как защититесь от training/serving skew?**

Один и тот же `features.py` extractor вызывается в `training.py` и в `scorer.py`. Это прямая рекомендация Sculley et al. NeurIPS-2015 "Hidden Technical Debt in ML Systems". Любой добавленный feature автоматически появляется в обеих сторонах pipeline.

**D6. Cold-start — что будет с новым household?**

Три layered defences. (1) Нет артефакта -> `_load_model()` -> `None` -> deterministic scorer. (2) Артефакт есть, но per-group sample меньше threshold — blend deterministic + ML с весом, decay linearly. (3) Любое prediction вне [0,1] — clamp перед persist, чтобы model regression не уехало в pathological range.

### E. Backend и архитектура

**E1. Почему монолит, а не микросервисы?**

При 3 сервисах (web, worker, beat) микросервисы overengineering. Domain coherent — все вращается вокруг household / plan. Монолитный backend плюс отдельный worker уже даёт правильную separation концерных. ADR-0001 фиксирует sibling-codebase подход; реальная декомпозиция — по 7 Django app, что обеспечивает coupling discipline без операционной стоимости микросервисов.

**E2. Почему async через Celery, а не Django Channels / asgi?**

Plan generation — CPU-bound (CP-SAT solver) с wall-clock до 5с. Если бы делали async-await, мы бы блокировали event loop на длительный CPU job. Celery worker сидит в отдельном процессе, и HTTP-сервер остаётся responsive. Channels хорош для websockets / streaming, что нам не нужно.

**E3. Какие гарантии идемпотентности?**

(1) `PlanGenerationRun` — natural dedup key, worker проверяет status перед expensive work, double broker delivery не приведет к double-write плана. (2) State-changing endpoints (plan replace, shopping check-off, pantry mutations) принимают `Idempotency-Key` header. (3) Push delivery, ranker retraining — `autoretry_for` с exp backoff, max 6 attempts. Plan generation — intentionally **не** retriable — пользователь явно перезапускает с UI, иначе скрытые retry прячут intermittent bugs.

**E4. Как доказывается совместимость API между mobile и backend?**

(1) Contract tests на mobile-side — фиксированные fixtures по wire format, любое изменение требует двухстороннего PR. (2) `drf-spectacular` рендерит OpenAPI динамически в `/api/v1/schema/`, Swagger в `/api/v1/docs/`. (3) `AppVersionGateMiddleware` enforce минимальную mobile-версию для contract-breaking changes. (4) Versioning at path (`/api/v1/`), не header — debug easier через CloudWatch logs.

**E5. Что вы делаете при zero-downtime миграциях?**

Три discipline rules. (1) Schema changes разбиваются на reversible steps: добавить nullable column в одном migration, backfill в management command, enforce NOT NULL в третьем. (2) Destructive migrations (drop column, rename table) deferred за deprecation window не меньше двух release cycles — иначе old mobile в дикой природе break-нется. (3) Long-running data migrations — не в `migrate` (он держит startup lock), а в one-off management command, записанный в release runbook.

### F. Mobile

**F1. Почему Expo Managed, а не bare RN?**

ADR-0004. Bare RN требует pod-install + Gradle wiring для каждого нативного plugin. Команда без native iOS/Android опыта. Expo Managed закрывает 95% потребностей (notifications, secure store, deep links) без native gymnastics. **EAS Build** — облачная сборка iOS/Android прямо из CI без необходимости Mac в pipeline. **EAS Update** — OTA JS-only patches без store review (Apple/Google review занимает дни).

**F2. Что такое Feature-Sliced Design в вашей реализации?**

5 layers под `mobile/src/` в порядке убывающей volatility: `core` (Expo navigation, providers, deep linking) -> `screens` (27 destinations) -> `features` (single-user-intent actions, например replace plan item) -> `entities` (recipe / plan / group с API client + query keys + view components) -> `shared` (design system tokens, formatters, http client, query client config, error boundaries, telemetry adapters). Imports flow downward only: screen -> features/entities/shared; feature -> entities/shared; entity -> shared. Enforced через TypeScript path aliases.

**F3. Почему TanStack Query, а не Redux?**

Server state ≠ client state. TanStack даёт caching, dedup, background refetch, optimistic updates, query invalidation — то, что в Redux нужно писать руками. Локальное состояние форм — через React Hook Form. Если бы был сложный domain-state (multi-step wizards, undo history), мы бы добавили Zustand, но не Redux.

**F4. Как обеспечиваете консистентный UX?**

Design system в `shared/ui/theme.ts` (palette, spacing, radii, typography, shadows, motion tokens). Атомарные components: `Text`, `Button`, `Card`, `Input` — все theme-aware. Все UI strings через `formatters.ts` с `pluralRu` — никаких hardcoded RU strings в screens. Иконки только Lucide через wrapper `Icon.tsx` — никаких эмодзи. Все tappable через `TouchableSurface` с haptic feedback.

### G. Production / Infra

**G1. Почему ECS Fargate, а не EKS?**

ADR-0002. EKS control-plane fee ~$70/мес — для 3 services unjustified. Diminishing returns для 3-service workload. Fargate: per-second billing, native ALB/IAM/CloudWatch integration, no control-plane fee, `aws ecs run-task` для one-off (migrations) — попадает идеально. Если когда-нибудь GPU-backed inference — добавим EKS отдельно, Fargate не load-bearing.

**G2. Что такое RPO и RTO в вашем плане?**

RPO (Recovery Point Objective) = **1 час** — максимально допустимая потеря recent data. RTO (Recovery Time Objective) = **4 часа** — максимально допустимое время восстановления сервиса. RDS — daily backups + PITR (point-in-time recovery), retention 30 дней, manual snapshot перед рискованной миграцией.

**G3. Почему GitHub OIDC?**

Чтобы исключить long-lived AWS access keys в repo secrets. GitHub-issued JWT обменивается на short-lived AWS credentials по trust policy. Production deploy role allowed только из main branch protected repo. PR workflows assume strictly read-only plan role. Terraform apply — manual approval + protected branch.

**G4. Какая модель угроз?**

STRIDE-aligned. **Spoofing**: short-lived JWT (60 мин), refresh rotation с blacklist, Argon2 hashing. **Tampering**: HTTPS end-to-end via ACM, ECS↔RDS TLS, signed share tokens. **Repudiation**: X-Request-ID на каждом запросе propagated в logs / Celery / Sentry / mobile. **Info disclosure**: Secrets Manager only, S3 private + CloudFront-only public access. **DoS**: WAF rate-limit per IP, DRF throttle per user/endpoint, plan-generate cap 20/час/user. **Elevation of privilege**: admin restricted IP allowlist на ALB listener, admin actions audit-logged.

**G5. CI/CD — что у вас 8 workflows?**

`backend-ci`, `backend-deploy`, `etl-ci`, `mobile-ci`, `mobile-eas-build`, `mobile-eas-update`, `terraform-plan`, `terraform-apply`. Per-directory path filters в каждом — backend change не trigger-ит mobile build и наоборот. Mobile builds через EAS, terraform apply — manual approval только из main.

**G6. Observability?**

3-layer. (1) **Sentry** — backend errors + perf traces (sample 10%). (2) **PostHog** — product events через shim, no-op on missing keys (local dev не зависит от remote). (3) **CloudWatch** — 4 dashboards (API health, planning engine, infra, business). Custom metrics: PlansGeneratedTotal, PlanGenerationLatencyMs, CPSATStatusDistribution, MLScorerInvocationsTotal, MLScorerFallbacksTotal, CandidatePoolSize, ShortlistTrim. Структурированные JSON logs через structlog с request-ID correlation.

### H. Стоимость и масштабирование

**H1. Сколько стоит развернуть?**

~$2 640–3 360/год AWS + $99 Apple + $25 Google (one-off) + $30 домен = **$3 000–3 800 в первый год**. Sentry / PostHog / EAS — free tier достаточно изначально.

**H2. До какого DAU это масштабируется?**

Bottleneck — RDS vertical scaling. Trigger plan: monitor CPU + slow queries; add read replica when CPU averages >60%; только тогда consider sharding by region. Web-side scaling — ECS service autoscaling на ALB request count / CPU. На текущей t4g.small примерно держится до нескольких тысяч DAU без архитектурных изменений.

**H3. Что если AWS поднимет цены или Apple снимет с App Store?**

Terraform — provider-agnostic в принципе, но мы коммитимся на AWS managed services. Cloud-migration ratio (Fargate / RDS / Redis / S3 / CloudFront) — единственные AWS-specific артефакты; остальное (Django, Celery, Redis, Postgres) переезжает на GCP/Azure без изменений. Apple — store-submission deferred именно для того, чтобы не накладывать ongoing legal / privacy review responsibilities; mobile binary продолжает работать.

### I. Evaluation и валидность

**I1. На скольких сценариях проверяли алгоритм?**

Один representative (S1: 2 adults, 7 days, 3 meals, blocked lamb + garlic) для full CP-SAT vs deterministic comparison; три дополнительных household scenarios (S2: пара + малыш с блоком dairy/nuts, S3: high-activity single mass-gain, S4: strict-budget pair weight-loss с shellfish/pork блоком). Это **не** стратифицированный benchmark — это explicitly disclosed как threat to validity в Section 4.14.

**I2. Откуда уверенность, что результаты не cherry-picked?**

Three guards. (1) Sensitivity analysis по budget/time/shortlist size — поведение consistent. (2) 4 разных household scenarios покрывают range conjunctions constraint'ов. (3) Все evaluation artifacts регенерируются из repo state — комиссия может перезапустить.

**I3. Что в evaluation НЕ измерено?**

Честно: NDCG@5/@10 на real labels (нужны feedback rows). Online A/B real users. SOC/ISO external audit. Реальное production-shape latency и throughput под нагрузкой. Все эти gaps указаны в Section 4.14 и 4.15.

### J. Ограничения / Future work

**J1. Что вы будете делать дальше?**

Data: increase canonical ingredient coverage, automated alias learning, Astana-specific Arbuz snapshot. Planner: pantry-aware scoring (recipes using on-hand ingredients +0.10 to score), leftover-aware planning (excess servings carry to next-day), per-member portion scaling, Pareto-frontier plans (cheapest/balanced/premium). ML: online A/B via PostHog feature flags, feature-importance drift detection, decile-bucket calibration. Product: substitution suggestions in recipe view, share-link analytics, RU/KK/EN localisation, offline cache via TanStack Query persistence. Production: становится deployed как только активируется AWS аккаунт и подаётся в стор.

**J2. Главное ограничение?**

Coverage heterogeneity в long tail рецептов и ингредиентов. Cultural naming variants, colloquial quantities, source-specific formatting иногда дают ambiguity, что affects cost precision, nutrient aggregation, shopping-list granularity для меньшинства рецептов. Mitigation — periodic curated alias enrichment.

---

## 4. «Трудные» вопросы и заранее заготовленные ответы

Это вопросы, которые комиссия задаёт, чтобы найти слабые места. Лучше отвечать спокойно и признавать границы, чем оправдываться.

**T1. Вы говорите «production-ready», но в проде ничего нет. Это не оверклейм?**

Намеренно используется формулировка **deployment-ready**, не «in production». Это значит: Terraform plans готовы, GitHub OIDC настроен, runbooks написаны, CI/CD wired через path filters, observability shim сидит на правильных hook'ах. Активация production требует AWS billing + Apple Developer Program + Google Play Console — это **business decision**, не engineering blocker. Та же дисциплина проходит по всему диплому: где deployed — пишем deployed, где ready — пишем ready. Section 4.14 явно перечисляет это как threat to validity.

**T2. CP-SAT улучшает разрыв с 2617 до 47 ккал — это слишком хорошо, чтобы быть правдой.**

Это **один сценарий**, S1, явно описанный как representative — это не benchmark по N сценариям. Мы дополнительно показываем 3 других сценария (Table 4.3) — там разрывы тоже малы (47.7/4.7, 62.3/6.1, 51.1/2.9, 74.5/8.2 ккал/г) но больше — потому что constraint conjunction сужает feasible region. Объяснение того, почему deterministic так плох — он greedy slot-by-slot, не глобальная оптимизация; ему легко промахнуться по недельной сумме макро.

**T3. ML — это маркетинговый bullet, на самом деле планер работает на детерминистическом scorer.**

Вы правы в том смысле, что **production hot path сейчас использует deterministic scorer** по умолчанию. ML-слой существует как **engineering readiness** — feature extractor, training pipeline, lazy inference, graceful fallback. Запустится автоматически когда (а) накопится достаточно `RecipeFeedback`, и (б) валидационный NDCG@10 покажет регрессию-устойчивый артефакт. Мы намеренно не заявляем измеренный gain, потому что synthetic-only labels — это просто перетренировка детерминистического scorer; Sculley et al. NeurIPS-15 явно об этом предупреждают.

**T4. Зачем вы делали и backend, и mobile, и ETL, и Terraform — это не дипломная работа, а год работы.**

Согласен, scope большой. Но это и есть тезис работы: **end-to-end система** требует все эти компоненты, иначе она не работает как decision support. Frontend без backend — макет; backend без ETL — без данных; всё это без Terraform — не production-ready. Декомпозиция по 5 sibling codebases с per-directory CI filters позволяет работать **параллельно двум авторам** (как ADR-0001 формулирует). Bexultan и Temirlan делили — например, mobile и planner логика; backend models и ETL pipeline. Конкретные contributions можно расписать если нужно.

**T5. Покажите мне инцидент-ран — как восстанавливаете базу?**

`docs/runbooks/database-restore.md` — point-in-time path (PITR в течение 30 дней) или latest-snapshot path. Switch ECS на restored instance через task definition update. Drill cadence — раз в квартал. RPO 1 час, RTO 4 часа. Если хотите — могу прокликать команды в терминале.

**T6. Покажите, как делается deploy.**

`docs/runbooks/deploy.md`. Normal flow: PR в main -> backend-ci -> backend-deploy workflow assume-role через OIDC -> ECR push -> ECS service update -> smoke test runs. Manual fallback: `aws ecs update-service --force-new-deployment`. Smoke checks: synthetic user creates household, generates plan, opens shopping list, tears down — под 30 секунд.

**T7. Что будет, если OR-Tools удалят из pip / change API?**

(1) Уже есть deterministic fallback — без OR-Tools планер всё равно работает. (2) `try: from ortools.sat.python import cp_model except Exception: cp_model = None` — в `services.py` уже стоит graceful import. (3) Версия pin-нится в `requirements.txt`. Если когда-то выйдет breaking change в OR-Tools, мы либо pin старую версию, либо мигрируем код CP-SAT model.

**T8. Если CP-SAT возвращает OPTIMAL за 5 секунд, а ваш мобильный polling 2 секунды — пользователь видит latency 5 секунд минимум?**

Нет. Polling начинается сразу после `POST /generate`, и backend в момент завершения отправляет push notification через Expo. Polling — fallback на случай если push не пришёл (network issue, denied push permissions). Polling cycle 2с — это не latency floor.

**T9. Почему именно 27 экранов? Это много или мало?**

Это полный household workflow: auth (4–5), onboarding (6 шагов + edit screens), home (1), plans (week + day + recipe detail + replace + adapt), recipes (list + details + favorites), profile (settings, group, members, notifications), shopping, pantry, analytics. Меньше — не покроет real journey. Больше — splitting concerns мы переместили в features layer вместо отдельных screens.

**T10. Кто будет поддерживать это после защиты?**

Engineering — оба автора + supervisor (Alua Myrzakerimova). Production — business decision: либо forked product, либо open-source с community contributions. Runbooks, ADR, README устроены так, чтобы новый разработчик восстанавливал состояние за 1–2 дня (`docs/handoff.md` упоминание в README).

---

## 5. Demo storyboard с тайм-кодами

Если демо — это видео (рекомендую):

| Время | Экран | Действие | Что говорить голосом |
|------:|-------|----------|----------------------|
| 0:00 | Welcome | Появление title screen | — (тишина или короткое intro music) |
| 0:05 | Sign up | Email + password ввод | «Регистрация по email» |
| 0:12 | Onboarding mode | Tap "Семья" | «Выбираем режим — семья» |
| 0:20 | Create household | Ввод имени + region | «Создаём домохозяйство, регион — Астана» |
| 0:30 | Add members | Добавление 2 взрослых + ребёнка | «Указываем состав семьи и цели каждого» |
| 0:45 | Member detail | Возраст, вес, цель | «Один человек — набор массы, другой — поддержание» |
| 1:00 | Constraints | Allergies + dislikes | «Добавляем аллергию на орехи» |
| 1:10 | Preferences | Cooking time + variety | «Максимум 90 минут на готовку, высокое разнообразие» |
| 1:20 | Budget | 60 000 KZT/неделя | «Бюджет 60 тысяч тенге в неделю, средняя строгость» |
| 1:30 | Summary | Скролл по resume | «Проверяем результат» |
| 1:40 | Generate plan | Tap Generate + focus picks | «Выбираем приоритеты — нутриенты и вкус» |
| 1:50 | Strictness | Picker | «Строгость средняя по бюджету и времени» |
| 2:00 | Loading | Spinner с progress | «Backend ставит Celery job, CP-SAT решает за 5 секунд» |
| 2:10 | Week view | Появление сетки дней | «Вот план недели: total cost, total calories, overall score» |
| 2:20 | Day detail | Tap день 3 | «День 3 — три блюда, breakdown по cost и калориям» |
| 2:30 | Recipe detail | Tap «Ашы-сорпа» | «Открываем рецепт — теги, нутриенты, шаги» |
| 2:45 | Replace | Tap "Заменить" | «Можно заменить одно блюдо в плане» |
| 2:55 | Nutrition analytics | Открыть Аналитика | «Сводка по макро относительно member targets» |
| 3:05 | Budget analytics | Tap Бюджет | «Cost by day, остаток против бюджета» |
| 3:15 | Why this plan | Tap Объяснения | «Per-meal rationale — почему планер выбрал именно это» |
| 3:25 | Shopping list | Tap Покупки | «126 позиций, total cost, чек-офф progress» |
| 3:35 | Pantry | Tap Кладовая | «Добавляем продукт в pantry — он вычтется из shopping list» |
| 3:50 | Закрытие | Возврат на home | — |

**Если демо запускается live (не рекомендую — больше точек отказа):**

- Перед защитой: убедиться, что simulator открыт, app залогинен, plan уже сгенерирован (на онбординг 1.5 минуты не уйдёт).
- Запустить с уже сгенерированного плана. Дойти до плана за 30 секунд: weekly view -> day detail -> recipe -> explanations -> shopping list. Всё.
- Backup: на случай, если симулятор падает — скриншот-сетка на отдельном слайде.

---

## 6. Чек-лист день-до и утро защиты

### За день до

- [ ] Полный проход слайдов с таймером (минимум 2 раза).
- [ ] Демо-ролик проигрывается в финальной презентации (PowerPoint/Keynote) без сторонних плееров — лучше embedded MP4.
- [ ] Резервная копия презентации: USB + email + Google Drive.
- [ ] Резервная копия видео отдельным файлом — на случай если в презентации не воспроизведётся.
- [ ] Скриншоты планов / экранов мобильного — на случай если демо не работает (в `docs/diploma/presentation-assets/screenshots/`).
- [ ] Проверка ноутбука: достаточно заряда + кабель + переходник HDMI/USB-C под проектор.
- [ ] Текст вступления (первые 30 секунд) — выучить дословно, потом импровизация.
- [ ] Распечатка cheat sheet с числами (Section 1) — отдельный лист в кармане.
- [ ] Чашка воды рядом во время выступления.
- [ ] Заранее открытые в браузере / IDE окна на случай live-questions:
  - Swagger UI (`http://localhost:8000/api/v1/docs/` — если развёрнуто).
  - `backend/apps/planning/services.py` — функции `_build_candidate_pool`, `_build_cp_sat_selection`, `_score_recipe_for_group`.
  - `backend/apps/planning/ml_scoring/scorer.py` — функция `predict_score`.
  - `docs/diploma/main.pdf` — Table 4.2, Section 3.4 (формулы), Section 4.7 (sensitivity).
  - `docs/adr/0003-cp-sat-with-ml-fallback.md`.
- [ ] Запасной план если интернет упадёт: всё локально работает.

### Утро защиты

- [ ] Открыть `diploma-defense-prep.md` (этот файл), пройти Section 1 (числа) и Section 4 (трудные вопросы) ещё раз.
- [ ] За 15 минут до выхода: глоток воды, прогулка по коридору (CO2 в голове падает).
- [ ] Войти в аудиторию: сразу подключить ноутбук, проверить, что слайды читаются с задних рядов.
- [ ] Первые 30 секунд — приветствие + название проекта + кто авторы + supervisor.

### Во время Q&A

- Если не знаешь ответ — **не сочиняй**. Скажи: «В рамках текущей работы это не измерено, в Section 4.15 это обозначено как ограничение; план будущей работы — [конкретный пункт из Section 4.16]».
- Если вопрос двусмысленный — повтори своими словами: «Если я правильно понимаю, вы спрашиваете о ...».
- Если вопрос о коде / детали — открой соответствующий файл прямо в IDE. Это сильно повышает доверие.
- Если вопрос про метрики — открой `docs/diploma/main.pdf` на нужной таблице (4.1, 4.2, 4.3, 4.4).
- Если вопрос про инфраструктуру — открой соответствующий ADR.

### Финал

После Q&A — короткое «спасибо за вопросы, спасибо за внимание, готовы к обсуждению». Не заминай конец — это последнее впечатление.

---

## Дополнительно — что НЕ говорить

- Не используй фразу «можно сказать, что» — это word filler, оставляет ощущение неуверенности.
- Не говори «в идеале хотелось бы, но не успели» — лучше «следующий шаг roadmap'a — это ...».
- Не говори «это очень просто» / «тривиально» — комиссии не нравится, когда работа описывается как лёгкая.
- Не делай слайды с длинным текстом — на экране bullets, остальное — голосом.
- Не извиняйся за время / за слайды — это создаёт впечатление слабости.
