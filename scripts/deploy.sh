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
  test-registry    Test connection to registry through SSH tunnel

Options:
  -h, --help       Show this help message
EOT
}

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h|--help) show_help; exit 0 ;;
        build-*|up-*|down*|clean|setup-remote|deploy-prod|test-registry) COMMAND="$1" ;;
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
    if ss -ln | grep -q ":${REGISTRY_PORT}\\b"; then
        echo "Error: Port ${REGISTRY_PORT} is already in use"
        echo "Please stop any existing process using this port and try again"
        exit 1
    fi
    
    # Start new tunnel with verbose output
    echo "Creating SSH tunnel to ${remote_host}..."
    ssh -f -N -L "${REGISTRY_PORT}:localhost:${REGISTRY_PORT}" "$remote_host"
    if [ $? -ne 0 ]; then
        echo "Failed to establish SSH tunnel"
        exit 1
    fi
    
    # Wait for tunnel to be established and get PID
    echo "Waiting for tunnel to be established..."
    for i in {1..5}; do
        TUNNEL_PID=$(ss -lpn | grep ":${REGISTRY_PORT}" | grep -o 'pid=\([0-9]*\)' | cut -d= -f2)
        if [ -n "$TUNNEL_PID" ]; then
            echo "Tunnel established with PID ${TUNNEL_PID}"
            break
        fi
        sleep 1
    done

    if [ -z "$TUNNEL_PID" ]; then
        echo "Failed to get tunnel PID"
        exit 1
    fi
    
    # Set up cleanup trap
    trap cleanup_tunnel EXIT
    
    # Wait for tunnel to be ready
    echo "Testing tunnel connection..."
    for i in {1..5}; do
        if nc -z localhost ${REGISTRY_PORT} 2>/dev/null; then
            echo "Port ${REGISTRY_PORT} is now accessible"
            return 0
        fi
        echo "Attempt $i: Waiting for port ${REGISTRY_PORT} to be ready..."
        sleep 1
    done
    
    echo "Timeout waiting for tunnel to be ready"
    cleanup_tunnel
    exit 1
}

# Function to test registry connection
test_registry() {
    echo "Testing registry connection..."
    if ! docker --context production info >/dev/null 2>&1; then
        echo "Cannot connect to production server. Please run setup-remote first."
        exit 1
    fi

    # Get the remote host from the current context
    REMOTE_HOST=$(docker context inspect production --format '{{.Endpoints.docker.Host}}' | sed 's|ssh://||' | cut -d':' -f1)
    
    # Get actual registry port before setting up tunnel
    REGISTRY_PORT=$(get_registry_port)
    echo "Detected registry port: ${REGISTRY_PORT}"
    
    # Set up SSH tunnel
    setup_tunnel "$REMOTE_HOST"
    
    echo "Testing registry API..."
    curl -v http://localhost:${REGISTRY_PORT}/v2/ || {
        echo "Failed to connect to registry API"
        exit 1
    }
    
    echo "Registry connection test complete"
}

# Function to get registry port from container
get_registry_port() {
    # Try to get the host port from container inspection using jq
    local port=$(docker --context production inspect registry 2>/dev/null | jq -r '.[0].NetworkSettings.Ports."5000/tcp"[0].HostPort')
    if [ "$port" != "null" ] && [ -n "$port" ]; then
        echo -n "$port"
        return 0
    fi
    # Fallback to default port
    echo -n "${REGISTRY_PORT}"
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
            local detected_port=$(get_registry_port)
            echo "Registry already running on ${host}:${detected_port}"
            export REGISTRY_PORT="${detected_port}"
            # Check if registry is actually responding
            if docker --context production exec registry wget -q --spider http://localhost:${detected_port}/v2/ 2>/dev/null; then
                echo "Registry is healthy and responding to requests"
            else
                echo "Warning: Registry container exists but may not be healthy"
                echo "You may want to restart it with: docker --context production restart registry"
            fi
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
                    --network host \
                    -v registry_data:/var/lib/registry \
                    -e REGISTRY_HTTP_ADDR=localhost:${REGISTRY_PORT} \
                    registry:2
                
                echo "Waiting for registry to start..."
                sleep 5
                
                # Verify registry is responding
                if docker --context production exec registry wget -q --spider http://localhost:${REGISTRY_PORT}/v2/ 2>/dev/null; then
                    echo "Registry is running and healthy on ${host}:${REGISTRY_PORT}"
                else
                    echo "Warning: Registry container started but is not responding"
                    echo "Check logs with: docker --context production logs registry"
                    exit 1
                fi
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
    
    # Get actual registry port before setting up tunnel
    REGISTRY_PORT=$(get_registry_port)
    echo "Detected registry port: ${REGISTRY_PORT}"
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
    "test-registry")
        test_registry
        ;;
    "")
        echo "No command specified"
        show_help
        exit 1
        ;;
esac 