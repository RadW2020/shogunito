#!/bin/bash
# Script para iniciar la API ejecutando migraciones primero en entorno de test
# Este script se usa cuando NODE_ENV=test para asegurar que las migraciones se ejecuten

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Obtener el directorio del script y navegar a la raíz de la API
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$API_DIR"

# Solo ejecutar migraciones si estamos en entorno de test
if [ "$NODE_ENV" = "test" ]; then
    echo -e "${YELLOW}🔄 Entorno de test detectado - ejecutando migraciones...${NC}" >&2
    echo -e "${YELLOW}📊 Variables de entorno:${NC}" >&2
    echo -e "   DATABASE_HOST=${DATABASE_HOST:-localhost}" >&2
    echo -e "   DATABASE_PORT=${DATABASE_PORT:-5432}" >&2
    echo -e "   DATABASE_NAME=${DATABASE_NAME:-shogun_test}" >&2
    
    # Esperar a que PostgreSQL esté listo (opcional, con timeout)
    echo -e "${YELLOW}⏳ Verificando conexión a PostgreSQL...${NC}" >&2
    MAX_RETRIES=30
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if command -v psql >/dev/null 2>&1; then
            if PGPASSWORD="${DATABASE_PASSWORD}" psql -h "${DATABASE_HOST:-localhost}" -p "${DATABASE_PORT:-5434}" -U "${DATABASE_USERNAME:-shogun_test}" -d "${DATABASE_NAME:-shogun_test}" -c "SELECT 1" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ PostgreSQL está listo${NC}" >&2
                break
            fi
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            sleep 1
        fi
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo -e "${YELLOW}⚠️  No se pudo verificar PostgreSQL, continuando de todas formas...${NC}" >&2
    fi
    
    # Ejecutar migraciones con las variables de entorno actuales
    echo -e "${YELLOW}🔄 Ejecutando migraciones...${NC}" >&2
    if npm run migration:run >&2; then
        echo -e "${GREEN}✅ Migraciones ejecutadas correctamente${NC}" >&2
    else
        MIGRATION_EXIT_CODE=$?
        echo -e "${YELLOW}⚠️  Error ejecutando migraciones (código: $MIGRATION_EXIT_CODE)${NC}" >&2
        echo -e "${YELLOW}💡 Esto puede ser normal si las migraciones ya están aplicadas${NC}" >&2
        echo -e "${YELLOW}💡 Continuando con el inicio de la API...${NC}" >&2
    fi
fi

# Iniciar la API normalmente
echo -e "${GREEN}🚀 Iniciando API...${NC}" >&2
exec npm run start:dev





