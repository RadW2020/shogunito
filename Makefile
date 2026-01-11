# ==============================================
# SHOGUNITO - Makefile for Docker Operations
# ==============================================

.PHONY: help dev prod test build clean logs ci ci

# Default target
help:
	@echo "Shogunito Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Stop, rebuild and start development (full restart)"
	@echo "  make dev-up           - Start development without stopping (no downtime)"
	@echo "  make dev-build        - Rebuild and start development environment"
	@echo "  make dev-down         - Stop development environment"
	@echo "  make dev-logs         - View development logs"
	@echo ""
	@echo "Production:"
	@echo "  make prod             - Stop, rebuild and start production (full restart)"
	@echo "  make prod-up          - Start production without stopping (no downtime)"
	@echo "  make prod-build       - Build production images only"
	@echo "  make prod-down        - Stop production environment"
	@echo "  make prod-logs        - View production logs"
	@echo ""
	@echo "Testing:"
	@echo "  make test-up          - Start test infrastructure"
	@echo "  make test-down        - Stop test infrastructure"
	@echo ""
	@echo "Utilities:"
	@echo "  make build-api        - Build API image"
	@echo "  make build-web        - Build Web image"
	@echo "  make clean            - Clean up Docker resources"
	@echo "  make ps               - Show running containers"
	@echo "  make logs             - View all logs"
	@echo ""
	@echo "CI:"
	@echo "  make ci               - Run CI checks (same as GitHub Actions)"

# Development
dev:
	@echo "Stopping existing development environment..."
	docker-compose -p shogunito-dev down --remove-orphans
	@echo "Starting development environment..."
	DOCKER_BUILDKIT=1 docker-compose -p shogunito-dev up -d

dev-up:
	@echo "Starting development environment (without stopping existing)..."
	DOCKER_BUILDKIT=1 docker-compose -p shogunito-dev up -d

dev-build:
	@echo "Rebuilding and starting development environment..."
	DOCKER_BUILDKIT=1 docker-compose -p shogunito-dev up -d --build

dev-down:
	@echo "Stopping development environment..."
	docker-compose -p shogunito-dev down --remove-orphans

dev-logs:
	docker-compose -p shogunito-dev logs -f

# Production
prod:
	@echo "Stopping existing production environment..."
	@docker-compose -f docker-compose.production.yml -p shogunito-prod down --remove-orphans || true
	@echo "Force removing any remaining containers..."
	@docker rm -f shogunito-api-prod shogunito-web-prod shogunito-postgres-prod shogunito-minio-prod 2>/dev/null || true
	@echo "Building and starting production environment..."
	DOCKER_BUILDKIT=1 docker-compose -f docker-compose.production.yml -p shogunito-prod up -d --build

prod-up:
	@echo "Starting production environment (without stopping existing)..."
	DOCKER_BUILDKIT=1 docker-compose -f docker-compose.production.yml -p shogunito-prod up -d --build

prod-build:
	@echo "Building production images..."
	DOCKER_BUILDKIT=1 docker-compose -f docker-compose.production.yml -p shogunito-prod build --parallel

prod-down:
	@echo "Stopping production environment..."
	@docker-compose -f docker-compose.production.yml -p shogunito-prod down --remove-orphans || true
	@echo "Force removing any remaining containers..."
	@docker rm -f shogunito-api-prod shogunito-web-prod shogunito-postgres-prod shogunito-minio-prod 2>/dev/null || true

prod-logs:
	docker-compose -f docker-compose.production.yml -p shogunito-prod logs -f

# Testing
test-up:
	@echo "Starting test infrastructure..."
	docker-compose -f docker-compose.test.yml up -d

test-down:
	@echo "Stopping test infrastructure..."
	docker-compose -f docker-compose.test.yml down -v

# Build individual services
build-api:
	@echo "Building API image..."
	DOCKER_BUILDKIT=1 docker build -f apps/api/Dockerfile -t shogunito-api:latest .

build-web:
	@echo "Building Web image..."
	DOCKER_BUILDKIT=1 docker build -f apps/web/Dockerfile -t shogunito-web:latest .

# Utilities
clean:
	@echo "Cleaning up Docker resources..."
	docker system prune -a -f
	docker volume prune -f

ps:
	@echo "Running containers:"
	docker-compose -p shogunito-dev ps

logs:
	docker-compose -p shogunito-dev logs -f

# Health checks
health:
	@echo "Checking service health..."
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Database operations
db-migrate:
	@echo "Running database migrations..."
	docker-compose -p shogunito-dev exec api npm run migration:run

# Restart services
restart-api:
	docker-compose -p shogunito-dev restart api

restart-web:
	docker-compose -p shogunito-dev restart web

restart-all:
	docker-compose -p shogunito-dev restart

# CI - Run the same checks as GitHub Actions
ci:
	@echo "Running CI checks (same as GitHub Actions)..."
	@echo ""
	@echo "Step 1: Installing dependencies..."
	npm ci
	@echo ""
	@echo "Step 2: Installing missing optional dependencies (Linux only)..."
	@if [ "$$(uname)" = "Linux" ]; then \
		npm install --no-save --force @rollup/rollup-linux-x64-gnu lightningcss-linux-x64-gnu || true; \
	else \
		echo "Skipping (not on Linux)"; \
	fi
	@echo ""
	@echo "Step 3: Rebuilding native modules..."
	npm rebuild
	@echo ""
	@echo "Step 4: Building..."
	npm run build
	@echo ""
	@echo "Step 5: Checking types..."
	npm run check-types
	@echo ""
	@echo "Step 6: Linting..."
	npm run lint
	@echo ""
	@echo "Step 7: Checking formatting..."
	npm run format:check
	@echo ""
	@echo ""
	@echo "✅ All CI checks passed!"
