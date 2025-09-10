#!/bin/bash

# NBA Analytics Deployment Helper Script
# Place this script in the infrastructure/ directory
# Usage: ./deploy.sh [command] [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$SCRIPT_DIR/environments/dev"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Terraform/OpenTofu is installed
    if ! command -v tofu &> /dev/null; then
        print_error "OpenTofu is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured or invalid. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "$TERRAFORM_DIR/main.tf" ]; then
        print_error "Cannot find Terraform configuration. Make sure you're running this from the infrastructure/ directory."
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
}

# Function to get Terraform outputs
get_terraform_outputs() {
    print_status "Getting Terraform outputs..."
    
    cd "$TERRAFORM_DIR"
    
    # Check if Terraform state exists
    if ! tofu state list &> /dev/null; then
        print_error "No Terraform state found. Please run 'tofu apply' first."
        exit 1
    fi
    
    # Get outputs
    ALB_URL=$(tofu output -raw application_url 2>/dev/null || { print_error "Failed to get ALB URL from Terraform output"; exit 1; })
    FRONTEND_REPO=$(tofu output -raw frontend_repository_url 2>/dev/null || { print_error "Failed to get frontend repository URL"; exit 1; })
    BACKEND_REPO=$(tofu output -raw backend_repository_url 2>/dev/null || { print_error "Failed to get backend repository URL"; exit 1; })
    ETL_REPO=$(tofu output -raw etl_repository_url 2>/dev/null || { print_error "Failed to get ETL repository URL"; exit 1; })
    CLUSTER_NAME=$(tofu output -raw ecs_cluster_name 2>/dev/null || { print_error "Failed to get ECS cluster name"; exit 1; })
    DB_SETUP_TASK_ARN=$(tofu output -raw db_setup_task_definition_arn 2>/dev/null || { print_error "Failed to get DB setup task ARN"; exit 1; })
    ETL_TASK_ARN=$(tofu output -raw etl_task_definition_arn 2>/dev/null || { print_error "Failed to get ETL task ARN"; exit 1; })
    PRIVATE_SUBNETS=$(tofu output -json private_subnet_ids 2>/dev/null | jq -r '.[]' | tr '\n' ',' | sed 's/,$//' || { print_error "Failed to get private subnets"; exit 1; })
    ECS_SG=$(tofu output -raw ecs_security_group_id 2>/dev/null || { print_error "Failed to get ECS security group"; exit 1; })
    
    # Extract region and account ID from repository URL
    AWS_REGION=$(echo "$FRONTEND_REPO" | cut -d'.' -f4)
    AWS_ACCOUNT_ID=$(echo "$FRONTEND_REPO" | cut -d'.' -f1)
    
    cd - > /dev/null
    
    print_success "Terraform outputs retrieved"
    print_status "ALB URL: $ALB_URL"
    print_status "AWS Region: $AWS_REGION"
    print_status "ECS Cluster: $CLUSTER_NAME"
}

# Function to build and push containers
build_and_push_containers() {
    print_status "Building and pushing containers..."
    
    # Login to ECR
    print_status "Logging in to ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com" || {
        print_error "Failed to login to ECR. Please check your AWS credentials and permissions."
        exit 1
    }
    
    # Build and push frontend
    print_status "Building frontend container..."
    cd "$PROJECT_ROOT/frontend"
    docker build \
        --platform linux/amd64 \
        --build-arg REACT_APP_API_URL="$ALB_URL" \
        -t nba-analytics/frontend:latest . || {
        print_error "Failed to build frontend container"
        exit 1
    }
    
    print_status "Pushing frontend container..."
    docker tag nba-analytics/frontend:latest "$FRONTEND_REPO:latest"
    docker push "$FRONTEND_REPO:latest" || {
        print_error "Failed to push frontend container"
        exit 1
    }
    
    # Build and push backend
    print_status "Building backend container..."
    cd "$PROJECT_ROOT/backend"
    docker build --platform linux/amd64 -t nba-analytics/backend:latest . || {
        print_error "Failed to build backend container"
        exit 1
    }
    
    print_status "Pushing backend container..."
    docker tag nba-analytics/backend:latest "$BACKEND_REPO:latest"
    docker push "$BACKEND_REPO:latest" || {
        print_error "Failed to push backend container"
        exit 1
    }
    
    # Build and push ETL
    print_status "Building ETL container..."
    cd "$PROJECT_ROOT/data-pipeline"
    docker build --platform linux/amd64 -t nba-analytics/etl:latest . || {
        print_error "Failed to build ETL container"
        exit 1
    }
    
    print_status "Pushing ETL container..."
    docker tag nba-analytics/etl:latest "$ETL_REPO:latest"
    docker push "$ETL_REPO:latest" || {
        print_error "Failed to push ETL container"
        exit 1
    }
    
    cd "$SCRIPT_DIR"
    print_success "All containers built and pushed successfully"
}

# Function to run database setup
run_database_setup() {
    print_status "Running database setup..."
    
    TASK_ARN=$(aws ecs run-task \
        --cluster "$CLUSTER_NAME" \
        --task-definition "$DB_SETUP_TASK_ARN" \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
        --overrides '{"containerOverrides":[{"name":"db-setup","command":["npm","run","setup-db"]}]}' \
        --region "$AWS_REGION" \
        --query 'tasks[0].taskArn' \
        --output text) || {
        print_error "Failed to start database setup task"
        exit 1
    }
    
    print_success "Database setup task started: $TASK_ARN"
    print_warning "Note: This is fire-and-forget. Check ECS console for task status."
}

