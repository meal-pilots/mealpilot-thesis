# План презентации для защиты диплома

Тема: **Design, Implementation, and Production Deployment of an Intelligent Meal Planning System for Households with Hybrid Constraint Programming and Learning-to-Rank Scoring**

Формат: 12-15 минут, 14 слайдов, один слайд под готовый демо-ролик приложения.

Главная мысль защиты: это не приложение с рецептами, а end-to-end система поддержки решений для семьи: данные собираются и нормализуются, backend строит недельный план под ограничения, мобильное приложение показывает результат, а инфраструктура подготовлена к production-развертыванию.

## Слайд 1. Титульный

**Текст на слайде**

Intelligent Meal Planner  
Система интеллектуального планирования питания для домохозяйств

Backend + Mobile + ETL + CP-SAT + Production-ready infrastructure

Авторы: Bexultan Yessirkegen, Temirlan Ilyassov  
Astana IT University, Software Engineering

**Что сказать**

Добрый день. Мы представляем дипломный проект Intelligent Meal Planner. Это система, которая генерирует план питания для семьи на несколько дней или неделю с учетом бюджета, целей по питанию, времени готовки, ограничений по продуктам и предпочтений каждого члена семьи. В работе важен не только интерфейс приложения, но и полный инженерный цикл: сбор данных, backend API, оптимизационный алгоритм, мобильный клиент и production-ready инфраструктура.

## Слайд 2. Проблема

**Текст на слайде**

Обычные сервисы рецептов не решают задачу семейного планирования:

- у семьи общий бюджет, но разные цели и ограничения;
- нужно учитывать аллергии, disliked ingredients, религиозные запреты;
- нужен список покупок, а не только отдельный рецепт;
- важно объяснить, почему выбран именно такой план;
- локальные цены и кухня Казахстана редко учитываются.

**Что сказать**

Проблема в том, что выбор еды на неделю не является простым поиском рецепта. У семьи может быть ребенок, человек с целью набора массы, другой человек с целью похудения, общий бюджет в тенге и ограничения по времени. Если приложение предлагает просто популярные рецепты, оно не решает реальную бытовую задачу. Поэтому мы формулируем задачу как оптимизационную: нужно выбрать блюда по дням и приемам пищи так, чтобы они одновременно подходили по бюджету, ограничениям, нутриентам и разнообразию.

## Слайд 3. Цель и задачи проекта

**Текст на слайде**

Цель: разработать систему, которая автоматически строит недельный план питания для домохозяйства.

Задачи:

- собрать и нормализовать корпус рецептов;
- связать рецепты с ингредиентами, ценами и нутриентами;
- реализовать API и асинхронную генерацию планов;
- построить CP-SAT planner с fallback;
- создать мобильное приложение полного пользовательского сценария;
- подготовить инфраструктуру для production deployment.

**Что сказать**

Мы разделили проект на несколько инженерных задач. Первая часть - данные: рецепты, ингредиенты, цены, нутриенты. Вторая часть - backend и модель предметной области. Третья - алгоритм планирования. Четвертая - мобильный клиент, где пользователь реально проходит путь от онбординга до списка покупок. Пятая - инфраструктура: Docker, Terraform, CI/CD, AWS и runbooks.

## Слайд 4. Пользовательский сценарий

**Текст на слайде**

Основной flow:

1. Регистрация и вход.
2. Онбординг семьи: состав, цели, бюджет, время готовки.
3. Генерация плана.
4. Просмотр недельного меню.
5. Детали дня, замена блюда, адаптации.
6. Список покупок, бюджетная и нутриентная аналитика.
7. Объяснение "почему этот план".
8. Кладовая, уведомления, избранные рецепты.

**Визуал**

Сделать горизонтальную дорожку из 5-6 телефонных кадров:

- welcome / создание аккаунта;
- выбор режима питания;
- параметры члена семьи;
- бюджет и summary;
- генерация плана;
- итоговый план недели.

