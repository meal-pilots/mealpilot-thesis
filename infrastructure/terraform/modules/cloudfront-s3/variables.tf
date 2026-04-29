variable "bucket_name" { type = string }
variable "create_distribution" {
  type    = bool
  default = true
}
variable "aliases" {
  type    = list(string)
  default = []
}
variable "certificate_arn" {
  type    = string
  default = ""
}
variable "price_class" {
  type    = string
  default = "PriceClass_100"
}
variable "enable_versioning" {
  type    = bool
  default = true
}
variable "enable_lifecycle" {
  type    = bool
  default = true
}
variable "tags" {
  type    = map(string)
  default = {}
}
