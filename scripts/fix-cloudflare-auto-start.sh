#!/bin/bash

# Script para corregir el auto-inicio de Cloudflare Tunnel
# El problema: El proceso está corriendo manualmente en lugar de estar gestionado por launchd
# La solución: Cargar el LaunchDaemon para que se gestione automáticamente

set -e

echo "🔧 Corrigiendo auto-inicio de Cloudflare Tunnel"
echo "================================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Verificar que el LaunchDaemon existe
echo "1. Verificando LaunchDaemon..."
if [ -f /Library/LaunchDaemons/com.cloudflare.cloudflared.plist ]; then
    echo -e "${GREEN}✅ LaunchDaemon existe${NC}"
    echo "   Ubicación: /Library/LaunchDaemons/com.cloudflare.cloudflared.plist"
else
    echo -e "${RED}❌ LaunchDaemon no existe${NC}"
    echo "   Necesitas crear el LaunchDaemon primero"
    exit 1
fi

# 2. Verificar sintaxis del plist
echo ""
echo "2. Verificando sintaxis del plist..."
if plutil -lint /Library/LaunchDaemons/com.cloudflare.cloudflared.plist >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Sintaxis correcta${NC}"
else
    echo -e "${RED}❌ Error en la sintaxis del plist${NC}"
    plutil -lint /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
    exit 1
fi

# 3. Verificar estado actual
echo ""
echo "3. Verificando estado actual..."
if ps aux | grep -q "[c]loudflared tunnel run"; then
    PID=$(pgrep -f "cloudflared tunnel run")
    echo -e "${YELLOW}⚠️  Proceso manual corriendo (PID: $PID)${NC}"
    echo "   Este proceso será detenido y reemplazado por el servicio gestionado"
else
    echo -e "${GREEN}✅ No hay proceso manual corriendo${NC}"
fi

# 4. Verificar si el servicio está cargado
echo ""
echo "4. Verificando si el servicio está cargado en launchd..."
if sudo launchctl list | grep -q cloudflare 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Servicio ya está cargado${NC}"
    echo "   Se descargará y recargará para asegurar configuración correcta"
    NEEDS_RELOAD=true
else
    echo -e "${BLUE}ℹ️  Servicio no está cargado${NC}"
    NEEDS_RELOAD=false
fi

# 5. Confirmar acción
echo ""
echo -e "${YELLOW}⚠️  Esta operación requiere permisos de administrador${NC}"
echo "   Se realizarán las siguientes acciones:"
echo "   1. Detener el proceso manual actual (si existe)"
echo "   2. Descargar el servicio de launchd (si está cargado)"
echo "   3. Verificar permisos del LaunchDaemon"
echo "   4. Cargar el LaunchDaemon en launchd"
echo "   5. Iniciar el servicio gestionado"
echo ""
read -p "¿Continuar? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Operación cancelada"
    exit 0
fi

# 6. Detener proceso manual
echo ""
echo "5. Deteniendo proceso manual..."
if ps aux | grep -q "[c]loudflared tunnel run"; then
    echo "   Deteniendo proceso..."
    sudo pkill -f "cloudflared tunnel run" 2>/dev/null || true
    sleep 2
    
    # Verificar que se detuvo
    if ps aux | grep -q "[c]loudflared tunnel run"; then
        echo "   Forzando detención..."
        sudo pkill -9 -f "cloudflared tunnel run" 2>/dev/null || true
        sleep 2
    fi
    
    if ps aux | grep -q "[c]loudflared tunnel run"; then
        echo -e "${RED}❌ No se pudo detener el proceso manual${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Proceso manual detenido${NC}"
    fi
else
    echo -e "${GREEN}✅ No había proceso manual corriendo${NC}"
fi

# 7. Descargar servicio si está cargado
if [ "$NEEDS_RELOAD" = true ]; then
    echo ""
    echo "6. Descargando servicio de launchd..."
    sudo launchctl bootout system/com.cloudflare.cloudflared 2>/dev/null && echo -e "${GREEN}✅ Servicio descargado${NC}" || echo -e "${BLUE}ℹ️  Servicio no estaba cargado${NC}"
    sleep 2
fi

# 8. Verificar permisos
echo ""
echo "7. Verificando permisos del LaunchDaemon..."
CURRENT_PERMS=$(ls -l /Library/LaunchDaemons/com.cloudflare.cloudflared.plist | awk '{print $1" "$3" "$4}')
echo "   Permisos actuales: $CURRENT_PERMS"

sudo chown root:wheel /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo chmod 644 /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
echo -e "${GREEN}✅ Permisos correctos${NC}"

# 9. Cargar LaunchDaemon
echo ""
echo "8. Cargando LaunchDaemon en launchd..."
if sudo launchctl bootstrap system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist 2>&1; then
    echo -e "${GREEN}✅ LaunchDaemon cargado${NC}"
