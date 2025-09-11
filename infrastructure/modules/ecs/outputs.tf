output "cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "frontend_service_name" {
  description = "Name of the frontend service"
  value       = aws_ecs_service.frontend.name
}

output "backend_service_name" {
  description = "Name of the backend service"
  value       = aws_ecs_service.backend.name
}

output "db_setup_task_definition_arn" {
  description = "ARN of the database setup task definition"
  value       = aws_ecs_task_definition.db_setup.arn
}