#!/bin/bash
# Script para ejecutar tests E2E del web con infraestructura Docker
# Este script inicia los servicios de test necesarios antes de ejecutar Playwright

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando tests E2E del web...${NC}"

# Navegar al directorio raíz del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

# Verificar si docker-compose está disponible
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Error: docker-compose no está instalado${NC}"
    exit 1
fi

# Usar docker compose o docker-compose según disponibilidad
DOCKER_COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
fi

# Verificar si los servicios de test ya están corriendo
POSTGRES_RUNNING=$(docker ps --filter "name=shogun-postgres-test" --format "{{.Names}}" 2>/dev/null | grep -q "shogun-postgres-test" && echo "yes" || echo "no")
MINIO_RUNNING=$(docker ps --filter "name=shogun-minio-test" --format "{{.Names}}" 2>/dev/null | grep -q "shogun-minio-test" && echo "yes" || echo "no")

if [ "$POSTGRES_RUNNING" = "no" ] || [ "$MINIO_RUNNING" = "no" ]; then
    echo -e "${YELLOW}🐳 Iniciando servicios de test (docker-compose.test.yml)...${NC}"
    
    # Detener contenedores existentes si los hay
    $DOCKER_COMPOSE_CMD -f docker-compose.test.yml down -v 2>/dev/null || true
    
    # Iniciar contenedores de test
    $DOCKER_COMPOSE_CMD -f docker-compose.test.yml up -d
    
    # Esperar a que los servicios estén listos
    echo -e "${YELLOW}⏳ Esperando a que los servicios estén listos...${NC}"
    sleep 5
    
    # Verificar que PostgreSQL esté listo
    echo -e "${YELLOW}📦 Verificando PostgreSQL...${NC}"
    for i in {1..30}; do
        if docker exec shogun-postgres-test pg_isready -U shogun_test &> /dev/null; then
            echo -e "${GREEN}✅ PostgreSQL está listo${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ PostgreSQL no respondió a tiempo${NC}"
            $DOCKER_COMPOSE_CMD -f docker-compose.test.yml logs postgres-test
            exit 1
        fi
        sleep 1
    done
    
    # Verificar que MinIO esté listo
    echo -e "${YELLOW}🗄️  Verificando MinIO...${NC}"
    if ! command -v curl &> /dev/null; then
        echo -e "${YELLOW}⚠️  curl no está disponible, esperando 10 segundos para MinIO...${NC}"
        sleep 10
    else
        for i in {1..30}; do
            if curl -f http://localhost:9012/minio/health/live &> /dev/null; then
                echo -e "${GREEN}✅ MinIO está listo${NC}"
                break
            fi
            if [ $i -eq 30 ]; then
                echo -e "${RED}❌ MinIO no respondió a tiempo${NC}"
                $DOCKER_COMPOSE_CMD -f docker-compose.test.yml logs minio-test
                exit 1
            fi
            sleep 1
        done
    fi
    
    SERVICES_STARTED_BY_SCRIPT=true
else
    echo -e "${GREEN}✅ Servicios de test ya están corriendo${NC}"
    SERVICES_STARTED_BY_SCRIPT=false
fi

# Navegar al directorio del web app
cd "$PROJECT_ROOT/apps/web"

# Ejecutar migraciones en la base de datos de test antes de iniciar tests
echo -e "${YELLOW}🔄 Ejecutando migraciones en base de datos de test...${NC}"
cd "$PROJECT_ROOT/apps/api"
export DATABASE_HOST="${DATABASE_HOST:-localhost}"
export DATABASE_PORT="${DATABASE_PORT:-5434}"
export DATABASE_USERNAME="${DATABASE_USERNAME:-shogun_test}"
export DATABASE_PASSWORD="${DATABASE_PASSWORD:-shogun_test_password}"
export DATABASE_NAME="${DATABASE_NAME:-shogun_test}"
export NODE_ENV="test"

if npm run migration:run 2>/dev/null; then
    echo -e "${GREEN}✅ Migraciones ejecutadas correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudieron ejecutar migraciones (puede que ya estén aplicadas o haya un error)${NC}"
    echo -e "${YELLOW}💡 Las migraciones se ejecutarán automáticamente cuando se inicie la API${NC}"
fi
cd "$PROJECT_ROOT/apps/web"

# Verificar que la API esté accesible (opcional, Playwright también lo hará)
echo -e "${YELLOW}🔍 Verificando que la API esté accesible...${NC}"
if command -v curl &> /dev/null; then
    for i in {1..10}; do
        if curl -f http://localhost:3000/api/v1/ &> /dev/null 2>&1; then
            echo -e "${GREEN}✅ API está accesible${NC}"
            break
        fi
        if [ $i -eq 10 ]; then
            echo -e "${YELLOW}⚠️  API no está accesible aún, pero Playwright la iniciará automáticamente${NC}"
        fi
        sleep 1
    done
else
    echo -e "${YELLOW}⚠️  curl no disponible, saltando verificación de API${NC}"
fi

# Ejecutar tests de Playwright
echo -e "${GREEN}🧪 Ejecutando tests E2E de Playwright...${NC}"
echo -e "${YELLOW}💡 Nota: La API se iniciará automáticamente con las variables de entorno de test${NC}"
echo ""

# Pasar todos los argumentos a Playwright
npm run test:e2e "$@"

TEST_EXIT_CODE=$?

# Mostrar logs si los tests fallaron
if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Tests fallaron${NC}"
    if [ "$SERVICES_STARTED_BY_SCRIPT" = "true" ]; then
        echo -e "${YELLOW}📋 Logs de servicios:${NC}"
        cd "$PROJECT_ROOT"
        $DOCKER_COMPOSE_CMD -f docker-compose.test.yml logs --tail=50 postgres-test
        $DOCKER_COMPOSE_CMD -f docker-compose.test.yml logs --tail=50 minio-test
    fi
fi

# Preguntar si se desea detener los contenedores (solo si los iniciamos nosotros)
if [ "$SERVICES_STARTED_BY_SCRIPT" = "true" ] && [ "$1" != "--keep-running" ]; then
    echo ""
    echo -e "${YELLOW}🛑 ¿Deseas detener los servicios de test? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        cd "$PROJECT_ROOT"
        $DOCKER_COMPOSE_CMD -f docker-compose.test.yml down -v
        echo -e "${GREEN}✅ Servicios detenidos${NC}"
    else
        echo -e "${YELLOW}💡 Servicios siguen corriendo. Para detenerlos: docker-compose -f docker-compose.test.yml down -v${NC}"
    fi
fi

exit $TEST_EXIT_CODE