# Function to run ETL setup
run_etl_setup() {
    print_status "Running ETL setup (teams and players initialization)..."
    
    TASK_ARN=$(aws ecs run-task \
        --cluster "$CLUSTER_NAME" \
        --task-definition "$ETL_TASK_ARN" \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
        --overrides '{"containerOverrides":[{"name":"etl","command":["python","nba_pipeline.py","setup"]}]}' \
        --region "$AWS_REGION" \
        --query 'tasks[0].taskArn' \
        --output text) || {
        print_error "Failed to start ETL setup task"
        exit 1
    }
    
    print_success "ETL setup task started: $TASK_ARN"
    print_warning "Note: This is fire-and-forget. Check ECS console for task status."
}

# Function to run ETL command
run_etl_command() {
    local etl_args=("$@")
    
    if [ ${#etl_args[@]} -eq 0 ]; then
        print_error "No ETL command provided"
        return 1
    fi
    
    print_status "Running ETL command: python nba_pipeline.py ${etl_args[*]}"
    
    # Convert array to JSON format for ECS overrides
    local cmd_json="[\"python\",\"nba_pipeline.py\""
    for arg in "${etl_args[@]}"; do
        cmd_json="$cmd_json,\"$arg\""
    done
    cmd_json="$cmd_json]"
    
    TASK_ARN=$(aws ecs run-task \
        --cluster "$CLUSTER_NAME" \
        --task-definition "$ETL_TASK_ARN" \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
        --overrides "{\"containerOverrides\":[{\"name\":\"etl\",\"command\":$cmd_json}]}" \
        --region "$AWS_REGION" \
        --query 'tasks[0].taskArn' \
        --output text) || {
        print_error "Failed to start ETL task"
        exit 1
    }
    
    print_success "ETL task started: $TASK_ARN"
    print_warning "Note: This is fire-and-forget. Check ECS console for task status."
}

# Function to show usage
show_usage() {
    cat << EOF
NBA Analytics Deployment Helper Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  tf-outputs             - Get Terraform Outputs
  deploy                 - Build containers, push to ECR, setup database, and initialize data
  build                  - Build and push containers only
  db-setup              - Run database setup only
  etl-setup             - Run ETL setup (teams and players) only
  etl [ETL_COMMAND]     - Run specific ETL command

ETL Commands (use with 'etl' command):
  Database Commands:
    clear                                   # Clear all data from database
    setup                                   # Initialize both teams and players (clears existing data)
  
  Setup Commands:
    setup-teams                             # Initialize NBA teams only (clears all data first)
    setup-players                           # Initialize active players only
  
  Load Commands (Traditional + Advanced Stats):
    load YYYY-MM-DD                         # Load all stats for specific date
    load YYYY-MM-DD to YYYY-MM-DD           # Load all stats for date range
  
  Load Commands (Traditional Stats Only):
    load-basic YYYY-MM-DD                   # Load traditional stats only
    load-basic YYYY-MM-DD to YYYY-MM-DD     # Load traditional stats only
  
  Load Commands (Advanced Stats Only):
    load-advanced YYYY-MM-DD                # Load advanced stats only
    load-advanced YYYY-MM-DD to YYYY-MM-DD  # Load advanced stats only
  
  Career Statistics Commands:
    load-career-all                         # Load career stats for all players
    load-career-all --max-players 50        # Load career stats for first 50 players
    load-career-active                      # Load career stats for active players only
    load-career-player PLAYER_ID           # Load career stats for specific player
    load-career-players PLAYER_ID1,PLAYER_ID2  # Load career stats for multiple players

Examples:
  $0 deploy                               # Full deployment
  $0 build                                # Build and push containers only
  $0 etl setup                           # Initialize teams and players
  $0 etl load 2025-01-19                 # Load stats for one day
  $0 etl load 2025-01-15 to 2025-01-22  # Load stats for date range
  $0 etl load-career-active              # Load career stats for active players
  $0 etl load-career-player 2544         # Load career stats for LeBron James

Prerequisites:
  - AWS CLI configured with valid credentials
  - OpenTofu/Terraform installed
  - Docker installed and running
  - jq installed
  - Infrastructure deployed (tofu apply completed)

EOF
}

# Main script logic
main() {
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    local command="$1"
    shift
    
    case "$command" in
        "deploy")
            check_prerequisites
            get_terraform_outputs
            build_and_push_containers
            run_database_setup
            run_etl_setup
            print_success "Full deployment completed!"
            print_status "Your application should be available at: $ALB_URL"
            ;;
        "build")
            check_prerequisites
            get_terraform_outputs
            build_and_push_containers
            ;;
        "tf-outputs")
            check_prerequisites
            get_terraform_outputs
            ;;
        "db-setup")
            check_prerequisites
            get_terraform_outputs
            run_database_setup
            ;;
        "etl-setup")
            check_prerequisites
            get_terraform_outputs
            run_etl_setup
            ;;
        "etl")
            if [ $# -eq 0 ]; then
                print_error "ETL command requires arguments"
                show_usage
                exit 1
            fi
            check_prerequisites
            get_terraform_outputs
            run_etl_command "$@"
            ;;
        "-h"|"--help"|"help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"