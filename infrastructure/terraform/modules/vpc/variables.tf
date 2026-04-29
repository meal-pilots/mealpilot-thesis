variable "name" {
  description = "Logical name prefix for resources."
  type        = string
}

variable "region" {
  description = "AWS region this VPC is deployed to."
  type        = string
}

variable "cidr_block" {
  description = "Top-level CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "How many AZs to spread across."
  type        = number
  default     = 2
}

variable "single_nat_gateway" {
  description = "Use one NAT GW for cost savings (dev/staging)."
  type        = bool
  default     = false
}

variable "enable_s3_endpoint" {
  description = "Provision a gateway VPC endpoint for S3 to keep data plane on-AWS."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags for all created resources."
  type        = map(string)
  default     = {}
}
