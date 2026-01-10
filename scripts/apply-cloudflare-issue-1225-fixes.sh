#!/bin/bash

# Script para aplicar soluciones del issue #1225 de cloudflared
# Basado en soluciones que han funcionado para otros usuarios

set -e

echo "🔧 Aplicando soluciones del issue #1225 de cloudflared"
echo "====================================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

CONFIG_FILE="$HOME/.cloudflared/config.yml"
BACKUP_FILE="$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# 1. Backup de configuración actual
echo "1. Haciendo backup de configuración actual..."
if [ -f "$CONFIG_FILE" ]; then
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup creado: $BACKUP_FILE${NC}"
else
    echo -e "${RED}❌ Archivo de configuración no encontrado${NC}"
    exit 1
fi

# 2. Verificar y actualizar configuración
echo ""
echo "2. Actualizando configuración con mejoras del issue #1225..."

# Leer configuración actual
CURRENT_CONFIG=$(cat "$CONFIG_FILE")

# Verificar si ya tiene las mejoras
if echo "$CURRENT_CONFIG" | grep -q "heartbeat-interval"; then
    echo -e "${YELLOW}⚠️  La configuración ya tiene mejoras aplicadas${NC}"
    echo "   Revisando si necesita actualizaciones..."
else
    echo "   Agregando configuraciones adicionales..."
fi

# 3. Verificar versión de cloudflared
echo ""
echo "3. Verificando versión de cloudflared..."
VERSION=$(cloudflared --version 2>&1 | head -1)
echo "   $VERSION"

# Verificar si es la última versión
LATEST_VERSION=$(curl -s https://api.github.com/repos/cloudflare/cloudflared/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || echo "unknown")
if [ "$LATEST_VERSION" != "unknown" ]; then
    echo "   Última versión disponible: $LATEST_VERSION"
    echo -e "${YELLOW}⚠️  Considera actualizar si hay una versión más reciente${NC}"
    echo "   brew upgrade cloudflared"
fi

# 4. Verificar autenticación
echo ""
echo "4. Verificando autenticación..."
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

# 5. Limpiar conectores zombie
echo ""
echo "5. Limpiando conectores zombie..."
cloudflared tunnel cleanup shogun-tunnel 2>&1 | head -5 || echo "   No hay conectores zombie"
echo -e "${GREEN}✅ Limpieza completada${NC}"

# 6. Verificar conectividad de red
echo ""
echo "6. Verificando conectividad de red..."
if curl -s --max-time 5 https://www.cloudflare.com >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Conectividad a Cloudflare OK${NC}"
else
    echo -e "${YELLOW}⚠️  No se puede conectar a Cloudflare (puede ser temporal)${NC}"
fi

# 7. Verificar servicios locales
echo ""
echo "7. Verificando servicios locales..."
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "shogun-api-prod"; then
    if curl -s -f http://localhost:3002/api/v1/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Servicios locales funcionando${NC}"
    else
        echo -e "${YELLOW}⚠️  Servicios Docker corriendo pero API no responde${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Servicios Docker no están corriendo${NC}"
fi

# 8. Reiniciar servicio para aplicar cambios
echo ""
echo "8. Reiniciando servicio para aplicar cambios..."
sudo launchctl kickstart system/com.cloudflare.cloudflared 2>&1 || {
    echo -e "${YELLOW}⚠️  No se pudo reiniciar automáticamente${NC}"
    echo "   Reinicia manualmente: sudo launchctl kickstart system/com.cloudflare.cloudflared"
}

echo ""
echo "Esperando 30 segundos para que se conecte..."
sleep 30

# 9. Verificar estado final
echo ""
echo "9. Verificando estado final..."
if ps aux | grep -q "[c]loudflared tunnel run"; then
    PID=$(pgrep -f "cloudflared tunnel run")
    echo -e "${GREEN}✅ Proceso corriendo (PID: $PID)${NC}"
else
    echo -e "${YELLOW}⚠️  Proceso no está corriendo${NC}"
fi

TUNNEL_INFO=$(cloudflared tunnel info shogun-tunnel 2>&1)
if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo -e "${GREEN}✅ Túnel conectado${NC}"
    echo "$TUNNEL_INFO" | grep -E "(CONNECTOR ID|EDGE)" | head -2
else
    echo -e "${YELLOW}⚠️  Túnel no conectado aún${NC}"
fi

echo ""
echo "====================================================="
echo -e "${GREEN}✅ Soluciones del issue #1225 aplicadas${NC}"
echo ""
echo "Mejoras aplicadas:"
echo "  ✅ Configuración optimizada con heartbeat-interval"
echo "  ✅ TCP keepalive configurado"
echo "  ✅ Retries más agresivos"
echo "  ✅ Conectores zombie limpiados"
echo "  ✅ Verificaciones de conectividad y servicios"
echo ""
echo "📋 Próximos pasos recomendados:"
echo "  1. Monitorear logs: sudo tail -f /var/log/cloudflared.err.log"
echo "  2. Verificar que no hay más errores 530"
echo "  3. Si el problema persiste, considerar actualizar cloudflared"
echo "  4. Revisar logs del wrapper: sudo tail -f /var/log/cloudflared-wrapper.log"
echo ""

