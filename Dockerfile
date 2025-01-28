FROM node:18-slim AS base

SHELL ["/bin/sh", "-c"]

RUN echo "==> Starting workspace build - installing system dependencies"
# Install system dependencies - just openssl for now, to ensure it's aligned with the media service
# where openssl is installed as a by-product of the build process. The prisma client needs it.
RUN apt-get update && \
    apt-get install -y \
    openssl \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN echo "==> Installing pnpm"
# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Set pnpm home
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"

RUN echo "==> Copying workspace files"
# Copy workspace files first
COPY pnpm-workspace.yaml package.json ./
COPY pnpm-lock*.yaml ./

RUN echo "==> Copying packages"
# Copy all packages
COPY packages ./packages
# Copy env file for the core-storage package
COPY packages/core-storage/.env.docker packages/core-storage/.env

RUN echo "==> Copying scripts"
# Copy scripts
COPY scripts ./scripts

RUN echo "==> Installing dependencies"
# Install all dependencies
RUN pnpm arch-install --frozen-lockfile

RUN echo "==> Building all packages"
# Build all packages
RUN pnpm -r build

RUN echo "==> Workspace build complete"