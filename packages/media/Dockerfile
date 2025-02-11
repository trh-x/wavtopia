# Get the workspace image name from build args
ARG WORKSPACE_IMAGE
FROM ${WORKSPACE_IMAGE} AS prod-build

# Create deployment for media service
RUN pnpm --filter @wavtopia/media --prod deploy media-service

# Create the final image
FROM node:18-slim

# Install FFmpeg and build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    lame \
    # MilkyTracker dependencies
    build-essential \
    cmake \
    libsdl2-dev \
    libjack-dev \
    librtmidi-dev \
    zlib1g-dev \
    # Schism Tracker dependencies
    automake \
    autoconf-archive \
    libtool \
    libflac-dev \
    perl \
    pkgconf \
    libutf8proc-dev \
    # Clean up
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Build and install Schism Tracker from source
COPY packages/media/deps/schismtracker ./deps/schismtracker
RUN cd deps/schismtracker && \
    autoreconf -i && \
    mkdir -p build && \
    cd build && \
    ../configure && \
    make && \
    cp schismtracker /usr/local/bin/ && \
    cd ../.. && \
    rm -rf deps/schismtracker

# Build milkycli utility
COPY packages/media/deps/milkytracker ./deps/milkytracker

# Build MilkyTracker
RUN cd deps/milkytracker && \
    cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --target milkycli && \
    cp build/src/tools/milkycli/milkycli /usr/local/bin/ && \
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