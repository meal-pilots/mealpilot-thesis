# Infrastructure

Terraform-defined AWS infrastructure for the Intelligent Meal Planner backend.

## Layout

```
infrastructure/terraform/
  modules/                     # reusable building blocks
    vpc/
    iam-github-oidc/
    ecr/
    ecs-cluster/
    ecs-service/
    rds-postgres/
    elasticache-redis/
    alb/
    acm-certificate/
    cloudfront-s3/
    route53/
    waf/
    secrets-manager/
    cloudwatch-alarms/
  environments/
    dev/                       # cheap, single-AZ, public testing
    staging/                   # multi-AZ, prod-like sizing
    prod/                      # multi-AZ, full security stack
```

## Prerequisites

1. AWS account with admin credentials available locally for the bootstrap step.
2. Terraform 1.9+ installed (`brew install terraform`).
3. A pre-existing **S3 bucket + DynamoDB table** for remote state, created once
   manually before the first `terraform init`. Suggested names:
   - `meal-planner-tfstate` (versioning enabled, KMS encrypted)
   - `meal-planner-tfstate-lock` (DynamoDB, partition key `LockID`)
4. A registered domain in Route 53 (e.g. `mealplanner.kz`) and a hosted zone.

## Bootstrap an environment

```bash
cd infrastructure/terraform/environments/prod
terraform init
terraform plan -out tfplan
terraform apply tfplan
```

The first apply provisions VPC, ECR, RDS, Redis, ALB, ECS cluster and supporting
resources. Container images are pushed by the backend deploy workflow.

## Outputs you'll need

After the first apply note these outputs (used by GitHub Actions):

- `ecs_cluster_name`
- `ecs_web_service_name` / `ecs_worker_service_name`
- `migrate_task_definition_arn`
- `private_subnet_ids` / `migrate_security_group_id`
- `api_url`
- `aws_deploy_role_arn` (also stored as a GitHub secret `AWS_DEPLOY_ROLE_ARN`)

## State, secrets, and what NOT to commit

- Never commit `terraform.tfvars` containing secrets. Use `*.tfvars.example`
  templates and Secrets Manager for runtime values.
- The state file lives in S3, encrypted with KMS. Locking is via DynamoDB.
- IAM users/keys are NOT used for deployment. GitHub Actions assumes the
  `aws_deploy_role` via OIDC.
