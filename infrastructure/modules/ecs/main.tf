# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-cluster"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project_name}-${var.environment}-frontend"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-frontend-logs"
  }
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}-${var.environment}-backend"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-backend-logs"
  }
}

resource "aws_cloudwatch_log_group" "etl" {
  name              = "/ecs/${var.project_name}-${var.environment}-etl"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-${var.environment}-etl-logs"
  }
}

# Frontend Task Definition
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-${var.environment}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn           = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "frontend"
      image = "${var.frontend_repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-${var.environment}-frontend-task"
  }
}

# Backend Task Definition
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-${var.environment}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn           = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "backend"
      image = "${var.backend_repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3001
          hostPort      = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3001"
        },
        {
          name  = "FRONTEND_URL"
          value = var.frontend_url
        }
      ]

      secrets = [
        {
          name      = "DB_HOST"
          valueFrom = "${var.db_credentials_secret_arn}:host::"
        },
        {
          name      = "DB_PORT"
          valueFrom = "${var.db_credentials_secret_arn}:port::"
        },
        {
          name      = "DB_NAME"
          valueFrom = "${var.db_credentials_secret_arn}:database::"
        },
        {
          name      = "DB_USER"
          valueFrom = "${var.db_credentials_secret_arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${var.db_credentials_secret_arn}:password::"
        },
        {
          name      = "JWT_ACCESS_SECRET"
          valueFrom = "${var.app_secrets_secret_arn}:jwt_access_secret::"
        },
        {
          name      = "JWT_REFRESH_SECRET"
          valueFrom = "${var.app_secrets_secret_arn}:jwt_refresh_secret::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-${var.environment}-backend-task"
  }
}

# Database Setup Task Definition (uses backend container)
resource "aws_ecs_task_definition" "db_setup" {
  family                   = "${var.project_name}-${var.environment}-db-setup"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn           = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "db-setup"
      image = "${var.backend_repository_url}:latest"
      
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        }
      ]

      secrets = [
        {
          name      = "DB_HOST"
          valueFrom = "${var.db_credentials_secret_arn}:host::"
        },
        {
          name      = "DB_PORT"
          valueFrom = "${var.db_credentials_secret_arn}:port::"
        },
        {
          name      = "DB_NAME"
          valueFrom = "${var.db_credentials_secret_arn}:database::"
        },
        {
          name      = "DB_USER"
          valueFrom = "${var.db_credentials_secret_arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${var.db_credentials_secret_arn}:password::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "db-setup"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-${var.environment}-db-setup-task"
  }
}

# ETL Task Definition (for data loading only)
resource "aws_ecs_task_definition" "etl" {
  family                   = "${var.project_name}-${var.environment}-etl"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 1024
  memory                   = 2048
  execution_role_arn       = var.ecs_task_execution_role_arn
  task_role_arn           = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name  = "etl"
      image = "${var.etl_repository_url}:latest"
      
      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        }
      ]

      secrets = [
        {
          name      = "DB_HOST"
          valueFrom = "${var.db_credentials_secret_arn}:host::"
        },
        {
          name      = "DB_PORT"
          valueFrom = "${var.db_credentials_secret_arn}:port::"
        },
        {
          name      = "DB_NAME"
          valueFrom = "${var.db_credentials_secret_arn}:database::"
        },
        {
          name      = "DB_USER"
          valueFrom = "${var.db_credentials_secret_arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${var.db_credentials_secret_arn}:password::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.etl.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-${var.environment}-etl-task"
  }
}

# Frontend Service
resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-${var.environment}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.frontend_target_group_arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [var.frontend_target_group_arn]

  tags = {
    Name = "${var.project_name}-${var.environment}-frontend-service"
  }
}

# Backend Service
resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-${var.environment}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.backend_target_group_arn
    container_name   = "backend"
    container_port   = 3001
  }

  depends_on = [var.backend_target_group_arn]

  tags = {
    Name = "${var.project_name}-${var.environment}-backend-service"
  }
}