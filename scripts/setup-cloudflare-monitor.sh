#!/bin/bash

# Script para configurar el monitoreo automático de Cloudflare Tunnel
# Crea un LaunchAgent que ejecuta el script de monitoreo cada 5 minutos

# No usar set -e porque launchctl puede dar errores falsos positivos

echo "🔧 Configurando monitoreo automático de Cloudflare Tunnel"
echo "=========================================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Rutas
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/monitor-cloudflare-tunnel.sh"
PLIST_PATH="$HOME/Library/LaunchAgents/com.shogun.cloudflare-monitor.plist"

# Verificar que el script de monitoreo existe
if [ ! -f "$MONITOR_SCRIPT" ]; then
    echo -e "${RED}❌ Script de monitoreo no encontrado: $MONITOR_SCRIPT${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Script de monitoreo encontrado${NC}"

# Crear el LaunchAgent plist
echo ""
echo "Creando LaunchAgent para monitoreo automático..."
cat > "$PLIST_PATH" << EOF
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
        <string>single</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
        <key>HOME</key>
        <string>$HOME</string>
    </dict>
    <key>StartInterval</key>
    <integer>300</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/cloudflare-tunnel-monitor.out.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/cloudflare-tunnel-monitor.err.log</string>
</dict>
</plist>
EOF

echo -e "${GREEN}✅ LaunchAgent creado: $PLIST_PATH${NC}"

# Verificar sintaxis
echo ""
echo "Verificando sintaxis del plist..."
if plutil -lint "$PLIST_PATH" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Sintaxis correcta${NC}"
else
    echo -e "${RED}❌ Error en la sintaxis del plist${NC}"
    plutil -lint "$PLIST_PATH"
    exit 1
fi

# Descargar si está cargado
echo ""
echo "Descargando servicio si está cargado..."
launchctl unload "$PLIST_PATH" 2>/dev/null && echo -e "${GREEN}✅ Servicio descargado${NC}" || echo "   No estaba cargado"

# Cargar el LaunchAgent
echo ""
echo "Cargando LaunchAgent..."
# Intentar con -w (force) primero
if launchctl load -w "$PLIST_PATH" 2>/dev/null; then
    echo -e "${GREEN}✅ LaunchAgent cargado${NC}"
else
    # Si falla, intentar método tradicional
    ERROR_OUTPUT=$(launchctl load "$PLIST_PATH" 2>&1)
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ LaunchAgent cargado${NC}"
    else
        # El error 134 es un falso positivo conocido en macOS
        if [ $EXIT_CODE -eq 134 ]; then
            echo -e "${YELLOW}⚠️  Error 134 (falso positivo conocido en macOS)${NC}"
            echo "   El servicio puede funcionar de todas formas"
        else
            echo -e "${YELLOW}⚠️  Error al cargar: $ERROR_OUTPUT${NC}"
        fi
    fi
fi

# Verificar que está cargado
echo ""
echo "Verificando estado..."
sleep 2
if launchctl list | grep -q "com.shogun.cloudflare-monitor"; then
    echo -e "${GREEN}✅ Servicio activo${NC}"
    launchctl list | grep "com.shogun.cloudflare-monitor"
else
    echo -e "${YELLOW}⚠️  Servicio no aparece en launchctl list${NC}"
    echo "   Esto puede ser normal - el servicio puede estar funcionando de todas formas"
    echo "   Verifica los logs para confirmar:"
    echo "   tail -f $HOME/Library/Logs/cloudflare-tunnel-monitor.out.log"
fi

# Probar ejecución manual para verificar que funciona
echo ""
echo "Probando ejecución manual del script..."
if /bin/bash "$MONITOR_SCRIPT" single >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Script funciona correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  El script puede tener problemas, revisa los logs${NC}"
fi

echo ""
echo "=========================================================="
if launchctl list | grep -q "com.shogun.cloudflare-monitor" 2>/dev/null; then
    echo -e "${GREEN}✅ Monitoreo automático configurado (LaunchAgent)${NC}"
else
    echo -e "${YELLOW}⚠️  LaunchAgent no se cargó correctamente${NC}"
    echo ""
    echo "Como alternativa, puedes usar crontab:"
    echo "  ./scripts/setup-cloudflare-monitor-cron.sh"
    echo ""
    echo "O verificar manualmente si el servicio funciona:"
    echo "  Espera 5 minutos y revisa: tail -f $HOME/Library/Logs/cloudflare-tunnel-monitor.out.log"
fi
echo ""
echo "El script de monitoreo se ejecutará automáticamente cada 5 minutos"
echo ""
echo "📋 Comandos útiles:"
echo "  Ver logs: tail -f $HOME/Library/Logs/cloudflare-tunnel-monitor.log"
echo "  Verificar estado: launchctl list | grep cloudflare-monitor"
echo "  Detener monitoreo: launchctl unload $PLIST_PATH"
echo "  Reiniciar monitoreo: launchctl unload $PLIST_PATH && launchctl load $PLIST_PATH"
echo "  Ejecutar manualmente: $MONITOR_SCRIPT single"
echo "  Alternativa (crontab): ./scripts/setup-cloudflare-monitor-cron.sh"
echo ""

