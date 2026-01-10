#!/bin/bash

# Script de diagnóstico completo para Cloudflare Tunnel
# Verifica que todos los servicios sean accesibles desde internet

set -e

echo "🔍 Diagnóstico Completo de Cloudflare Tunnel"
echo "=============================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir estado
print_status() {
    if [ "$1" = "OK" ]; then
        echo -e "${GREEN}✅ $2${NC}"
    elif [ "$1" = "ERROR" ]; then
        echo -e "${RED}❌ $2${NC}"
    else
        echo -e "${YELLOW}⚠️  $2${NC}"
    fi
}

# 1. Verificar instalación de cloudflared
echo "1. Verificando instalación de cloudflared..."
if command -v cloudflared &> /dev/null; then
    VERSION=$(cloudflared --version 2>&1 | head -1)
    print_status "OK" "cloudflared instalado: $VERSION"
else
    print_status "ERROR" "cloudflared no está instalado"
    exit 1
fi
echo ""

# 2. Verificar proceso cloudflared
echo "2. Verificando proceso cloudflared..."
if ps aux | grep -q "[c]loudflared tunnel run"; then
    PID=$(pgrep -f "cloudflared tunnel run")
    print_status "OK" "Proceso cloudflared corriendo (PID: $PID)"
else
    print_status "ERROR" "No hay proceso cloudflared corriendo"
fi
echo ""

# 3. Verificar servicio launchd
echo "3. Verificando servicio launchd..."
if launchctl list | grep -q cloudflare; then
    print_status "OK" "Servicio launchd cargado"
else
    print_status "WARNING" "Servicio launchd no está cargado (el proceso puede estar corriendo manualmente)"
fi
echo ""

# 4. Verificar configuración
echo "4. Verificando configuración..."
if [ -f ~/.cloudflared/config.yml ]; then
    print_status "OK" "Archivo config.yml existe"
    echo "   Contenido:"
    cat ~/.cloudflared/config.yml | sed 's/^/   /'
else
    print_status "ERROR" "Archivo config.yml no existe"
fi
echo ""

# 5. Verificar información del túnel
echo "5. Verificando información del túnel..."
TUNNEL_INFO=$(cloudflared tunnel info shogun-tunnel 2>&1)
if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    print_status "OK" "Túnel tiene conexiones activas"
    echo "$TUNNEL_INFO" | sed 's/^/   /'
else
    print_status "ERROR" "Túnel no tiene conexiones activas"
    echo "$TUNNEL_INFO" | sed 's/^/   /'
fi
echo ""

# 6. Verificar servicios locales
echo "6. Verificando servicios locales..."
API_LOCAL=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/api/v1/health 2>/dev/null || echo "000")
WEB_LOCAL=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3003 2>/dev/null || echo "000")
MINIO_LOCAL=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:9010/minio/health/live 2>/dev/null || echo "000")

if [ "$API_LOCAL" = "200" ]; then
    print_status "OK" "API local responde (http://localhost:3002)"
else
    print_status "ERROR" "API local no responde (código: $API_LOCAL)"
fi

if [ "$WEB_LOCAL" = "200" ]; then
    print_status "OK" "Web local responde (http://localhost:3003)"
else
    print_status "ERROR" "Web local no responde (código: $WEB_LOCAL)"
fi

if [ "$MINIO_LOCAL" = "200" ] || [ "$MINIO_LOCAL" = "204" ]; then
    print_status "OK" "MinIO local responde (http://localhost:9010)"
else
    print_status "WARNING" "MinIO local no responde (código: $MINIO_LOCAL)"
fi
echo ""

# 7. Verificar DNS
echo "7. Verificando resolución DNS..."
API_DNS=$(dig +short shogunapi.uliber.com 2>/dev/null | head -1)
WEB_DNS=$(dig +short shogunweb.uliber.com 2>/dev/null | head -1)
MINIO_DNS=$(dig +short shogunminio.uliber.com 2>/dev/null | head -1)

if [ -n "$API_DNS" ]; then
    print_status "OK" "shogunapi.uliber.com resuelve a: $API_DNS"
else
    print_status "ERROR" "shogunapi.uliber.com no resuelve"
fi

if [ -n "$WEB_DNS" ]; then
    print_status "OK" "shogunweb.uliber.com resuelve a: $WEB_DNS"
else
    print_status "ERROR" "shogunweb.uliber.com no resuelve"
fi

if [ -n "$MINIO_DNS" ]; then
    print_status "OK" "shogunminio.uliber.com resuelve a: $MINIO_DNS"
else
    print_status "WARNING" "shogunminio.uliber.com no resuelve"
fi
echo ""

# 8. Verificar accesibilidad externa
echo "8. Verificando accesibilidad desde internet..."
echo "   (Esto puede tardar hasta 10 segundos por endpoint)"
echo ""

API_EXT=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://shogunapi.uliber.com/api/v1/health 2>/dev/null || echo "000")
sleep 1
WEB_EXT=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://shogunweb.uliber.com 2>/dev/null || echo "000")
sleep 1
MINIO_EXT=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://shogunminio.uliber.com 2>/dev/null || echo "000")

