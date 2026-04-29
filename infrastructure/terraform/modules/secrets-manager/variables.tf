variable "name_prefix" {
  description = "Path prefix for all secrets, e.g. 'meal-planner/prod'."
  type        = string
}

variable "secrets" {
  description = "Map of secret_name => { description, value }"
  type = map(object({
    description = string
    value       = string
  }))
}

variable "recovery_window_in_days" {
  type    = number
  default = 7
}

variable "kms_key_id" {
  type    = string
  default = null
}

variable "tags" {
  type    = map(string)
  default = {}
}
