# Get the workspace image name from build args
ARG WORKSPACE_IMAGE
FROM ${WORKSPACE_IMAGE} AS prod-build

# Create deployment for media service
RUN pnpm --filter @wavtopia/media --prod deploy media-service

# Create the final image
FROM node:18-slim

# Add build arg for MilkyTracker version - needs to be redeclared after FROM
ARG MILKYTRACKER_COMMIT
# Debug output for MilkyTracker commit
RUN echo "Building with MilkyTracker commit: ${MILKYTRACKER_COMMIT:-unknown}"
# Use it in a label to force cache invalidation when it changes
LABEL org.opencontainers.image.revision.milkytracker="${MILKYTRACKER_COMMIT:-unknown}"

# Install FFmpeg and build dependencies
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

# Copy the media-service deployment
COPY --from=prod-build /app/media-service .

# Create directories for file processing
RUN mkdir -p /tmp/uploads /tmp/converted && \
    chmod 775 /tmp/uploads /tmp/converted

# Copy env file for the media service
COPY packages/media/.env.docker .env

ENV NODE_ENV=production

CMD ["node", "dist/index.js"] 