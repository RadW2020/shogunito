#!/bin/bash

# Script para corregir los registros DNS de Cloudflare Tunnel
# El problema: Los registros están como A records en lugar de CNAME

set -e

echo "🔧 Corrección de Registros DNS para Cloudflare Tunnel"
echo "======================================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TUNNEL_ID="5adc17fe-7cf4-468e-8bef-a3264ec7e67f"
TUNNEL_NAME="shogun-tunnel"
DOMAINS=("shogunapi.uliber.com" "shogunweb.uliber.com" "shogunminio.uliber.com")
EXPECTED_CNAME="${TUNNEL_ID}.cfargotunnel.com"

echo "Túnel ID: ${TUNNEL_ID}"
echo "CNAME esperado: ${EXPECTED_CNAME}"
echo ""

# Función para verificar DNS
check_dns() {
    local domain=$1
    echo -e "${BLUE}Verificando: ${domain}${NC}"
    
    # Verificar CNAME
    local cname=$(dig ${domain} CNAME +short 2>/dev/null | head -1)
    
    # Verificar A records
    local a_records=$(dig ${domain} A +short 2>/dev/null)
    
    if [ -n "$cname" ]; then
        if [ "$cname" = "$EXPECTED_CNAME" ]; then
            echo -e "  ${GREEN}✅ CNAME correcto: ${cname}${NC}"
            return 0
        else
            echo -e "  ${RED}❌ CNAME incorrecto: ${cname}${NC}"
            echo -e "  ${YELLOW}   Esperado: ${EXPECTED_CNAME}${NC}"
            return 1
        fi
    elif [ -n "$a_records" ]; then
        echo -e "  ${RED}❌ Tiene A records (INCORRECTO): ${a_records}${NC}"
        echo -e "  ${YELLOW}   Los túneles requieren CNAME, no A records${NC}"
        return 1
    else
        echo -e "  ${RED}❌ No tiene registros DNS${NC}"
        return 1
    fi
}

# Verificar estado actual
echo "📊 Estado Actual de DNS:"
echo "------------------------"
echo ""

HAS_ISSUES=0
for domain in "${DOMAINS[@]}"; do
    if ! check_dns "$domain"; then
        HAS_ISSUES=1
    fi
    echo ""
done

if [ $HAS_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los registros DNS están correctos${NC}"
    echo ""
    echo "Si aún no funciona, el problema puede ser:"
    echo "  1. Propagación DNS (espera 5-10 minutos)"
    echo "  2. SSL/TLS no está en modo 'Flexible'"
    echo "  3. El túnel no está conectado correctamente"
    exit 0
fi

echo ""
echo "======================================================"
echo "🔧 Corrección Necesaria"
echo "======================================================"
echo ""

echo -e "${YELLOW}⚠️  PROBLEMA DETECTADO:${NC}"
echo ""
echo "Los registros DNS están configurados como A records (IPs directas)"
echo "en lugar de CNAME apuntando al túnel."
echo ""
echo "Los túneles de Cloudflare REQUIEREN CNAME apuntando a:"
echo "  ${EXPECTED_CNAME}"
echo ""

echo "📋 Pasos para Corregir:"
echo ""
echo "1. Ve a Cloudflare Dashboard:"
echo "   https://dash.cloudflare.com"
echo ""
echo "2. Selecciona tu dominio: uliber.com"
echo ""
echo "3. Ve a DNS → Records"
echo ""
echo "4. ELIMINA estos A records (si existen):"
for domain in "${DOMAINS[@]}"; do
    echo "   - ${domain} → [cualquier IP] (A record)"
done
echo ""
echo "5. Ejecuta estos comandos para crear los CNAME correctos:"
echo ""
for domain in "${DOMAINS[@]}"; do
    echo "   cloudflared tunnel route dns ${TUNNEL_NAME} ${domain}"
done
echo ""
echo "6. Espera 5-10 minutos para la propagación DNS"
echo ""
echo "7. Verifica con:"
echo "   dig shogunapi.uliber.com CNAME +short"
echo "   # Debe mostrar: ${EXPECTED_CNAME}"
echo ""

read -p "¿Quieres que ejecute los comandos para crear los CNAME ahora? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    echo "Creando CNAME records..."
    echo ""
    
    for domain in "${DOMAINS[@]}"; do
        echo -e "${BLUE}Creando CNAME para: ${domain}${NC}"
        if cloudflared tunnel route dns ${TUNNEL_NAME} ${domain} 2>&1; then
            echo -e "${GREEN}✅ CNAME creado para ${domain}${NC}"
        else
            echo -e "${RED}❌ Error al crear CNAME para ${domain}${NC}"
            echo "   Puede que ya exista o haya un problema de permisos"
        fi
        echo ""
    done
    
    echo ""
    echo "Esperando 10 segundos..."
    sleep 10
    
    echo ""
    echo "Verificando cambios..."
    echo ""
    
    for domain in "${DOMAINS[@]}"; do
        check_dns "$domain"
        echo ""
    done
    
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo ""
    echo "1. Si aún ves A records, elimínalos manualmente en Cloudflare Dashboard"
    echo "2. Espera 5-10 minutos para la propagación DNS completa"
    echo "3. Verifica que SSL/TLS esté en modo 'Flexible' en Cloudflare Dashboard"
    echo "4. Prueba desde otro dispositivo/red (no desde el servidor)"
    echo ""
else
    echo ""
    echo "Ejecuta los comandos manualmente cuando estés listo."
fi

echo ""
echo "Para más información, consulta:"
echo "  docs/CLOUDFLARE_DNS_FIX.md"

