variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "ecs_security_group_id" {
  description = "Security group ID for ECS"
  type        = string
}

variable "frontend_repository_url" {
  description = "ECR repository URL for frontend"
  type        = string
}

variable "backend_repository_url" {
  description = "ECR repository URL for backend"
  type        = string
}

variable "etl_repository_url" {
  description = "ECR repository URL for ETL"
  type        = string
}

variable "frontend_target_group_arn" {
  description = "ARN of the frontend target group"
  type        = string
}

variable "backend_target_group_arn" {
  description = "ARN of the backend target group"
  type        = string
}

variable "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  type        = string
}

variable "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  type        = string
}

variable "db_credentials_secret_arn" {
  description = "ARN of the database credentials secret"
  type        = string
}

variable "app_secrets_secret_arn" {
  description = "ARN of the application secrets secret"
  type        = string
}

variable "frontend_url" {
  description = "Frontend URL for CORS"
  type        = string
}