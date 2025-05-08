#!/bin/bash

set -e  # Exit on any error

# Debug mode flag
DEBUG=0
USE_ENV_PASSWORDS=0

# Debug logging function
debug_log() {
    if [ "$DEBUG" -eq 1 ]; then
        echo "🔍 DEBUG: $1" >&2
    fi
}

# Helper function to validate password characters
validate_password() {
    local password=$1
    # Allow only:
    # - ASCII letters (a-z, A-Z)
    # - Numbers (0-9)
    # - Special characters (-._~) that are URL-safe (needed for DATABASE_URL)
    if [[ ! "$password" =~ ^[-a-zA-Z0-9._~]+$ ]]; then
        echo "❌ Password contains invalid characters"
        echo "Allowed characters: letters, numbers, and -._~"
        return 1
    fi
    return 0
}

# Parse flags before other arguments
while [ $# -gt 0 ]; do
    case "$1" in
        --debug)
            DEBUG=1
            shift
            ;;
        --use-env)
            USE_ENV_PASSWORDS=1
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

# Variables for new passwords
NEW_POSTGRES_PASSWORD=""
NEW_MINIO_PASSWORD=""
NEW_PGADMIN_PASSWORD=""
NEW_REDIS_PASSWORD=""

# Create .env.new with updated passwords
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

    # Get DATABASE_URL from the current file being processed
    local current_database_url
    current_database_url=$(grep "^DATABASE_URL=" "$source_file" | cut -d'=' -f2-)

    # Create new env file with updated passwords
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
                    # Use the DATABASE_URL from the current file
                    user=$(echo "$current_database_url" | sed -E 's|^postgresql://([^:]+):.*@.*$|\1|')
                    rest=$(echo "$current_database_url" | sed -E 's|^postgresql://[^:]+:[^@]+@(.*)$|\1|')
                    echo "DATABASE_URL=postgresql://$user:$NEW_POSTGRES_PASSWORD@$rest"
                else
                    echo "$line"
                fi
                ;;
            MINIO_PASSWORD=*)
                [[ -n "$NEW_MINIO_PASSWORD" ]] && echo "MINIO_PASSWORD=$NEW_MINIO_PASSWORD" || echo "$line"
                ;;
            PGADMIN_PASSWORD=*)
                [[ -n "$NEW_PGADMIN_PASSWORD" ]] && echo "PGADMIN_PASSWORD=$NEW_PGADMIN_PASSWORD" || echo "$line"
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

assign_new_credentials() {
    local service=$1
    local password_var
    if [ "$USE_ENV_PASSWORDS" -eq 1 ]; then
        case $service in
            postgres)
                NEW_POSTGRES_PASSWORD="$POSTGRES_PASSWORD"
                ;;
            minio)
                NEW_MINIO_PASSWORD="$MINIO_PASSWORD"
                ;;
            pgadmin)
                NEW_PGADMIN_PASSWORD="$PGADMIN_PASSWORD"
                ;;
            redis)
                NEW_REDIS_PASSWORD="$REDIS_PASSWORD"
                ;;
        esac
        return
    fi
    case $service in
        postgres)
            echo "Current PostgreSQL user: $POSTGRES_USER"
            while true; do
                read -p "Enter new PostgreSQL password: " password_var
                if validate_password "$password_var"; then
                    NEW_POSTGRES_PASSWORD=$password_var
                    break
                fi
            done
            ;;
        minio)
            echo "Current MinIO user: $MINIO_USER"
            while true; do
                read -p "Enter new MinIO password: " password_var
                if validate_password "$password_var"; then
                    NEW_MINIO_PASSWORD=$password_var
                    break
                fi
            done
            ;;
        pgadmin)
            echo "Current pgAdmin email: $PGADMIN_EMAIL"
            while true; do
                read -p "Enter new pgAdmin password: " password_var
                if validate_password "$password_var"; then
                    NEW_PGADMIN_PASSWORD=$password_var
                    break
                fi
            done
            ;;
        redis)
            echo "Current Redis user: $REDIS_USERNAME"
            while true; do
                read -p "Enter new Redis password: " password_var
                if validate_password "$password_var"; then
                    NEW_REDIS_PASSWORD=$password_var
                    break
                fi
            done
            ;;
    esac
}

