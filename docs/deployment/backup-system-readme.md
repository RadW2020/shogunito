# Backup System

Sistema de backups para PostgreSQL y MinIO en producción usando volúmenes Docker.

## Scripts

### `backup.sh`

Crea backups de los volúmenes de PostgreSQL y MinIO.

**Uso:**

```bash
./backup-system/backup.sh
```

**Qué hace backup:**

- PostgreSQL: Snapshot completo del volumen Docker
- MinIO: Snapshot completo del volumen Docker
- Metadata: Información del backup en `backup_info.json`

**Ubicación:** `./backups/<timestamp>/`

### `restore.sh`

Restaura backups a PostgreSQL y MinIO.

**Uso:**

```bash
./backup-system/restore.sh ./backups/20240101_120000
```

**⚠️ Advertencia:** Esto sobrescribirá los datos existentes y requiere detener los servicios.

### `cleanup.sh`

Limpia backups antiguos según política de retención.

**Uso:**

```bash
# Limpiar backups antiguos
./backup-system/cleanup.sh

# Ver qué se eliminaría (dry run)
./backup-system/cleanup.sh --dry-run
```

**Política de retención:**

- Backups diarios: Mantener últimos 7 días
- Backups semanales: Mantener últimos 4 semanas (backups del domingo)
- Backups mensuales: Mantener últimos 12 meses (backups del día 1)

### `setup-cron.sh`

Configura backups automáticos con cron.

**Uso:**

```bash
# Configurar backups automáticos
./backup-system/setup-cron.sh

# Eliminar jobs de cron
./backup-system/setup-cron.sh --remove
```

**Jobs configurados:**

- Backup diario: 2:00 AM
- Limpieza: 4:00 AM diario

## Estrategia de Backup

Este sistema usa **backup de volúmenes Docker**, que es:

- ✅ Muy rápido
- ✅ Snapshot completo del estado
- ✅ Incluye todos los datos y configuración interna

**Nota importante:** Los backups de volúmenes son específicos de la versión de PostgreSQL/MinIO. Asegúrate de restaurar en la misma versión que se usó para crear el backup.

## Variables de Entorno

Opcionalmente puedes configurar la ubicación de backups:

```bash
export BACKUP_DIR=/ruta/a/backups
```

## Ejemplo de Uso

```bash
# 1. Crear un backup
./backup-system/backup.sh

# 2. Verificar que se creó
ls -lh ./backups/

# 3. Configurar backups automáticos
./backup-system/setup-cron.sh

# 4. Ver logs de backup
tail -f ./backups/backup.log
```

## Restauración

**Proceso de restauración:**

1. Detener servicios (el script lo hace automáticamente):

   ```bash
   docker-compose -f docker-compose.production.yml down
   ```

2. Restaurar backup:

   ```bash
   ./backup-system/restore.sh ./backups/20240101_120000
   ```

3. El script reinicia los servicios automáticamente

## Solución de Problemas

### El backup falla

1. Verificar que los volúmenes existan:

   ```bash
   docker volume ls | grep -E "pgdata_prod|minio_prod"
   ```

2. Verificar espacio en disco:
   ```bash
   df -h
   ```

### La restauración falla

1. Asegurarse de que el directorio de backup existe y contiene archivos:

   ```bash
   ls -lh ./backups/20240101_120000/
   ```

2. Verificar que los servicios estén detenidos antes de restaurar

3. Verificar que tienes permisos para crear/eliminar volúmenes Docker

## Mejores Prácticas

1. **Probar restauraciones regularmente**: Verificar que los backups se pueden restaurar
2. **Almacenar backups fuera del servidor**: Usar almacenamiento remoto para recuperación ante desastres
3. **Monitorear tamaño de backups**: Alertar si los backups crecen inesperadamente
4. **Automatizar limpieza**: Eliminar backups antiguos automáticamente
5. **Documentar procedimientos de restauración**: Mantener pasos de restauración documentados
