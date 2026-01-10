#!/bin/bash
# Script para ejecutar tests E2E con infraestructura Docker

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando infraestructura de tests E2E...${NC}"

# Navegar al directorio raíz del proyecto
cd "$(dirname "$0")/../../.."

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

# Detener contenedores existentes si los hay
echo -e "${YELLOW}🛑 Deteniendo contenedores existentes...${NC}"
$DOCKER_COMPOSE_CMD -f docker-compose.test.yml down -v 2>/dev/null || true

# Iniciar contenedores de test
echo -e "${GREEN}🐳 Iniciando contenedores de test...${NC}"
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

# Ejecutar tests E2E
echo -e "${GREEN}🧪 Ejecutando tests E2E...${NC}"
cd apps/api

# Ejecutar con cobertura si se especifica --coverage
if [[ "$*" == *"--coverage"* ]]; then
    npm run test:e2e -- --coverage
else
    npm run test:e2e
fi

TEST_EXIT_CODE=$?

# Mostrar logs si los tests fallaron
if [ $TEST_EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Tests fallaron${NC}"
    echo -e "${YELLOW}📋 Logs de PostgreSQL:${NC}"
    cd ../..
    $DOCKER_COMPOSE_CMD -f docker-compose.test.yml logs --tail=50 postgres-test
    echo -e "${YELLOW}📋 Logs de MinIO:${NC}"
    $DOCKER_COMPOSE_CMD -f docker-compose.test.yml logs --tail=50 minio-test
fi

# Preguntar si se desea detener los contenedores
if [ "$1" != "--keep-running" ]; then
    echo -e "${YELLOW}🛑 Deteniendo contenedores de test...${NC}"
    cd ../..
    $DOCKER_COMPOSE_CMD -f docker-compose.test.yml down -v
    echo -e "${GREEN}✅ Contenedores detenidos${NC}"
else
    echo -e "${GREEN}✅ Contenedores siguen ejecutándose (usa --keep-running para mantenerlos)${NC}"
    echo -e "${YELLOW}💡 Para detenerlos manualmente: docker-compose -f docker-compose.test.yml down -v${NC}"
fi

exit $TEST_EXIT_CODE
