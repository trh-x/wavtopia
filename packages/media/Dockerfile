FROM node:18-slim

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

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

# Build export-to-wav utility
COPY packages/media/deps/milkytracker ./deps/milkytracker
RUN cd deps/milkytracker && \
    cmake -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --target export-to-wav && \
    cp build/src/tools/export-to-wav/export-to-wav /usr/local/bin/ && \
    cd ../.. && \
    rm -rf deps/milkytracker

# Copy workspace files
COPY pnpm-*.yaml ./
COPY package.json ./
COPY packages/media/package.json ./packages/media/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/media/src ./packages/media/src
COPY packages/media/tsconfig.json ./packages/media/

# Build TypeScript code
RUN cd packages/media && pnpm build

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV EXPORT_TO_WAV_PATH=/usr/local/bin/export-to-wav

# Create directories for file processing
RUN mkdir -p /tmp/uploads /tmp/converted && \
    chmod 777 /tmp/uploads /tmp/converted

# Expose port for API endpoints
EXPOSE 3001

# Set working directory to the media service
WORKDIR /app/packages/media

CMD ["pnpm", "start"] 