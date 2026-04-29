variable "region" {
  type    = string
  default = "eu-central-1"
}

variable "name" {
  type    = string
  default = "meal-planner-prod"
}

variable "domain_name" {
  type        = string
  description = "Apex domain (e.g. mealplanner.kz)."
}

variable "api_subdomain" {
  type    = string
  default = "api"
}

variable "media_subdomain" {
  type    = string
  default = "media"
}

variable "hosted_zone_id" {
  type        = string
  description = "Existing Route 53 hosted zone id for the domain."
}

variable "github_repositories" {
  type        = list(string)
  description = "Repos allowed to assume the deploy role, e.g. [\"yourorg/diploma-work\"]."
}

variable "alert_email_endpoints" {
  type    = list(string)
  default = []
}

variable "tfstate_bucket" {
  type    = string
  default = "meal-planner-tfstate"
}

variable "tfstate_lock_table" {
  type    = string
  default = "meal-planner-tfstate-lock"
}

variable "backend_image_tag" {
  type    = string
  default = "latest"
}

variable "min_app_version_ios" {
  type    = string
  default = "0.0.0"
}

variable "min_app_version_android" {
  type    = string
  default = "0.0.0"
}

variable "django_secret_key" {
  type      = string
  sensitive = true
}

variable "sentry_dsn" {
  type    = string
  default = ""
}

variable "expo_access_token" {
  type      = string
  default   = ""
  sensitive = true
}

locals {
  common_tags = {
    Project     = "meal-planner"
    Environment = "prod"
    ManagedBy   = "terraform"
  }
  api_fqdn   = "${var.api_subdomain}.${var.domain_name}"
  media_fqdn = "${var.media_subdomain}.${var.domain_name}"
}