Сохраненные ассеты для первых кадров лежат в `docs/diploma/presentation-assets/screenshots/01-welcome.png` ... `08-generate-strictness.png`.

**Что сказать**

В мобильном приложении реализован полный сценарий. Пользователь не просто смотрит список рецептов. Он создает группу или семью, добавляет членов семьи, указывает возраст, вес, цель, бюджет и предпочтения. Затем запускает генерацию плана. После генерации он видит недельную сетку, стоимость, калории, скоринг, причины выбора, список покупок и аналитику. Также есть замена конкретного блюда, адаптация под члена семьи, кладовая, уведомления и избранные рецепты.

## Слайд 5. Архитектура системы

**Текст на слайде**

Компоненты:

- Mobile: React Native + Expo;
- Web: React + Vite;
- Backend: Django REST Framework;
- Async jobs: Celery + Redis;
- Data: PostgreSQL 16;
- Planner: OR-Tools CP-SAT + deterministic fallback;
- ETL: Python pipeline;
- Infra: Terraform + AWS ECS Fargate, RDS, ElastiCache, S3, CloudFront, WAF.

**Визуал**

Вставить C4 Container diagram из `docs/architecture/c4-containers.md` или `docs/diploma/diagrams/c4-container.mmd`.

**Что сказать**

Система разделена на несколько независимых слоев. Мобильное приложение общается с backend через REST API. Долгие задачи, например генерация плана, не выполняются прямо в HTTP-запросе: API создает запись PlanGenerationRun, отправляет Celery task в очередь planning, а клиент опрашивает статус. PostgreSQL хранит доменную модель, Redis используется как брокер Celery и cache, а ETL-пайплайн отдельно готовит каталог рецептов. Для production подготовлен Terraform-слой под AWS.

## Слайд 6. Данные и ETL

**Текст на слайде**

Data pipeline:

- источник: RuRecipes-93k, TheMealDB, Spoonacular, web scraping;
- extraction: JSON-LD schema.org/Recipe + CSS fallback;
- normalization: ingredient parsing, aliases, units, prices;
- nutrition: USDA FoodData Central;
- quality score: 8 компонентов;
- deduplication: MinHash LSH;
- export bundle для backend.

Текущий repo state:

- 90 605 рецептов в ETL silver layer;
- 5 605 рецептов в export bundle;
- 5 000 рецептов в backend demo sample;
- 7 030 Arbuz price rows.

**Что сказать**

Данные являются отдельным вкладом проекта. ETL умеет находить страницы рецептов, скачивать HTML, извлекать JSON-LD, парсить ингредиенты, нормализовать единицы измерения и связывать ингредиенты с ценами и нутриентами. В репозитории видно два масштаба: большой ETL слой содержит 90 605 рецептов, а backend sample содержит 5 000 рецептов, чтобы другой разработчик мог воспроизвести систему без многогигабайтного dump. Для качества используется score из восьми компонентов: нутриенты, match ингредиентов, наличие времени, порций, изображения, шагов, корректного парсинга и покрытия цен.

## Слайд 7. Доменная модель backend

**Текст на слайде**

Основные сущности:

- User, UserSettings;
- Group, GroupMember, MemberConstraint, GroupPreference;
- Recipe, Ingredient, IngredientPrice, RecipeNutrition;
- MealPlan, MealPlanDay, MealPlanItem;
- MealItemAdaptation;
- ShoppingList, ShoppingListItem;
- PantryItem;
- RecipeFeedback, PlanFeedback, Notification, Device.

**Визуал**

Вставить ER overview из `docs/diploma/diagrams/er-overview.mmd`.

**Что сказать**

Backend построен вокруг доменной модели семьи и плана питания. Group описывает домохозяйство, GroupMember хранит цели и параметры человека, MemberConstraint хранит аллергии, disliked products и другие запреты. Recipe связан с ингредиентами, ценами и нутриентами. MealPlan состоит из дней и элементов меню, а ShoppingList собирается автоматически из ингредиентов всех выбранных рецептов. PantryItem нужен, чтобы учитывать продукты, которые уже есть дома. Feedback и Notification закрывают контур улучшения рекомендаций и пользовательских уведомлений.

