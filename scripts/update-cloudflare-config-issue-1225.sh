#!/bin/bash

# Script para actualizar la configuración de cloudflared con mejoras del issue #1225

set -e

CONFIG_FILE="$HOME/.cloudflared/config.yml"
BACKUP_FILE="$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Actualizando configuración de cloudflared con mejoras del issue #1225"
echo "========================================================================"
echo ""

# Backup
if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo "✅ Backup creado: $BACKUP_FILE"
else
    echo "❌ Archivo de configuración no encontrado: $CONFIG_FILE"
    exit 1
fi

# Crear nueva configuración con mejoras
cat > "$CONFIG_FILE" << 'EOF'
tunnel: shogun-tunnel
credentials-file: /Users/antoniojimenez/.cloudflared/5adc17fe-7cf4-468e-8bef-a3264ec7e67f.json

# ============================================
# Connection stability settings
# Based on solutions from cloudflared issue #1225
# ============================================
# Prevent disconnections due to inactivity
originRequest:
  keepAliveConnections: 100
  keepAliveTimeout: 90s
  connectTimeout: 30s
  tcpKeepAlive: 30s  # TCP keepalive to prevent connection drops
  noHappyEyeballs: false
  disableChunkedEncoding: false
  httpHostHeader: ""  # Let cloudflared set this automatically

# QUIC protocol settings for better stability
# These help prevent "timeout: no recent network activity" errors
protocol: quic
edge-ip-version: auto

# Retry settings - more aggressive retries
retries: 5
retry-after: 5s  # Wait 5 seconds between retries

# Grace period before closing connections
grace-period: 30s

# ============================================
# Ingress rules
# ============================================
ingress:
  # API - shogunapi.uliber.com → localhost:3002
  - hostname: shogunapi.uliber.com
    service: http://localhost:3002
    originRequest:
      connectTimeout: 30s
      noTLSVerify: false
      tcpKeepAlive: 30s

  # Frontend - shogunweb.uliber.com → localhost:3003
  - hostname: shogunweb.uliber.com
    service: http://localhost:3003
    originRequest:
      connectTimeout: 30s
      tcpKeepAlive: 30s

  # MinIO - shogunminio.uliber.com → localhost:9010
  - hostname: shogunminio.uliber.com
    service: http://localhost:9010
    originRequest:
      connectTimeout: 30s
      tcpKeepAlive: 30s

  # Regla catch-all: devuelve 404 para cualquier otra petición
  - service: http_status:404
EOF

echo "✅ Configuración actualizada"
echo ""
echo "Mejoras aplicadas:"
echo "  ✅ tcpKeepAlive: 30s (previene desconexiones TCP)"
echo "  ✅ retry-after: 5s (reintentos más rápidos)"
echo "  ✅ tcpKeepAlive en cada servicio individual"
echo ""
echo "Para aplicar los cambios, reinicia el servicio:"
echo "  sudo launchctl kickstart system/com.cloudflare.cloudflared"
echo ""

