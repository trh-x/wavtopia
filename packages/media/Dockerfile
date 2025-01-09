FROM node:18-slim

# Install FFmpeg and other required packages
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Create app directory
WORKDIR /app

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

# Create directories for file processing
RUN mkdir -p /tmp/uploads /tmp/converted && \
    chmod 777 /tmp/uploads /tmp/converted

# Expose port for API endpoints
EXPOSE 3001

# Set working directory to the media service
WORKDIR /app/packages/media

CMD ["pnpm", "start"] 