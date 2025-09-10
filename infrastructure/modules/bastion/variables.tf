# infrastructure/modules/bastion/variables.tf

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID where bastion will be deployed"
  type        = string
}

variable "public_subnet_id" {
  description = "Public subnet ID for bastion host"
  type        = string
}

variable "rds_security_group_id" {
  description = "RDS security group ID to allow bastion access"
  type        = string
}

variable "rds_endpoint" {
  description = "RDS endpoint hostname (without port)"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type for bastion host"
  type        = string
  default     = "t3.micro"
}

variable "ssh_public_key" {
  description = "SSH public key for bastion access"
  type        = string
}