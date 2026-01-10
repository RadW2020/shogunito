# Docker Guide - Shogun

Complete guide for Docker setup in development and production environments.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Development Setup](#development-setup)
3. [Production Setup](#production-setup)
4. [Optimization](#optimization)
5. [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture

- **Multi-stage builds**: Separate stages for dependencies, building, and production
- **Layer caching**: BuildKit cache mounts for faster builds
- **Health checks**: All services monitored automatically
- **Security**: Non-root users, proper signal handling

### Services

**Development (docker-compose.yml):**

- postgres:16 (port 5432)
- minio (ports 9000/9001)
- api (port 3000) - hot reload
- web (port 5173) - hot reload

**Production (docker-compose.production.yml):**

- postgres:16 (port 5433)
- minio (ports 9010/9011)
- api (port 3002) - optimized build
- web (port 3003) - nginx

---

## Development Setup

### Quick Start

```bash
# Start infrastructure only
docker-compose up -d postgres minio

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api web

# Stop services
docker-compose down
```

### Services

All services include health checks and auto-restart. Development uses hot reload with mounted volumes.

**Access:**

- API: http://localhost:3000
- Web: http://localhost:5173
- MinIO Console: http://localhost:9001
- PgAdmin: http://localhost:5050

---

## Production Setup

### 1. Environment Configuration

Copy and configure production environment files:

```bash
# Create .env files from templates
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For DATABASE_PASSWORD
```

### 2. Build and Deploy

```bash
# Build with BuildKit enabled
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.production.yml build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 3. Key Features

**Code Isolation:**

- Code is "frozen" in Docker images at build time
- Git branch changes don't affect running containers
- Full isolation from local development environment

**Production Ports (different from dev to avoid conflicts):**
| Service | Dev Port | Prod Port | Internal Port |
|---------------|----------|-----------|---------------|
| PostgreSQL | 5432 | 5433 | 5432 |
| MinIO API | 9000 | 9010 | 9000 |
| MinIO Console | 9001 | 9011 | 9001 |
| API | 3000 | 3002 | 3002 |
| Web | 5173 | 3003 | 3003 |

All services bind to 127.0.0.1 (localhost only). Use Cloudflare Tunnel to expose externally.

### 4. Update Workflow

```bash
# Pull latest code
git checkout main
git pull origin main

# Rebuild images
docker-compose -f docker-compose.production.yml build

# Restart with new images
docker-compose -f docker-compose.production.yml up -d

# Verify
docker-compose -f docker-compose.production.yml ps
curl http://localhost:3002/health
```

---

## Optimization

### BuildKit Cache

Enable BuildKit for faster builds:

```bash
# Enable globally
export DOCKER_BUILDKIT=1

# Or per command
DOCKER_BUILDKIT=1 docker build .
```

**Cache locations:**

- `/root/.npm` - npm package cache
- `/app/.turbo` - Turbo build cache
- `/app/node_modules` - Dependencies

### Dockerfiles

**API Dockerfile** (apps/api/Dockerfile):

- Stage 1: Install dependencies with cache mount
- Stage 2: Build TypeScript with turbo cache
- Stage 3: Production dependencies only
- Stage 4: Final minimal image (~150-200 MB)

**Web Dockerfile** (apps/web/Dockerfile):

- Stage 1: Install dependencies with cache mount
- Stage 2: Build React/Vite with turbo cache
- Stage 3: Nginx serving static files (~50-60 MB)

### Health Checks

All services have configured health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3002/health || exit 1
```

### Best Practices

1. **Order layers by change frequency:**

   ```dockerfile
   COPY package*.json ./    # Rarely changes
   RUN npm ci               # Changes occasionally
   COPY . .                 # Changes frequently
   RUN npm run build        # Final step
   ```

2. **Use .dockerignore:**

   ```
   node_modules
   dist
   .git
   *.log
   ```

3. **Non-root users:**

   ```dockerfile
   USER nodejs:nodejs
   ```

4. **Cache mounts:**
   ```dockerfile
   RUN --mount=type=cache,target=/root/.npm \
       npm ci --prefer-offline
   ```

---

## Troubleshooting

### Build Issues

**Cache not working:**

```bash
# Verify BuildKit is enabled
echo $DOCKER_BUILDKIT

# Clear cache and rebuild
docker builder prune -a
docker-compose build --no-cache
```

**Out of space:**

```bash
# Check disk usage
docker system df

# Clean up
docker system prune -a
docker volume prune
```

### Runtime Issues

**Health check failing:**

```bash
# Check health status
docker inspect --format='{{json .State.Health}}' container_name

# Test health endpoint
docker exec container_name wget --spider http://localhost:3002/health
```

**Services not starting:**

```bash
# View detailed logs
docker-compose logs --tail=100 api

# Recreate containers
docker-compose down -v
docker-compose up -d
```

**Hot reload not working (dev):**

```bash
# Check volumes are mounted
docker-compose config

# Increase file watchers (Linux)
sudo sysctl -w fs.inotify.max_user_watches=524288
```

### Permission Issues

**Non-root user can't write:**

```dockerfile
# Set proper ownership
COPY --chown=nodejs:nodejs ./dist ./dist

# Or create directories
RUN mkdir -p /app/uploads && chown nodejs:nodejs /app/uploads
```

### Performance

**Slow npm install:**

```dockerfile
# Use cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline
```

**Large images:**

```bash
# Check image sizes
docker images | grep shogun

# Use dive to analyze layers
dive shogun-api:latest
```

---

## Quick Commands Reference

```bash
# Development
docker-compose up -d                          # Start all
docker-compose up -d postgres minio           # Infrastructure only
docker-compose logs -f api                    # View logs
docker-compose restart api                    # Restart service
docker-compose down                           # Stop all
docker-compose down -v                        # Stop and remove volumes

# Production
docker-compose -f docker-compose.production.yml build    # Build images
docker-compose -f docker-compose.production.yml up -d    # Start services
docker-compose -f docker-compose.production.yml ps       # Status
docker-compose -f docker-compose.production.yml logs -f  # Logs
docker-compose -f docker-compose.production.yml down     # Stop

# Maintenance
docker system df                              # Check disk usage
docker system prune -a                        # Clean everything
docker volume ls                              # List volumes
docker logs container_name                    # View container logs
docker exec -it container_name sh             # Shell access
```

---

## Resources

- [Docker Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [BuildKit cache](https://docs.docker.com/build/cache/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Best practices](https://docs.docker.com/develop/dev-best-practices/)