## Слайд 8. Алгоритм планирования

**Текст на слайде**

Pipeline генерации:

1. Candidate pool: фильтрация published recipes.
2. Hard constraints: аллергии, disliked ingredients, budget, time.
3. Scoring: deterministic scorer, ML-ready LightGBM layer.
4. CP-SAT assignment: recipe -> day + meal slot.
5. Fallback: deterministic greedy planner.
6. Post-processing: servings, shopping list, analytics, explanations.

**Визуал**

Вставить компонентную диаграмму из `docs/architecture/c4-components-planning.md`.

**Что сказать**

Алгоритм состоит из нескольких этапов. Сначала backend строит candidate pool: берет опубликованные рецепты нужных категорий и отбрасывает то, что не подходит группе. Затем рецепты получают score: сейчас базовый путь использует детерминистические правила, а слой LightGBM реализован для обучения и включения после накопления реального feedback. После этого CP-SAT решает задачу assignment: выбрать ровно одно блюдо на каждый слот, не нарушить бюджет, ограничить повторы и минимизировать отклонения по нутриентам. Если OR-Tools недоступен или задача неразрешима, система использует детерминистический fallback, чтобы пользователь не остался без результата.

## Слайд 9. Результаты алгоритма

**Текст на слайде**

Representative scenario: 2 adults, 7 days, 3 meals/day.

CP-SAT против deterministic baseline:

- calorie gap: 2616.72 -> 47.72 kcal;
- protein gap: 317.22 -> 4.71 g;
- diversity score: 1.00 -> 1.00;
- total cost: +3 321.80 KZT within flexible budget;
- overall score: 0.89 -> 0.88.

**Что сказать**

Для оценки мы сравнили CP-SAT planner с детерминистическим baseline на репрезентативном сценарии. Главный результат: CP-SAT резко уменьшил недельный разрыв по калориям и белку. По калориям разрыв снизился примерно с 2617 до 48 килокалорий, по белку - с 317 до 4.7 грамма. Цена стала немного выше, но осталась в допустимом flexible budget. Это показывает компромисс: CP-SAT не просто выбирает самые дешевые или самые скоринговые рецепты, а глобально балансирует нутриенты, разнообразие и бюджет.

## Слайд 10. Демо-ролик приложения

**Текст на слайде**

Демо полного пользовательского сценария

**Вставить видео**

`[ВСТАВИТЬ ГОТОВЫЙ ДЕМО-РОЛИК ПРИЛОЖЕНИЯ НА ВЕСЬ СЛАЙД]`

Рекомендуемые настройки:

- видео на весь слайд;
- autoplay on click;
- без лишнего текста поверх видео;
- длительность фрагмента: 2-3 минуты;
- если ролик длинный, оставить только ключевой путь.

**Storyboard ролика по твоим скриншотам**

1. Welcome: "Готовим для семьи без лишних усилий".
2. Онбординг: "Кто будет питаться?"
3. Член семьи: возраст, вес, цель "Набор массы".
4. Предпочтения: 90 минут, максимум разнообразия.
5. Бюджет: 60 000 KZT в неделю.
6. Summary: проверка созданной семьи.
7. Новый план: выбор приоритетов "Нутриенты" и "Вкус".
8. Строгость: бюджет и время готовки "Средне".
9. План недели: стоимость, калории, score, budget fit.
10. День: блюда, cost, calories, CP-SAT explanation, замена и адаптация.
11. Рецепт: "Ашы-сорпа", теги, нутриенты, стоимость, servings.
12. Нутриенты: macro balance и fit по члену семьи.
13. Бюджет: лимит, план, остаток, cost by day.
14. Почему этот план: budget, nutrition, group fit, tradeoff.
15. Покупки: 126 позиций, total cost, check-off progress.
16. Кладовая: добавление продукта, который будет учитываться в shopping list.

