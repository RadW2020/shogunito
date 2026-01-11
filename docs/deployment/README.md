# Deployment Documentation

Complete deployment guides and scripts for Shogunito production setup.

## 📚 Documentation

### Core Guides (Start Here)

- **[PRODUCTION.md](./PRODUCTION.md)** - Complete production setup guide
  - Environment configuration
  - Deployment methods (Docker, separate directory, systemd)
  - Git workflow & branch protection

  - Maintenance and troubleshooting

- **[DOCKER.md](./DOCKER.md)** - Docker guide for development and production
  - Development setup with hot reload
  - Production builds with multi-stage Dockerfiles
  - BuildKit optimization
  - Health checks and best practices

- **[COOLIFY.md](./COOLIFY.md)** - Coolify deployment guide (Coming soon)
  - Automatic deployments on Oracle Free Tier
  - SSL/TLS via Coolify Proxy
  - Database and storage management


## 🎯 Quick Start

### Docker Production (Recommended)

```bash
# 1. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit .env files with production values

# 2. Build and deploy
docker-compose -f docker-compose.production.yml up -d

# 3. Setup Coolify
# Follow instructions in COOLIFY.md
```

### Traditional Production

```bash
# 1. Create separate production directory
mkdir -p ~/shogunito-production
cd ~/shogunito-production
git clone <repo-url> .

# 2. Configure and deploy
# See PRODUCTION.md for complete steps
```


## 📖 What's in Each Guide

### PRODUCTION.md

- Quick 5-minute deployment
- Environment variables configuration
- Docker vs traditional vs systemd deployment
- Git branch protection (GitHub/GitLab)

- Monitoring and maintenance
- Complete troubleshooting section

### DOCKER.md

- Development and production setups
- Port configurations (dev vs prod)
- BuildKit cache optimization
- Multi-stage build architecture
- Health checks configuration
- Troubleshooting guide
- Command reference


## 🔄 Recent Changes (2025-01-19)

Documentation has been consolidated and optimized:

- **Updated:** PRODUCTION.md (removed macOS content)
- **Updated:** Migrated to Coolify on Oracle Free Tier

## 📊 File Structure

```
docs/deployment/
├── README.md                   # This file
├── PRODUCTION.md              # Complete production guide (~600 lines)
├── DOCKER.md                  # Docker setup guide (~330 lines)

```

---

**Last Updated:** 2025-01-19
