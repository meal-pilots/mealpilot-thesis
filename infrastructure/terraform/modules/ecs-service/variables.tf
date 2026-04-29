variable "service_name" { type = string }
variable "cluster_name" { type = string }
variable "cluster_id" { type = string }
variable "region" { type = string }
variable "execution_role_arn" { type = string }
variable "task_role_arn" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "image" { type = string }
variable "container_name" {
  type    = string
  default = "web"
}
variable "container_port" {
  type    = number
  default = 8000
}
variable "command" {
  type    = list(string)
  default = []
}
variable "cpu" {
  type    = number
  default = 512
}
variable "memory" {
  type    = number
  default = 1024
}
variable "cpu_architecture" {
  type    = string
  default = "X86_64"
}
variable "port_mappings" {
  type    = any
  default = []
}
variable "environment_variables" {
  type    = map(string)
  default = {}
}
variable "secret_environment_variables" {
  type    = map(string)
  default = {}
}
variable "health_check" {
  type    = any
  default = null
}
variable "log_retention_days" {
  type    = number
  default = 30
}
variable "desired_count" {
  type    = number
  default = 2
}
variable "create_service" {
  type    = bool
  default = true
}
variable "attach_to_alb" {
  type    = bool
  default = false
}
variable "target_group_arn" {
  type    = string
  default = null
}
variable "health_check_grace_period_seconds" {
  type    = number
  default = 60
}
variable "enable_autoscaling" {
  type    = bool
  default = false
}
variable "min_capacity" {
  type    = number
  default = 2
}
variable "max_capacity" {
  type    = number
  default = 10
}
variable "tags" {
  type    = map(string)
  default = {}
}
