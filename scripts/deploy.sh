#!/bin/bash
set -e

# Default values
REGISTRY_PORT="5000"
COMMAND=""
DEBUG=false
DOCKER_VOLUMES_BASE=""

# Help message
show_help() {
    cat <<EOT
Usage: $0 [options] command [args]

Commands:
  build-workspace     Build the base workspace image
  build-tools         Build the tools image
  build-media         Build the media service
  build-backend       Build the backend service
  build-services      Build all backend services (media and backend)
  up-dev              Start development services
  up-prod            Start production services (requires --volumes-base path)
  down               Stop all services
  down-volumes       Stop all services and remove volumes
  clean              Remove all containers, volumes, and unused images
  setup-remote       Configure remote deployment
  deploy-prod        Deploy to production server (requires --volumes-base path)
  verify-prod-volumes Verify production volume directories exist (requires --volumes-base path)
  test-registry      Test connection to registry through SSH tunnel
  bootstrap-prod     Bootstrap the production database with an admin user

Options:
  -h, --help                Show this help message
  -d, --debug              Enable debug/verbose output
  --volumes-base <path>    Base path for Docker volumes (required for production commands)
EOT
}

# Debug logging function
debug_log() {
    if [ "$DEBUG" = true ]; then
        echo "[DEBUG] $1"
    fi
}

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h|--help) 
            show_help
            exit 0 
            ;;
        -d|--debug) 
            DEBUG=true
            ;;
        --volumes-base)
            shift
            DOCKER_VOLUMES_BASE="$1"
            ;;
        build-workspace|build-tools|build-media|build-backend|build-services|up-dev|up-prod|down|down-volumes|clean|setup-remote|deploy-prod|test-registry|bootstrap-prod|verify-prod-volumes)
            COMMAND="$1"
            ;;
        *)
            echo "Unknown parameter: $1"
            exit 1
            ;;
    esac
    shift
done

# Check if a command was specified
if [ -z "$COMMAND" ]; then
    echo "No command specified"
    show_help
    exit 1
fi

# Validate required parameters for specific commands
if { [ "$COMMAND" = "deploy-prod" ] || [ "$COMMAND" = "up-prod" ] || [ "$COMMAND" = "verify-prod-volumes" ]; } && [ -z "$DOCKER_VOLUMES_BASE" ]; then
    echo "Error: $COMMAND command requires --volumes-base parameter"
    echo "Example: $0 --volumes-base /path/to/volumes $COMMAND"
    exit 1
fi

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
    
    # Start new tunnel
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

# Function to build a service and capture its image ID
build_service() {
    local service_name="$1"
    local temp_file=$(mktemp)
    
    debug_log "Building service: $service_name"
    debug_log "Using temporary file: $temp_file"
    
    # Add --progress=plain when debug is enabled
    local build_args=""
    if [ "$DEBUG" = true ]; then
        build_args="--progress=plain"
        debug_log "Using build args: $build_args"
    fi
    
    # Build and capture the image ID
    debug_log "Starting build for $service_name..."
    COMPOSE_DOCKER_CLI_BUILD=1 docker compose --profile build build $build_args "$service_name" 2>&1 | while read -r line; do
        if [ "$DEBUG" = true ]; then
            echo "[BUILD] $line"
        else
            echo "$line"
        fi
        if [[ $line =~ "writing image sha256:" ]]; then
            echo "$line" | sed -n 's/.*sha256:\([a-f0-9]*\).*/sha256:\1/p' > "$temp_file"
            debug_log "${service_name} image ID: $(cat "$temp_file")"
        fi
    done

    new_docker_image_id=$(cat "$temp_file")
    debug_log "Build complete. Image ID: $new_docker_image_id"
    rm "$temp_file"
    
    # Check if build was successful
    if [ -z "$new_docker_image_id" ]; then
        echo "Error: Failed to build $service_name"
        exit 1
    fi
}

# Function to build tools image (used by other build commands)
build_tools() {
    debug_log "Building tools image..."
    docker compose --profile build build tools
}

