# Get the workspace image name from build args
ARG WORKSPACE_IMAGE
FROM ${WORKSPACE_IMAGE} AS prod-build

# Create deployment for media service
RUN pnpm --filter @wavtopia/media --prod deploy media-service

# Create the final image
FROM node:18-slim

# Add build arg for MilkyTracker version
ARG MILKYTRACKER_COMMIT

# Debug: Show what Docker sees
RUN echo "Build arg MILKYTRACKER_COMMIT is: ${MILKYTRACKER_COMMIT}" && \
    ls -la /deps/milkytracker || true

# Add label for information purposes (not for cache invalidation)
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

# Debug: Show contents after copy
RUN echo "After COPY, contents are:" && \
    ls -la /deps/milkytracker

# Create commit file in its own layer for debugging
RUN echo "Creating commit file with: ${MILKYTRACKER_COMMIT}" && \
    echo "${MILKYTRACKER_COMMIT:-unknown}" > /deps/milkytracker/.commit && \
    echo "Commit file contents:" && \
    cat /deps/milkytracker/.commit

# Build MilkyTracker
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