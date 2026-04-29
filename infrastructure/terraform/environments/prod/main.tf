module "vpc" {
  source = "../../modules/vpc"

  name               = var.name
  region             = var.region
  cidr_block         = "10.0.0.0/16"
  az_count           = 2
  single_nat_gateway = false
  enable_s3_endpoint = true

  tags = local.common_tags
}

module "ecr" {
  source = "../../modules/ecr"

  repository_names = ["meal-planner-backend", "meal-planner-worker"]
  tags             = local.common_tags
}

module "github_oidc" {
  source = "../../modules/iam-github-oidc"

  name                 = var.name
  create_oidc_provider = true
  allowed_repositories = var.github_repositories
  task_role_arns       = ["*"]
  tfstate_bucket       = var.tfstate_bucket
  tfstate_lock_table   = var.tfstate_lock_table

  tags = local.common_tags
}

module "alb" {
  source = "../../modules/alb"

  name                = var.name
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  certificate_arn     = module.api_certificate.certificate_arn
  health_path         = "/api/v1/health/live"
  deletion_protection = true

  tags = local.common_tags
}

module "api_certificate" {
  source = "../../modules/acm-certificate"

  domain_name               = local.api_fqdn
  subject_alternative_names = []
  hosted_zone_id            = var.hosted_zone_id

  tags = local.common_tags
}

module "media_certificate" {
  source = "../../modules/acm-certificate"
  providers = {
    aws = aws.us_east_1
  }

  domain_name               = local.media_fqdn
  subject_alternative_names = []
  hosted_zone_id            = var.hosted_zone_id

  tags = local.common_tags
}

module "rds" {
  source = "../../modules/rds-postgres"

  name                       = var.name
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.ecs_cluster.tasks_security_group_id]
  multi_az                   = true
  deletion_protection        = true
  backup_retention_days      = 30

  tags = local.common_tags
}

module "redis" {
  source = "../../modules/elasticache-redis"

  name                       = var.name
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.private_subnet_ids
  allowed_security_group_ids = [module.ecs_cluster.tasks_security_group_id]
  multi_az                   = true

  tags = local.common_tags
}

module "media_bucket" {
  source = "../../modules/cloudfront-s3"

  bucket_name         = "${var.name}-media"
  create_distribution = true
  aliases             = [local.media_fqdn]
  certificate_arn     = module.media_certificate.certificate_arn
  enable_versioning   = true
  enable_lifecycle    = true

  tags = local.common_tags
}

module "secrets" {
  source = "../../modules/secrets-manager"

  name_prefix = "meal-planner/prod"

  secrets = {
    django_secret_key = {
      description = "Django SECRET_KEY"
      value       = var.django_secret_key
    }
    db_password = {
      description = "Postgres master password"
      value       = module.rds.master_password
    }
    redis_auth_token = {
      description = "Redis AUTH token"
      value       = module.redis.auth_token
    }
    sentry_dsn = {
      description = "Sentry project DSN"
      value       = var.sentry_dsn
    }
    expo_access_token = {
      description = "Expo push API token"
      value       = var.expo_access_token
    }
  }

  tags = local.common_tags
}

module "ecs_cluster" {
  source = "../../modules/ecs-cluster"

  name                   = var.name
  vpc_id                 = module.vpc.vpc_id
  alb_security_group_ids = [module.alb.alb_security_group_id]
  secret_arns            = values(module.secrets.secret_arns)
  s3_bucket_names        = [module.media_bucket.bucket_name]

  tags = local.common_tags
}

locals {
  backend_image = "${module.ecr.repository_urls["meal-planner-backend"]}:${var.backend_image_tag}"

  base_environment = {
    DJANGO_SETTINGS_MODULE   = "config.settings.prod"
    DJANGO_ENV               = "prod"
    DJANGO_DEBUG             = "0"
    DJANGO_ALLOWED_HOSTS     = local.api_fqdn
    CSRF_TRUSTED_ORIGINS     = "https://${local.api_fqdn},https://${var.domain_name}"
    CORS_ALLOWED_ORIGINS     = "https://${var.domain_name}"
    POSTGRES_HOST            = module.rds.endpoint
    POSTGRES_PORT            = tostring(module.rds.port)
    POSTGRES_DB              = module.rds.database_name
    POSTGRES_USER            = module.rds.master_username
    POSTGRES_SSLMODE         = "require"
    REDIS_HOST               = module.redis.primary_endpoint_address
    REDIS_PORT               = tostring(module.redis.port)
    REDIS_USE_TLS            = "1"
    AWS_S3_REGION_NAME       = var.region
    AWS_STORAGE_BUCKET_NAME  = module.media_bucket.bucket_name
    AWS_S3_CUSTOM_DOMAIN     = local.media_fqdn
    MIN_APP_VERSION_IOS      = var.min_app_version_ios
    MIN_APP_VERSION_ANDROID  = var.min_app_version_android
    GIT_SHA                  = var.backend_image_tag
    LOG_LEVEL                = "INFO"
    APP_LOG_LEVEL            = "INFO"
    GUNICORN_WORKERS         = "3"
    GUNICORN_THREADS         = "2"
    GUNICORN_TIMEOUT         = "60"
    RUN_COLLECTSTATIC_ON_BOOT = "1"
    RUN_MIGRATIONS_ON_BOOT   = "0"
  }

  base_secrets = {
    DJANGO_SECRET_KEY  = module.secrets.secret_arns["django_secret_key"]
    POSTGRES_PASSWORD  = module.secrets.secret_arns["db_password"]
    REDIS_PASSWORD     = module.secrets.secret_arns["redis_auth_token"]
    SENTRY_DSN         = module.secrets.secret_arns["sentry_dsn"]
    EXPO_ACCESS_TOKEN  = module.secrets.secret_arns["expo_access_token"]
  }
}

