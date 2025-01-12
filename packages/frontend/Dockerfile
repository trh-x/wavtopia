# Get the workspace image name from build args
ARG WORKSPACE_IMAGE
FROM ${WORKSPACE_IMAGE} AS prod-build

# Create prod-build deployment for frontend build
RUN pnpm --filter @wavtopia/frontend --prod deploy frontend-build


# Create the final nginx image
FROM nginx:alpine

# Copy the built frontend files
COPY --from=prod-build /app/frontend-build/dist /usr/share/nginx/html

# Copy nginx configuration
COPY packages/frontend/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 