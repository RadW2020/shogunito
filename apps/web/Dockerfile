# ==============================================
# SHOGUN WEB - Dockerfile for Production
# ==============================================

# Stage 1: Dependencies
FROM node:20 AS deps

WORKDIR /app

# First copy only package files and regenerate lock from scratch for correct arch binaries
COPY package.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install dependencies fresh (without lock file to get correct native binaries)
# Use --legacy-peer-deps to handle version conflicts
# Include devDependencies needed for building
RUN npm install --legacy-peer-deps --include=dev

# Stage 2: Build
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install ALL dependencies (including devDependencies) needed for build
# Force production=false to ensure devDependencies are installed
RUN npm install --legacy-peer-deps --include=dev

# Now copy the source code (DON'T copy api - not needed for web build)
COPY apps/web ./apps/web
COPY packages ./packages

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_NODE_ENV=production

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV CI=true

# Build only shared and web (not api)
RUN npm run build --filter=@shogun/shared && \
    npm run build --filter=shogun-web

# Stage 2: Production with Nginx
FROM nginx:alpine AS production

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /usr/share/nginx/html

# Copy built static files from builder
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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3003/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
