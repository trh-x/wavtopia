#!/bin/bash
set -e

# Default values
# TODO: Add this back in once the env files are all the same. Update the usage message as well.
# ENV_FILE=".env.docker"
COMMAND=""

# Help message
show_help() {
    cat <<EOT
Usage: $0 [options] command

Commands:
  build-workspace  Build the base workspace image
  build-media      Build the media service
  build-backend    Build the backend service
  build-services   Build all backend services (media and backend)
  up-dev           Start development services
  up-prod          Start production services
  down             Stop all services
  down-volumes     Stop all services and remove volumes
  clean            Remove all containers, volumes, and unused images
  setup-remote     Configure remote deployment
  deploy-prod      Deploy to production server

Options:
  --env FILE       Specify environment file (default: .env.docker) (not used yet)
  -h, --help       Show this help message
EOT
}

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --env) ENV_FILE="$2"; shift ;;
        -h|--help) show_help; exit 0 ;;
        build-*|up-*|down*|clean|setup-remote|deploy-prod) COMMAND="$1" ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Function to copy env files to services
# TODO: Add this back in once the env files are all the same
# copy_env_files() {
#     echo "Copying environment files..."
#     cp $ENV_FILE packages/backend/.env.docker
#     cp $ENV_FILE packages/frontend/.env.docker
#     cp $ENV_FILE packages/media/.env.docker
# }

# Function to setup remote context
setup_remote() {
    echo "Setting up remote Docker context..."
    read -p "Enter remote server host: " host
    read -p "Enter SSH user: " user
    read -p "Enter SSH port (default: 22): " port
    port=${port:-22}
    
    # Use SSH config file for all settings including identity file
    SSH_CONFIG_PATH="$HOME/.ssh/config"
    if [ ! -f "$SSH_CONFIG_PATH" ]; then
        echo "Warning: SSH config file not found at $SSH_CONFIG_PATH"
    fi
    
    # Create context with SSH config
    docker context create production \
        --docker "host=ssh://$user@$host:$port?ssh-config=$SSH_CONFIG_PATH" \
        --description "Production server at $host"
    
    echo "Testing connection..."
    if docker --context production info >/dev/null 2>&1; then
        echo "Connection successful!"
    else
        echo "Connection failed. Please check your SSH configuration and try again."
        docker context rm production
        exit 1
    fi
}

# Function to deploy to production
deploy_prod() {
    echo "Deploying to production server..."
    if ! docker --context production info >/dev/null 2>&1; then
        echo "Cannot connect to production server. Please run setup-remote first."
        exit 1
    fi
    docker context use production || (echo "Please set up production context first" && exit 1)
    docker compose --profile production up -d
    docker context use default
}

# Function to build workspace (used by other build commands)
build_workspace() {
    docker compose --profile build build workspace
}

# Main command execution
case $COMMAND in
    "build-workspace")
        build_workspace
        ;;
    "build-media")
        build_workspace
        docker compose build media
        ;;
    "build-backend")
        build_workspace
        docker compose build backend
        ;;
    "build-services")
        build_workspace
        docker compose build media backend
        ;;
    "up-dev")
        docker compose --profile development up -d
        ;;
    "up-prod")
        build_workspace
        docker compose build media backend
        docker compose --profile production up -d
        ;;
    "down")
        docker compose down
        ;;
    "down-volumes")
        docker compose down -v
        ;;
    "clean")
        docker compose down -v
        docker system prune -f
        docker volume prune -f
        ;;
    "setup-remote")
        setup_remote
        ;;
    "deploy-prod")
        deploy_prod
        ;;
    "")
        echo "No command specified"
        show_help
        exit 1
        ;;
esac 