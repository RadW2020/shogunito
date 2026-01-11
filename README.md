# Shogun

![CI](https://github.com/radw2020/shogunito/actions/workflows/deploy.yml/badge.svg)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

Flow tracking application for short storytelling videos with automated pipeline from script to delivery.

## Requirements

- Node.js 20+ (use `nvm use` to automatically use the version specified in `.nvmrc`)
- Docker & Docker Compose

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit the .env files with your configuration

# Start services first (PostgreSQL, MinIO)
npm run docker:up

# Start development (API + Frontend)
npm run dev
```

## Environment Configuration

Each application has its own environment configuration:

- **API**: `apps/api/.env` - Database, ports, CORS
- **Web**: `apps/web/.env` - API URLs, feature flags, UI config

### Production Configuration

For production deployment, use the production-specific files:

- **API**: `apps/api/.env.production` → Copy to `apps/api/.env` on production server
- **Web**: `apps/web/.env.production` → Copy to `apps/web/.env` on production server
- **Docker**: `docker-compose.production.yml` - Production-optimized Docker configuration

⚠️ **Important**: Production files contain sensitive defaults that MUST be changed before use.

📚 **See**: `docs/deployment/PRODUCTION_SETUP.md` for complete production deployment guide.

## Development

```bash
# Individual services
npm run dev --filter=api    # NestJS API only
npm run dev --filter=web    # React frontend only

# Build & test
npm run build              # Build all apps
npm run lint              # Lint workspace
npm run test              # Run tests
```

## Architecture

- **API**: NestJS + TypeORM + PostgreSQL
- **Frontend**: React + Vite + TailwindCSS
- **Services**: PostgreSQL, MinIO
- **Monorepo**: Turborepo with shared packages

## Project Structure

```
apps/
├── api/          # NestJS backend
└── web/          # React frontend

packages/
├── shared/       # Shared types & interfaces
└── typescript-config/  # TS configurations
```

## Services

- **API**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **PostgreSQL**: localhost:5432
- **MinIO**: http://localhost:9000

## Backups

The project includes a backup system for PostgreSQL and MinIO volumes in production.

### Quick Backup Commands

```bash
# Create backup
./backup-system/backup.sh

# Restore from backup
./backup-system/restore.sh ./backups/20240101_120000

# Setup automated backups (cron)
./backup-system/setup-cron.sh
```

📚 **See**: `backup-system/README.md` for complete backup documentation and `backup-system/QUICK_START.md` for quick reference.

## Production & Deployment

All deployment documentation and scripts are located in `docs/deployment/`:

- **Docker Production**: See `docs/deployment/DOCKER.md` for dockerized production setup (services isolated from local code)
- **Production Configuration**: See `docs/deployment/PRODUCTION.md` for production deployment via Coolify, branch protection, and workflow

- **Branch Strategy**: `dev` → `main` (main is protected, only accepts merges from dev)

### Quick Production Start

```bash
# Build and start all services (API, Web, PostgreSQL, MinIO)
docker-compose -f docker-compose.production.yml up -d --build

# View logs
docker-compose -f docker-compose.production.yml logs -f
```
