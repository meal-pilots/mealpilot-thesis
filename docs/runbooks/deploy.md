# Runbook: Deploy backend

## Normal flow

1. PR merged into `main` triggers `.github/workflows/backend-deploy.yml`.
2. Workflow assumes `AWS_DEPLOY_ROLE_ARN` via OIDC.
3. Builds Docker image, tags with short Git SHA, pushes to ECR.
4. Runs `migrate` as a one-off Fargate task.
5. Updates `web` and `worker` ECS services with `--force-new-deployment`.
6. Polls `/api/v1/health/ready` until 200 OK is observed (10 retries × 15s).

## Manual deploy (CI broken)

```bash
GIT_SHA=$(git rev-parse --short HEAD)
ECR_REPO=$(cd infrastructure/terraform/environments/prod && terraform output -raw ecr_backend_repo_url)

docker build -t "$ECR_REPO:$GIT_SHA" -t "$ECR_REPO:latest" backend/
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin "$(echo $ECR_REPO | cut -d/ -f1)"
docker push "$ECR_REPO:$GIT_SHA"
docker push "$ECR_REPO:latest"

CLUSTER=$(terraform -chdir=infrastructure/terraform/environments/prod output -raw ecs_cluster_name)
WEB_SERVICE=$(terraform -chdir=infrastructure/terraform/environments/prod output -raw ecs_web_service_name)
WORKER_SERVICE=$(terraform -chdir=infrastructure/terraform/environments/prod output -raw ecs_worker_service_name)
MIGRATE_TASK_DEF=$(terraform -chdir=infrastructure/terraform/environments/prod output -raw migrate_task_definition_arn)
SUBNETS=$(terraform -chdir=infrastructure/terraform/environments/prod output -json private_subnet_ids | jq -r '. | join(",")')
TASKS_SG=$(terraform -chdir=infrastructure/terraform/environments/prod output -raw tasks_security_group_id)

aws ecs run-task --cluster "$CLUSTER" --task-definition "$MIGRATE_TASK_DEF" \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$TASKS_SG],assignPublicIp=DISABLED}"

aws ecs update-service --cluster "$CLUSTER" --service "$WEB_SERVICE" --force-new-deployment
aws ecs update-service --cluster "$CLUSTER" --service "$WORKER_SERVICE" --force-new-deployment
```

## Rollback

If a deploy is bad:

```bash
PREVIOUS_TAG=<short-sha-before-bad-deploy>
WEB_TASK_DEF=$(aws ecs describe-services --cluster "$CLUSTER" --services "$WEB_SERVICE" --query 'services[0].taskDefinition' --output text)
NEW_TASK_DEF=$(aws ecs register-task-definition --family ... --container-definitions "...:$PREVIOUS_TAG..." --query 'taskDefinition.taskDefinitionArn' --output text)
aws ecs update-service --cluster "$CLUSTER" --service "$WEB_SERVICE" --task-definition "$NEW_TASK_DEF" --force-new-deployment
```

In practice it's faster to revert the merge commit and let CI deploy a green build.

## Smoke checks after deploy

```bash
curl -fsS https://api.mealplanner.kz/api/v1/health/live
curl -fsS https://api.mealplanner.kz/api/v1/health/ready | jq
```

`ready` must return `{"status":"ready", "checks":{"database":"ok","cache":"ok"}}`.
