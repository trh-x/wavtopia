FROM node:18-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    build-essential \
    cmake \
    libsdl2-dev \
    libjack-dev \
    librtmidi-dev \
    zlib1g-dev \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Build export-to-wav utility
COPY packages/media/deps/milkytracker ./deps/milkytracker
RUN cd deps/milkytracker && \
    cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --target export-to-wav && \
    cp build/src/tools/export-to-wav/export-to-wav /usr/local/bin/ && \
    cd ../.. && \
    rm -rf deps/milkytracker

# Install pnpm and typescript globally
RUN npm install -g pnpm typescript

WORKDIR /app

# Copy workspace files and env files first
COPY package.json pnpm-workspace.yaml ./
COPY packages/media/package.json packages/media/
COPY packages/core-storage/package.json packages/core-storage/
COPY packages/core-storage/prisma packages/core-storage/prisma/

# Install dependencies in two steps to handle workspace packages correctly
# TODO: Use pnpm deploy instead of install, with a multi-stage build.
# See https://pnpm.io/cli/deploy
RUN pnpm install --no-frozen-lockfile --ignore-scripts && \
    cd packages/core-storage && pnpm install --no-frozen-lockfile --ignore-scripts && \
    pnpm prisma generate && cd ../.. && \
    cd packages/media && pnpm install --no-frozen-lockfile --ignore-scripts && cd ../..

# Copy source files
COPY packages/core-storage packages/core-storage/
COPY packages/media packages/media/

# Ensure .env file wasn't overwritten by the full copy
COPY packages/media/.env.docker packages/media/.env

# Build packages using global TypeScript
RUN cd packages/core-storage && tsc && \
    cd ../media && tsc

# Create directories for file processing
RUN mkdir -p /tmp/uploads /tmp/converted && \
    chmod 775 /tmp/uploads /tmp/converted

# Set working directory to the media service
WORKDIR /app/packages/media

# Only set NODE_ENV, let other vars come from .env
ENV NODE_ENV=production

CMD ["node", "dist/index.js"] 