# Function to build workspace (used by other build commands)
build_workspace() {
    debug_log "Building workspace..."
    docker compose --profile build build workspace
}

# Function to build media service (used by other build commands)
build_media() {
    build_service "media"
}

# Function to build backend service
build_backend() {
    build_service "backend"
}

# Function to deploy to production
deploy_prod() {
    echo "Deploying to production server..."
    debug_log "Starting deployment process"
    debug_log "Using Docker volumes base path: $DOCKER_VOLUMES_BASE"
    
    if ! docker --context production info >/dev/null 2>&1; then
        echo "Cannot connect to production server. Please run setup-remote first."
        exit 1
    fi

    # Get the remote host from the current context
    REMOTE_HOST=$(docker context inspect production --format '{{.Endpoints.docker.Host}}' | sed 's|ssh://||' | cut -d':' -f1)
    REMOTE_USER=$(echo "$REMOTE_HOST" | cut -d'@' -f1)
    REMOTE_HOSTNAME=$(echo "$REMOTE_HOST" | cut -d'@' -f2)
    debug_log "Remote host details: User=$REMOTE_USER, Hostname=$REMOTE_HOSTNAME"
    
    # Get actual registry port before setting up tunnel
    REGISTRY_PORT=$(get_registry_port)
    debug_log "Detected registry port: ${REGISTRY_PORT}"
    REGISTRY="localhost:${REGISTRY_PORT}"

    # Set up SSH tunnel
    debug_log "Setting up SSH tunnel to $REMOTE_HOST"
    setup_tunnel "$REMOTE_HOST"

    # Build and tag images locally
    echo "Building images locally..."
    docker context use default
    debug_log "Switched to default context"
    
    # Build workspace first since all services depend on it
    debug_log "Starting workspace build"
    build_workspace

    # Build tools next as the media service depends on it
    debug_log "Starting tools build"
    build_tools

    # Build and push services
    debug_log "Starting media service build"
    build_media
    if [ $? -ne 0 ]; then
        echo "Error: Failed to build media service"
        exit 1
    fi
    local media_image_id="$new_docker_image_id"
    debug_log "Media image built with ID: $media_image_id"

    debug_log "Starting backend service build"
    build_backend
    if [ $? -ne 0 ]; then
        echo "Error: Failed to build backend service"
        exit 1
    fi
    local backend_image_id="$new_docker_image_id"
    debug_log "Backend image built with ID: $backend_image_id"

    # Tag and push using image IDs to ensure we use the correct images
    debug_log "Tagging and pushing images to registry at $REGISTRY"
    docker tag "${media_image_id}" "${REGISTRY}/wavtopia-media:latest"
    docker tag "${backend_image_id}" "${REGISTRY}/wavtopia-backend:latest"
    
    echo "Pushing images to registry..."
    docker push "${REGISTRY}/wavtopia-media:latest"
    docker push "${REGISTRY}/wavtopia-backend:latest"

    # Switch to production context and deploy
    echo "Deploying services..."
    docker context use production
    debug_log "Switched to production context"
    
    # Use localhost for registry when deploying since we're on the remote host
    export REGISTRY_PREFIX="localhost:${REGISTRY_PORT}/"
    debug_log "Using registry prefix: ${REGISTRY_PREFIX}"
    
    # Pull latest images
    echo "Pulling latest images..."
    docker pull "${REGISTRY_PREFIX}wavtopia-media:latest"
    docker pull "${REGISTRY_PREFIX}wavtopia-backend:latest"
    
    # Deploy services first to ensure database is running
    debug_log "Starting production services"
    DOCKER_VOLUMES_BASE="$DOCKER_VOLUMES_BASE" docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile production pull
    DOCKER_VOLUMES_BASE="$DOCKER_VOLUMES_BASE" docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d
    
    # Wait a moment for the database to be ready
    echo "Waiting for database to be ready..."
    sleep 5
    
    # Run database migrations in production
    echo "Running database migrations..."
    debug_log "Executing database migrations"
    DOCKER_VOLUMES_BASE="$DOCKER_VOLUMES_BASE" docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile production run --rm \
      backend sh -c "cd /app/node_modules/@wavtopia/core-storage && npm run migrate:deploy"
    
    # Switch back to default context
    docker context use default
    debug_log "Switched back to default context"
    echo "Services deployed! Don't forget to update the frontend too if there are any changes."
}

