FROM node:18-slim AS base

SHELL ["/bin/sh", "-c"]

# Install system dependencies - just openssl for now, to ensure it's aligned with the media service
# where openssl is installed as a by-product of the build process. The prisma client needs it.
RUN apt-get update && \
    apt-get install -y \
    openssl \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@9.15.5

WORKDIR /app

# Set pnpm home
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"

# Copy workspace files first
COPY pnpm-workspace.yaml package.json ./
COPY pnpm-lock*.yaml ./

# Copy all packages
COPY packages ./packages
# Copy env file for the core-storage package
COPY packages/core-storage/.env.docker packages/core-storage/.env

# Copy scripts
COPY scripts/apply-arch-lockfile.sh ./scripts/

# Install all dependencies
RUN pnpm arch-install --frozen-lockfile

# Build all packages
RUN pnpm -r build