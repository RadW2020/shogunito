# Production Setup Guide - Shogun

Complete guide for deploying Shogun to production, including Docker and Git workflow.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Methods](#deployment-methods)
4. [Git Workflow & Branch Protection](#git-workflow--branch-protection)
5. [Oracle Cloud Setup](#deployment-on-oracle-cloud-free-tier-linux)
6. [Maintenance](#maintenance)

---

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- [Coolify](https://coolify.io) instance on Oracle Free Tier
- Access to Git repository

### Deploy in 5 Minutes

```bash
# 1. Clone or pull latest
git checkout main
git pull origin main

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit .env files with production values

# 3. Start services
docker-compose -f docker-compose.production.yml up -d

# 4. Verify
docker-compose -f docker-compose.production.yml ps
curl http://localhost:3002/health
curl http://localhost:3003
```

---

## Environment Configuration

### API Configuration (apps/api/.env)

```bash
# Generate secure secrets
openssl rand -base64 32  # For each secret below

# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USERNAME=shogun_prod
DATABASE_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DATABASE_NAME=shogun_prod

# Authentication
# ⚠️ CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET MUST remain the same between deployments
# If these change, all existing user sessions will be invalidated and users will be forced to login again.
# Generate once and keep them consistent:
#   openssl rand -base64 32  # For JWT_SECRET
#   openssl rand -base64 32  # For JWT_REFRESH_SECRET
JWT_SECRET=CHANGE_THIS_JWT_SECRET
JWT_REFRESH_SECRET=CHANGE_THIS_REFRESH_SECRET
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# MinIO Storage
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=CHANGE_THIS_ACCESS_KEY
MINIO_SECRET_KEY=CHANGE_THIS_SECRET_KEY
MINIO_BUCKET=shogun-production

# Application
NODE_ENV=production
PORT=3002
FRONTEND_URL=https://shogunweb.uliber.com
```

### Frontend Configuration (apps/web/.env)

```bash
VITE_API_URL=https://shogunapi.uliber.com
VITE_NODE_ENV=production
```

### Security Checklist

- [ ] All secrets changed from defaults
- [ ] Strong passwords (32+ characters)
- [ ] JWT secrets are unique and **consistent between deployments** (critical for session persistence)
- [ ] CORS configured for specific domains
- [ ] Database password is strong
- [ ] MinIO credentials are secure

### ⚠️ Important: JWT Secrets and Session Persistence

**CRITICAL:** The `JWT_SECRET` and `JWT_REFRESH_SECRET` values **MUST remain the same** between deployments.

**Why?** These secrets are used to sign and verify JWT tokens. If they change:

- All existing tokens in users' browsers become invalid
- Users will be forced to login again after each deployment
- This creates a poor user experience

**Solution:**

1. Generate strong secrets once: `openssl rand -base64 32`
2. Store them in `apps/api/.env.production`
3. **Never change them** unless you want to invalidate all sessions
4. Keep the `.env.production` file backed up and consistent across deployments

The application will now validate these secrets on startup and refuse to start if they're using default values.

---

## Deployment Methods

### Method 1: Docker (Recommended)

**Advantages:**

- ✅ Code isolated in Docker images
- ✅ Git branch changes don't affect running containers
- ✅ Easy rollback and updates
- ✅ Consistent across environments

**Deploy:**

```bash
# Build images
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.production.yml build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Monitor
docker-compose -f docker-compose.production.yml logs -f
```

**Update:**

```bash
git pull origin main
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

### Method 2: Separate Production Directory

**Use case:** Keep production separate from development.

```bash
# Create production directory
mkdir -p ~/shogun-production
cd ~/shogun-production

# Clone repository
git clone <repo-url> .
git checkout main

# Configure and deploy
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit .env files

docker-compose -f docker-compose.production.yml up -d
```

### Method 3: Same Directory with Guards

**Use case:** Single directory for dev and prod.

**Protection via Docker:** Services run in containers, isolated from code changes.

**Additional safety (systemd):**

```bash
# Create /etc/systemd/system/shogun-api.service
[Unit]
Description=Shogun API
After=docker.service

[Service]
Type=oneshot
WorkingDirectory=/home/user/shogun
ExecStartPre=/usr/bin/git checkout main
ExecStartPre=/usr/bin/git pull origin main
ExecStart=/usr/bin/docker-compose -f docker-compose.production.yml up -d
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

---

## Git Workflow & Branch Protection

### Branch Strategy

```
dev (development) → Pull Request → main (production)
```

### Protect main Branch

**GitHub:**

1. Settings → Branches → Add rule for `main`
2. Enable:
   - ✅ Require pull request before merging
   - ✅ Require approvals (1+)
   - ✅ Require status checks to pass
   - ✅ Require conversation resolution
3. Restrict pushes to `main` (allow only via PR)

**GitLab:**

1. Settings → Repository → Protected branches
2. `main` branch:
   - Allowed to merge: Developers/Maintainers
   - Allowed to push: No one
   - Force push: Disabled

### Enforce dev → main Flow

**GitHub Actions** (.github/workflows/require-dev-branch.yml):

```yaml
name: Require merge from dev
on:
  pull_request:
    branches: [main]

jobs:
  check-source:
    runs-on: ubuntu-latest
    steps:
      - name: Check source branch
        run: |
          if [ "${{ github.event.pull_request.head.ref }}" != "dev" ]; then
            echo "❌ PRs to main must come from dev"
            exit 1
          fi
```

### Development Workflow

```bash
# Work on dev
git checkout dev
git pull origin dev

# Make changes
git add .
git commit -m "feat: new feature"
git push origin dev

# Create PR: dev → main
# After review and approval, merge

# Deploy from main
git checkout main
git pull origin main
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

---


---

## Deployment on Oracle Cloud Free Tier (Linux)

Since the project has been migrated to Oracle Free Tier, it runs on Linux (Oracle Linux/Ubuntu).

### Recommended Setup

1. **Coolify**: Use Coolify to manage your Docker Compose deployment.
2. **Postgres & MinIO**: Can be managed as separate Coolify resources or within the stack.
3. **SSL/TLS**: Automatically handled by Coolify's built-in proxy.

### Security on Oracle Cloud

- Ensure the VCN (Virtual Cloud Network) Security List or Network Security Group allows inbound traffic on port 80/443 (managed by Coolify).
- Coolify handles the firewall rules for your containers internally.


---

## Maintenance

### Monitoring

**Local checks:**

```bash
# Service status
docker-compose -f docker-compose.production.yml ps

# Health endpoints
curl http://localhost:3002/health
curl http://localhost:3003

# Public endpoints
curl https://shogunapi.yourdomain.com/health
curl https://shogunweb.yourdomain.com

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

**External monitoring (recommended):**

- [UptimeRobot](https://uptimerobot.com) - Free, checks every 5 min
- [Pingdom](https://www.pingdom.com) - More advanced

### Updates

```bash
# 1. Backup database
~/backup-database.sh

# 2. Pull latest
git checkout main
git pull origin main

# 3. Rebuild
docker-compose -f docker-compose.production.yml build

# 4. Deploy
docker-compose -f docker-compose.production.yml up -d

# 5. Verify
docker-compose -f docker-compose.production.yml ps
curl http://localhost:3002/health
```

### Rollback

```bash
# Stop current
docker-compose -f docker-compose.production.yml down

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild and start
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

### Database Backup & Restore

**Backup:**

```bash
docker exec shogun-postgres-prod pg_dump -U shogun_prod shogun_prod > backup.sql
```

**Restore:**

```bash
docker exec -i shogun-postgres-prod psql -U shogun_prod shogun_prod < backup.sql
```

### Logs Management

**View logs:**

```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f api

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100 api
```

**Log rotation:**
Docker handles log rotation automatically. Configure in docker-compose:

```yaml
logging:
  driver: 'json-file'
  options:
    max-size: '10m'
    max-file: '3'
```

---

## Troubleshooting

### Services Not Starting

```bash
# Check Docker
docker info

# View logs
docker-compose -f docker-compose.production.yml logs

# Recreate containers
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml up -d
```

### Database Connection Issues

```bash
# Check database is running
docker-compose -f docker-compose.production.yml ps postgres

# Check connectivity
docker exec shogun-postgres-prod pg_isready -U shogun_prod

# View database logs
docker-compose -f docker-compose.production.yml logs postgres
```

### SSL/HTTPS Issues

1. Verify Coolify Proxy is running
2. Check your domain's A/CNAME records point to your Oracle IP
3. Ensure SSL certificate generation in Coolify is successful

---

## Production Checklist

### Pre-deployment

- [ ] `.env` files configured with production values
- [ ] All secrets changed from defaults
- [ ] Database password is strong
- [ ] JWT secrets are unique
- [ ] CORS configured for production domains
- [ ] Branch protection enabled on `main`
- [ ] CI/CD configured (if using)

### Post-deployment

- [ ] Services running: `docker-compose ps`
- [ ] Health checks passing
- [ ] Public domains accessible
- [ ] HTTPS working (green lock)
- [ ] Database initialized
- [ ] Backups configured
- [ ] Monitoring set up


---

## Quick Commands

```bash
# Deploy
docker-compose -f docker-compose.production.yml up -d

# Update
git pull && docker-compose -f docker-compose.production.yml build && docker-compose -f docker-compose.production.yml up -d

# Logs
docker-compose -f docker-compose.production.yml logs -f

# Status
docker-compose -f docker-compose.production.yml ps

# Stop
docker-compose -f docker-compose.production.yml down

# Backup
docker exec shogun-postgres-prod pg_dump -U shogun_prod shogun_prod > backup.sql
```

---

**Last Updated:** 2025-01-19
