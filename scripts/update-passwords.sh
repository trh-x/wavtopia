#!/bin/bash

set -e  # Exit on any error

# Debug mode flag
DEBUG=0

# Debug logging function
debug_log() {
    if [ "$DEBUG" -eq 1 ]; then
        echo "🔍 DEBUG: $1" >&2
    fi
}

# Parse flags before other arguments
while [ $# -gt 0 ]; do
    case "$1" in
        --debug)
            DEBUG=1
            shift
            ;;
        *)
            break
            ;;
    esac
done

# Load current environment variables
if [ -f .env ]; then
    source .env
    debug_log "Loaded environment from .env"
else
    echo "No .env file found. Please copy .env.example to .env first."
    exit 1
fi

# Variables for new credentials
NEW_POSTGRES_PASSWORD=""
NEW_MINIO_ROOT_USER=""
NEW_MINIO_ROOT_PASSWORD=""
NEW_PGADMIN_EMAIL=""
NEW_PGADMIN_PASSWORD=""
NEW_REDIS_USERNAME=""
NEW_REDIS_PASSWORD=""

# Create .env.new with updated credentials
update_env_file() {
    local source_file="$1"
    local target_file="${source_file}.new"
    local backup_file="${source_file}.bak"

    # Skip if source file doesn't exist
    if [ ! -f "$source_file" ]; then
        debug_log "Skipping $source_file (file not found)"
        return 0
    fi

    debug_log "Updating $source_file -> $target_file"

    # Create backup
    cp "$source_file" "$backup_file"

    # Create new env file with updated credentials
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines and comments
        if [[ -z "$line" ]] || [[ "$line" =~ ^# ]]; then
            echo "$line"
            continue
        fi

        # Update specific variables
        case "$line" in
            POSTGRES_PASSWORD=*)
                [[ -n "$NEW_POSTGRES_PASSWORD" ]] && echo "POSTGRES_PASSWORD=$NEW_POSTGRES_PASSWORD" || echo "$line"
                ;;
            DATABASE_URL=*)
                if [[ -n "$NEW_POSTGRES_PASSWORD" ]]; then
                    # Replace password in DATABASE_URL while preserving the rest of the URL
                    old_url="$DATABASE_URL"
                    user=$(echo "$old_url" | sed -E 's|^postgresql://([^:]+):.*@.*$|\1|')
                    rest=$(echo "$old_url" | sed -E 's|^postgresql://[^:]+:[^@]+@(.*)$|\1|')
                    echo "DATABASE_URL=postgresql://$user:$NEW_POSTGRES_PASSWORD@$rest"
                else
                    echo "$line"
                fi
                ;;
            MINIO_ROOT_USER=*)
                [[ -n "$NEW_MINIO_ROOT_USER" ]] && echo "MINIO_ROOT_USER=$NEW_MINIO_ROOT_USER" || echo "$line"
                ;;
            MINIO_ROOT_PASSWORD=*)
                [[ -n "$NEW_MINIO_ROOT_PASSWORD" ]] && echo "MINIO_ROOT_PASSWORD=$NEW_MINIO_ROOT_PASSWORD" || echo "$line"
                ;;
            PGADMIN_EMAIL=*)
                [[ -n "$NEW_PGADMIN_EMAIL" ]] && echo "PGADMIN_EMAIL=$NEW_PGADMIN_EMAIL" || echo "$line"
                ;;
            PGADMIN_PASSWORD=*)
                [[ -n "$NEW_PGADMIN_PASSWORD" ]] && echo "PGADMIN_PASSWORD=$NEW_PGADMIN_PASSWORD" || echo "$line"
                ;;
            REDIS_USERNAME=*)
                [[ -n "$NEW_REDIS_USERNAME" ]] && echo "REDIS_USERNAME=$NEW_REDIS_USERNAME" || echo "$line"
                ;;
            REDIS_PASSWORD=*)
                [[ -n "$NEW_REDIS_PASSWORD" ]] && echo "REDIS_PASSWORD=$NEW_REDIS_PASSWORD" || echo "$line"
                ;;
            *)
                echo "$line"
                ;;
        esac
    done < "$source_file" > "$target_file"

    debug_log "Created $target_file"
}

prompt_new_credentials() {
    local service=$1
    case $service in
        postgres)
            echo "Current PostgreSQL user: $POSTGRES_USER"
            read -p "Enter new PostgreSQL password: " NEW_POSTGRES_PASSWORD
            ;;
        minio)
            echo "Current MinIO user: $MINIO_ROOT_USER"
            read -p "Enter new MinIO username: " NEW_MINIO_ROOT_USER
            read -p "Enter new MinIO password: " NEW_MINIO_ROOT_PASSWORD
            ;;
        pgadmin)
            echo "Current pgAdmin email: $PGADMIN_EMAIL"
            read -p "Enter new pgAdmin email: " NEW_PGADMIN_EMAIL
            read -p "Enter new pgAdmin password: " NEW_PGADMIN_PASSWORD
            ;;
        redis)
            echo "Current Redis user: $REDIS_USERNAME"
            read -p "Enter new Redis username: " NEW_REDIS_USERNAME
            read -p "Enter new Redis password: " NEW_REDIS_PASSWORD
            ;;
    esac
}

