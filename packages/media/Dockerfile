# Get the workspace image name from build args
ARG WORKSPACE_IMAGE
FROM ${WORKSPACE_IMAGE} AS pruned

# Create pruned deployment for media service
RUN pnpm --filter @wavtopia/media --prod deploy pruned

# Create the final image
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

WORKDIR /app

# Copy the pruned deployment
COPY --from=pruned /app/pruned .

# Create directories for file processing
RUN mkdir -p /tmp/uploads /tmp/converted && \
    chmod 775 /tmp/uploads /tmp/converted

# Copy env file for the media service
COPY packages/media/.env.docker .env

ENV NODE_ENV=production

CMD ["node", "dist/index.js"] 