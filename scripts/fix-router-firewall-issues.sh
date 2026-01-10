#!/bin/bash

# Script para solucionar problemas de router/firewall que causan desconexiones
# Basado en errores "timeout: no recent network activity"

set -e

echo "🔧 Solucionando problemas de router/firewall con Cloudflare Tunnel"
echo "==================================================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CONFIG_FILE="$HOME/.cloudflared/config.yml"
BACKUP_FILE="$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# 1. Backup
echo "1. Haciendo backup de configuración..."
if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup creado${NC}"
else
    echo -e "${RED}❌ Archivo de configuración no encontrado${NC}"
    exit 1
fi

# 2. Cambiar a HTTP/2 en lugar de QUIC (más compatible con routers/firewalls)
echo ""
echo "2. Cambiando protocolo a HTTP/2 (más compatible con routers/firewalls)..."
echo "   QUIC (UDP) puede ser bloqueado por routers con NAT agresivo"

cat > "$CONFIG_FILE" << 'EOF'
tunnel: shogun-tunnel
credentials-file: /Users/antoniojimenez/.cloudflared/5adc17fe-7cf4-468e-8bef-a3264ec7e67f.json

# ============================================
# Connection stability settings
# Optimized for router/firewall compatibility
# ============================================
# Use HTTP/2 instead of QUIC to avoid UDP/NAT issues
# HTTP/2 uses TCP which is more reliable through routers
protocol: http2

# Aggressive keepalive to prevent router from closing connections
originRequest:
  keepAliveConnections: 100
  keepAliveTimeout: 30s  # Reduced from 90s - more frequent keepalive
  connectTimeout: 10s   # Faster connection timeout
  tcpKeepAlive: 10s     # More frequent TCP keepalive (every 10s)
  noHappyEyeballs: false
  disableChunkedEncoding: false
  httpHostHeader: ""

# Retry settings - very aggressive
retries: 10           # More retries
retry-after: 2s       # Faster retries (2 seconds)

# Grace period
grace-period: 10s    # Shorter grace period

# ============================================
# Ingress rules
# ============================================
ingress:
  # API - shogunapi.uliber.com → localhost:3002
  - hostname: shogunapi.uliber.com
    service: http://localhost:3002
    originRequest:
      connectTimeout: 10s
      tcpKeepAlive: 10s
      noTLSVerify: false

  # Frontend - shogunweb.uliber.com → localhost:3003
  - hostname: shogunweb.uliber.com
    service: http://localhost:3003
    originRequest:
      connectTimeout: 10s
      tcpKeepAlive: 10s

  # MinIO - shogunminio.uliber.com → localhost:9010
  - hostname: shogunminio.uliber.com
    service: http://localhost:9010
    originRequest:
      connectTimeout: 10s
      tcpKeepAlive: 10s

  # Regla catch-all: devuelve 404 para cualquier otra petición
  - service: http_status:404
EOF

echo -e "${GREEN}✅ Configuración actualizada a HTTP/2${NC}"

# 3. Limpiar conectores zombie
echo ""
echo "3. Limpiando conectores zombie..."
cloudflared tunnel cleanup shogun-tunnel 2>&1 | head -3 || true
echo -e "${GREEN}✅ Limpieza completada${NC}"

# 4. Reiniciar servicio
echo ""
echo "4. Reiniciando servicio con nueva configuración..."
sudo launchctl kickstart system/com.cloudflare.cloudflared 2>&1 || {
    echo -e "${YELLOW}⚠️  No se pudo reiniciar automáticamente${NC}"
    echo "   Reinicia manualmente: sudo launchctl kickstart system/com.cloudflare.cloudflared"
}

echo ""
echo "Esperando 30 segundos para que se conecte..."
sleep 30

# 5. Verificar
echo ""
echo "5. Verificando estado..."
if ps aux | grep -q "[c]loudflared tunnel run"; then
    PID=$(pgrep -f "cloudflared tunnel run")
    echo -e "${GREEN}✅ Proceso corriendo (PID: $PID)${NC}"
else
    echo -e "${YELLOW}⚠️  Proceso no está corriendo${NC}"
fi

TUNNEL_INFO=$(cloudflared tunnel info shogun-tunnel 2>&1)
if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo -e "${GREEN}✅ Túnel conectado${NC}"
    echo "$TUNNEL_INFO" | grep -E "(CONNECTOR ID|EDGE)" | head -2
else
    echo -e "${YELLOW}⚠️  Túnel no conectado aún${NC}"
    echo "   Espera unos minutos más y verifica: cloudflared tunnel info shogun-tunnel"
fi

echo ""
echo "========================================================="
echo -e "${GREEN}✅ Cambios aplicados${NC}"
echo ""
echo "Cambios realizados:"
echo "  ✅ Protocolo cambiado de QUIC (UDP) a HTTP/2 (TCP)"
echo "  ✅ TCP keepalive más frecuente (cada 10s)"
echo "  ✅ Timeouts más cortos para reconexión rápida"
echo "  ✅ Más reintentos (10 en lugar de 5)"
echo ""
echo "📋 Por qué HTTP/2:"
echo "  - QUIC (UDP) puede ser bloqueado por routers con NAT agresivo"
echo "  - HTTP/2 (TCP) es más compatible con firewalls/routers"
echo "  - TCP keepalive funciona mejor que UDP keepalive"
echo ""
echo "📋 Si el problema persiste:"
echo "  1. Verifica configuración del router (NAT, firewall)"
echo "  2. Considera desactivar NAT agresivo en el router"
echo "  3. Verifica que no hay firewall bloqueando conexiones salientes"
echo "  4. Revisa logs: sudo tail -f /var/log/cloudflared.err.log"
echo ""


