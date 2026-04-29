variable "name" { type = string }
variable "alb_arn" {
  type    = string
  default = ""
}
variable "rate_limit_per_5min" {
  type    = number
  default = 2000
}
variable "tags" {
  type    = map(string)
  default = {}
}
