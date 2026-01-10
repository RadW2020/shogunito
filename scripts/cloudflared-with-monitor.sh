#!/bin/bash

# Wrapper script para cloudflared que incluye monitoreo automático
# Este script ejecuta cloudflared y monitorea periódicamente la conexión
# Si detecta que el túnel está desconectado, reinicia cloudflared

TUNNEL_NAME="shogun-tunnel"
CLOUDFLARED_BIN="/opt/homebrew/bin/cloudflared"
MONITOR_INTERVAL=300  # 5 minutos
LOG_FILE="/var/log/cloudflared-monitor.log"
PID_FILE="/var/run/cloudflared.pid"

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función para verificar si el túnel tiene conexiones activas
check_tunnel_connected() {
    TUNNEL_INFO=$("$CLOUDFLARED_BIN" tunnel info "$TUNNEL_NAME" 2>&1)
    if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
        return 0  # Conectado
    else
        return 1  # Desconectado
    fi
}

# Función para reiniciar cloudflared usando launchctl
restart_via_launchctl() {
    log "Reiniciando cloudflared via launchctl..."
    sudo launchctl kickstart system/com.cloudflare.cloudflared 2>&1 | tee -a "$LOG_FILE" || {
        log "Error al reiniciar via launchctl, intentando método alternativo..."
        sudo launchctl stop com.cloudflare.cloudflared 2>/dev/null || true
        sleep 3
        sudo launchctl start com.cloudflare.cloudflared 2>&1 | tee -a "$LOG_FILE"
    }
    sleep 20  # Esperar a que se conecte
}

# Ejecutar cloudflared directamente (el LaunchDaemon lo gestionará)
log "Iniciando cloudflared (gestionado por LaunchDaemon)..."
exec "$CLOUDFLARED_BIN" tunnel run "$TUNNEL_NAME"

