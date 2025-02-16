# Get the workspace image names from build args
ARG WORKSPACE_IMAGE
ARG WORKSPACE_APT_IMAGE

# Build the tools image first
FROM wavtopia-tools AS tools

# Use workspace image for building
FROM ${WORKSPACE_IMAGE} AS prod-build

# Create deployment for media service
RUN pnpm --filter @wavtopia/media --prod deploy media-service

# Create the final image
FROM ${WORKSPACE_APT_IMAGE}

# Install runtime dependencies only
RUN apt-get install -y --no-install-recommends \
    ffmpeg \
    lame \
    # Schism Tracker dependencies
    libjack0 \
    libutf8proc2 \
    # Clean up
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy the compiled tools from the tools image
COPY --from=tools /usr/local/bin/schismtracker /usr/local/bin/
COPY --from=tools /usr/local/bin/milkycli /usr/local/bin/

WORKDIR /app

# Copy the media-service deployment
COPY --from=prod-build /app/media-service .

# Create directories for file processing
RUN mkdir -p /tmp/uploads /tmp/converted && \
    chmod 775 /tmp/uploads /tmp/converted && \
    # Create XDG runtime directory for schismtracker
    mkdir -p /run/user/1000 && \
    chmod 700 /run/user/1000 && \
    # Create schismtracker config directory
    mkdir -p /root/.config/schism

# Copy schismtracker config
COPY config/schism/config /root/.config/schism/config

# Set environment variables for schismtracker
ENV XDG_RUNTIME_DIR=/run/user/1000
ENV SDL_AUDIODRIVER=disk

# Copy env file for the media service
COPY .env.docker .env

ENV NODE_ENV=production

CMD ["node", "dist/index.js"] 