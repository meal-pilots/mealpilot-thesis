# Runbook: Incident response

## Severity definitions

- **SEV-1** — full outage: all users see 5xx, can't sign in.
- **SEV-2** — major degradation: feature down (planning, shopping list)
  for >5% of users for >10 minutes.
- **SEV-3** — minor: single page slow, one push channel down.

## Triage (first 5 minutes)

1. Acknowledge the alert in Slack/SNS.
2. Open the "API Health" CloudWatch dashboard.
3. Check ECS service health: `aws ecs describe-services --cluster <name> --services web worker beat`.
4. Check Sentry for new error spike — group by `release` and look at `request_id` correlation.
5. Decide: roll back, scale up, or hotfix.

## Common causes and quick fixes

### 5xx spike right after deploy
- Roll back to previous task definition (see `deploy.md`).
- File post-mortem ticket.

### RDS CPU > 80%
- Check Performance Insights: which query is hottest?
- If a missing index, ship a migration adding the index (`CREATE INDEX CONCURRENTLY`).
- As a band-aid, increase RDS instance class via Terraform plan/apply.

### Redis evictions
- Check `EvictedKeys` metric. Increase `cache.t4g.micro` to `cache.t4g.small`.
- Inspect cache key namespaces to find runaway writers.

### Celery DLQ growing
- `aws ecs describe-services` to see worker health.
- `kubectl-style` shell: use SSM Session Manager into a worker, run `celery inspect active`.
- If a task is stuck on a poisoned message — purge the dead-letter queue and redeploy with the fix.

### TLS certificate expired
- ACM auto-renews 60 days before expiry. If it didn't:
  - `terraform apply` against the certificate module to re-issue.
  - Manually validate via DNS records in Route 53.

## Communicating

- SEV-1 / SEV-2: post status update in #incidents channel every 30 minutes
  with current ETA and what we're trying.
- After resolution: write a short post-mortem (cause, impact, fix, follow-ups)
  within 48 hours.

## Escalation contacts

- Primary on-call: REPLACE_WITH_PHONE
- AWS Support (Business plan): REPLACE_WITH_CASE_URL
- Domain registrar: REPLACE
