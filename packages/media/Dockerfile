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

# Copy the media service package
COPY packages/media ./packages/media

# Ensure .npmrc is used
COPY packages/media/.npmrc ./packages/media/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build TypeScript code
RUN cd packages/media && pnpm build

# Expose port for API endpoints
EXPOSE 3001

# Set working directory to the media service
WORKDIR /app/packages/media

CMD ["pnpm", "start"] 