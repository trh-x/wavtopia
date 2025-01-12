#!/bin/bash

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    ARCH="amd64"
fi

echo "Detected architecture: $ARCH"

cp pnpm-lock.${ARCH}.yaml pnpm-lock.yaml

echo "Applied lockfile for $ARCH architecture: pnpm-lock.${ARCH}.yaml -> pnpm-lock.yaml" 
