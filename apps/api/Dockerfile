# ==============================================
# SHOGUN API - Dockerfile for Production
# ==============================================
# Optimized multi-stage build with layer caching and BuildKit

# syntax=docker/dockerfile:1.4

# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files for better layer caching
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY turbo.json ./

# Install all dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# Stage 2: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY turbo.json ./

# Copy source code (only what's needed for API and shared)
COPY packages ./packages
COPY apps/api ./apps/api

# Build shared first, then API (turbo will cache unchanged packages)
RUN --mount=type=cache,target=/app/.turbo \
    npm run build --filter=@shogun/shared && \
    npm run build --filter=shogun-api

# Stage 3: Production dependencies
FROM node:20-alpine AS prod-deps

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/typescript-config/package*.json ./packages/typescript-config/
COPY turbo.json ./

# Install only production dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --prefer-offline

# Stage 4: Production
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling and wget for healthcheck
RUN apk add --no-cache dumb-init wget

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/package*.json ./

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package*.json ./apps/api/
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/src ./packages/shared/src
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/package*.json ./packages/shared/

# Set working directory to API
WORKDIR /app/apps/api

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3002

# Add labels for metadata
LABEL org.opencontainers.image.title="Shogun API"
LABEL org.opencontainers.image.description="Shogun API backend service"
LABEL org.opencontainers.image.vendor="Shogun"
LABEL maintainer="Shogun Team"

# Health check with increased frequency
# Note: Using -O /dev/null instead of --spider because the /health endpoint only handles GET, not HEAD
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 -O /dev/null http://localhost:3002/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]

