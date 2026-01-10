#!/bin/bash

# Script para activar el LaunchDaemon de Cloudflare Tunnel
# Requiere permisos de administrador (sudo)

set -e

echo "🔧 Activando LaunchDaemon para Cloudflare Tunnel..."
echo ""

# Paso 1: Detener proceso manual
echo "1. Deteniendo proceso manual actual..."
if ps aux | grep -q "[c]loudflared tunnel run"; then
    echo "   Proceso encontrado, deteniendo..."
    sudo pkill -f "cloudflared tunnel run" 2>/dev/null || true
    sleep 2
    
    if ps aux | grep -q "[c]loudflared tunnel run"; then
        echo "   Forzando detención..."
        sudo pkill -9 -f "cloudflared tunnel run" 2>/dev/null || true
        sleep 2
    fi
    
    if ps aux | grep -q "[c]loudflared tunnel run"; then
        echo "   ❌ No se pudo detener el proceso manual"
        exit 1
    else
        echo "   ✅ Proceso manual detenido"
    fi
else
    echo "   ✅ No hay proceso manual corriendo"
fi

# Paso 2: Verificar permisos
echo ""
echo "2. Verificando permisos del LaunchDaemon..."
if [ -f /Library/LaunchDaemons/com.cloudflare.cloudflared.plist ]; then
    sudo chown root:wheel /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
    sudo chmod 644 /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
    echo "   ✅ Permisos correctos"
else
    echo "   ❌ No existe el LaunchDaemon"
    exit 1
fi

# Paso 3: Verificar sintaxis del plist
echo ""
echo "3. Verificando sintaxis del plist..."
if plutil -lint /Library/LaunchDaemons/com.cloudflare.cloudflared.plist >/dev/null 2>&1; then
    echo "   ✅ Sintaxis correcta"
else
    echo "   ❌ Error en la sintaxis del plist"
    plutil -lint /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
    exit 1
fi

# Paso 4: Descargar si está cargado
echo ""
echo "4. Descargando servicio si está cargado..."
if sudo launchctl list | grep -q cloudflare; then
    sudo launchctl bootout system/com.cloudflare.cloudflared 2>/dev/null && echo "   ✅ Servicio descargado" || echo "   ⚠️  Error al descargar (puede ser normal)"
else
    echo "   ℹ️  Servicio no estaba cargado"
fi

# Paso 5: Cargar LaunchDaemon
echo ""
echo "5. Cargando LaunchDaemon..."
if sudo launchctl bootstrap system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist 2>&1; then
    echo "   ✅ LaunchDaemon cargado"
else
    echo "   ⚠️  Error al cargar con bootstrap, intentando método tradicional..."
    if sudo launchctl load -w /Library/LaunchDaemons/com.cloudflare.cloudflared.plist 2>&1; then
        echo "   ✅ LaunchDaemon cargado (método tradicional)"
    else
        echo "   ❌ Error al cargar el LaunchDaemon"
        echo "   Verifica los logs del sistema:"
        echo "   log show --predicate 'subsystem == \"com.apple.launchd\"' --last 10m | grep cloudflare"
        exit 1
    fi
fi

# Paso 6: Iniciar servicio
echo ""
echo "6. Iniciando servicio..."
sudo launchctl kickstart system/com.cloudflare.cloudflared
echo "   ✅ Servicio iniciado"

# Paso 7: Esperar conexión
echo ""
echo "7. Esperando conexión del túnel (15 segundos)..."
sleep 15

# Paso 8: Verificar
echo ""
echo "8. Verificando estado..."
echo ""

# Verificar servicio
if sudo launchctl list | grep -q cloudflare; then
    echo "   ✅ Servicio launchd activo"
    sudo launchctl list | grep cloudflare
else
    echo "   ⚠️  Servicio launchd no aparece en la lista"
fi

# Verificar proceso
echo ""
if ps aux | grep -q "[c]loudflared tunnel run"; then
    echo "   ✅ Proceso corriendo"
    ps aux | grep "[c]loudflared tunnel run" | awk '{print "      Usuario: "$1" | PID: "$2" | Tiempo: "$10}'
else
    echo "   ❌ Proceso no está corriendo"
    echo "   Revisa los logs: sudo tail -50 /var/log/cloudflared.err.log"
fi

# Verificar túnel
echo ""
echo "   Verificando túnel..."
TUNNEL_INFO=$(cloudflared tunnel info shogun-tunnel 2>&1)
if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo "   ✅ Túnel conectado (CONNECTOR ID presente)"
    echo "$TUNNEL_INFO" | grep -E "(CONNECTOR ID|EDGE)" | head -2
else
    echo "   ⚠️  Túnel no conectado o sin CONNECTOR ID"
    echo "$TUNNEL_INFO" | head -5
fi

# Verificar endpoints
echo ""
echo "   Verificando endpoints..."
API_STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://shogunapi.uliber.com/api/v1/health 2>&1 || echo "000")
WEB_STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://shogunweb.uliber.com 2>&1 || echo "000")

if [ "$API_STATUS" = "200" ] && [ "$WEB_STATUS" = "200" ]; then
    echo "   ✅ Endpoints funcionando (API: $API_STATUS, Web: $WEB_STATUS)"
else
    echo "   ⚠️  Endpoints no responden correctamente (API: $API_STATUS, Web: $WEB_STATUS)"
    echo "   Esto puede ser normal si hay problemas de red temporales"
fi

echo ""
echo "✅ Proceso completado"
echo ""
echo "📋 Comandos útiles:"
echo "  Ver logs: sudo tail -f /var/log/cloudflared.out.log"
echo "  Ver errores: sudo tail -f /var/log/cloudflared.err.log"
echo "  Reiniciar: sudo launchctl kickstart system/com.cloudflare.cloudflared"
echo "  Estado del túnel: cloudflared tunnel info shogun-tunnel"
echo "  Estado del servicio: sudo launchctl list | grep cloudflare"





