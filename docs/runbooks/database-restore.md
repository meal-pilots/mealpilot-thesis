# Runbook: Database restore from snapshot

Recovery target: **RPO 1 hour, RTO 4 hours**.

## Scenario A — restore latest automated backup to a new instance

```bash
SOURCE_DB=meal-planner-prod
TARGET_DB=meal-planner-prod-restore-$(date +%Y%m%d%H%M)

aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier "$SOURCE_DB" \
    --target-db-instance-identifier "$TARGET_DB" \
    --use-latest-restorable-time \
    --db-subnet-group-name meal-planner-prod-pg \
    --vpc-security-group-ids "$(terraform output -raw rds_security_group_id)" \
    --multi-az
```

Wait until `aws rds describe-db-instances` reports `available`.

## Scenario B — point-in-time restore

```bash
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier "$SOURCE_DB" \
    --target-db-instance-identifier "$TARGET_DB" \
    --restore-time 2026-04-27T14:30:00Z \
    --db-subnet-group-name meal-planner-prod-pg \
    --vpc-security-group-ids "$(terraform output -raw rds_security_group_id)"
```

## Switching ECS to the restored instance

1. Update Secrets Manager `meal-planner/prod/db_password` if the password
   changed (or use the same password — RDS preserves master password on PITR).
2. Update Terraform `rds_postgres` module to reference the new identifier.
3. `terraform apply` — this also rolls the ECS task definition with new env vars.
4. ECS rolling update.
5. Verify `/api/v1/health/ready` returns `database: ok`.

## After recovery

- Take a manual snapshot for forensics.
- File a post-mortem with timeline.
- Run a 1-hour soak test with k6 to confirm latency hasn't regressed.

## DR drill cadence

Run a real restore-to-isolated-VPC drill **once a quarter**. Document
elapsed times in `docs/dr-drill-log.md`.
