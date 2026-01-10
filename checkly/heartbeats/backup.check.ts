import { HeartbeatMonitor } from 'checkly/constructs';

/**
 * Heartbeat Monitor para el backup diario de producción
 *
 * Este monitor espera recibir un ping cada día después del backup.
 * Si no recibe el ping en 26 horas (24h + 2h de gracia), envía una alerta.
 *
 * El script de backup (backup-system/backup.sh) envía el ping automáticamente
 * cuando el backup se completa exitosamente.
 *
 * Configuración:
 * - Period: 1 día (el backup se ejecuta diariamente a las 2 AM)
 * - Grace: 2 horas (margen para retrasos o reintentos)
 */
new HeartbeatMonitor('backup-daily', {
  name: 'Daily Database Backup',
  activated: true,

  // Esperamos un ping cada día
  period: 1,
  periodUnit: 'days',

  // 2 horas de gracia antes de alertar
  grace: 2,
  graceUnit: 'hours',

  // Tags para organización
  tags: ['backup', 'database', 'critical', 'production'],
});

