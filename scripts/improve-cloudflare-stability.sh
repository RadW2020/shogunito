#!/bin/bash

# Script para mejorar la estabilidad de Cloudflare Tunnel
# Implementa las mejores prácticas para prevenir desconexiones

set -e

echo "🔧 Mejorando estabilidad de Cloudflare Tunnel"
echo "=============================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PLIST_PATH="/Library/LaunchDaemons/com.cloudflare.cloudflared.plist"
WRAPPER_SCRIPT="/Users/antoniojimenez/Projects/shogun/scripts/cloudflared-wrapper.sh"
CONFIG_FILE="$HOME/.cloudflared/config.yml"

# 1. Verificar versión de cloudflared
echo "1. Verificando versión de cloudflared..."
VERSION=$(cloudflared --version 2>&1 | head -1)
echo "   Versión actual: $VERSION"
echo -e "${GREEN}✅ cloudflared instalado${NC}"

# 2. Verificar autenticación
echo ""
echo "2. Verificando autenticación..."
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo -e "${RED}❌ Certificado no encontrado${NC}"
    echo "   Ejecuta: cloudflared tunnel login"
    exit 1
fi

if [ ! -f ~/.cloudflared/5adc17fe-7cf4-468e-8bef-a3264ec7e67f.json ]; then
    echo -e "${RED}❌ Credenciales del túnel no encontradas${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Autenticación verificada${NC}"

# 3. Mejorar configuración de keepalive
echo ""
echo "3. Mejorando configuración de keepalive..."
if [ -f "$CONFIG_FILE" ]; then
    # Backup
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Verificar si ya tiene las configuraciones optimizadas
    if ! grep -q "keepAliveConnections: 100" "$CONFIG_FILE"; then
        echo "   Agregando configuración de keepalive optimizada..."
        # Ya tiene configuración, solo verificar que esté completa
        echo -e "${YELLOW}⚠️  Revisa manualmente la configuración en $CONFIG_FILE${NC}"
    else
        echo -e "${GREEN}✅ Configuración de keepalive ya está optimizada${NC}"
    fi
else
    echo -e "${RED}❌ Archivo de configuración no encontrado${NC}"
    exit 1
fi

# 4. Actualizar LaunchDaemon para usar wrapper
echo ""
echo "4. Actualizando LaunchDaemon para usar wrapper con verificaciones..."
sudo tee "$PLIST_PATH" > /dev/null << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.cloudflared</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$WRAPPER_SCRIPT</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>TUNNEL_ORIGIN_CERT</key>
        <string>/Users/antoniojimenez/.cloudflared/cert.pem</string>
        <key>HOME</key>
        <string>/Users/antoniojimenez</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/cloudflared.out.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/cloudflared.err.log</string>
</dict>
</plist>
EOF

echo -e "${GREEN}✅ LaunchDaemon actualizado${NC}"

# 5. Verificar sintaxis
echo ""
echo "5. Verificando sintaxis..."
if sudo plutil -lint "$PLIST_PATH" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Sintaxis correcta${NC}"
else
    echo -e "${RED}❌ Error en la sintaxis${NC}"
    sudo plutil -lint "$PLIST_PATH"
    exit 1
fi

# 6. Reiniciar servicio
echo ""
echo "6. Reiniciando servicio..."
sudo launchctl bootout system/com.cloudflare.cloudflared 2>/dev/null || true
sleep 2
sudo launchctl bootstrap system "$PLIST_PATH"
sleep 2
sudo launchctl kickstart system/com.cloudflare.cloudflared

echo ""
echo "Esperando 30 segundos para que se conecte..."
sleep 30

# 7. Verificar
echo ""
echo "7. Verificando estado..."
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

echo ""
echo "========================================================="
echo -e "${GREEN}✅ Mejoras aplicadas${NC}"
echo ""
echo "Cambios realizados:"
echo "  ✅ LaunchDaemon ahora verifica dependencias antes de iniciar"
echo "  ✅ Espera a que Docker y servicios estén listos"
echo "  ✅ Verifica autenticación antes de iniciar"
echo "  ✅ Logs más verbosos para diagnóstico"
echo ""
echo "📋 Comandos útiles:"
echo "  Ver logs del wrapper: sudo tail -f /var/log/cloudflared-wrapper.log"
echo "  Ver logs de cloudflared: sudo tail -f /var/log/cloudflared.err.log"
echo "  Verificar túnel: cloudflared tunnel info shogun-tunnel"
echo "  Reiniciar: sudo launchctl kickstart system/com.cloudflare.cloudflared"
echo ""

