# ADR 0002: ECS Fargate over EKS / EC2

- **Status**: Accepted
- **Date**: 2026-04-27

## Context

We need to run a Django web service, a Celery worker, and a Celery beat
scheduler in production. We expect 2-10 web tasks at peak, 1-4 worker
tasks, and 1 beat task. There is no team dedicated to ops.

## Decision

Use **AWS ECS Fargate**.

## Alternatives considered

- **EKS / Kubernetes** — far more flexibility, but high baseline cost
  (~$70/mo for the control plane alone) and steep operational complexity.
  Diminishing returns for a 3-service workload.
- **EC2 with docker-compose** — cheapest, but no auto-scaling, single
  point of failure, manual TLS, manual deployments.
- **AWS App Runner** — closer to Heroku-style; easier than ECS but
  inflexible for Celery workers, and no easy private networking to RDS
  without an NLB.

## Rationale

- Native AWS integrations (ALB, IAM, Secrets Manager, CloudWatch).
- No control-plane fee.
- Per-second billing for both vCPU and memory.
- ECS Service auto-scaling targets ALB request count or CPU.
- "One-off" `aws ecs run-task` command perfectly fits our migration step.
- Plays well with Terraform.

## Consequences

- We accept that scheduling rules (DaemonSet-style "one task per node") are
  unavailable. We don't need them.
- If we ever need GPU-backed inference, we can attach an EKS cluster later
  without changing the rest of the stack — Fargate is not load-bearing for
  the diploma defense.
