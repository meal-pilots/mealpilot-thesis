variable "name" { type = string }
variable "alert_email_endpoints" {
  type    = list(string)
  default = []
}
variable "alb_arn_suffix" {
  type    = string
  default = ""
}
variable "alb_5xx_threshold" {
  type    = number
  default = 25
}
variable "p95_latency_seconds" {
  type    = number
  default = 2
}
variable "rds_instance_id" {
  type    = string
  default = ""
}
variable "rds_free_storage_threshold_bytes" {
  type    = number
  default = 10737418240
}
variable "ecs_cluster_name" {
  type    = string
  default = ""
}
variable "ecs_service_name" {
  type    = string
  default = ""
}
variable "tags" {
  type    = map(string)
  default = {}
}