update_postgres() {
    echo "Updating PostgreSQL password..."
    prompt_new_credentials postgres
    
    # Get the container info
    debug_log "Getting PostgreSQL container ID..."
    CONTAINER_NAME=$(docker compose ps -q postgres)
    debug_log "Container ID: $CONTAINER_NAME"
    
    if [ -z "$CONTAINER_NAME" ]; then
        echo "❌ PostgreSQL container is not running"
        return 1
    fi
    
    # Get network and image info from container using format queries
    debug_log "Getting container network and image info..."
    # TODO: Look up the network name, currently hardcoded to wavtopia-net
    NETWORK_NAME=$(docker inspect --format='{{index .NetworkSettings.Networks "wavtopia_wavtopia-net" "NetworkID"}}' "$CONTAINER_NAME")
    IMAGE_NAME=$(docker inspect --format='{{.Config.Image}}' "$CONTAINER_NAME")
    debug_log "Network: $NETWORK_NAME"
    debug_log "Image: $IMAGE_NAME"
    
    if [ -z "$NETWORK_NAME" ] || [ -z "$IMAGE_NAME" ]; then
        echo "❌ Failed to determine container configuration"
        debug_log "Network or image name is empty"
        return 1
    fi
    
    # Try to connect with current password and set new password
    debug_log "Attempting to update password..."
    debug_log "Running: docker run --rm --network $NETWORK_NAME -e PGPASSWORD=**** $IMAGE_NAME psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB"
    
    if ! OUTPUT=$(docker run --rm --network "$NETWORK_NAME" \
        -e PGPASSWORD="$POSTGRES_PASSWORD" \
        "$IMAGE_NAME" psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "ALTER USER $POSTGRES_USER WITH PASSWORD '$NEW_POSTGRES_PASSWORD';" 2>&1); then
        echo "❌ Failed to update PostgreSQL password"
        debug_log "Error output: $OUTPUT"
        return 1
    fi
    echo "✅ PostgreSQL password updated successfully"
    
    # Verify the new password works
    debug_log "Verifying new password..."
    if ! OUTPUT=$(docker run --rm --network "$NETWORK_NAME" \
        -e PGPASSWORD="$NEW_POSTGRES_PASSWORD" \
        "$IMAGE_NAME" psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "SELECT 1;" 2>&1); then
        echo "❌ New password verification failed"
        debug_log "Error output: $OUTPUT"
        return 1
    fi
    echo "✅ Verified new password works"
}

update_minio() {
    echo "Updating MinIO credentials..."
    prompt_new_credentials minio
    
    # Wait for MinIO to be ready by checking the health endpoint
    echo "Waiting for MinIO to be ready..."
    until docker compose exec -T minio curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; do
        sleep 1
    done

    # Configure mc with current credentials
    if ! docker compose exec -T minio mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; then
        echo "❌ Failed to authenticate with MinIO using current credentials"
        return 1
    fi

    # Update MinIO root credentials
    if docker compose exec -T minio mc admin user add local "$NEW_MINIO_ROOT_USER" "$NEW_MINIO_ROOT_PASSWORD" --update; then
        echo "✅ MinIO credentials updated successfully"
    else
        echo "❌ Failed to update MinIO credentials"
        return 1
    fi
}

update_pgadmin() {
    echo "Updating pgAdmin credentials..."
    prompt_new_credentials pgadmin
    
    # Set new credentials as environment variables for the container
    docker compose stop pgadmin
    if PGADMIN_EMAIL="$NEW_PGADMIN_EMAIL" PGADMIN_PASSWORD="$NEW_PGADMIN_PASSWORD" docker compose up -d pgadmin; then
        echo "✅ pgAdmin credentials updated successfully"
    else
        echo "❌ Failed to update pgAdmin credentials"
        return 1
    fi
}

update_redis() {
    echo "Updating Redis credentials..."
    prompt_new_credentials redis
    
    # Redis credentials are applied on container restart
    if docker compose restart redis; then
        echo "✅ Redis restarted with new credentials"
    else
        echo "❌ Failed to restart Redis"
        return 1
    fi
}

show_usage() {
    echo "Usage: $0 [--debug] [service...]"
    echo "Updates service credentials using values from .env"
    echo
    echo "Options:"
    echo "  --debug    Enable debug logging"
    echo
    echo "Available services:"
    echo "  postgres   - Update PostgreSQL password"
    echo "  minio     - Update MinIO credentials"
    echo "  pgadmin   - Update pgAdmin credentials"
    echo "  redis     - Restart Redis to apply new credentials"
    echo
    echo "If no service is specified, all services will be updated."
    echo "Multiple services can be specified: $0 postgres minio"
}

# Check if help is requested
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

echo "This script will update service credentials using values from .env"
echo "Make sure you have updated .env with the desired credentials before continuing."

# If no arguments provided, update all services
if [ $# -eq 0 ]; then
    read -p "Update all services? (y/n) " confirm
    if [ "$confirm" != "y" ]; then
        exit 0
    fi
    echo
    echo "Updating all service credentials..."
    update_postgres
    update_minio
    update_pgadmin
    update_redis
else
    # Update only specified services
    for service in "$@"; do
        case $service in
            postgres)
                update_postgres
                ;;
            minio)
                update_minio
                ;;
            pgadmin)
                update_pgadmin
                ;;
            redis)
                update_redis
                ;;
            *)
                echo "❌ Unknown service: $service"
                echo
                show_usage
                exit 1
                ;;
        esac
    done
fi

# After all updates are done, generate new env files
if [ $# -eq 0 ] || [ $# -gt 0 ]; then
    update_env_file ".env"
    update_env_file ".env.docker"
    echo
    echo "New environment files have been created:"
    echo "- .env.new"
    echo "- .env.docker.new"
    echo
    echo "Review the changes with:"
    echo "  diff .env .env.new"
    echo "  diff .env.docker .env.docker.new"
    echo
    echo "Then copy them over with:"
    echo "  cp .env.new .env"
    echo "  cp .env.docker.new .env.docker"
fi

echo
echo "✅ Credential updates completed"
if [ $# -eq 0 ]; then
    echo "Note: For Redis, restart the container to apply new credentials from .env"
fi 