# Function to bootstrap production database
bootstrap_prod() {
    echo "Bootstrapping production database..."
    if ! docker --context production info >/dev/null 2>&1; then
        echo "Cannot connect to production server. Please run setup-remote first."
        exit 1
    fi

    # Run bootstrap command in production context
    docker context use production
    DOCKER_VOLUMES_BASE="$DOCKER_VOLUMES_BASE" docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile production run --rm \
      backend sh -c "cd /app/node_modules/@wavtopia/core-storage && npm run bootstrap"
    
    # Switch back to default context
    docker context use default
    echo "Production database bootstrapped successfully!"
}

# Function to verify production volume directories
verify_prod_volumes() {
    echo "Verifying production volume directories..."
    debug_log "Using Docker volumes base path: $DOCKER_VOLUMES_BASE"
    
    if ! docker --context production info >/dev/null 2>&1; then
        echo "Cannot connect to production server. Please run setup-remote first."
        exit 1
    fi

    # Get the remote host from the current context
    REMOTE_HOST=$(docker context inspect production --format '{{.Endpoints.docker.Host}}' | sed 's|ssh://||' | cut -d':' -f1)
    debug_log "Remote host: $REMOTE_HOST"

    # List of required directories (without base path)
    local required_dirs=(
        "wavtopia_postgres_data"
        "wavtopia_minio_data"
        "wavtopia_redis_data"
        "wavtopia_temp_files"
    )
    
    echo "Checking directories..."
    # Use ls to check each directory and capture both stdout and stderr
    local output
    output=$(ssh "$REMOTE_HOST" "cd ${DOCKER_VOLUMES_BASE} 2>/dev/null && ls -d ${required_dirs[*]} 2>&1") || true
    debug_log "ls output: $output"
    
    # Find missing directories by checking for "No such file" messages
    local missing=()
    for dir in "${required_dirs[@]}"; do
        if [[ ! "$output" == *"$dir"* ]] || [[ "$output" == *"No such file"* ]]; then
            missing+=("$dir")
        fi
    done

    # If any directories are missing, show error
    if [ ${#missing[@]} -gt 0 ]; then
        echo "Error: The following required directories are missing:"
        for dir in "${missing[@]}"; do
            echo "  - ${DOCKER_VOLUMES_BASE}/${dir}"
        done
        echo "Please create these directories on the production server before proceeding."
        echo "You can create them with:"
        echo "  ssh $REMOTE_HOST 'mkdir -p ${DOCKER_VOLUMES_BASE}/{$(IFS=,; echo "${missing[*]}")}}'"
        exit 1
    fi

    echo "All required volume directories exist!"
}

# Main command execution
case $COMMAND in
    "build-workspace")
        build_workspace
        ;;
    "build-tools")
        build_tools
        ;;
    "build-media")
        build_workspace
        build_tools
        build_media
        ;;
    "build-backend")
        build_workspace
        build_backend
        ;;
    "build-services")
        build_workspace
        build_tools
        build_media
        build_backend
        ;;
    "up-dev")
        docker compose --profile development up -d
        ;;
    "up-prod")
        build_workspace
        build_tools
        build_media
        build_backend
        DOCKER_VOLUMES_BASE="$DOCKER_VOLUMES_BASE" docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d
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
    "verify-prod-volumes")
        verify_prod_volumes
        ;;
    "bootstrap-prod")
        bootstrap_prod
        ;;
    "")
        echo "No command specified"
        show_help
        exit 1
        ;;
esac 