API_EXT_ERROR=0
WEB_EXT_ERROR=0

if [ "$API_EXT" = "200" ] || [ "$API_EXT" = "301" ] || [ "$API_EXT" = "302" ]; then
    print_status "OK" "API externa accesible: https://shogunapi.uliber.com (código: $API_EXT)"
else
    print_status "ERROR" "API externa NO accesible: https://shogunapi.uliber.com (código: $API_EXT)"
    API_EXT_ERROR=1
    if [ "$API_EXT" = "000" ]; then
        echo "   → Timeout: La conexión no se establece. Verifica:"
        echo "     - Configuración SSL/TLS en Cloudflare Dashboard (debe ser 'Flexible')"
        echo "     - Registros DNS en Cloudflare Dashboard"
        echo "     - Firewall o restricciones de red"
    elif [ "$API_EXT" = "502" ]; then
        echo "   → Bad Gateway: El túnel está conectado pero los servicios locales no responden"
    elif [ "$API_EXT" = "530" ]; then
        echo "   → Cloudflare Error: El túnel no está conectado correctamente"
    fi
fi

if [ "$WEB_EXT" = "200" ] || [ "$WEB_EXT" = "301" ] || [ "$WEB_EXT" = "302" ]; then
    print_status "OK" "Web externa accesible: https://shogunweb.uliber.com (código: $WEB_EXT)"
else
    print_status "ERROR" "Web externa NO accesible: https://shogunweb.uliber.com (código: $WEB_EXT)"
    WEB_EXT_ERROR=1
    if [ "$WEB_EXT" = "000" ]; then
        echo "   → Timeout: La conexión no se establece"
    elif [ "$WEB_EXT" = "502" ]; then
        echo "   → Bad Gateway: El túnel está conectado pero los servicios locales no responden"
    elif [ "$WEB_EXT" = "530" ]; then
        echo "   → Cloudflare Error: El túnel no está conectado correctamente"
    fi
fi

if [ "$MINIO_EXT" = "200" ] || [ "$MINIO_EXT" = "301" ] || [ "$MINIO_EXT" = "302" ]; then
    print_status "OK" "MinIO externo accesible: https://shogunminio.uliber.com (código: $MINIO_EXT)"
else
    print_status "WARNING" "MinIO externo NO accesible: https://shogunminio.uliber.com (código: $MINIO_EXT)"
fi
echo ""

# 9. Resumen y recomendaciones
echo "=============================================="
echo "📋 Resumen y Recomendaciones"
echo "=============================================="
echo ""

ISSUES=0

if ! ps aux | grep -q "[c]loudflared tunnel run"; then
    echo "❌ El proceso cloudflared no está corriendo"
    echo "   Solución: Ejecuta 'cloudflared tunnel run shogun-tunnel' o configura el LaunchAgent"
    ISSUES=$((ISSUES + 1))
fi

if ! echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo "❌ El túnel no tiene conexiones activas"
    echo "   Solución: Ejecuta 'cloudflared tunnel cleanup shogun-tunnel' y reinicia"
    ISSUES=$((ISSUES + 1))
fi

if [ "$API_LOCAL" != "200" ] || [ "$WEB_LOCAL" != "200" ]; then
    echo "❌ Los servicios locales no responden"
    echo "   Solución: Verifica que Docker esté corriendo: docker-compose -f docker-compose.production.yml ps"
    ISSUES=$((ISSUES + 1))
fi

if [ "$API_EXT_ERROR" = "1" ] || [ "$WEB_EXT_ERROR" = "1" ]; then
    echo "❌ Los endpoints externos no son accesibles (timeout)"
    echo "   Posibles causas:"
    echo "   1. SSL/TLS en Cloudflare Dashboard no está en modo 'Flexible'"
    echo "   2. Los registros DNS CNAME no están configurados correctamente"
    echo "   3. Firewall o restricciones de red bloquean las conexiones"
    echo ""
    echo "   Pasos para verificar:"
    echo "   1. Ve a https://dash.cloudflare.com → Tu dominio → SSL/TLS → Overview"
    echo "   2. Asegúrate de que está en modo 'Flexible'"
    echo "   3. Ve a DNS → Records y verifica que existen los CNAME:"
    echo "      - shogunapi.uliber.com → 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com"
    echo "      - shogunweb.uliber.com → 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com"
    echo "      - shogunminio.uliber.com → 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo "✅ Todo parece estar funcionando correctamente"
    echo ""
    echo "Endpoints accesibles:"
    echo "  - API: https://shogunapi.uliber.com"
    echo "  - Web: https://shogunweb.uliber.com"
    echo "  - MinIO: https://shogunminio.uliber.com"
else
    echo ""
    echo "⚠️  Se encontraron $ISSUES problema(s). Revisa las recomendaciones arriba."
fi

echo ""
echo "Para más información, consulta:"
echo "  - docs/deployment/CLOUDFLARE_TUNNEL.md"
echo "  - docs/CLOUDFLARE_TUNNEL_TROUBLESHOOTING.md"

