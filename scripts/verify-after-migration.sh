#!/bin/bash

# Script para verificar que todo funciona después de la migración

set -e

echo "🔍 Verificación Post-Migración"
echo "==============================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "1. Verificando proceso cloudflared..."
if ps aux | grep -q "[c]loudflared tunnel run"; then
    PID=$(pgrep -f "cloudflared tunnel run")
    echo -e "${GREEN}✅ Proceso corriendo (PID: $PID)${NC}"
else
    echo -e "${RED}❌ Proceso NO está corriendo${NC}"
    echo "   Reiniciando..."
    sudo launchctl kickstart system/com.cloudflare.cloudflared
    sleep 10
fi
echo ""

echo "2. Verificando conexiones del túnel..."
TUNNEL_INFO=$(cloudflared tunnel info shogun-tunnel 2>&1)
if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo -e "${GREEN}✅ Túnel tiene conexiones activas${NC}"
    echo "$TUNNEL_INFO" | grep "CONNECTOR ID" | sed 's/^/   /'
else
    echo -e "${RED}❌ Túnel NO tiene conexiones activas${NC}"
    echo "   Esperando 30 segundos..."
    sleep 30
    cloudflared tunnel info shogun-tunnel
fi
echo ""

echo "3. Verificando servicios locales..."
API_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://localhost:3002/api/v1/health 2>/dev/null || echo "000")
WEB_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://localhost:3003 2>/dev/null || echo "000")

if [ "$API_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ API local responde (HTTP $API_STATUS)${NC}"
else
    echo -e "${RED}❌ API local no responde (HTTP $API_STATUS)${NC}"
fi

if [ "$WEB_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Web local responde (HTTP $WEB_STATUS)${NC}"
else
    echo -e "${RED}❌ Web local no responde (HTTP $WEB_STATUS)${NC}"
fi
echo ""

echo "4. Verificando DNS..."
CNAME=$(dig shogunapi.uliber.com CNAME +short 2>/dev/null | head -1)
if [ -n "$CNAME" ]; then
    echo -e "${GREEN}✅ CNAME existe: $CNAME${NC}"
else
    echo -e "${YELLOW}⚠️  CNAME no visible aún (puede tardar unos minutos)${NC}"
fi
echo ""

echo "5. Verificando accesibilidad externa..."
echo "   (Esto puede tardar hasta 10 segundos por endpoint)"
echo ""

API_EXT=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://shogunapi.uliber.com/api/v1/health 2>/dev/null || echo "000")
sleep 2
WEB_EXT=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://shogunweb.uliber.com 2>/dev/null || echo "000")

if [ "$API_EXT" = "200" ] || [ "$API_EXT" = "301" ] || [ "$API_EXT" = "302" ]; then
    echo -e "${GREEN}✅ API externa accesible: https://shogunapi.uliber.com (HTTP $API_EXT)${NC}"
else
    if [ "$API_EXT" = "000" ]; then
        echo -e "${YELLOW}⚠️  API externa: Timeout (puede ser normal desde el servidor)${NC}"
        echo "   Prueba desde otro dispositivo/red para confirmar"
    else
        echo -e "${RED}❌ API externa: HTTP $API_EXT${NC}"
    fi
fi

if [ "$WEB_EXT" = "200" ] || [ "$WEB_EXT" = "301" ] || [ "$WEB_EXT" = "302" ]; then
    echo -e "${GREEN}✅ Web externa accesible: https://shogunweb.uliber.com (HTTP $WEB_EXT)${NC}"
else
    if [ "$WEB_EXT" = "000" ]; then
        echo -e "${YELLOW}⚠️  Web externa: Timeout (puede ser normal desde el servidor)${NC}"
        echo "   Prueba desde otro dispositivo/red para confirmar"
    else
        echo -e "${RED}❌ Web externa: HTTP $WEB_EXT${NC}"
    fi
fi
echo ""

echo "=============================================="
echo "📋 Resumen"
echo "=============================================="
echo ""

if [ "$API_STATUS" = "200" ] && [ "$WEB_STATUS" = "200" ] && echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo -e "${GREEN}✅ Configuración local correcta${NC}"
    echo ""
    if [ "$API_EXT" = "000" ] || [ "$WEB_EXT" = "000" ]; then
        echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
        echo ""
        echo "Los endpoints muestran timeout desde el servidor, pero esto puede ser normal."
        echo "Para verificar que realmente funciona:"
        echo ""
        echo "1. Prueba desde otro dispositivo/red:"
        echo "   https://shogunweb.uliber.com"
        echo ""
        echo "2. Prueba desde tu móvil con datos"
        echo ""
        echo "3. Espera 2-3 minutos más para que la migración se complete completamente"
    else
        echo -e "${GREEN}✅ Todo funciona correctamente${NC}"
    fi
else
    echo -e "${RED}❌ Hay problemas con la configuración local${NC}"
    echo "   Revisa los errores arriba"
fi

echo ""
echo "Para verificar en Cloudflare Dashboard:"
echo "  https://one.dash.cloudflare.com → Networks → Connectors → Cloudflare Tunnels"
echo "  Verifica que 'shogun-tunnel' muestra Routes configuradas"






