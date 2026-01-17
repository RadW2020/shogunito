#!/bin/bash

# Script para actualizar la API key del Oracle Monitor
# Ejecutar este script en el servidor Oracle Free Tier (80.225.189.40)

set -e

echo "🔐 Actualizando API Key del Oracle Monitor..."

# Nueva API key generada
NEW_API_KEY="41e6ec1e035090ca68eba803786d7f31d0dd4bcc33c767767e0fd9a2ede2f72b"

# API key antigua (a revocar)
OLD_API_KEY="sgh7f78g789sf89g984895wtette4et423te4r0x8bb86sgfg867d"

echo ""
echo "📋 Información:"
echo "  Nueva API Key: $NEW_API_KEY"
echo "  API Key antigua: $OLD_API_KEY"
echo ""

# Buscar archivos que contengan la API key antigua
echo "🔍 Buscando archivos con la API key antigua..."
FOUND_FILES=$(grep -r "$OLD_API_KEY" /home /opt /etc /root 2>/dev/null | cut -d: -f1 | sort -u || true)

if [ -z "$FOUND_FILES" ]; then
    echo "⚠️  No se encontraron archivos con la API key antigua."
    echo "    Puede que esté en una variable de entorno o base de datos."
    echo ""
    echo "    Busca manualmente en:"
    echo "    - Variables de entorno: env | grep -i api"
    echo "    - Servicios systemd: systemctl list-units --type=service"
    echo "    - Docker containers: docker ps"
    echo "    - Configuraciones de Coolify"
else
    echo "✅ Archivos encontrados:"
    echo "$FOUND_FILES"
    echo ""
    
    # Preguntar si quiere hacer backup
    read -p "¿Quieres hacer backup de estos archivos? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for file in $FOUND_FILES; do
            if [ -f "$file" ]; then
                cp "$file" "$file.backup-$(date +%Y%m%d-%H%M%S)"
                echo "  ✅ Backup creado: $file.backup-$(date +%Y%m%d-%H%M%S)"
            fi
        done
    fi
    
    # Reemplazar la API key
    read -p "¿Quieres reemplazar la API key automáticamente? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for file in $FOUND_FILES; do
            if [ -f "$file" ]; then
                sed -i "s/$OLD_API_KEY/$NEW_API_KEY/g" "$file"
                echo "  ✅ Actualizado: $file"
            fi
        done
        
        echo ""
        echo "🔄 Recuerda reiniciar los servicios afectados:"
        echo "   sudo systemctl restart <nombre-del-servicio>"
        echo "   o"
        echo "   docker restart <nombre-del-contenedor>"
    fi
fi

echo ""
echo "✅ Proceso completado."
echo ""
echo "📝 Próximos pasos:"
echo "  1. Verifica que el servicio funcione con la nueva API key"
echo "  2. Prueba el endpoint: curl -H 'X-API-Key: $NEW_API_KEY' http://localhost/status"
echo "  3. Si todo funciona, elimina los backups: rm *.backup-*"
echo ""