module "web_service" {
  source = "../../modules/ecs-service"

  service_name        = "web"
  cluster_name        = module.ecs_cluster.cluster_name
  cluster_id          = module.ecs_cluster.cluster_id
  region              = var.region
  execution_role_arn  = module.ecs_cluster.execution_role_arn
  task_role_arn       = module.ecs_cluster.task_role_arn
  subnet_ids          = module.vpc.private_subnet_ids
  security_group_ids  = [module.ecs_cluster.tasks_security_group_id]
  image               = local.backend_image
  command             = ["web"]
  cpu                 = 1024
  memory              = 2048
  port_mappings       = [{ containerPort = 8000, hostPort = 8000, protocol = "tcp" }]
  environment_variables        = local.base_environment
  secret_environment_variables = local.base_secrets
  health_check = {
    command     = ["CMD-SHELL", "curl -f http://127.0.0.1:8000/api/v1/health/live || exit 1"]
    interval    = 30
    timeout     = 5
    retries     = 3
    startPeriod = 30
  }
  log_retention_days  = 30
  desired_count       = 2
  attach_to_alb       = true
  target_group_arn    = module.alb.web_target_group_arn
  enable_autoscaling  = true
  min_capacity        = 2
  max_capacity        = 8

  tags = local.common_tags
}

module "worker_service" {
  source = "../../modules/ecs-service"

  service_name        = "worker"
  cluster_name        = module.ecs_cluster.cluster_name
  cluster_id          = module.ecs_cluster.cluster_id
  region              = var.region
  execution_role_arn  = module.ecs_cluster.execution_role_arn
  task_role_arn       = module.ecs_cluster.task_role_arn
  subnet_ids          = module.vpc.private_subnet_ids
  security_group_ids  = [module.ecs_cluster.tasks_security_group_id]
  image               = local.backend_image
  command             = ["worker"]
  cpu                 = 512
  memory              = 1024
  environment_variables        = local.base_environment
  secret_environment_variables = local.base_secrets
  log_retention_days  = 30
  desired_count       = 1
  attach_to_alb       = false
  enable_autoscaling  = true
  min_capacity        = 1
  max_capacity        = 4

  tags = local.common_tags
}

module "beat_service" {
  source = "../../modules/ecs-service"

  service_name        = "beat"
  cluster_name        = module.ecs_cluster.cluster_name
  cluster_id          = module.ecs_cluster.cluster_id
  region              = var.region
  execution_role_arn  = module.ecs_cluster.execution_role_arn
  task_role_arn       = module.ecs_cluster.task_role_arn
  subnet_ids          = module.vpc.private_subnet_ids
  security_group_ids  = [module.ecs_cluster.tasks_security_group_id]
  image               = local.backend_image
  command             = ["beat"]
  cpu                 = 256
  memory              = 512
  environment_variables        = local.base_environment
  secret_environment_variables = local.base_secrets
  log_retention_days  = 30
  desired_count       = 1
  attach_to_alb       = false

  tags = local.common_tags
}

module "migrate_task" {
  source = "../../modules/ecs-service"

  service_name        = "migrate"
  cluster_name        = module.ecs_cluster.cluster_name
  cluster_id          = module.ecs_cluster.cluster_id
  region              = var.region
  execution_role_arn  = module.ecs_cluster.execution_role_arn
  task_role_arn       = module.ecs_cluster.task_role_arn
  subnet_ids          = module.vpc.private_subnet_ids
  security_group_ids  = [module.ecs_cluster.tasks_security_group_id]
  image               = local.backend_image
  command             = ["migrate"]
  cpu                 = 512
  memory              = 1024
  environment_variables        = local.base_environment
  secret_environment_variables = local.base_secrets
  log_retention_days  = 30
  create_service      = false

  tags = local.common_tags
}

module "waf" {
  source = "../../modules/waf"

  name                = var.name
  alb_arn             = module.alb.alb_arn
  rate_limit_per_5min = 2000

  tags = local.common_tags
}

module "alarms" {
  source = "../../modules/cloudwatch-alarms"

  name                  = var.name
  alert_email_endpoints = var.alert_email_endpoints
  alb_arn_suffix        = element(split(":loadbalancer/", module.alb.alb_arn), 1)
  rds_instance_id       = var.name
  ecs_cluster_name      = module.ecs_cluster.cluster_name
  ecs_service_name      = module.web_service.service_name

  tags = local.common_tags
}

module "api_dns" {
  source = "../../modules/route53"

  hosted_zone_id       = var.hosted_zone_id
  record_name          = local.api_fqdn
  alias_target_dns     = module.alb.alb_dns_name
  alias_target_zone_id = module.alb.alb_zone_id
}

module "media_dns" {
  source = "../../modules/route53"

  hosted_zone_id       = var.hosted_zone_id
  record_name          = local.media_fqdn
  alias_target_dns     = module.media_bucket.distribution_domain_name
  alias_target_zone_id = module.media_bucket.distribution_zone_id
}