**Что сказать перед видео**

Сейчас покажу короткий демо-ролик. В нем видно весь пользовательский путь: регистрация, онбординг семьи, генерация плана, просмотр недельного меню, детали дня, замена блюда, список покупок, бюджетная и нутриентная аналитика, объяснения выбора, кладовая и уведомления.

**Что сказать после видео**

В демо видно, что алгоритм не существует отдельно от продукта. Пользователь получает не математическую модель, а понятный результат: что готовить, сколько это стоит, какие продукты купить и почему система выбрала именно такой план.

## Слайд 11. Мобильное приложение

**Текст на слайде**

Mobile client:

- React Native + Expo;
- 27 screens;
- React Navigation + deep links;
- TanStack Query для server state;
- Russian UI, KZT prices, metric units;
- screens: Home, Plans, Recipes, Profile, Onboarding, Analytics, Pantry, Notifications.

**Визуал**

Лучший вариант: 6 телефонных мокапов на одном слайде:

- Plan week;
- Day details;
- Recipe details;
- Nutrition analytics;
- Budget analytics;
- Shopping list или Pantry.

Эти кадры показывают, что приложение закрывает не только onboarding, но и ежедневную работу с готовым планом.

**Что сказать**

Мобильное приложение сделано на React Native через Expo. В коде 27 экранов: авторизация, онбординг, главная, планы, рецепты, профиль, аналитика, кладовая и уведомления. Для серверного состояния используется TanStack Query: данные кэшируются, мутации инвалидируют нужные query keys, а UI обновляется без ручного управления каждым запросом. Также настроены deep links, например открытие конкретного плана или рецепта. Интерфейс локализован под русскоязычного пользователя: цены в тенге, единицы измерения метрические, pluralization вынесена в formatters.

## Слайд 12. Production readiness

**Текст на слайде**

Production-ready элементы:

- Docker Compose для local development;
- GitHub Actions CI/CD;
- Terraform modules;
- AWS ECS Fargate вместо EKS;
- RDS Postgres Multi-AZ;
- ElastiCache Redis;
- S3 + CloudFront;
- WAF, TLS, Secrets Manager;
- Sentry, PostHog, CloudWatch;
- runbooks: deploy, incident, DR, secrets, mobile rollback.

**Что сказать**

Одна из целей проекта - показать не только prototype, но и production preparation. В репозитории есть Docker setup для локального запуска, CI workflows для backend, mobile, ETL и Terraform, а также Terraform-модули для AWS. Мы выбрали ECS Fargate, потому что для трех сервисов - web, worker и beat - Kubernetes был бы избыточным и дорогим. Для безопасности используются Argon2 hashing, JWT rotation, blacklist refresh tokens, throttling, WAF, Secrets Manager и HTTPS. Также подготовлены runbooks, чтобы deployment, incident response, восстановление базы, rotation secrets и mobile rollback были описаны заранее.

## Слайд 13. Ограничения и дальнейшее развитие

**Текст на слайде**

Ограничения:

- production traffic еще не накоплен;
- ML ranker готов инженерно, но real-label NDCG требует feedback data;
- цены не являются real-time retail tracking;
- long-tail ingredients требуют дальнейшего alias enrichment.

Next steps:

- pantry-aware planning;
- leftover-aware planning;
- per-member portion scaling;
- Pareto plans: cheapest / balanced / premium;
- kk-KZ localization;
- online A/B evaluation.

**Что сказать**

Мы явно отделяем реализованные возможности от будущих измерений. Например, слой LightGBM реализован: есть feature extractor, training pipeline, inference и fallback. Но честная оценка NDCG требует реальных пользовательских feedback rows, поэтому это не заявляется как уже доказанное product improvement. Также текущие цены - это статистический и retail snapshot, а не real-time мониторинг магазинов. В следующих версиях логично развивать pantry-aware planning, leftovers, более точные порции по каждому члену семьи, несколько вариантов плана и казахскую локализацию.

