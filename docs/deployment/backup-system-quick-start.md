# Quick Start - Backup System

## Comandos Rápidos

### Crear Backup

```bash
./backup-system/backup.sh
```

### Restaurar Backup

```bash
./backup-system/restore.sh ./backups/20240101_120000

# ⚠️ ADVERTENCIA: Esto sobrescribirá los datos existentes!
```

### Configurar Backups Automáticos

```bash
# Configurar jobs de cron para backups automáticos diarios
./backup-system/setup-cron.sh

# Eliminar jobs de cron
./backup-system/setup-cron.sh --remove
```

### Limpiar Backups Antiguos

```bash
# Eliminar backups antiguos (mantiene últimos 7 días, 4 semanas, 12 meses)
./backup-system/cleanup.sh

# Ver qué se eliminaría (dry run)
./backup-system/cleanup.sh --dry-run
```

## Ubicación de Backups

- **Producción**: `./backups/<timestamp>/`

Cada backup contiene:

- `postgres_volume.tar.gz` - Snapshot del volumen PostgreSQL
- `minio_volume.tar.gz` - Snapshot del volumen MinIO
- `backup_info.json` - Metadata del backup

## Ejemplo de Flujo de Trabajo

```bash
# 1. Crear un backup
./backup-system/backup.sh

# 2. Verificar que se creó el backup
ls -lh ./backups/

# 3. Configurar backups automáticos
./backup-system/setup-cron.sh

# 4. Ver logs de backup
tail -f ./backups/backup.log
```

## Restauración

El proceso de restauración:

1. Detiene los servicios automáticamente
2. Restaura los volúmenes desde el backup
3. Reinicia los servicios automáticamente

**Importante:** Los backups de volúmenes son específicos de la versión de PostgreSQL/MinIO. Asegúrate de restaurar en la misma versión.

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

1. Asegurarse de que el directorio de backup existe y contiene archivos
2. Verificar permisos de Docker
3. Verificar que los servicios estén detenidos

Para más detalles, ver [backup-system/README.md](./README.md)
