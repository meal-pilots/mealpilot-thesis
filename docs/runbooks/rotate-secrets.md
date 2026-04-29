# Runbook: Rotate secrets

## DJANGO_SECRET_KEY

```bash
NEW_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(48))")
aws secretsmanager update-secret \
    --secret-id meal-planner/prod/django_secret_key \
    --secret-string "$NEW_KEY"
aws ecs update-service --cluster meal-planner-prod-cluster --service web --force-new-deployment
aws ecs update-service --cluster meal-planner-prod-cluster --service worker --force-new-deployment
```

Effect: every active session keeps working (we don't sign anything with this
key directly), but new password resets and CSRF tokens use the new key.

## Postgres master password

Use AWS-managed rotation. Configure once via Terraform:

```hcl
resource "aws_secretsmanager_secret_rotation" "db" {
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = aws_serverlessapplicationrepository_cloudformation_stack.rds_rotation.outputs.RotationLambdaARN
  rotation_rules {
    automatically_after_days = 90
  }
}
```

Manual rotation:

```bash
aws secretsmanager rotate-secret \
    --secret-id meal-planner/prod/db_password \
    --rotation-lambda-arn arn:aws:lambda:eu-central-1:...:rds-rotation
```

## Redis AUTH token

Redis does not natively support online rotation when the auth token changes.
For a planned rotation:

1. Apply Terraform with the new auth token to a new ElastiCache cluster.
2. Cut traffic to the new endpoint via env var swap (Secrets Manager + ECS rolling update).
3. After 24 hours of stability, decommission the old cluster.

Document the new token in Secrets Manager with version stamping.

## Sentry DSN

Just create a new key in Sentry → Project Settings → Client Keys, update
the Secrets Manager value, and force a new ECS deployment.

## Expo access token

Rotate from Expo dashboard → Access tokens → Revoke + create. Update
`meal-planner/prod/expo_access_token` and roll worker service.
