#!/bin/bash

# Script para corregir el servicio de Cloudflare Tunnel
# Detiene el proceso manual y carga el LaunchDaemon correctamente

set -e

echo "🔧 Corrigiendo servicio de Cloudflare Tunnel"
echo "=============================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar que el LaunchDaemon existe
echo "1. Verificando LaunchDaemon..."
if [ -f /Library/LaunchDaemons/com.cloudflare.cloudflared.plist ]; then
    echo -e "${GREEN}✅ LaunchDaemon existe${NC}"
else
    echo -e "${RED}❌ LaunchDaemon no existe${NC}"
    exit 1
fi

# 2. Detener proceso actual
echo ""
echo "2. Deteniendo proceso actual..."
if ps aux | grep -q "[c]loudflared tunnel run"; then
    PID=$(pgrep -f "cloudflared tunnel run")
    echo "   Proceso encontrado (PID: $PID)"
    echo "   Necesitas ejecutar: sudo pkill -f 'cloudflared tunnel run'"
    echo ""
    read -p "   ¿Quieres detener el proceso ahora? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        sudo pkill -f "cloudflared tunnel run" || echo "   Proceso detenido"
        sleep 2
    else
        echo "   Saltando detención del proceso"
    fi
else
    echo -e "${GREEN}✅ No hay proceso corriendo${NC}"
fi

# 3. Descargar LaunchDaemon si está cargado
echo ""
echo "3. Descargando LaunchDaemon si está cargado..."
sudo launchctl bootout system/com.cloudflare.cloudflared 2>/dev/null || echo "   No estaba cargado"

# 4. Verificar permisos del LaunchDaemon
echo ""
echo "4. Verificando permisos del LaunchDaemon..."
sudo chown root:wheel /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo chmod 644 /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
echo -e "${GREEN}✅ Permisos correctos${NC}"

# 5. Verificar que el archivo de configuración existe
echo ""
echo "5. Verificando configuración..."
if [ -f ~/.cloudflared/config.yml ]; then
    echo -e "${GREEN}✅ Archivo config.yml existe${NC}"
else
    echo -e "${RED}❌ Archivo config.yml no existe${NC}"
    exit 1
fi

# 6. Verificar que el archivo de credenciales existe
if [ -f ~/.cloudflared/5adc17fe-7cf4-468e-8bef-a3264ec7e67f.json ]; then
    echo -e "${GREEN}✅ Archivo de credenciales existe${NC}"
else
    echo -e "${RED}❌ Archivo de credenciales no existe${NC}"
    exit 1
fi

# 7. Cargar LaunchDaemon
echo ""
echo "6. Cargando LaunchDaemon..."
sudo launchctl bootstrap system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist 2>&1 || {
    echo "   Intentando método alternativo..."
    sudo launchctl load -w /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
}

# 8. Iniciar servicio
echo ""
echo "7. Iniciando servicio..."
sudo launchctl kickstart system/com.cloudflare.cloudflared 2>&1 || {
    sudo launchctl start com.cloudflare.cloudflared
}

# 9. Esperar conexión
echo ""
echo "8. Esperando conexión (10 segundos)..."
sleep 10

# 10. Verificar estado
echo ""
echo "9. Verificando estado..."
if ps aux | grep -q "[c]loudflared tunnel run"; then
    PID=$(pgrep -f "cloudflared tunnel run")
    echo -e "${GREEN}✅ Proceso corriendo (PID: $PID)${NC}"
else
    echo -e "${RED}❌ Proceso no está corriendo${NC}"
    echo "   Revisa los logs: sudo tail -f /var/log/cloudflared.err.log"
    exit 1
fi

# 11. Verificar conexiones del túnel
echo ""
echo "10. Verificando conexiones del túnel..."
TUNNEL_INFO=$(cloudflared tunnel info shogun-tunnel 2>&1)
if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo -e "${GREEN}✅ Túnel tiene conexiones activas${NC}"
    echo "$TUNNEL_INFO" | grep "CONNECTOR ID" | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️  Túnel no tiene conexiones activas aún${NC}"
    echo "   Espera 30 segundos más y verifica: cloudflared tunnel info shogun-tunnel"
fi

# 12. Verificar servicio launchd
echo ""
echo "11. Verificando servicio launchd..."
if sudo launchctl list | grep -q cloudflare; then
    echo -e "${GREEN}✅ Servicio cargado en launchd${NC}"
    sudo launchctl list | grep cloudflare | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️  Servicio no aparece en launchctl list${NC}"
    echo "   Pero el proceso está corriendo, esto puede ser normal"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Proceso completado${NC}"
echo ""
echo "Para verificar el estado:"
echo "  ps aux | grep cloudflared"
echo "  cloudflared tunnel info shogun-tunnel"
echo "  sudo tail -f /var/log/cloudflared.out.log"
echo ""
echo "Para verificar accesibilidad:"
echo "  ./scripts/check-cloudflare-accessibility.sh"

