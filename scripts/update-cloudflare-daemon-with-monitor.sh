#!/bin/bash

# Script para actualizar el LaunchDaemon de Cloudflare para incluir monitoreo
# Modifica el LaunchDaemon existente para que monitoree y reinicie automáticamente

set -e

echo "🔧 Actualizando LaunchDaemon de Cloudflare con monitoreo"
echo "========================================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PLIST_PATH="/Library/LaunchDaemons/com.cloudflare.cloudflared.plist"
WRAPPER_SCRIPT="/Users/antoniojimenez/Projects/shogun/scripts/cloudflared-with-monitor.sh"
MONITOR_SCRIPT="/Users/antoniojimenez/Projects/shogun/scripts/monitor-cloudflare-tunnel.sh"

# Verificar que el wrapper script existe
if [ ! -f "$WRAPPER_SCRIPT" ]; then
    echo -e "${RED}❌ Script wrapper no encontrado: $WRAPPER_SCRIPT${NC}"
    exit 1
fi

# Hacer ejecutable
chmod +x "$WRAPPER_SCRIPT"
chmod +x "$MONITOR_SCRIPT"

echo -e "${GREEN}✅ Scripts verificados${NC}"

# Crear el nuevo plist: ejecuta cloudflared directamente (como antes)
# Y creamos un segundo LaunchDaemon para el monitoreo
echo ""
echo "Manteniendo LaunchDaemon principal de cloudflared..."
echo "Creando LaunchDaemon adicional para monitoreo..."

MONITOR_PLIST="/Library/LaunchDaemons/com.shogun.cloudflare-monitor.plist"

sudo tee "$MONITOR_PLIST" > /dev/null << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.shogun.cloudflare-monitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$MONITOR_SCRIPT</string>
        <string>loop</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
        <key>HOME</key>
        <string>/Users/antoniojimenez</string>
    </dict>
    <key>StartInterval</key>
    <integer>60</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/cloudflare-monitor.out.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/cloudflare-monitor.err.log</string>
</dict>
</plist>
EOF

echo -e "${GREEN}✅ LaunchDaemon de monitoreo creado${NC}"

echo -e "${GREEN}✅ LaunchDaemon actualizado${NC}"

# Verificar sintaxis
echo ""
echo "Verificando sintaxis..."
if sudo plutil -lint "$PLIST_PATH" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Sintaxis correcta${NC}"
else
    echo -e "${RED}❌ Error en la sintaxis${NC}"
    sudo plutil -lint "$PLIST_PATH"
    exit 1
fi

# Cargar el LaunchDaemon de monitoreo
echo ""
echo "Cargando LaunchDaemon de monitoreo..."
sudo launchctl bootout system/com.shogun.cloudflare-monitor 2>/dev/null || true
sleep 2
sudo launchctl bootstrap system "$MONITOR_PLIST"
sleep 2
sudo launchctl kickstart system/com.shogun.cloudflare-monitor

echo ""
echo "Esperando 20 segundos para que se conecte..."
sleep 20

# Verificar
echo ""
echo "Verificando estado..."
if ps aux | grep -q "[c]loudflared tunnel run"; then
    PID=$(pgrep -f "cloudflared tunnel run")
    echo -e "${GREEN}✅ Proceso corriendo (PID: $PID)${NC}"
else
    echo -e "${YELLOW}⚠️  Proceso no está corriendo aún${NC}"
fi

TUNNEL_INFO=$(cloudflared tunnel info shogun-tunnel 2>&1)
if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo -e "${GREEN}✅ Túnel conectado${NC}"
else
    echo -e "${YELLOW}⚠️  Túnel no conectado aún (puede tardar unos minutos)${NC}"
fi

# Verificar monitoreo
echo ""
if sudo launchctl list | grep -q "com.shogun.cloudflare-monitor"; then
    echo -e "${GREEN}✅ LaunchDaemon de monitoreo activo${NC}"
else
    echo -e "${YELLOW}⚠️  LaunchDaemon de monitoreo no aparece en la lista${NC}"
fi

echo ""
echo "========================================================="
echo -e "${GREEN}✅ Monitoreo configurado${NC}"
echo ""
echo "Configuración:"
echo "  ✅ LaunchDaemon principal: ejecuta cloudflared (sin cambios)"
echo "  ✅ LaunchDaemon de monitoreo: verifica cada 5 minutos y reinicia si es necesario"
echo ""
echo "📋 Comandos útiles:"
echo "  Ver logs de cloudflared: sudo tail -f /var/log/cloudflared.out.log"
echo "  Ver logs de monitoreo: sudo tail -f /var/log/cloudflare-monitor.out.log"
echo "  Ver logs de monitoreo (alternativo): tail -f ~/Library/Logs/cloudflare-tunnel-monitor.log"
echo "  Reiniciar cloudflared: sudo launchctl kickstart system/com.cloudflare.cloudflared"
echo "  Reiniciar monitoreo: sudo launchctl kickstart system/com.shogun.cloudflare-monitor"
echo "  Estado del túnel: cloudflared tunnel info shogun-tunnel"
echo ""

