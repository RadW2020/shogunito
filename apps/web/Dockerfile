# ==============================================
# SHOGUN WEB - Dockerfile for Production
# ==============================================
# Optimized multi-stage build with layer caching and BuildKit

# syntax=docker/dockerfile:1.4

# Stage 1: Dependencies
FROM node:20-alpine AS deps

# Install build tools and libc-compat for native modules (like lightningcss used by Vite)
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Copy only package files for better layer caching
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY turbo.json ./

# Install all dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# Stage 2: Build
FROM node:20-alpine AS builder

# Install build tools needed for any native rebuilds during build stage
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files and source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_NODE_ENV=production

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV CI=true

# Build shared first, then web (turbo will cache unchanged packages)
RUN --mount=type=cache,target=/app/.turbo \
    npm run build --filter=@shogun/shared && \
    npm run build --filter=shogun-web

# Stage 3: Production with Nginx
FROM nginx:alpine AS production

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /usr/share/nginx/html

# Copy built files from builder
COPY --from=builder /app/apps/web/dist ./

# Copy custom nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions for nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 3003

# Add labels for metadata
LABEL org.opencontainers.image.title="Shogun Web"
LABEL org.opencontainers.image.description="Shogun Web frontend application"
LABEL org.opencontainers.image.vendor="Shogun"
LABEL maintainer="Shogun Team"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3003/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
