#!/bin/bash

# Diagnóstico profundo de Cloudflare Tunnel
# Analiza todos los aspectos posibles del problema

set -e

echo "🔍 Diagnóstico Profundo de Cloudflare Tunnel"
echo "=============================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TUNNEL_ID="5adc17fe-7cf4-468e-8bef-a3264ec7e67f"
TUNNEL_NAME="shogun-tunnel"
EXPECTED_CNAME="${TUNNEL_ID}.cfargotunnel.com"

echo "1. Verificando proceso cloudflared..."
if ps aux | grep -q "[c]loudflared tunnel run"; then
    PID=$(pgrep -f "cloudflared tunnel run")
    echo -e "${GREEN}✅ Proceso corriendo (PID: $PID)${NC}"
    ps aux | grep "[c]loudflared tunnel run" | grep -v grep
else
    echo -e "${RED}❌ Proceso NO está corriendo${NC}"
    exit 1
fi
echo ""

echo "2. Verificando conexiones del túnel..."
TUNNEL_INFO=$(cloudflared tunnel info ${TUNNEL_NAME} 2>&1)
if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo -e "${GREEN}✅ Túnel tiene conexiones activas${NC}"
    echo "$TUNNEL_INFO" | grep "CONNECTOR ID" | sed 's/^/   /'
else
    echo -e "${RED}❌ Túnel NO tiene conexiones activas${NC}"
    echo "$TUNNEL_INFO"
fi
echo ""

