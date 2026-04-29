output "bucket_name" {
  value = aws_s3_bucket.this.id
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}

output "distribution_id" {
  value = try(aws_cloudfront_distribution.this[0].id, null)
}

output "distribution_domain_name" {
  value = try(aws_cloudfront_distribution.this[0].domain_name, null)
}

output "distribution_zone_id" {
  value = try(aws_cloudfront_distribution.this[0].hosted_zone_id, null)
}
