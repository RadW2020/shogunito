# Solución: Error 530 "The origin has been unregistered from Argo Tunnel"

**Problema:** El túnel se desconecta completamente de Cloudflare, causando error 530.

**Fecha:** 2025-12-22

---

## 🔍 Análisis del Problema

### Síntoma

- Error 530: "The origin has been unregistered from Argo Tunnel"
- El túnel se desconecta completamente de Cloudflare
- El monitoreo detecta la desconexión pero hay una ventana de tiempo donde el servicio está caído

### Causa

El túnel se desconecta por:
1. **Inactividad prolongada** - Cloudflare cierra conexiones inactivas
2. **Problemas de red temporales** - Interrupciones de red causan desconexiones
3. **Intervalo de monitoreo demasiado largo** - 5 minutos es demasiado tiempo

---

## ✅ Solución Implementada

### 1. Reducir Intervalo de Monitoreo

**Cambio:** De 5 minutos a 1 minuto

**Razón:** Reduce la ventana de tiempo donde el túnel puede estar desconectado sin ser detectado.

**Archivos modificados:**
- `scripts/monitor-cloudflare-tunnel.sh` - `CHECK_INTERVAL=60` (1 minuto)
- `scripts/update-cloudflare-daemon-with-monitor.sh` - `StartInterval: 60` (1 minuto)

### 2. Mejorar Proceso de Reconexión

**Cambio:** Agregar reintentos en la verificación después del reinicio

**Razón:** A veces el túnel tarda más en reconectarse, los reintentos aseguran que se verifique correctamente.

### 3. Configuración de Keepalive

La configuración actual en `~/.cloudflared/config.yml` ya incluye:
- `keepAliveConnections: 100`
- `keepAliveTimeout: 90s`
- `connectTimeout: 30s`
- `grace-period: 30s`

---

## 🚀 Aplicar Cambios

### Paso 1: Actualizar el LaunchDaemon de Monitoreo

```bash
sudo ./scripts/update-cloudflare-daemon-with-monitor.sh
```

Esto:
- Actualiza el intervalo de monitoreo a 1 minuto
- Reinicia el servicio de monitoreo
- Verifica que todo funciona

### Paso 2: Verificar que Funciona

```bash
# Ver logs en tiempo real
tail -f ~/Library/Logs/cloudflare-tunnel-monitor.log

# Verificar que el monitoreo se ejecuta cada minuto
# Deberías ver entradas cada ~60 segundos
```

---

## 📊 Resultado Esperado

**Antes:**
- Monitoreo cada 5 minutos
- Ventana de desconexión de hasta 5 minutos
- Error 530 frecuente

**Después:**
- Monitoreo cada 1 minuto
- Ventana de desconexión de hasta 1 minuto
- Detección y recuperación más rápida
- Menos errores 530

---

## 🔍 Verificación

### Verificar Intervalo de Monitoreo

```bash
# Ver el plist del monitoreo
cat /Library/LaunchDaemons/com.shogun.cloudflare-monitor.plist | grep StartInterval

# Debe mostrar: <integer>60</integer>
```

### Verificar que se Ejecuta Cada Minuto

```bash
# Ver logs - deberías ver entradas cada ~60 segundos
tail -f ~/Library/Logs/cloudflare-tunnel-monitor.log

# O contar entradas en los últimos 5 minutos (debería haber ~5)
tail -100 ~/Library/Logs/cloudflare-tunnel-monitor.log | grep -c "OK:"
```

---

## ⚠️ Notas Importantes

### Impacto en Recursos

- **Antes:** Verificación cada 5 minutos = ~288 verificaciones/día
- **Después:** Verificación cada 1 minuto = ~1440 verificaciones/día

El impacto es mínimo porque:
- Las verificaciones son rápidas (< 1 segundo)
- Solo se reinicia si detecta problemas
- Es necesario para evitar errores 530

### Si el Problema Persiste

Si después de reducir el intervalo a 1 minuto el problema persiste:

1. **Revisar logs de cloudflared:**
   ```bash
   sudo tail -100 /var/log/cloudflared.err.log
   ```

2. **Verificar problemas de red:**
   - Latencia alta
   - Pérdida de paquetes
   - Firewall bloqueando conexiones

3. **Considerar aumentar keepalive:**
   - Editar `~/.cloudflared/config.yml`
   - Reducir `keepAliveTimeout` a 30s
   - Aumentar `keepAliveConnections`

---

## 🔗 Referencias

- [Solución: Cloudflare Tunnel se Desconecta Periódicamente](./CLOUDFLARE_TUNNEL_DISCONNECTION_FIX.md)
- [Solución de Problemas - Cloudflare Tunnel](./CLOUDFLARE_TUNNEL_TROUBLESHOOTING.md)

---

**Última actualización:** 2025-12-22  
**Estado:** ✅ **SOLUCIÓN IMPLEMENTADA** - Ejecutar `sudo ./scripts/update-cloudflare-daemon-with-monitor.sh` para aplicar

