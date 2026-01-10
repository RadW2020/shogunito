#!/bin/bash

# Script de monitoreo y auto-recuperación para Cloudflare Tunnel
# Verifica periódicamente que el túnel esté conectado y funcional
# Si detecta problemas, intenta reiniciar el servicio automáticamente

set -e

# Configuración
TUNNEL_NAME="shogun-tunnel"
SERVICE_NAME="com.cloudflare.cloudflared"
LOG_FILE="$HOME/Library/Logs/cloudflare-tunnel-monitor.log"
CHECK_INTERVAL=60  # 1 minuto - verificación más frecuente para evitar desconexiones
MAX_RETRIES=3

# Colores para logs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] OK: $1${NC}" | tee -a "$LOG_FILE"
}

# Función para verificar si el túnel tiene conexiones activas
check_tunnel_connected() {
    TUNNEL_INFO=$(cloudflared tunnel info "$TUNNEL_NAME" 2>&1)
    if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
        return 0  # Conectado
    else
        return 1  # Desconectado
    fi
}

# Función para verificar si los endpoints externos responden
check_endpoints() {
    API_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://shogunapi.uliber.com/api/v1/health 2>&1 || echo "000")
    WEB_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://shogunweb.uliber.com 2>&1 || echo "000")
    
    if [ "$API_STATUS" = "200" ] && [ "$WEB_STATUS" = "200" ]; then
        return 0  # Funcionando
    else
        return 1  # No funcionando
    fi
}

# Función para verificar si el proceso está corriendo
check_process() {
    if ps aux | grep -q "[c]loudflared tunnel run"; then
        return 0  # Proceso corriendo
    else
        return 1  # Proceso no corriendo
    fi
}

# Función para reiniciar cloudflared directamente
restart_service() {
    log "Reiniciando cloudflared..."
    
    # Detener proceso actual
    sudo pkill -f "cloudflared tunnel run" 2>/dev/null || true
    sleep 3
    
    # Reiniciar usando launchctl
    if sudo launchctl kickstart system/"$SERVICE_NAME" 2>/dev/null; then
        log_success "Servicio reiniciado con kickstart"
        sleep 20  # Esperar a que se conecte
        return 0
    else
        log_error "No se pudo reiniciar el servicio"
        return 1
    fi
}

# Función para verificar y reparar
check_and_fix() {
    local issues=0
    
    # Verificar proceso
    if ! check_process; then
        log_warning "Proceso cloudflared no está corriendo"
        issues=$((issues + 1))
    fi
    
    # Verificar túnel conectado
    if ! check_tunnel_connected; then
        log_warning "Túnel no tiene conexiones activas (sin CONNECTOR ID)"
        issues=$((issues + 1))
    fi
    
    # Verificar endpoints (solo si el túnel está conectado)
    if check_tunnel_connected && ! check_endpoints; then
        log_warning "Endpoints externos no responden correctamente"
        issues=$((issues + 1))
    fi
    
    # Si hay problemas, intentar reparar
    if [ $issues -gt 0 ]; then
        log_warning "Se detectaron $issues problema(s), intentando reparar..."
        
        # Limpiar conectores zombie primero
        log "Limpiando conectores zombie..."
        cloudflared tunnel cleanup "$TUNNEL_NAME" 2>&1 | tee -a "$LOG_FILE" || true
        
        # Reiniciar servicio
        if restart_service; then
            log "Esperando 30 segundos para que el túnel se conecte..."
            sleep 30
            
            # Verificar de nuevo - con reintentos
            local retries=3
            local retry_count=0
            while [ $retry_count -lt $retries ]; do
                if check_tunnel_connected && check_endpoints; then
                    log_success "Problema resuelto - túnel conectado y endpoints funcionando"
                    return 0
                fi
                retry_count=$((retry_count + 1))
                if [ $retry_count -lt $retries ]; then
                    log "Reintentando verificación ($retry_count/$retries)..."
                    sleep 10
                fi
            done
            
            log_error "Problema persiste después del reinicio y $retries reintentos"
            return 1
        else
            log_error "No se pudo reiniciar el servicio"
            return 1
        fi
    else
        log_success "Todo funcionando correctamente"
        return 0
    fi
}

# Función principal de monitoreo continuo
monitor_loop() {
    log "Iniciando monitoreo continuo (verificación cada $CHECK_INTERVAL segundos)..."
    log "Presiona Ctrl+C para detener"
    
    while true; do
        check_and_fix
        sleep "$CHECK_INTERVAL"
    done
}

# Función de verificación única
single_check() {
    log "Ejecutando verificación única..."
    check_and_fix
    exit $?
}

# Main
case "${1:-single}" in
    loop|continuous)
        monitor_loop
        ;;
    single|once)
        single_check
        ;;
    *)
        echo "Uso: $0 [loop|single]"
        echo "  loop: Monitoreo continuo (verificación cada $CHECK_INTERVAL segundos)"
        echo "  single: Verificación única (default)"
        exit 1
        ;;
esac

