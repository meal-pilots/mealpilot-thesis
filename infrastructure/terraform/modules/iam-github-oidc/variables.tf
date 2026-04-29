variable "name" {
  description = "Logical name prefix."
  type        = string
}

variable "create_oidc_provider" {
  description = "Whether to create the OIDC provider (only one per account)."
  type        = bool
  default     = true
}

variable "allowed_repositories" {
  description = "GitHub repos allowed to assume the role, e.g. [\"owner/repo\"]."
  type        = list(string)
}

variable "task_role_arns" {
  description = "ECS task/exec roles that the deploy role can pass."
  type        = list(string)
  default     = ["*"]
}

variable "tfstate_bucket" {
  description = "S3 bucket holding terraform state."
  type        = string
}

variable "tfstate_lock_table" {
  description = "DynamoDB table for state locking."
  type        = string
}

variable "tags" {
  type    = map(string)
  default = {}
}
