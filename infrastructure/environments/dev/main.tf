terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
  
  backend "s3" {
    bucket         = "nba-analytics-tofu-state"
    key            = "dev/terraform.tfstate"
    region         = "us-west-1"
    dynamodb_table = "nba-analytics-tofu-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "nba-analytics"
      Environment = var.environment
      ManagedBy   = "opentofu"
      Owner       = "devops-team"
    }
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

module "vpc" {
  source = "../../modules/vpc"

  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
}

module "ecr" {
  source = "../../modules/ecr"

  project_name = var.project_name
}

module "rds" {
  source = "../../modules/rds"

  project_name          = var.project_name
  environment          = var.environment
  private_subnet_ids   = module.vpc.private_subnet_ids
  db_security_group_id = aws_security_group.rds.id
  db_password          = var.db_password
}

# Security Groups
resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-alb-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "ecs" {
  name_prefix = "${var.project_name}-ecs-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "From ALB"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow ECS containers to communicate with each other
  ingress {
    description = "Inter-container communication"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "PostgreSQL from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

module "alb" {
  source = "../../modules/alb"

  project_name           = var.project_name
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_security_group_id = aws_security_group.alb.id
}

module "secrets" {
  source = "../../modules/secrets"

  project_name = var.project_name
  environment  = var.environment
  db_username  = "postgres"
  db_password  = var.db_password
  db_endpoint  = split(":", module.rds.db_instance_endpoint)[0]
  db_port      = 5432
  db_name      = "nba_analytics"
  frontend_url = module.alb.alb_url
}

module "ecs" {
  source = "../../modules/ecs"

  project_name                = var.project_name
  environment                = var.environment
  aws_region                 = var.aws_region
  private_subnet_ids         = module.vpc.private_subnet_ids
  ecs_security_group_id      = aws_security_group.ecs.id
  frontend_repository_url    = module.ecr.frontend_repository_url
  backend_repository_url     = module.ecr.backend_repository_url
  etl_repository_url         = module.ecr.etl_repository_url
  frontend_target_group_arn  = module.alb.frontend_target_group_arn
  backend_target_group_arn   = module.alb.backend_target_group_arn
  ecs_task_execution_role_arn = module.secrets.ecs_task_execution_role_arn
  ecs_task_role_arn          = module.secrets.ecs_task_role_arn
  db_credentials_secret_arn  = module.secrets.db_credentials_secret_arn
  app_secrets_secret_arn     = module.secrets.app_secrets_secret_arn
  frontend_url              = module.alb.alb_url
}