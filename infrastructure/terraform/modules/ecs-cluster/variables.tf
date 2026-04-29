variable "name" { type = string }
variable "vpc_id" { type = string }
variable "alb_security_group_ids" {
  type    = list(string)
  default = []
}
variable "secret_arns" {
  type    = list(string)
  default = []
}
variable "s3_bucket_names" {
  type    = list(string)
  default = []
}
variable "tags" {
  type    = map(string)
  default = {}
}
