#!/bin/bash

set -e

# Check if an argument is provided
if [ $# -ne 1 ]; then
    echo "Usage: $0 <.env file>"
    echo "Example: $0 .env.docker"
    exit 1
fi

SOURCE_ENV="$1"

# Check if source env file exists
if [ ! -f "$SOURCE_ENV" ]; then
    echo "Error: File $SOURCE_ENV does not exist"
    exit 1
fi

# Function to extract env vars used in a config file
extract_env_vars() {
    local config_file="$1"
    grep -o 'process\.env\.[A-Z_]\+' "$config_file" | sed 's/process\.env\.//'
}

# Function to create package env file with matching vars
create_package_env() {
    local package_dir="$1"
    local config_file="$2"
    local target_env="$3"
    local source_env="$4"
    local core_storage_vars="$5"
    
    # Get the list of env vars used in config
    local env_vars=$(extract_env_vars "$config_file")
    
    # For packages that depend on core-storage, include its vars
    if [ ! -z "$core_storage_vars" ]; then
        env_vars=$(echo -e "$env_vars\n$core_storage_vars" | sort -u)
    fi
    
    echo "# Generated from $source_env" > "$target_env"
    echo "# Variables used by $(basename $package_dir)" >> "$target_env"
    if [ ! -z "$core_storage_vars" ]; then
        echo "# Including variables from core-storage package" >> "$target_env"
    fi
    echo "" >> "$target_env"
    
    # For each env var in the source file
    while IFS= read -r line; do
        # Skip comments and empty lines
        if [[ $line =~ ^[[:space:]]*# || -z $line ]]; then
            continue
        fi
        
        # Get the variable name (everything before =)
        local var_name=$(echo "$line" | cut -d= -f1)
        
        # Check if this var is used in the config
        if echo "$env_vars" | grep -q "^$var_name$"; then
            # If there's a comment above this var in source, copy it
            local comment=$(grep -B 1 "^$var_name=" "$source_env" | grep "^#" || true)
            if [ ! -z "$comment" ]; then
                echo "$comment" >> "$target_env"
            fi
            echo "$line" >> "$target_env"
        fi
    done < "$source_env"
    
    echo "Created $(basename $target_env) for $(basename $package_dir)"
}

# First, get core-storage env vars since they'll be needed by other packages
CORE_STORAGE_VARS=""
if [ -f "packages/core-storage/src/config.ts" ]; then
    CORE_STORAGE_VARS=$(extract_env_vars "packages/core-storage/src/config.ts")
fi

# Process each package (excluding core-storage)
for package_dir in packages/*; do
    if [ -d "$package_dir" ] && [ "$(basename $package_dir)" != "core-storage" ]; then
        config_file="$package_dir/src/config.ts"
        if [ -f "$config_file" ]; then
            # Create the same type of env file in the package
            target_env="$package_dir/$(basename $SOURCE_ENV)"
            create_package_env "$package_dir" "$config_file" "$target_env" "$SOURCE_ENV" "$CORE_STORAGE_VARS"
        fi
    fi
done

echo "Environment files distribution complete!" 