echo "3. Verificando servicios locales..."
echo "   API (localhost:3002):"
API_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://localhost:3002/api/v1/health 2>/dev/null || echo "000")
if [ "$API_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✅ Responde (HTTP $API_STATUS)${NC}"
else
    echo -e "   ${RED}❌ No responde (HTTP $API_STATUS)${NC}"
fi

echo "   Web (localhost:3003):"
WEB_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://localhost:3003 2>/dev/null || echo "000")
if [ "$WEB_STATUS" = "200" ]; then
    echo -e "   ${GREEN}✅ Responde (HTTP $WEB_STATUS)${NC}"
else
    echo -e "   ${RED}❌ No responde (HTTP $WEB_STATUS)${NC}"
fi

echo "   MinIO (localhost:9010):"
MINIO_STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://localhost:9010/minio/health/live 2>/dev/null || echo "000")
if [ "$MINIO_STATUS" = "200" ] || [ "$MINIO_STATUS" = "204" ]; then
    echo -e "   ${GREEN}✅ Responde (HTTP $MINIO_STATUS)${NC}"
else
    echo -e "   ${YELLOW}⚠️  No responde (HTTP $MINIO_STATUS)${NC}"
fi
echo ""

echo "4. Verificando configuración del túnel..."
if [ -f ~/.cloudflared/config.yml ]; then
    echo -e "${GREEN}✅ Archivo config.yml existe${NC}"
    echo "   Contenido:"
    cat ~/.cloudflared/config.yml | sed 's/^/   /'
else
    echo -e "${RED}❌ Archivo config.yml NO existe${NC}"
fi
echo ""

echo "5. Verificando DNS (desde diferentes servidores)..."
echo "   DNS local:"
DNS_LOCAL=$(dig +short shogunapi.uliber.com 2>/dev/null | head -1)
echo "   $DNS_LOCAL"

echo "   DNS Google (8.8.8.8):"
DNS_GOOGLE=$(dig @8.8.8.8 +short shogunapi.uliber.com 2>/dev/null | head -1)
echo "   $DNS_GOOGLE"

echo "   DNS Cloudflare (1.1.1.1):"
DNS_CF=$(dig @1.1.1.1 +short shogunapi.uliber.com 2>/dev/null | head -1)
echo "   $DNS_CF"

echo "   CNAME:"
CNAME=$(dig shogunapi.uliber.com CNAME +short 2>/dev/null | head -1)
if [ -n "$CNAME" ]; then
    if [ "$CNAME" = "$EXPECTED_CNAME" ]; then
        echo -e "   ${GREEN}✅ CNAME correcto: $CNAME${NC}"
    else
        echo -e "   ${RED}❌ CNAME incorrecto: $CNAME${NC}"
        echo -e "   ${YELLOW}   Esperado: $EXPECTED_CNAME${NC}"
    fi
else
    echo -e "   ${RED}❌ No hay CNAME${NC}"
fi
echo ""

echo "6. Verificando registros DNS en Cloudflare (vía API)..."
echo "   (Esto requiere verificación manual en Dashboard)"
echo "   Ve a: https://dash.cloudflare.com → uliber.com → DNS → Records"
echo "   Debes ver CNAME para:"
echo "     - shogunapi.uliber.com → ${EXPECTED_CNAME}"
echo "     - shogunweb.uliber.com → ${EXPECTED_CNAME}"
echo "     - shogunminio.uliber.com → ${EXPECTED_CNAME}"
echo "   NO debe haber A o AAAA records para estos subdominios"
echo ""

echo "7. Verificando SSL/TLS en Cloudflare..."
echo "   Ve a: https://dash.cloudflare.com → uliber.com → SSL/TLS → Overview"
echo "   Debe estar en modo: ${YELLOW}Flexible${NC}"
echo ""

echo "8. Verificando configuración del túnel en Cloudflare Dashboard..."
echo "   Ve a: https://dash.cloudflare.com → uliber.com → Zero Trust → Networks → Tunnels"
echo "   Verifica que el túnel '${TUNNEL_NAME}' está:"
echo "     - ✅ Activo"
echo "     - ✅ Conectado"
echo "     - ✅ Con rutas configuradas para los subdominios"
echo ""

echo "9. Probando conectividad directa a Cloudflare..."
echo "   Intentando conectar a las IPs de Cloudflare..."
for ip in 188.114.96.5 188.114.97.5; do
    if timeout 2 bash -c "echo > /dev/tcp/$ip/443" 2>/dev/null; then
        echo -e "   ${GREEN}✅ Puerto 443 accesible en $ip${NC}"
    else
        echo -e "   ${RED}❌ Puerto 443 NO accesible en $ip${NC}"
    fi
done
echo ""

echo "10. Verificando firewall local..."
echo "    Verificando si hay reglas que bloqueen conexiones salientes..."
if command -v pfctl &> /dev/null; then
    echo "    (macOS firewall puede estar activo)"
    echo "    Verifica en: System Settings → Network → Firewall"
fi
echo ""

echo "=============================================="
echo "📋 Resumen y Recomendaciones"
echo "=============================================="
echo ""

ISSUES=0

if ! echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo -e "${RED}❌ PROBLEMA: Túnel no tiene conexiones activas${NC}"
    echo "   Solución:"
    echo "     cloudflared tunnel cleanup ${TUNNEL_NAME}"
    echo "     sudo launchctl kickstart system/com.cloudflare.cloudflared"
    ISSUES=$((ISSUES + 1))
fi

if [ "$API_STATUS" != "200" ] || [ "$WEB_STATUS" != "200" ]; then
    echo -e "${RED}❌ PROBLEMA: Servicios locales no responden${NC}"
    echo "   Solución: Verifica que Docker esté corriendo"
    ISSUES=$((ISSUES + 1))
fi

if [ -z "$CNAME" ] || [ "$CNAME" != "$EXPECTED_CNAME" ]; then
    echo -e "${RED}❌ PROBLEMA: DNS no está configurado correctamente${NC}"
    echo "   Solución:"
    echo "     1. Elimina A y AAAA records en Cloudflare Dashboard"
    echo "     2. Verifica que los CNAME apuntan a: ${EXPECTED_CNAME}"
    echo "     3. Espera 5-10 minutos para propagación"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Si todo está correcto pero aún no funciona:${NC}"
    echo ""
    echo "1. Verifica en Cloudflare Dashboard → Zero Trust → Networks → Tunnels"
    echo "   que el túnel está configurado y activo"
    echo ""
    echo "2. Verifica que los registros DNS en Cloudflare Dashboard son CNAME"
    echo "   (no A ni AAAA records)"
    echo ""
    echo "3. Verifica que SSL/TLS está en modo 'Flexible'"
    echo ""
    echo "4. Prueba desde otro dispositivo/red (no desde el servidor)"
    echo ""
    echo "5. Revisa los logs del túnel:"
    echo "   sudo tail -f /var/log/cloudflared.out.log"
    echo "   sudo tail -f /var/log/cloudflared.err.log"
else
    echo ""
    echo -e "${RED}Se encontraron $ISSUES problema(s). Corrígelos arriba.${NC}"
fi

echo ""
echo "Para más información:"
echo "  docs/CLOUDFLARE_SOLUTION.md"
echo "  docs/CLOUDFLARE_DNS_FIX.md"






