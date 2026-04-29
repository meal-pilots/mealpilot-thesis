# Staging mirrors prod with cheaper sizing. Copy/extend environments/prod/main.tf
# when you need a real staging stack. For now this stub keeps the directory and
# placeholder state so terraform-plan-staging workflows do not error out.

terraform {
  required_version = ">= 1.6"

  backend "s3" {
    bucket         = "meal-planner-tfstate"
    key            = "staging/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "meal-planner-tfstate-lock"
    encrypt        = true
  }

  required_providers {
    aws = { source = "hashicorp/aws", version = ">= 5.60" }
  }
}

provider "aws" {
  region = "eu-central-1"
  default_tags {
    tags = {
      Project     = "meal-planner"
      Environment = "staging"
      ManagedBy   = "terraform"
    }
  }
}
