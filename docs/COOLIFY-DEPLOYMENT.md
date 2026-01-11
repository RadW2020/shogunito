# 🚀 Despliegue con Coolify en Oracle Cloud

Esta guía explica cómo desplegar Shogunito usando Coolify como plataforma de gestión.

## Prerrequisitos

- Coolify instalado en tu instancia Oracle Cloud Free Tier
- Un dominio apuntando a la IP de tu servidor
- Acceso SSH al servidor

## Estrategia de Despliegue

Usamos **Docker Compose como Stack único** en Coolify. Esto significa:

- ✅ Una sola aplicación en Coolify = todo el proyecto
- ✅ Coolify gestiona SSL automáticamente
- ✅ Sin configuraciones complejas de proxy manual

## Paso 1: Preparar el Servidor

Conecta por SSH y crea los volúmenes externos:

```bash
ssh opc@TU_IP_ORACLE

# Crear volúmenes para persistencia de datos
docker volume create shogun_pgdata_prod
docker volume create shogun_minio_prod
```

## Paso 2: Configurar en Coolify

### 2.1 Crear el Proyecto

1. Accede a Coolify Dashboard (`https://coolify.tudominio.com`)
2. Ve a **Projects** → **+ Add New Project**
3. Nombre: `Shogunito`

### 2.2 Añadir la Aplicación

1. Dentro del proyecto, clic en **+ New**
2. Selecciona **Docker Compose**
3. Configura:

| Campo | Valor |
|-------|-------|
| **Git Repository** | `https://github.com/RadW2020/shogunito` |
| **Branch** | `main` |
| **Docker Compose File** | `docker-compose.production.yml` |
| **Build Pack** | Docker Compose |

### 2.3 Variables de Entorno

En la sección **Environment Variables**, añade:

```env
# ========== DATABASE ==========
DATABASE_USERNAME=shogun_prod
DATABASE_PASSWORD=GENERA_PASSWORD_SEGURO
DATABASE_NAME=shogun_prod

# ========== MINIO (Object Storage) ==========
MINIO_ACCESS_KEY=GENERA_ACCESS_KEY
MINIO_SECRET_KEY=GENERA_SECRET_KEY
MINIO_PUBLIC_ENDPOINT=https://minio.tudominio.com

# ========== JWT (¡CRÍTICO! No cambies después del primer deploy) ==========
JWT_SECRET=GENERA_JWT_SECRET_MUY_LARGO_Y_SEGURO
JWT_REFRESH_SECRET=GENERA_REFRESH_SECRET_DIFERENTE
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ========== FRONTEND ==========
VITE_API_URL=https://api.tudominio.com

# ========== CORS ==========
ALLOWED_ORIGINS=https://app.tudominio.com,https://tudominio.com
FRONTEND_URL=https://app.tudominio.com
```

### 2.4 Configurar Dominios

En Coolify, configura los dominios para cada servicio del compose:

| Servicio | Puerto | Dominio |
|----------|--------|---------|
| `api` | 3002 | `api.tudominio.com` |
| `web` | 3003 | `app.tudominio.com` (o `tudominio.com`) |
| `minio` | 9000 | `minio.tudominio.com` (API S3) |
| `minio` | 9001 | `minio-console.tudominio.com` (Console) |

> **Nota:** Coolify's Traefik proxy genera certificados SSL automáticamente con Let's Encrypt.

## Paso 3: Deploy

1. Clic en **Deploy** en Coolify
2. Espera a que build termine (puede tardar 5-10 minutos la primera vez)
3. Verifica los logs en Coolify

## Verificación Post-Deploy

### Health Checks

```bash
# API
curl https://api.tudominio.com/health

# Web
curl https://app.tudominio.com/health
```

### Swagger/OpenAPI

La documentación de la API estará disponible en:
```
https://api.tudominio.com/api/v1/docs
```

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        ORACLE CLOUD                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                      COOLIFY                            ││
│  │  ┌──────────────────────────────────────────────────┐   ││
│  │  │              Traefik Proxy                       │   ││
│  │  │         (SSL + Routing automático)               │   ││
│  │  └───────────┬──────────┬──────────┬────────────────┘   ││
│  │              │          │          │                     ││
│  │  ┌───────────▼──┐ ┌─────▼────┐ ┌───▼─────┐              ││
│  │  │     API      │ │   Web    │ │  MinIO  │              ││
│  │  │   :3002      │ │  :3003   │ │  :9000  │              ││
│  │  └──────┬───────┘ └──────────┘ └─────────┘              ││
│  │         │                                                ││
│  │  ┌──────▼───────┐                                       ││
│  │  │  PostgreSQL  │                                       ││
│  │  │    :5432     │                                       ││
│  │  └──────────────┘                                       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Los contenedores no inician

1. Verifica que los volúmenes externos existen:
   ```bash
   docker volume ls | grep shogun
   ```

2. Revisa los logs en Coolify

### Error de conexión a la base de datos

1. Verifica que las variables `DATABASE_*` están correctas.
2. El servicio `postgres` debe estar healthy antes de que `api` inicie

### MinIO no accesible

1. Verifica `MINIO_PUBLIC_ENDPOINT` coincide con tu dominio
2. Revisa que el dominio está configurado en Coolify para el servicio `minio`

### JWT tokens inválidos después de redeploy

Si cambiaste `JWT_SECRET` o `JWT_REFRESH_SECRET`, todos los usuarios tendrán que volver a iniciar sesión. **No cambies estos valores después del primer deploy.**

## Actualizaciones

Para actualizar la aplicación:

1. Push cambios a tu repositorio
2. En Coolify, clic en **Redeploy** o configura auto-deploy con webhooks

## Backups

### Base de Datos

```bash
# En el servidor
docker exec shogun-postgres-prod pg_dump -U shogun_prod shogun_prod > backup.sql
```

### MinIO

Los archivos están en el volumen `shogun_minio_prod`. Puedes hacer backup con:

```bash
docker run --rm -v shogun_minio_prod:/data -v $(pwd):/backup alpine tar czf /backup/minio-backup.tar.gz /data
```
