output "api_url" {
  value = "https://${local.api_fqdn}"
}

output "media_url" {
  value = "https://${local.media_fqdn}"
}

output "ecs_cluster_name" {
  value = module.ecs_cluster.cluster_name
}

output "ecs_web_service_name" {
  value = module.web_service.service_name
}

output "ecs_worker_service_name" {
  value = module.worker_service.service_name
}

output "ecs_beat_service_name" {
  value = module.beat_service.service_name
}

output "migrate_task_definition_arn" {
  value = module.migrate_task.task_definition_arn
}

output "private_subnet_ids" {
  value = module.vpc.private_subnet_ids
}

output "tasks_security_group_id" {
  value = module.ecs_cluster.tasks_security_group_id
}

output "aws_deploy_role_arn" {
  value = module.github_oidc.deploy_role_arn
}

output "ecr_backend_repo_url" {
  value = module.ecr.repository_urls["meal-planner-backend"]
}

output "rds_endpoint" {
  value     = module.rds.endpoint
  sensitive = true
}

output "redis_endpoint" {
  value     = module.redis.primary_endpoint_address
  sensitive = true
}