## Слайд 14. Итог

**Текст на слайде**

Итог:

- реализован end-to-end meal planning system;
- данные, backend, mobile, ETL и infrastructure связаны в одну систему;
- CP-SAT улучшает качество недельного плана относительно greedy baseline;
- пользователь получает план, объяснения, аналитику и shopping list;
- проект подготовлен к дальнейшему production rollout.

**Что сказать**

В результате мы получили не отдельный алгоритм и не просто UI, а связанную систему. ETL готовит данные, backend хранит доменную модель и генерирует планы, CP-SAT решает оптимизационную задачу, мобильное приложение закрывает пользовательский сценарий, а инфраструктура показывает, как это может быть развернуто и поддерживаться. Главный вывод: классическое constraint programming, learning-to-rank readiness и disciplined production engineering можно объединить в одном прикладном продукте для домохозяйств.

Спасибо за внимание. Готовы ответить на вопросы.

## Как использовать конкретные скриншоты

Для презентации лучше не вставлять все скриншоты подряд отдельными слайдами. Они должны работать как доказательство пользовательского сценария:

- **Слайд 4**: storyboard из 5-6 экранов onboarding -> generation -> plan.
- **Слайд 10**: полноценный demo video на весь экран.
- **Слайд 11**: сетка из 6 экранов с готовым планом, днем, рецептом, нутриентами, бюджетом и покупками.

Сохраненные из временных файлов скриншоты:

- `docs/diploma/presentation-assets/screenshots/01-welcome.png`
- `docs/diploma/presentation-assets/screenshots/02-onboarding-mode.png`
- `docs/diploma/presentation-assets/screenshots/03-onboarding-members.png`
- `docs/diploma/presentation-assets/screenshots/04-onboarding-preferences.png`
- `docs/diploma/presentation-assets/screenshots/05-onboarding-budget.png`
- `docs/diploma/presentation-assets/screenshots/06-onboarding-summary.png`
- `docs/diploma/presentation-assets/screenshots/07-generate-focus.png`
- `docs/diploma/presentation-assets/screenshots/08-generate-strictness.png`

Оставшиеся прикрепленные кадры используй как product proof для второй половины демо: `Plan week`, `Day details`, `Recipe details`, `Nutrition analytics`, `Budget analytics`, `Why this plan`, `Shopping list`, `Pantry`.

## Короткий текст для генератора презентации

Сгенерируй академическую презентацию на русском языке для защиты диплома по проекту Intelligent Meal Planner. Формат 16:9, 14 слайдов, стиль современный, чистый, технический, без перегруженных абзацев. Тема: система интеллектуального планирования питания для домохозяйств Казахстана с Django backend, React Native mobile app, ETL pipeline, OR-Tools CP-SAT planner, LightGBM-ready scoring layer и production-ready AWS infrastructure.

Используй реальные скриншоты приложения как визуальные доказательства: onboarding, выбор режима, параметры члена семьи, предпочтения, бюджет, summary, выбор приоритетов генерации, strictness, план недели, день, рецепт, нутриенты, бюджет, "почему этот план", покупки и кладовая. Слайды с интерфейсом должны выглядеть как аккуратные iPhone mockups, не как случайные raw screenshots.

Структура слайдов:

