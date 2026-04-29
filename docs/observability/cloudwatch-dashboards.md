# CloudWatch Dashboards

Dashboards are managed via Terraform when stable; for ad-hoc exploration use
the AWS console. Below are the four canonical dashboards every reviewer
should be able to find at a glance.

## API Health

| Widget | Source | Notes |
|---|---|---|
| Requests/sec | `AWS/ApplicationELB:RequestCount` (sum 1min) | overall traffic |
| 4xx rate | `HTTPCode_Target_4XX_Count / RequestCount` | client errors |
| 5xx rate | `HTTPCode_Target_5XX_Count / RequestCount` | alert if > 1% |
| p50 / p95 / p99 latency | `TargetResponseTime` extended stats | SLO 2s p95 |
| Healthy hosts | `HealthyHostCount` | should equal desired_count |

## Planning Engine

| Widget | Source | Notes |
|---|---|---|
| Plans generated / hour | custom metric `meal_planner.plans_generated` | publish from `generate_meal_plan_for_group` |
| CP-SAT solve time | custom metric `meal_planner.cp_sat_solve_ms` | publish from `_build_cp_sat_selection` |
| % CP-SAT vs deterministic | custom metric ratio | drift indicator |
| ML scoring usage | custom metric `meal_planner.ml_score_invocations` | A/B exposure |
| Failed runs (DLQ) | `AWS/SQS:ApproximateNumberOfMessagesVisible` if you wire SQS DLQ |

## Infrastructure

| Widget | Source |
|---|---|
| ECS CPU / memory utilization | `AWS/ECS:CPUUtilization`, `MemoryUtilization` |
| ECS RunningTaskCount | per-service |
| RDS CPU | `AWS/RDS:CPUUtilization` |
| RDS connections | `DatabaseConnections` |
| RDS free storage | `FreeStorageSpace` |
| RDS read/write latency | `ReadLatency`, `WriteLatency` |
| Redis cache hit rate | `CacheHitRate` |
| Redis evictions | `Evictions` |

## Business

Sourced from PostHog primarily; for offline-friendly access, the
backend publishes a daily aggregate to CloudWatch:

| Widget | Source |
|---|---|
| DAU | PostHog daily active users |
| Sign-ups today | custom CW metric |
| Active households | custom CW metric (group has ≥1 generated plan in last 30 days) |
| Median plan cost | custom CW metric |
| % users with completed onboarding | PostHog funnel |
