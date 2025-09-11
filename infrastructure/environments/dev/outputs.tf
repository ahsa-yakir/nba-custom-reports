# infrastructure/environments/dev/outputs.tf

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "ID of the ECS security group"
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

# Application URLs
output "application_url" {
  description = "Main application URL"
  value       = module.alb.alb_url
}

output "api_url" {
  description = "Backend API URL"
  value       = "${module.alb.alb_url}/api"
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.alb_dns_name
}

# ECR Repository URLs
output "frontend_repository_url" {
  description = "Frontend ECR repository URL"
  value       = module.ecr.frontend_repository_url
}

output "backend_repository_url" {
  description = "Backend ECR repository URL"
  value       = module.ecr.backend_repository_url
}

# ECS Information
output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = module.ecs.cluster_name
}

output "db_setup_task_definition_arn" {
  description = "ARN of the database setup task definition (uses backend container)"
  value       = module.ecs.db_setup_task_definition_arn
}

# Database Information
output "database_endpoint" {
  description = "RDS database endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

# Bastion Host Information (only when enabled)
output "bastion_public_ip" {
  description = "Public IP address of the bastion host"
  value       = var.enable_bastion ? module.bastion[0].bastion_public_ip : null
}

output "bastion_ssh_command" {
  description = "SSH command to create tunnel to RDS"
  value       = var.enable_bastion ? module.bastion[0].ssh_command : null
  sensitive   = true
}

output "bastion_connection_instructions" {
  description = "Instructions for connecting to RDS through bastion"
  value       = var.enable_bastion ? module.bastion[0].connection_instructions : "Bastion host not enabled. Set enable_bastion=true to deploy."
  sensitive   = true
}