1. Титульный слайд: Intelligent Meal Planner, авторы Bexultan Yessirkegen и Temirlan Ilyassov, Astana IT University.
2. Проблема: обычные рецепты не учитывают семейный бюджет, аллергии, религиозные запреты, разные цели членов семьи, список покупок и локальные цены Казахстана.
3. Цель и задачи: собрать данные, нормализовать рецепты, реализовать API, CP-SAT planner, мобильный клиент, production-ready инфраструктуру.
4. Пользовательский сценарий: регистрация, онбординг семьи, генерация плана, недельное меню, детали дня, замена блюда, shopping list, analytics, why this plan, pantry, notifications.
5. Архитектура: mobile React Native + Expo, web React + Vite, backend Django REST Framework, Celery + Redis, PostgreSQL, ETL Python, AWS Terraform stack.
6. Данные и ETL: RuRecipes-93k, TheMealDB, Spoonacular, web scraping, JSON-LD extraction, ingredient parsing, USDA nutrition, prices, quality score, MinHash dedup. Указать: 90 605 recipes in ETL silver, 5 605 in export bundle, 5 000 backend demo recipes, 7 030 Arbuz price rows.
7. Backend domain model: User, Group, GroupMember, constraints, Recipe, Ingredient, Price, Nutrition, MealPlan, ShoppingList, PantryItem, Feedback, Notification, Device.
8. Алгоритм планирования: candidate pool, hard constraints, deterministic scoring, ML-ready LightGBM layer, CP-SAT assignment, deterministic fallback, shopping list and explanations.
9. Результаты: CP-SAT reduces calorie gap 2616.72 -> 47.72 kcal and protein gap 317.22 -> 4.71 g on representative scenario; cost +3321.80 KZT within flexible budget.
10. Демо-ролик: полноэкранный видео-слайд. Вставить готовый demo video file на весь слайд, autoplay on click, без текста поверх видео.
11. Mobile app: 27 screens, React Navigation, TanStack Query, Russian UI, KZT, metric units, Home, Plans, Recipes, Profile, Onboarding, Analytics, Pantry, Notifications.
12. Production readiness: Docker Compose, GitHub Actions, Terraform, ECS Fargate, RDS Postgres, ElastiCache Redis, S3, CloudFront, WAF, TLS, Secrets Manager, Sentry, PostHog, CloudWatch, runbooks.
13. Ограничения и развитие: no production feedback yet, LightGBM ranker requires real labels for NDCG, prices are snapshots, future pantry-aware planning, leftovers, per-member portions, Pareto plans, kk-KZ localization.
14. Итог: end-to-end system; data + backend + mobile + ETL + infrastructure; CP-SAT improves planning; user receives plan, explanations, analytics and shopping list.

Для каждого слайда добавь speaker notes на 40-70 секунд. На слайдах оставляй только краткие bullets, не больше 5-6 строк. Используй технические схемы C4 на архитектурных слайдах и один график comparison для CP-SAT results.

## Быстрые ответы на вопросы комиссии

**Почему CP-SAT, а не обычная сортировка рецептов?**  
Потому что план - это глобальная комбинаторная задача. Нужно выбрать блюда сразу на несколько дней и слотов, соблюсти бюджет, повторы, ограничения и нутриенты. Greedy selection может локально выбрать хорошие рецепты, но не гарантирует хороший недельный результат.

**Почему PostgreSQL, а не DynamoDB?**  
Модель сильно relational: семьи, участники, constraints, рецепты, ингредиенты, цены, планы, дни, элементы, shopping lists и feedback. PostgreSQL лучше подходит для связей, транзакций, JSONField и Django ORM.

**Зачем Celery?**  
Генерация плана может занимать несколько секунд, поэтому ее лучше вынести из HTTP request path. API возвращает generation_run_id, worker строит план, а мобильный клиент polling-ом получает статус.

**Что реально делает ML?**  
Слой LightGBM реализован как learning-to-rank readiness: feature extraction, training, inference и fallback. Но честные метрики NDCG требуют реального feedback после запуска. Поэтому текущий надежный путь - deterministic scorer + CP-SAT, а ML слой является подготовленным расширением.

**Как доказывается качество данных?**  
Через воспроизводимый ETL: source provenance, ingredient normalization, quality score из восьми компонентов, MinHash deduplication, USDA nutrition mapping и price coverage.

**Готово ли к production?**  
Инженерно подготовлено: Docker, CI/CD, Terraform, AWS modules, security settings, observability and runbooks. Фактический production rollout зависит от аккаунтов AWS, Apple Developer Program и Google Play Console.
