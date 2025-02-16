# Get the workspace image name from build args
ARG WORKSPACE_IMAGE
FROM ${WORKSPACE_IMAGE} AS prod-build

# Create prod-build deployment for backend service
RUN pnpm --filter @wavtopia/backend --prod deploy backend-service

# Create the final image
FROM ${WORKSPACE_IMAGE} AS apt-base

# Install system dependencies - just openssl for now, to ensure it's aligned with the media service
# where openssl is installed as a by-product of the build process. The prisma client needs it.
RUN apt-get install -y --no-install-recommends \
    openssl \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the backend-service deployment
COPY --from=prod-build /app/backend-service .

# Create uploads directory for file processing
RUN mkdir -p /tmp/uploads && \
    chmod 775 /tmp/uploads

# Copy env file for the backend service
COPY packages/backend/.env.docker .env

ENV NODE_ENV=production

CMD ["node", "dist/index.js"] 