#!/bin/bash

# Script alternativo para configurar monitoreo usando crontab
# Úsalo si el LaunchAgent no funciona

set -e

echo "🔧 Configurando monitoreo automático de Cloudflare Tunnel (crontab)"
echo "====================================================================="
echo ""

# Rutas
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/monitor-cloudflare-tunnel.sh"

# Verificar que el script existe
if [ ! -f "$MONITOR_SCRIPT" ]; then
    echo "❌ Script de monitoreo no encontrado: $MONITOR_SCRIPT"
    exit 1
fi

echo "✅ Script de monitoreo encontrado"

# Obtener crontab actual
CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")

# Verificar si ya existe la entrada
if echo "$CURRENT_CRON" | grep -q "monitor-cloudflare-tunnel"; then
    echo ""
    echo "⚠️  Ya existe una entrada de crontab para el monitoreo"
    echo "   Eliminando entrada anterior..."
    # Eliminar línea existente
    (echo "$CURRENT_CRON" | grep -v "monitor-cloudflare-tunnel") | crontab -
fi

# Agregar nueva entrada (cada 5 minutos)
echo ""
echo "Agregando entrada a crontab (cada 5 minutos)..."
(crontab -l 2>/dev/null || echo ""; echo "*/5 * * * * /bin/bash $MONITOR_SCRIPT single >> $HOME/Library/Logs/cloudflare-tunnel-monitor-cron.log 2>&1") | crontab -

echo "✅ Crontab configurado"
echo ""
echo "La verificación se ejecutará cada 5 minutos"
echo ""
echo "📋 Comandos útiles:"
echo "  Ver logs: tail -f $HOME/Library/Logs/cloudflare-tunnel-monitor-cron.log"
echo "  Ver crontab: crontab -l"
echo "  Eliminar: crontab -l | grep -v monitor-cloudflare-tunnel | crontab -"
echo "  Ejecutar manualmente: $MONITOR_SCRIPT single"
echo ""

