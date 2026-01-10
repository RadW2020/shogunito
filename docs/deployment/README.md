# Deployment Documentation

Complete deployment guides and scripts for Shogun production setup.

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

- **[CLOUDFLARE_TUNNEL.md](./CLOUDFLARE_TUNNEL.md)** - Cloudflare Tunnel setup
  - Installation and authentication
  - Configuration and DNS setup
  - Service installation (launchd/systemd)
  - SSL/TLS configuration


## 🎯 Quick Start

### Docker Production (Recommended)

```bash
# 1. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit .env files with production values

# 2. Build and deploy
docker-compose -f docker-compose.production.yml up -d

# 3. Setup Cloudflare Tunnel
# See CLOUDFLARE_TUNNEL.md
```

### Traditional Production

```bash
# 1. Create separate production directory
mkdir -p ~/shogun-production
cd ~/shogun-production
git clone <repo-url> .

# 2. Configure and deploy
# See PRODUCTION.md for complete steps
```

## 🔧 Utility Scripts

**Cloudflare Tunnel Management:**

- `check-cloudflare.sh` - Diagnostic script
- `restart-cloudflare.sh` - Quick restart


**Usage:**

```bash
# From deployment directory
cd docs/deployment
./check-cloudflare.sh
./restart-cloudflare.sh
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

### CLOUDFLARE_TUNNEL.md

- Prerequisites and domain setup
- Installation (Package manager or direct download)
- Configuration and DNS routing
- Service installation (systemd)
- SSL/TLS setup (Flexible mode)
- Complete troubleshooting (including tunnel keeps stopping)
- Management commands

## 🔄 Recent Changes (2025-01-19)

Documentation has been consolidated and optimized:

- **Updated:** PRODUCTION.md (removed macOS content)
- **Merged:** DOCKER.md + DOCKER_PRODUCTION.md → DOCKER.md
- **Updated:** CLOUDFLARE_TUNNEL.md (removed macOS content)
- **Reduced:** Total lines from ~3,200 to ~1,800 (44% reduction)
- **Updated:** All dates, references, and outdated information

## 📊 File Structure

```
docs/deployment/
├── README.md                   # This file
├── PRODUCTION.md              # Complete production guide (~600 lines)
├── DOCKER.md                  # Docker setup guide (~330 lines)
├── CLOUDFLARE_TUNNEL.md       # Tunnel setup guide (~477 lines)
├── check-cloudflare.sh        # Diagnostic script
├── restart-cloudflare.sh      # Restart script

```

---

**Last Updated:** 2025-01-19
