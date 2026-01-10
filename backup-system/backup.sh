#!/bin/bash

# ==============================================
# SHOGUN - Production Backup Script
# ==============================================
# This script creates backups of PostgreSQL and MinIO volumes for production
# 
# Usage:
#   ./backup-system/backup.sh
#
# Environment variables:
#   CHECKLY_HEARTBEAT_URL - URL to ping on successful backup (optional)

set -euo pipefail

# Detect if running from cron (no TTY) or interactive
IS_CRON=false
if [ ! -t 0 ]; then
    IS_CRON=true
fi

# Colors for output (only use if interactive)
if [ "$IS_CRON" = false ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# ==============================================
# CRITICAL: Setup PATH for cron environment
# ==============================================
# Cron runs with a minimal PATH, so we need to explicitly add all possible Docker locations
# This is the main fix for "docker: command not found" errors in cron

# Common Docker binary locations on macOS
DOCKER_PATHS=(
    "/usr/local/bin"
    "/opt/homebrew/bin"
    "/Applications/Docker.app/Contents/Resources/bin"
    "$HOME/.docker/bin"
)

# Build extended PATH
EXTENDED_PATH="/usr/bin:/bin:/usr/sbin:/sbin"
for docker_path in "${DOCKER_PATHS[@]}"; do
    if [ -d "$docker_path" ]; then
        EXTENDED_PATH="$docker_path:$EXTENDED_PATH"
    fi
done
export PATH="$EXTENDED_PATH"

# Also set DOCKER_HOST for Docker Desktop on macOS
if [ -S "$HOME/.docker/run/docker.sock" ]; then
    export DOCKER_HOST="unix://$HOME/.docker/run/docker.sock"
elif [ -S "/var/run/docker.sock" ]; then
    export DOCKER_HOST="unix:///var/run/docker.sock"
fi

# Find Docker binary with explicit paths
DOCKER_CMD=""
DOCKER_LOCATIONS=(
    "docker"
    "/usr/local/bin/docker"
    "/opt/homebrew/bin/docker"
    "/Applications/Docker.app/Contents/Resources/bin/docker"
    "$HOME/.docker/bin/docker"
)

for docker_loc in "${DOCKER_LOCATIONS[@]}"; do
    if command -v "$docker_loc" &> /dev/null || [ -x "$docker_loc" ]; then
        DOCKER_CMD="$docker_loc"
        break
    fi
done

if [ -z "$DOCKER_CMD" ]; then
    log "ERROR: Docker not found in any of the expected locations."
    log "DEBUG: PATH=$PATH"
    log "DEBUG: Searched locations: ${DOCKER_LOCATIONS[*]}"
    log "Please ensure Docker Desktop is installed and running."
    exit 1
fi

log "DEBUG: Using Docker at: $DOCKER_CMD"

# Verify Docker is accessible
if ! $DOCKER_CMD info > /dev/null 2>&1; then
    log "ERROR: Docker is not running or not accessible."
    log "DEBUG: DOCKER_HOST=$DOCKER_HOST"
    log "Please start Docker Desktop."
    exit 1
fi

# Configuration - Production only
COMPOSE_FILE="docker-compose.production.yml"
POSTGRES_CONTAINER="shogun-postgres-prod"
MINIO_CONTAINER="shogun-minio-prod"
POSTGRES_VOLUME="shogun_pgdata_prod"
MINIO_VOLUME="shogun_minio_prod"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# Create backup directory with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"
mkdir -p "$BACKUP_PATH"

log "Starting production backup..."
log "Backup directory: ${BACKUP_PATH}"

# Function to backup PostgreSQL volume
backup_postgres_volume() {
  log "Backing up PostgreSQL volume..."
  
  # Use --format to get clean volume names for reliable grep matching
  if ! $DOCKER_CMD volume ls --format '{{.Name}}' | grep -q "^${POSTGRES_VOLUME}$"; then
    log "ERROR: PostgreSQL volume '$POSTGRES_VOLUME' does not exist"
    log "DEBUG: Available volumes: $($DOCKER_CMD volume ls --format '{{.Name}}' | grep shogun || echo 'none')"
    return 1
  fi

  # Create a temporary container to access the volume
  if $DOCKER_CMD run --rm \
    -v "$POSTGRES_VOLUME:/data:ro" \
    -v "$(pwd)/${BACKUP_PATH}:/backup" \
    alpine tar czf /backup/postgres_volume.tar.gz -C /data .; then
    log "SUCCESS: PostgreSQL volume backup completed"
  else
    log "ERROR: Failed to backup PostgreSQL volume"
    return 1
  fi
}

# Function to backup MinIO volume
backup_minio_volume() {
  log "Backing up MinIO volume..."
  
  # Use --format to get clean volume names for reliable grep matching
  if ! $DOCKER_CMD volume ls --format '{{.Name}}' | grep -q "^${MINIO_VOLUME}$"; then
    log "ERROR: MinIO volume '$MINIO_VOLUME' does not exist"
    log "DEBUG: Available volumes: $($DOCKER_CMD volume ls --format '{{.Name}}' | grep minio || echo 'none')"
    return 1
  fi

  # Create a temporary container to access the volume
  if $DOCKER_CMD run --rm \
    -v "$MINIO_VOLUME:/data:ro" \
    -v "$(pwd)/${BACKUP_PATH}:/backup" \
    alpine tar czf /backup/minio_volume.tar.gz -C /data .; then
    log "SUCCESS: MinIO volume backup completed"
  else
    log "ERROR: Failed to backup MinIO volume"
    return 1
  fi
}

# Main backup logic
BACKUP_FAILED=false

if ! backup_postgres_volume; then
    BACKUP_FAILED=true
fi

if ! backup_minio_volume; then
    BACKUP_FAILED=true
fi

if [ "$BACKUP_FAILED" = true ]; then
    log "ERROR: Some backups failed. Check logs above for details."
    exit 1
fi

# Create backup metadata
cat > "${BACKUP_PATH}/backup_info.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "environment": "production",
  "backup_type": "volume",
  "postgres_container": "$POSTGRES_CONTAINER",
  "postgres_volume": "$POSTGRES_VOLUME",
  "minio_container": "$MINIO_CONTAINER",
  "minio_volume": "$MINIO_VOLUME"
}
EOF

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
log "SUCCESS: Backup completed successfully!"
log "Backup size: ${BACKUP_SIZE}"
log "Backup location: ${BACKUP_PATH}"

# ==============================================
# Checkly Heartbeat - Notify successful backup
# ==============================================
# This pings Checkly to confirm the backup ran successfully
# If Checkly doesn't receive a ping within the expected period, it will alert

CHECKLY_HEARTBEAT_URL="${CHECKLY_HEARTBEAT_URL:-}"

if [ -n "$CHECKLY_HEARTBEAT_URL" ]; then
    log "Sending heartbeat to Checkly..."
    if curl -fsS -m 10 -o /dev/null "$CHECKLY_HEARTBEAT_URL"; then
        log "SUCCESS: Checkly heartbeat sent"
    else
        log "WARNING: Failed to send Checkly heartbeat (backup still succeeded)"
    fi
else
    log "INFO: No CHECKLY_HEARTBEAT_URL configured, skipping heartbeat"
fi
