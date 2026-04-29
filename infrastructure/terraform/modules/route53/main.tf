terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = ">= 5.60" }
  }
}

resource "aws_route53_record" "alias" {
  zone_id = var.hosted_zone_id
  name    = var.record_name
  type    = "A"

  alias {
    name                   = var.alias_target_dns
    zone_id                = var.alias_target_zone_id
    evaluate_target_health = true
  }
}
