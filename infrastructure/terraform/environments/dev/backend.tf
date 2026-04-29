terraform {
  required_version = ">= 1.6"

  backend "s3" {
    bucket         = "meal-planner-tfstate"
    key            = "dev/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "meal-planner-tfstate-lock"
    encrypt        = true
  }

  required_providers {
    aws    = { source = "hashicorp/aws", version = ">= 5.60" }
    random = { source = "hashicorp/random", version = ">= 3.6" }
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project     = "meal-planner"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

variable "region" {
  type    = string
  default = "eu-central-1"
}

variable "name" {
  type    = string
  default = "meal-planner-dev"
}

variable "github_repositories" {
  type    = list(string)
  default = []
}

variable "tfstate_bucket" {
  type    = string
  default = "meal-planner-tfstate"
}

variable "tfstate_lock_table" {
  type    = string
  default = "meal-planner-tfstate-lock"
}

module "vpc" {
  source = "../../modules/vpc"

  name               = var.name
  region             = var.region
  cidr_block         = "10.10.0.0/16"
  az_count           = 2
  single_nat_gateway = true
}

module "ecr" {
  source           = "../../modules/ecr"
  repository_names = ["meal-planner-backend"]
}

module "github_oidc" {
  source               = "../../modules/iam-github-oidc"
  name                 = var.name
  create_oidc_provider = false
  allowed_repositories = var.github_repositories
  task_role_arns       = ["*"]
  tfstate_bucket       = var.tfstate_bucket
  tfstate_lock_table   = var.tfstate_lock_table
}

output "ecr_backend_repo_url" {
  value = module.ecr.repository_urls["meal-planner-backend"]
}

output "aws_deploy_role_arn" {
  value = module.github_oidc.deploy_role_arn
}
