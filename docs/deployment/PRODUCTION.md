# Production Setup Guide - Shogun

Complete guide for deploying Shogun to production, including Docker, Git workflow, and macOS-specific considerations.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Methods](#deployment-methods)
4. [Git Workflow & Branch Protection](#git-workflow--branch-protection)
5. [macOS Production](#macos-production)
6. [Maintenance](#maintenance)

---

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Cloudflare Tunnel configured (see CLOUDFLARE_TUNNEL.md)
- Access to Git repository
- Domain configured in Cloudflare

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

## macOS Production

### ⚠️ macOS Limitations

**System behavior:**

- LaunchAgents only work while user logged in
- macOS may force updates/restarts
- Fewer server-focused tools than Linux

**Mitigations:**

- Use Docker for all services
- Configure auto-start scripts
- Set up monitoring and auto-restart
- Disable auto-sleep

### Essential macOS Setup

#### 1. Auto-start Docker

**Docker Desktop:**

- Preferences → General → "Start Docker Desktop when you log in" ✅

#### 2. Prevent Sleep

**Create caffeinate service:**

```bash
# Create script
cat > ~/caffeinate-server.sh << 'EOF'
#!/bin/bash
/usr/bin/caffeinate -d -i -m -s
EOF

chmod +x ~/caffeinate-server.sh

# Create LaunchAgent
cat > ~/Library/LaunchAgents/com.shogun.caffeinate.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.shogun.caffeinate</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/YOUR_USERNAME/caffeinate-server.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# Load service
launchctl load ~/Library/LaunchAgents/com.shogun.caffeinate.plist
```

**Verify:**

```bash
ps aux | grep caffeinate | grep -v grep
```

#### 3. Monitoring & Auto-restart

**Create check script:**

```bash
cat > ~/check-services.sh << 'EOF'
#!/bin/bash
cd ~/shogun  # or ~/shogun-production

# Check Docker
if ! docker info > /dev/null 2>&1; then
    open -a Docker
    sleep 10
fi

# Check services
if ! docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    docker-compose -f docker-compose.production.yml up -d
fi

# Check Cloudflare Tunnel
if ! pgrep -f "cloudflared tunnel run" > /dev/null; then
    cloudflared tunnel run shogun-tunnel > /dev/null 2>&1 &
fi
EOF

chmod +x ~/check-services.sh
```

**Add to crontab (check every 5 minutes):**

```bash
crontab -e
# Add:
*/5 * * * * ~/check-services.sh >> ~/Library/Logs/check-services.log 2>&1
```

#### 4. Startup Script

**Master startup script:**

```bash
cat > ~/start-production.sh << 'EOF'
#!/bin/bash
sleep 5  # Wait for system ready

# Start Docker
if ! docker info > /dev/null 2>&1; then
    open -a Docker
    sleep 15
fi

# Start services
cd ~/shogun
docker-compose -f docker-compose.production.yml up -d

# Start Cloudflare Tunnel
if ! pgrep -f "cloudflared tunnel run" > /dev/null; then
    cloudflared tunnel run shogun-tunnel > ~/Library/Logs/cloudflared.log 2>&1 &
fi

# Start caffeinate
if ! pgrep -f "caffeinate.*-d.*-i.*-m" > /dev/null; then
    ~/caffeinate-server.sh &
fi
EOF

chmod +x ~/start-production.sh
```

**Add to Login Items:**

- System Preferences → Users & Groups → Login Items
- Add `~/start-production.sh`

#### 5. Backups

**Database backup:**

```bash
cat > ~/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups/shogun
mkdir -p $BACKUP_DIR

docker exec shogun-postgres-prod pg_dump -U shogun_prod shogun_prod > \
    $BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql

# Keep last 7 days
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
EOF

chmod +x ~/backup-database.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add:
0 2 * * * ~/backup-database.sh >> ~/Library/Logs/backup.log 2>&1
```

### macOS System Settings

**Energy Saver:**

- Prevent automatic sleeping ✅
- Wake for network access ✅

**Software Update:**

- Disable automatic updates ✅
- Check manually before updating

**Security:**

- Disable "Log out after X minutes" ✅

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
curl https://shogunapi.uliber.com/health
curl https://shogunweb.uliber.com

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

1. Verify Cloudflare Tunnel is running
2. Check SSL/TLS mode is "Flexible" in Cloudflare
3. Wait 2-3 minutes for DNS/SSL propagation
4. Clear browser cache

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
- [ ] macOS auto-start configured (if applicable)

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
