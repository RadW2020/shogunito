# Database Migrations

Este proyecto usa TypeORM para gestionar las migraciones de base de datos.

## Comandos Disponibles

Puedes ejecutar los comandos de migración desde la **raíz del proyecto** o desde `apps/api`.

### Desde la raíz del proyecto (Recomendado)

```bash
# Generar una nueva migración basada en cambios en las entidades
npm run migration:generate -- src/migrations/NombreDeLaMigracion

# Crear una migración vacía
npm run migration:create -- src/migrations/NombreDeLaMigracion

# Ejecutar migraciones pendientes
npm run migration:run

# Revertir la última migración
npm run migration:revert

# Mostrar el estado de las migraciones
npm run migration:show
```

### Desde apps/api

```bash
cd apps/api

# Generar una nueva migración
npm run migration:generate -- src/migrations/NombreDeLaMigracion

# Crear una migración vacía
npm run migration:create -- src/migrations/NombreDeLaMigracion

# Ejecutar migraciones pendientes
npm run migration:run

# Revertir la última migración
npm run migration:revert

# Mostrar el estado de las migraciones
npm run migration:show
```

## Requisitos Previos

Antes de ejecutar migraciones, asegúrate de que la base de datos PostgreSQL esté corriendo:

```bash
# Levantar los servicios de desarrollo (PostgreSQL + MinIO)
docker-compose up -d postgres minio

# O levantar todos los servicios
npm run docker:up
```

## Configuración

Las migraciones usan la configuración definida en:

- `apps/api/src/config/typeorm.config.js` - Configuración principal de TypeORM
- Variables de entorno del archivo `.env` en `apps/api/`

Credenciales por defecto para desarrollo:

- Host: `localhost`
- Port: `5432`
- Username: `dev`
- Password: `dev`
- Database: `shogun`

## Primera Migración

La primera migración (`InitialSchema`) ya ha sido generada y contiene todo el esquema inicial de la base de datos con las siguientes tablas:

- `users` - Usuarios del sistema
- `projects` - Proyectos
- `episodes` - Episodios
- `sequences` - Secuencias
- `shots` - Tomas
- `assets` - Assets
- `versions` - Versiones
- `playlists` - Playlists
- `notes` - Notas
- `statuses` - Estados personalizados
- `notifications` - Notificaciones
- `audit_logs` - Logs de auditoría
- `refresh_tokens` - Tokens de refresco

Para aplicar esta migración a tu base de datos:

```bash
npm run migration:run
```

## Flujo de Trabajo

1. **Modificar entidades**: Edita los archivos en `apps/api/src/entities/`
2. **Generar migración**: `npm run migration:generate migrations/DescripcionDelCambio`
3. **Revisar migración**: Verifica el archivo generado en `apps/api/migrations/`
4. **Aplicar migración**: `npm run migration:run`

## Notas Importantes

- Las migraciones se ejecutan en orden cronológico basado en el timestamp en el nombre del archivo
- Siempre revisa las migraciones generadas antes de aplicarlas en producción
- En desarrollo, `synchronize: true` está habilitado, pero **NO uses esto en producción**
- Las migraciones se guardan en `apps/api/src/migrations/` y se compilan automáticamente a `apps/api/dist/migrations/` con `nest build`
