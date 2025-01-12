#!/bin/bash

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    ARCH="amd64"
fi

echo "Detected architecture: $ARCH"

# Remove existing node_modules to ensure clean state
rm -rf node_modules packages/*/node_modules
# Remove existing lockfile
rm -rf pnpm-lock.yaml

# Update dependencies and generate lockfile for current architecture
pnpm install

cp pnpm-lock.yaml pnpm-lock.${ARCH}.yaml

echo "Generated lockfile for $ARCH architecture: pnpm-lock.${ARCH}.yaml" 
