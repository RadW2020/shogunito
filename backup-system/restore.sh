#!/bin/bash

# ==============================================
# SHOGUN - Production Restore Script
# ==============================================
# This script restores backups of PostgreSQL and MinIO volumes for production
# 
# Usage:
#   ./backup-system/restore.sh <backup_path>
#
# Example:
#   ./backup-system/restore.sh ./backups/20240101_120000

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - Production only
BACKUP_PATH="${1:-}"
COMPOSE_FILE="docker-compose.production.yml"
POSTGRES_CONTAINER="shogun-postgres-prod"
MINIO_CONTAINER="shogun-minio-prod"
POSTGRES_VOLUME="shogun_pgdata_prod"
MINIO_VOLUME="shogun_minio_prod"

if [ -z "$BACKUP_PATH" ] || [ ! -d "$BACKUP_PATH" ]; then
  echo -e "${RED}Error: Backup path is required and must exist${NC}"
  echo "Usage: $0 <backup_path>"
  exit 1
fi

echo -e "${YELLOW}WARNING: This will overwrite existing production data!${NC}"
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "Restore cancelled"
  exit 0
fi

echo -e "${GREEN}Starting production restore...${NC}"
echo -e "Backup path: ${BACKUP_PATH}"

# Function to restore PostgreSQL volume
restore_postgres_volume() {
  echo -e "${YELLOW}Restoring PostgreSQL volume...${NC}"
  
  if [ ! -f "${BACKUP_PATH}/postgres_volume.tar.gz" ]; then
    echo -e "${RED}Error: PostgreSQL volume backup not found${NC}"
    return 1
  fi

  # Stop PostgreSQL container
  docker-compose -f "$COMPOSE_FILE" stop postgres || true
  
  # Remove existing volume if it exists
  docker volume rm "$POSTGRES_VOLUME" 2>/dev/null || true
  
  # Create new volume
  docker volume create "$POSTGRES_VOLUME"
  
  # Restore volume data
  docker run --rm \
    -v "$POSTGRES_VOLUME:/data" \
    -v "$(pwd)/${BACKUP_PATH}:/backup" \
    alpine sh -c "cd /data && tar xzf /backup/postgres_volume.tar.gz"
  
  # Start PostgreSQL container
  docker-compose -f "$COMPOSE_FILE" up -d postgres
  
  echo -e "${GREEN}✓ PostgreSQL volume restore completed${NC}"
}

# Function to restore MinIO volume
restore_minio_volume() {
  echo -e "${YELLOW}Restoring MinIO volume...${NC}"
  
  if [ ! -f "${BACKUP_PATH}/minio_volume.tar.gz" ]; then
    echo -e "${RED}Error: MinIO volume backup not found${NC}"
    return 1
  fi

  # Stop MinIO container
  docker-compose -f "$COMPOSE_FILE" stop minio || true
  
  # Remove existing volume if it exists
  docker volume rm "$MINIO_VOLUME" 2>/dev/null || true
  
  # Create new volume
  docker volume create "$MINIO_VOLUME"
  
  # Restore volume data
  docker run --rm \
    -v "$MINIO_VOLUME:/data" \
    -v "$(pwd)/${BACKUP_PATH}:/backup" \
    alpine sh -c "cd /data && tar xzf /backup/minio_volume.tar.gz"
  
  # Start MinIO container
  docker-compose -f "$COMPOSE_FILE" up -d minio
  
  echo -e "${GREEN}✓ MinIO volume restore completed${NC}"
}

# Restore both volumes
restore_postgres_volume
restore_minio_volume

echo -e "${GREEN}✓ Restore completed successfully!${NC}"
