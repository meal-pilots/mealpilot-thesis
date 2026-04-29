terraform {
  required_version = ">= 1.6"
  required_providers {
    aws    = { source = "hashicorp/aws", version = ">= 5.60" }
    random = { source = "hashicorp/random", version = ">= 3.6" }
  }
}

resource "random_password" "master" {
  length  = 32
  special = true
  override_special = "!#%*-_+="
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-pg"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, { Name = "${var.name}-pg" })
}

resource "aws_security_group" "this" {
  name        = "${var.name}-pg-sg"
  description = "Postgres security group for ${var.name}"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Postgres from app security groups"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

resource "aws_kms_key" "rds" {
  description         = "KMS key for ${var.name} RDS encryption"
  enable_key_rotation = true

  tags = var.tags
}

resource "aws_db_instance" "this" {
  identifier     = var.name
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  db_name  = var.database_name
  username = var.master_username
  password = random_password.master.result

  multi_az             = var.multi_az
  publicly_accessible  = false
  db_subnet_group_name = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  parameter_group_name = aws_db_parameter_group.this.name

  backup_retention_period = var.backup_retention_days
  backup_window           = "02:30-03:30"
  maintenance_window      = "Mon:03:30-Mon:04:30"
  deletion_protection     = var.deletion_protection
  skip_final_snapshot     = !var.deletion_protection
  final_snapshot_identifier = var.deletion_protection ? "${var.name}-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  copy_tags_to_snapshot = true
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  apply_immediately = false

  tags = var.tags

  lifecycle {
    ignore_changes = [final_snapshot_identifier, password]
  }
}

resource "aws_db_parameter_group" "this" {
  name   = "${var.name}-pg-params"
  family = "postgres${split(".", var.engine_version)[0]}"

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  tags = var.tags
}
