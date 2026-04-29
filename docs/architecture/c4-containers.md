# C4 — Container View (Level 2)

```mermaid
flowchart TB
    subgraph clients [Clients]
        Mobile["Mobile App<br/>(React Native + Expo)"]
        Web["Web Landing<br/>(React + Vite)"]
    end

    subgraph awsedge [AWS Edge]
        Route53["Route 53"]
        CloudFront["CloudFront CDN"]
        WAF["AWS WAF"]
        ALB["Application Load Balancer<br/>+ ACM TLS"]
    end

    subgraph compute [ECS Fargate]
        Web8000["Django web<br/>(gunicorn 8000)"]
        Worker["Celery worker"]
        Beat["Celery beat"]
    end

    subgraph data [Data]
        RDS["RDS Postgres 16<br/>Multi-AZ"]
        Redis["ElastiCache Redis"]
        S3Media["S3 (media)"]
        S3Static["S3 (static)"]
        Secrets["Secrets Manager"]
    end

    subgraph etl [ETL]
        ETLPipeline["etl-meals pipeline<br/>(local / batch jobs)"]
        Ollama["Local Ollama<br/>(LLM normalization)"]
    end

    subgraph external [External]
        ExpoPush["Expo Push Service"]
        SentryEx["Sentry"]
        PostHogEx["PostHog"]
        USDAEx["USDA"]
        Spoonacular["Spoonacular"]
        HFEx["Hugging Face"]
    end

    Mobile --> Route53
    Web --> Route53
    Route53 --> CloudFront
    CloudFront --> S3Static
    Route53 --> ALB
    ALB --> WAF
    WAF --> Web8000

    Web8000 --> RDS
    Web8000 --> Redis
    Web8000 --> Secrets
    Web8000 --> S3Media
    Web8000 --> ExpoPush
    Web8000 --> SentryEx

    Worker --> RDS
    Worker --> Redis
    Worker --> ExpoPush
    Beat --> RDS

    ETLPipeline --> RDS
    ETLPipeline --> S3Media
    ETLPipeline --> Ollama
    ETLPipeline --> USDAEx
    ETLPipeline --> Spoonacular
    ETLPipeline --> HFEx

    Mobile --> ExpoPush
    Mobile --> SentryEx
    Mobile --> PostHogEx
```

## Notable containers

- **Mobile App** (`mobile/`) — primary client. React Native via Expo, ships
  through App Store and Play Market with EAS Build.
- **Django web** — REST + admin behind ALB. Async-friendly: long jobs handed
  to Celery via Redis.
- **Celery worker** — handles plan generation, push fan-out, recipe nutrition
  rebuild, ranker retraining.
- **Celery beat** — schedules periodic tasks (pantry expiration, ranker retrain,
  cost recalculation).
- **RDS Postgres 16** — multi-AZ, encrypted, daily backups, PITR.
- **ElastiCache Redis** — cache + Celery broker (different DBs).
- **S3 buckets** — recipe media (CloudFront-fronted) and Django static.
- **etl-meals** — separate Python project producing the import bundle and the
  ML training data; runs on demand or via scheduled Fargate one-off tasks.
