#!/bin/bash
set -e

# Default values
REGISTRY_PORT="5000"
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
  -h, --help       Show this help message
EOT
}

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h|--help) show_help; exit 0 ;;
        build-*|up-*|down*|clean|setup-remote|deploy-prod) COMMAND="$1" ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Function to cleanup SSH tunnel
cleanup_tunnel() {
    if [ -n "$TUNNEL_PID" ] && ps -p $TUNNEL_PID > /dev/null; then
        echo "Cleaning up SSH tunnel..."
        kill $TUNNEL_PID
    fi
}

# Function to setup SSH tunnel
setup_tunnel() {
    local remote_host="$1"
    echo "Setting up SSH tunnel for registry access..."
    
    # Check for existing process on the port
    local existing_pid=$(lsof -ti:${REGISTRY_PORT})
    if [ -n "$existing_pid" ]; then
        echo "Error: Port ${REGISTRY_PORT} is already in use by process ${existing_pid}"
        echo "Please stop the existing process and try again"
        exit 1
    fi
    
    # Start new tunnel
    ssh -f -N -L "${REGISTRY_PORT}:localhost:${REGISTRY_PORT}" "$remote_host"
    if [ $? -ne 0 ]; then
        echo "Failed to establish SSH tunnel"
        exit 1
    fi
    
    # Get tunnel PID
    TUNNEL_PID=$(lsof -ti:${REGISTRY_PORT})
    if [ -z "$TUNNEL_PID" ]; then
        echo "Failed to get tunnel PID"
        exit 1
    fi
    
    # Set up cleanup trap
    trap cleanup_tunnel EXIT
    
    # Wait for tunnel to be ready
    for i in {1..5}; do
        if nc -z localhost ${REGISTRY_PORT} 2>/dev/null; then
            echo "Tunnel established successfully"
            return 0
        fi
        sleep 1
    done
    
    echo "Timeout waiting for tunnel to be ready"
    cleanup_tunnel
    exit 1
}

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
    DOCKER_HOST="ssh://$user@$host:$port"
    export DOCKER_SSH_CONFIG="$SSH_CONFIG_PATH"
    docker context create production \
        --docker "host=$DOCKER_HOST" \
        --description "Production server at $host"
    
    echo "Testing connection..."
    if docker --context production info >/dev/null 2>&1; then
        echo "Connection successful!"
        
        # Check if registry is already running
        if docker --context production container inspect registry >/dev/null 2>&1; then
            echo "Registry already running on ${host}:${REGISTRY_PORT}"
        else
            # Check if port is already in use
            if docker --context production container ls -q --filter publish="${REGISTRY_PORT}" | grep -q .; then
                echo "Warning: Port ${REGISTRY_PORT} is already in use. Please ensure there isn't another registry running."
                exit 1
            fi
            
            read -p "No registry found. Would you like to create one? [y/N] " create_registry
            if [[ "$create_registry" =~ ^[Yy]$ ]]; then
                # Set up private registry on remote host
                echo "Setting up private registry on remote host..."
                docker --context production run -d \
                    --restart=always \
                    --name registry \
                    -p "${REGISTRY_PORT}:5000" \
                    -v registry_data:/var/lib/registry \
                    registry:2
                
                echo "Registry is running on ${host}:${REGISTRY_PORT}"
            else
                echo "Skipping registry creation. Please ensure a registry is available at ${host}:${REGISTRY_PORT}"
            fi
        fi
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

    # Get the remote host from the current context
    REMOTE_HOST=$(docker context inspect production --format '{{.Endpoints.docker.Host}}' | sed 's|ssh://||' | cut -d':' -f1)
    REMOTE_USER=$(echo "$REMOTE_HOST" | cut -d'@' -f1)
    REMOTE_HOSTNAME=$(echo "$REMOTE_HOST" | cut -d'@' -f2)
    REGISTRY="localhost:${REGISTRY_PORT}"

    # Set up SSH tunnel
    setup_tunnel "$REMOTE_HOST"

    # Build and tag images locally
    echo "Building images locally..."
    docker context use default
    
    # Build and push workspace image
    build_workspace
    docker tag wavtopia-workspace "${REGISTRY}/wavtopia-workspace"
    docker push "${REGISTRY}/wavtopia-workspace"
    
    # Build and push service images
    docker compose build media backend
    docker tag wavtopia-media "${REGISTRY}/wavtopia-media"
    docker tag wavtopia-backend "${REGISTRY}/wavtopia-backend"
    docker push "${REGISTRY}/wavtopia-media"
    docker push "${REGISTRY}/wavtopia-backend"

    # Update docker-compose to use the remote registry address
    export REGISTRY_PREFIX="${REMOTE_HOSTNAME}:${REGISTRY_PORT}/"

    # Switch to production context and deploy
    echo "Deploying services..."
    docker context use production
    docker compose --profile production up -d

    # Switch back to default context
    docker context use default
    echo "Deployment complete!"
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