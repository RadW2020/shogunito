# ==============================================
# SHOGUN WEB - Dockerfile for Production
# ==============================================
# Optimized multi-stage build with layer caching and BuildKit

# syntax=docker/dockerfile:1.4

# Stage 1: Dependencies
FROM node:20 AS deps

WORKDIR /app

# Install build tools required for native modules compilation
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy only package files for better layer caching
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY turbo.json ./

# Install all dependencies
# npm ci has a bug with optional dependencies in some environments, 
# so we use a standard install and rebuild to ensure native binaries match the platform
RUN npm install && \
    npm rebuild

# Stage 2: Build
FROM node:20 AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules


# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY turbo.json ./

# Copy source code (needed for shared package and web)
COPY packages ./packages
COPY apps/web ./apps/web
# Copy API source if it exists (for type references, but we won't build it)
COPY apps/api ./apps/api

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_NODE_ENV=production

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_NODE_ENV=$VITE_NODE_ENV

# Build
RUN npm run build --filter=@shogun/shared && \
    npm run build --filter=shogun-web

# Stage 3: Production with Nginx
FROM nginx:alpine AS production

# Install wget for healthcheck
RUN apk add --no-cache wget

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Copy built files from builder
COPY --from=builder --chown=nginx:nginx /app/apps/web/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY --chown=nginx:nginx apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 3003

# Add labels for metadata
LABEL org.opencontainers.image.title="Shogun Web"
LABEL org.opencontainers.image.description="Shogun Web frontend application"
LABEL org.opencontainers.image.vendor="Shogun"
LABEL maintainer="Shogun Team"

# Health check (nginx listens on port 3003 inside container)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3003/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