update_postgres() {
    echo "Updating PostgreSQL password..."
    assign_new_credentials postgres
    
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
    echo "Updating MinIO password..."
    assign_new_credentials minio
    
    # Wait for MinIO to be ready by checking the health endpoint
    echo "Waiting for MinIO to be ready..."
    until docker compose exec -T minio curl -sf http://localhost:9000/minio/health/live > /dev/null 2>&1; do
        sleep 1
    done

    # Configure mc with root credentials
    if ! docker compose exec -T minio mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; then
        echo "❌ Failed to authenticate with MinIO using root credentials"
        return 1
    fi

    # Remove existing user and recreate with new password
    echo "Removing existing MinIO user '$MINIO_USER'..."
    
    # First detach any existing policies
    if docker compose exec -T minio mc admin user info local "$MINIO_USER" > /dev/null 2>&1; then
        debug_log "User exists, detaching policies..."
        # Ignore errors here as the policy might not be attached
        docker compose exec -T minio mc admin policy detach local readwrite --user="$MINIO_USER" > /dev/null 2>&1 || true
        
        # Remove the user
        if ! docker compose exec -T minio mc admin user remove local "$MINIO_USER"; then
            echo "❌ Failed to remove existing MinIO user"
            return 1
        fi
        echo "✅ Removed existing MinIO user"
    else
        debug_log "User does not exist, proceeding with creation"
    fi

    # Create user with new password
    echo "Creating MinIO user with new password..."
    if ! docker compose exec -T minio mc admin user add local "$MINIO_USER" "$NEW_MINIO_PASSWORD"; then
        echo "❌ Failed to create MinIO user"
        return 1
    fi

    # Attach readwrite policy
    echo "Attaching readwrite policy..."
    if ! docker compose exec -T minio mc admin policy attach local readwrite --user="$MINIO_USER"; then
        echo "❌ Failed to attach policy to MinIO user"
        return 1
    fi

    echo "✅ MinIO password updated successfully"
}

update_pgadmin() {
    echo "Updating pgAdmin password..."
    assign_new_credentials pgadmin

    if [ "$USE_ENV_PASSWORDS" -eq 1 ]; then
        echo "ℹ️  No .env file update is needed; password is already set in the current .env file. Restart the pgAdmin container to apply the change."
    else
        echo "ℹ️  pgAdmin password will be applied after updating .env files and restarting the container"
    fi
}

update_redis() {
    echo "Updating Redis password..."
    assign_new_credentials redis

    if [ "$USE_ENV_PASSWORDS" -eq 1 ]; then
        echo "ℹ️  No .env file update is needed; password is already set in the current .env file. Restart the Redis container to apply the change."
    else
        echo "ℹ️  Redis password will be applied after updating .env files and restarting the container"
    fi
}

show_usage() {
    echo "Usage: $0 [--debug] [--use-env] [service...]"
    echo "Updates service passwords by prompting for new values or using .env values"
    echo
    echo "Options:"
    echo "  --debug      Enable debug logging"
    echo "  --use-env    Use passwords from current .env file (no prompt)"
    echo
    echo "Available services:"
    echo "  postgres   - Update PostgreSQL password"
    echo "  minio     - Update MinIO password"
    echo "  pgadmin   - Update pgAdmin password"
    echo "  redis     - Update Redis password"
    echo
    echo "If no service is specified, all services will be updated."
    echo "Multiple services can be specified: $0 postgres minio"
}

# Check if help is requested
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

if [ "$USE_ENV_PASSWORDS" -eq 1 ]; then
    echo "This script will use passwords from the current .env file for each service."
else
    echo "This script will prompt for new passwords for each service."
    echo "The changes will be saved to new .env files for review"
fi
echo
echo "Allowed password characters:"
echo "- Letters (a-z, A-Z)"
echo "- Numbers (0-9)"
echo "- Special characters: -._~"
echo

# If no arguments provided, update all services
if [ $# -eq 0 ]; then
    read -p "Update all services? (y/n) " confirm
    if [ "$confirm" != "y" ]; then
        exit 0
    fi
    echo
    echo "Updating all service passwords..."
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
if [ "$USE_ENV_PASSWORDS" -eq 1 ]; then
    echo
    echo "--use-env was set: No new .env files were created. Passwords were taken from the current .env file."
elif [ $# -eq 0 ] || [ $# -gt 0 ]; then
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
    echo
    echo "Finally, distribute the new env values to packages:"
    echo "  ./scripts/distribute-env.sh .env"
    echo "  ./scripts/distribute-env.sh .env.docker"
fi

echo
echo "✅ Password updates completed" 