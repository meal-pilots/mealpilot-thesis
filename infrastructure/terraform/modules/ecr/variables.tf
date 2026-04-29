variable "repository_names" {
  description = "List of ECR repos to create."
  type        = list(string)
}

variable "tags" {
  type    = map(string)
  default = {}
}