else
    echo -e "${YELLOW}⚠️  Error con bootstrap, intentando método tradicional...${NC}"
    if sudo launchctl load -w /Library/LaunchDaemons/com.cloudflare.cloudflared.plist 2>&1; then
        echo -e "${GREEN}✅ LaunchDaemon cargado (método tradicional)${NC}"
    else
        echo -e "${RED}❌ Error al cargar el LaunchDaemon${NC}"
        echo "   Verifica los logs del sistema:"
        echo "   log show --predicate 'subsystem == \"com.apple.launchd\"' --last 10m | grep cloudflare"
        exit 1
    fi
fi

# 10. Iniciar servicio
echo ""
echo "9. Iniciando servicio..."
sudo launchctl kickstart system/com.cloudflare.cloudflared 2>&1 || {
    echo "   Intentando método alternativo..."
    sudo launchctl start com.cloudflare.cloudflared
}
echo -e "${GREEN}✅ Servicio iniciado${NC}"

# 11. Esperar conexión
echo ""
echo "10. Esperando conexión del túnel (15 segundos)..."
sleep 15

# 12. Verificar estado
echo ""
echo "11. Verificando estado final..."
echo ""

# Verificar servicio launchd
if sudo launchctl list | grep -q cloudflare 2>/dev/null; then
    echo -e "${GREEN}✅ Servicio launchd activo${NC}"
    sudo launchctl list | grep cloudflare | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️  Servicio no aparece en launchctl list${NC}"
    echo "   Esto puede ser normal en algunos casos"
fi

# Verificar proceso
echo ""
if ps aux | grep -q "[c]loudflared tunnel run"; then
    PID=$(pgrep -f "cloudflared tunnel run")
    USER=$(ps aux | grep "[c]loudflared tunnel run" | awk '{print $1}' | head -1)
    echo -e "${GREEN}✅ Proceso corriendo${NC}"
    echo "   PID: $PID"
    echo "   Usuario: $USER"
    if [ "$USER" = "root" ]; then
        echo -e "   ${GREEN}✅ Ejecutándose como root (correcto para LaunchDaemon)${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Ejecutándose como $USER (debería ser root)${NC}"
    fi
else
    echo -e "${RED}❌ Proceso no está corriendo${NC}"
    echo "   Revisa los logs: sudo tail -50 /var/log/cloudflared.err.log"
    exit 1
fi

# Verificar túnel
echo ""
echo "   Verificando túnel..."
TUNNEL_INFO=$(cloudflared tunnel info shogun-tunnel 2>&1)
if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo -e "${GREEN}✅ Túnel conectado${NC}"
    echo "$TUNNEL_INFO" | grep -E "(CONNECTOR ID|EDGE)" | head -2 | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️  Túnel no conectado o sin CONNECTOR ID${NC}"
    echo "$TUNNEL_INFO" | head -5 | sed 's/^/   /'
    echo "   Espera 30 segundos más y verifica: cloudflared tunnel info shogun-tunnel"
fi

# Verificar endpoints
echo ""
echo "   Verificando endpoints externos..."
API_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://shogunapi.uliber.com/api/v1/health 2>&1 || echo "000")
WEB_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://shogunweb.uliber.com 2>&1 || echo "000")

if [ "$API_STATUS" = "200" ] && [ "$WEB_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Endpoints funcionando${NC}"
    echo "   API: HTTP $API_STATUS"
    echo "   Web: HTTP $WEB_STATUS"
else
    echo -e "${YELLOW}⚠️  Endpoints no responden correctamente${NC}"
    echo "   API: HTTP $API_STATUS"
    echo "   Web: HTTP $WEB_STATUS"
    echo "   Esto puede ser normal si hay problemas de red temporales"
    echo "   Espera unos minutos y verifica de nuevo"
fi

# Resumen final
echo ""
echo "================================================"
echo -e "${GREEN}✅ Proceso completado${NC}"
echo ""
echo "📋 Comandos útiles:"
echo "  Ver estado del servicio: sudo launchctl list | grep cloudflare"
echo "  Reiniciar servicio: sudo launchctl kickstart system/com.cloudflare.cloudflared"
echo "  Ver logs: sudo tail -f /var/log/cloudflared.out.log"
echo "  Ver errores: sudo tail -f /var/log/cloudflared.err.log"
echo "  Estado del túnel: cloudflared tunnel info shogun-tunnel"
echo ""
echo "🔄 El servicio ahora:"
echo "  ✅ Se iniciará automáticamente al arrancar el sistema"
echo "  ✅ Se reiniciará automáticamente si el proceso muere"
echo "  ✅ No requiere sesión de usuario activa"
echo "  ✅ Está gestionado por launchd (más robusto)"
echo ""


