#!/bin/bash

# Wrapper script para cloudflared que verifica dependencias antes de iniciar
# Previene desconexiones verificando que los servicios locales estén funcionando

set -e

TUNNEL_NAME="shogun-tunnel"
CLOUDFLARED_BIN="/opt/homebrew/bin/cloudflared"
MAX_WAIT=120  # 2 minutos máximo de espera
LOG_FILE="/var/log/cloudflared-wrapper.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Verificar que Docker está corriendo
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log "Docker no está corriendo, esperando..."
        local wait_time=0
        while [ $wait_time -lt $MAX_WAIT ]; do
            if docker info >/dev/null 2>&1; then
                log "Docker está corriendo"
                return 0
            fi
            sleep 5
            wait_time=$((wait_time + 5))
        done
        log "ERROR: Docker no está disponible después de $MAX_WAIT segundos"
        return 1
    fi
    return 0
}

# Verificar que los servicios Docker están corriendo
check_docker_services() {
    log "Verificando servicios Docker..."
    local wait_time=0
    
    while [ $wait_time -lt $MAX_WAIT ]; do
        # Verificar que los contenedores están corriendo
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "shogun-api-prod\|shogun-web-prod"; then
            # Verificar que la API responde
            if curl -s -f http://localhost:3002/api/v1/health >/dev/null 2>&1; then
                log "Servicios Docker están funcionando"
                return 0
            fi
        fi
        sleep 5
        wait_time=$((wait_time + 5))
    done
    
    log "WARNING: Servicios Docker no están completamente listos después de $MAX_WAIT segundos"
    log "Iniciando cloudflared de todas formas..."
    return 0  # Continuar de todas formas
}

# Verificar conectividad a Cloudflare
check_cloudflare_connectivity() {
    log "Verificando conectividad a Cloudflare..."
    if curl -s --max-time 5 https://www.cloudflare.com >/dev/null 2>&1; then
        log "Conectividad a Cloudflare OK"
        return 0
    else
        log "WARNING: No se puede conectar a Cloudflare, pero continuando..."
        return 0  # Continuar de todas formas
    fi
}

# Verificar autenticación
check_authentication() {
    if [ ! -f ~/.cloudflared/cert.pem ]; then
        log "ERROR: Certificado de autenticación no encontrado"
        return 1
    fi
    
    if [ ! -f ~/.cloudflared/5adc17fe-7cf4-468e-8bef-a3264ec7e67f.json ]; then
        log "ERROR: Archivo de credenciales del túnel no encontrado"
        return 1
    fi
    
    log "Autenticación verificada"
    return 0
}

# Main
log "Iniciando cloudflared wrapper..."

# Verificar dependencias
check_docker || exit 1
check_docker_services || exit 1
check_cloudflare_connectivity || exit 1
check_authentication || exit 1

# Iniciar cloudflared con logs más verbosos y opciones adicionales
# --loglevel debug: Más información para diagnóstico
# --no-autoupdate: Evitar actualizaciones automáticas que puedan causar desconexiones
log "Iniciando cloudflared tunnel con configuración optimizada..."
exec "$CLOUDFLARED_BIN" tunnel --loglevel info --no-autoupdate run "$TUNNEL_NAME"

