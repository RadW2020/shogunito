#!/bin/bash

# ==============================================
# SHOGUN - Backup Cleanup Script
# ==============================================
# This script removes old backups based on retention policy
# 
# Usage:
#   ./backup-system/cleanup.sh [--dry-run]
#
# Retention Policy:
#   - Daily backups: Keep last 7 days
#   - Weekly backups: Keep last 4 weeks (backups from Sunday)
#   - Monthly backups: Keep last 12 months (backups from 1st of month)

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

DRY_RUN="${1:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

if [ ! -d "$BACKUP_DIR" ]; then
  log "WARN: Backup directory does not exist: ${BACKUP_DIR}"
  exit 0
fi

log "Starting cleanup of old backups..."
log "Backup directory: ${BACKUP_DIR}"

if [ "$DRY_RUN" = "--dry-run" ]; then
  log "DRY RUN MODE - No files will be deleted"
  DELETE_CMD="echo [WOULD DELETE]"
else
  DELETE_CMD="rm -rf"
fi

# Count backups before cleanup
TOTAL_BEFORE=$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')

# Remove backups older than 7 days (keep daily backups)
log "Removing backups older than 7 days..."
DELETED_DAILY=0
while IFS= read -r -d '' backup; do
  if [ "$DRY_RUN" != "--dry-run" ]; then
    $DELETE_CMD "$backup"
    DELETED_DAILY=$((DELETED_DAILY + 1))
  else
    echo -e "  [WOULD DELETE] $(basename "$backup")"
    DELETED_DAILY=$((DELETED_DAILY + 1))
  fi
done < <(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +7 -mtime -30 -print0)

# Remove weekly backups older than 4 weeks (keep Sunday backups)
log "Removing weekly backups older than 4 weeks..."
DELETED_WEEKLY=0
while IFS= read -r -d '' backup; do
  BACKUP_DATE=$(basename "$backup" | cut -d'_' -f1)
  BACKUP_DAY=$(date -j -f "%Y%m%d" "$BACKUP_DATE" "+%u" 2>/dev/null || date -d "$BACKUP_DATE" "+%u" 2>/dev/null || echo "")
  
  # Only delete if it's not a Sunday backup (Sunday = 7 or 0 depending on system)
  if [ -n "$BACKUP_DAY" ] && [ "$BACKUP_DAY" != "7" ] && [ "$BACKUP_DAY" != "0" ]; then
    if [ "$DRY_RUN" != "--dry-run" ]; then
      $DELETE_CMD "$backup"
      DELETED_WEEKLY=$((DELETED_WEEKLY + 1))
    else
      echo -e "  [WOULD DELETE] $(basename "$backup")"
      DELETED_WEEKLY=$((DELETED_WEEKLY + 1))
    fi
  fi
done < <(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +30 -mtime -365 -print0)

# Remove monthly backups older than 12 months (keep 1st of month backups)
log "Removing monthly backups older than 12 months..."
DELETED_MONTHLY=0
while IFS= read -r -d '' backup; do
  BACKUP_DATE=$(basename "$backup" | cut -d'_' -f1)
  BACKUP_DAY=$(echo "$BACKUP_DATE" | cut -c7-8)
  
  # Only delete if it's not the 1st of the month
  if [ "$BACKUP_DAY" != "01" ]; then
    if [ "$DRY_RUN" != "--dry-run" ]; then
      $DELETE_CMD "$backup"
      DELETED_MONTHLY=$((DELETED_MONTHLY + 1))
    else
      echo -e "  [WOULD DELETE] $(basename "$backup")"
      DELETED_MONTHLY=$((DELETED_MONTHLY + 1))
    fi
  fi
done < <(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +365 -print0)

# Count backups after cleanup
TOTAL_AFTER=$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')

log "SUCCESS: Cleanup completed!"
log "Backups before: ${TOTAL_BEFORE}"
log "Backups deleted: $((DELETED_DAILY + DELETED_WEEKLY + DELETED_MONTHLY))"
log "  - Daily (>7 days): ${DELETED_DAILY}"
log "  - Weekly (>4 weeks): ${DELETED_WEEKLY}"
log "  - Monthly (>12 months): ${DELETED_MONTHLY}"
log "Backups remaining: ${TOTAL_AFTER}"

