# Get the workspace image name from build args
ARG WORKSPACE_IMAGE
FROM ${WORKSPACE_IMAGE} AS prod-build

RUN echo "==> Starting media build - creating deployment"
# Create deployment for media service
RUN pnpm --filter @wavtopia/media --prod deploy media-service
RUN echo "==> Deployment created"

# Create the final image
FROM node:18-slim

RUN echo "==> Setting up apt configuration"
# Configure apt to be more resilient
RUN echo "Acquire::http::Timeout \"5\";" > /etc/apt/apt.conf.d/99timeout && \
    echo "Acquire::ftp::Timeout \"5\";" >> /etc/apt/apt.conf.d/99timeout && \
    echo "Acquire::Retries \"3\";" >> /etc/apt/apt.conf.d/99timeout

RUN echo "==> Installing system dependencies"
# Install FFmpeg and build dependencies
RUN apt-get update -o Acquire::Check-Valid-Until=false && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    lame \
    build-essential \
    cmake \
    libsdl2-dev \
    libjack-dev \
    librtmidi-dev \
    zlib1g-dev \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN echo "==> Starting MilkyTracker build"
# Build export-to-wav utility
COPY packages/media/deps/milkytracker ./deps/milkytracker

# Build MilkyTracker
RUN cd deps/milkytracker && \
    cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --target export-to-wav && \
    cp build/src/tools/export-to-wav/export-to-wav /usr/local/bin/ && \
    cd ../.. && \
    rm -rf deps/milkytracker
RUN echo "==> MilkyTracker build complete"

WORKDIR /app

RUN echo "==> Copying media service deployment"
# Copy the media-service deployment
COPY --from=prod-build /app/media-service .

RUN echo "==> Creating processing directories"
# Create directories for file processing
RUN mkdir -p /tmp/uploads /tmp/converted && \
    chmod 775 /tmp/uploads /tmp/converted

RUN echo "==> Copying environment file"
# Copy env file for the media service
COPY packages/media/.env.docker .env

ENV NODE_ENV=production

RUN echo "==> Media build complete"

CMD ["node", "dist/index.js"] 