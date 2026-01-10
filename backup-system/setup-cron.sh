#!/bin/bash

# ==============================================
# SHOGUN - Cron Setup Script
# ==============================================
# This script sets up automated backups using cron for production
# 
# Usage:
#   ./backup-system/setup-cron.sh [--remove]

set -euo pipefail

ACTION="${1:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ "$ACTION" = "--remove" ]; then
  echo "Removing cron jobs for Shogun backups..."
  crontab -l 2>/dev/null | grep -v "shogun.*backup" | crontab -
  echo "✓ Cron jobs removed"
  exit 0
fi

echo "Setting up cron jobs for Shogun production backups..."
echo "Project directory: ${PROJECT_DIR}"

# Create backup directory if it doesn't exist
BACKUP_DIR="${PROJECT_DIR}/backups"
mkdir -p "$BACKUP_DIR"

# Get current crontab
CRON_TEMP=$(mktemp)
crontab -l 2>/dev/null > "$CRON_TEMP" || true

# Remove existing Shogun backup entries
grep -v "shogun.*backup" "$CRON_TEMP" > "${CRON_TEMP}.new" || true
mv "${CRON_TEMP}.new" "$CRON_TEMP"

# Checkly Heartbeat URL for backup monitoring
# This URL is pinged after successful backups to confirm they ran
CHECKLY_HEARTBEAT_URL="https://ping.checklyhq.com/a88f47f3-fa5f-4b27-89c6-1c81e1b5cf62"

# Add new cron jobs
cat >> "$CRON_TEMP" <<EOF

# Shogun Production Backup Jobs
# Daily backup at 2 AM with Checkly heartbeat monitoring
0 2 * * * cd ${PROJECT_DIR} && CHECKLY_HEARTBEAT_URL=${CHECKLY_HEARTBEAT_URL} ${SCRIPT_DIR}/backup.sh >> ${BACKUP_DIR}/backup.log 2>&1

# Cleanup old backups daily at 4 AM
0 4 * * * cd ${PROJECT_DIR} && ${SCRIPT_DIR}/cleanup.sh >> ${BACKUP_DIR}/cleanup.log 2>&1
EOF

# Install new crontab
crontab "$CRON_TEMP"
rm "$CRON_TEMP"

echo "✓ Cron jobs installed successfully!"
echo ""
echo "Installed jobs:"
echo "  - Daily backup: 2:00 AM"
echo "  - Cleanup: 4:00 AM daily"
echo ""
echo "View cron jobs: crontab -l"
echo "View logs: tail -f ${BACKUP_DIR}/backup.log"
echo ""
echo "To remove cron jobs: ./backup-system/setup-cron.sh --remove"
