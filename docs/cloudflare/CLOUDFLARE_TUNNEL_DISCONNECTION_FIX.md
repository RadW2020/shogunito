# Solución: Cloudflare Tunnel se Desconecta Periódicamente

**Problema identificado:** El túnel de Cloudflare se desconecta periódicamente, causando que los health checks fallen hasta que se reinicia manualmente (por ejemplo, al hacer SSH).

**Fecha:** 2025-12-22

---

## 🔍 Análisis del Problema

### Síntomas

- ❌ Health checks de Checkly fallan periódicamente (en rojo)
- ✅ El proceso `cloudflared` sigue corriendo
- ✅ Después de hacer SSH o reiniciar manualmente, vuelve a funcionar
- ⚠️ El túnel puede tener el proceso corriendo pero sin CONNECTOR ID activo

### Causa Raíz

El problema tiene varias causas posibles:

1. **El túnel se desconecta pero el proceso sigue corriendo**
   - `KeepAlive` en el LaunchDaemon solo reinicia si el proceso muere
   - No detecta si el túnel se desconecta pero el proceso sigue vivo

2. **Falta de tráfico mantiene el túnel vivo**
   - Aunque Checkly hace checks cada 15 minutos, puede haber períodos sin tráfico
   - Los túneles QUIC pueden desconectarse después de períodos de inactividad

3. **Problemas de red temporales**
   - Interrupciones de red pueden causar desconexiones
   - El túnel no se reconecta automáticamente en algunos casos

4. **Conectores zombie**
   - Conexiones antiguas que bloquean nuevas conexiones
   - Requieren limpieza manual

---

## ✅ Solución: Monitoreo y Auto-Recuperación

### Componentes de la Solución

1. **Script de monitoreo** (`scripts/monitor-cloudflare-tunnel.sh`)
   - Verifica periódicamente que el túnel esté conectado
   - Verifica que los endpoints externos respondan
   - Reinicia automáticamente si detecta problemas

2. **LaunchAgent para monitoreo automático**
   - Ejecuta el script de monitoreo cada 5 minutos
   - Se inicia automáticamente al iniciar sesión
   - No requiere intervención manual

### Instalación

#### Paso 1: Configurar el Monitoreo Automático

```bash
# Ejecutar el script de configuración
./scripts/setup-cloudflare-monitor.sh
```

Este script:
- Crea un LaunchAgent que ejecuta el monitoreo cada 5 minutos
- Se carga automáticamente en launchd
- Inicia el monitoreo inmediatamente

#### Paso 2: Verificar que Funciona

```bash
# Verificar que el LaunchAgent está cargado
launchctl list | grep cloudflare-monitor

# Ver los logs del monitoreo
tail -f ~/Library/Logs/cloudflare-tunnel-monitor.log

# Ejecutar una verificación manual
./scripts/monitor-cloudflare-tunnel.sh single
```

---

## 🔧 Uso del Script de Monitoreo

### Verificación Única

```bash
# Ejecutar una verificación única
./scripts/monitor-cloudflare-tunnel.sh single
```

### Monitoreo Continuo

```bash
# Monitoreo continuo (verificación cada 5 minutos)
./scripts/monitor-cloudflare-tunnel.sh loop
```

### Qué Hace el Script

1. **Verifica el proceso**
   - Comprueba que `cloudflared` esté corriendo

2. **Verifica la conexión del túnel**
   - Comprueba que haya CONNECTOR ID activo
   - Si no hay CONNECTOR ID, el túnel está desconectado

3. **Verifica endpoints externos**
   - Comprueba que `https://shogunapi.uliber.com` responda con HTTP 200
   - Comprueba que `https://shogunweb.uliber.com` responda con HTTP 200

4. **Auto-recuperación si hay problemas**
   - Limpia conectores zombie
   - Reinicia el servicio launchd
   - Espera 30 segundos y verifica de nuevo

---

## 📋 Gestión del Monitoreo

### Comandos Útiles

```bash
# Ver estado del monitoreo
launchctl list | grep cloudflare-monitor

# Ver logs en tiempo real
tail -f ~/Library/Logs/cloudflare-tunnel-monitor.log

# Ver logs de salida estándar
tail -f ~/Library/Logs/cloudflare-tunnel-monitor.out.log

# Ver logs de errores
tail -f ~/Library/Logs/cloudflare-tunnel-monitor.err.log

# Detener el monitoreo
launchctl unload ~/Library/LaunchAgents/com.shogun.cloudflare-monitor.plist

# Reiniciar el monitoreo
launchctl unload ~/Library/LaunchAgents/com.shogun.cloudflare-monitor.plist
launchctl load ~/Library/LaunchAgents/com.shogun.cloudflare-monitor.plist

# Ejecutar verificación manual
./scripts/monitor-cloudflare-tunnel.sh single
```

---

## 🔍 Diagnóstico

### Verificar Estado Actual

```bash
# Verificar proceso
ps aux | grep "[c]loudflared tunnel run"

# Verificar conexión del túnel
cloudflared tunnel info shogun-tunnel

# Verificar endpoints
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com

# Verificar servicio launchd
sudo launchctl list | grep cloudflare

# Verificar monitoreo
launchctl list | grep cloudflare-monitor
```

### Problemas Comunes

#### El monitoreo no se ejecuta

```bash
# Verificar que el LaunchAgent está cargado
launchctl list | grep cloudflare-monitor

# Si no está cargado, cargarlo
launchctl load ~/Library/LaunchAgents/com.shogun.cloudflare-monitor.plist

# Verificar logs de errores
tail -50 ~/Library/Logs/cloudflare-tunnel-monitor.err.log
```

#### El túnel se desconecta frecuentemente

1. **Verificar logs del túnel:**
   ```bash
   sudo tail -100 /var/log/cloudflared.err.log
   ```

2. **Verificar conectores zombie:**
   ```bash
   cloudflared tunnel info shogun-tunnel
   # Si hay múltiples CONNECTOR IDs antiguos, limpiar:
   cloudflared tunnel cleanup shogun-tunnel
   ```

3. **Verificar recursos del sistema:**
   ```bash
   top -pid $(pgrep -f "cloudflared tunnel run")
   ```

#### El monitoreo detecta problemas pero no los repara

1. **Verificar permisos:**
   ```bash
   # El script necesita sudo para reiniciar el servicio
   # Verificar que el usuario tiene permisos sudo sin contraseña para launchctl
   ```

2. **Ejecutar manualmente con más detalle:**
   ```bash
   ./scripts/monitor-cloudflare-tunnel.sh single
   # Revisar la salida para ver qué está fallando
   ```

---

## ⚙️ Configuración Avanzada

### Cambiar Intervalo de Verificación

Edita `~/Library/LaunchAgents/com.shogun.cloudflare-monitor.plist`:

```xml
<key>StartInterval</key>
<integer>300</integer>  <!-- Cambiar a segundos deseados (300 = 5 minutos) -->
```

Luego recarga:
```bash
launchctl unload ~/Library/LaunchAgents/com.shogun.cloudflare-monitor.plist
launchctl load ~/Library/LaunchAgents/com.shogun.cloudflare-monitor.plist
```

### Cambiar Intervalo en el Script

Edita `scripts/monitor-cloudflare-tunnel.sh` y cambia:

```bash
CHECK_INTERVAL=300  # Cambiar a segundos deseados
```

---

## 🔄 Integración con Checkly

El monitoreo local complementa los checks de Checkly:

- **Checkly:** Monitorea desde internet (cada 15 minutos)
- **Monitoreo local:** Verifica y repara problemas localmente (cada 5 minutos)

Esto asegura que:
1. Los problemas se detecten rápidamente (5 minutos vs 15 minutos)
2. Los problemas se reparen automáticamente sin intervención manual
3. Los health checks de Checkly permanezcan verdes

---

## 📊 Logs y Monitoreo

### Ubicación de Logs

- **Log principal:** `~/Library/Logs/cloudflare-tunnel-monitor.log`
- **Salida estándar:** `~/Library/Logs/cloudflare-tunnel-monitor.out.log`
- **Errores:** `~/Library/Logs/cloudflare-tunnel-monitor.err.log`
- **Logs del túnel:** `/var/log/cloudflared.out.log` y `/var/log/cloudflared.err.log`

### Formato de Logs

```
[2025-12-22 12:00:00] OK: Todo funcionando correctamente
[2025-12-22 12:05:00] WARNING: Túnel no tiene conexiones activas (sin CONNECTOR ID)
[2025-12-22 12:05:01] Reiniciando servicio Cloudflare Tunnel...
[2025-12-22 12:05:32] OK: Problema resuelto - túnel conectado y endpoints funcionando
```

---

## ✅ Checklist de Verificación

### Después de la Instalación

- [ ] Script de monitoreo ejecutable (`chmod +x`)
- [ ] LaunchAgent creado y cargado
- [ ] Primera verificación ejecutada exitosamente
- [ ] Logs se están generando correctamente
- [ ] Verificación manual funciona (`./scripts/monitor-cloudflare-tunnel.sh single`)

### Verificación Periódica

- [ ] Revisar logs semanalmente para detectar patrones
- [ ] Verificar que el monitoreo sigue activo
- [ ] Confirmar que los health checks de Checkly permanecen verdes
- [ ] Revisar si hay desconexiones frecuentes (puede indicar otro problema)

---

## 🔗 Referencias

- [Solución: Cloudflare Tunnel se Levanta Solo Después de SSH](./CLOUDFLARE_SSH_DEPENDENCY_FIX.md)
- [Solución de Problemas - Cloudflare Tunnel](./CLOUDFLARE_TUNNEL_TROUBLESHOOTING.md)
- [Guía Completa de Cloudflare Tunnel](../deployment/CLOUDFLARE_TUNNEL.md)

---

## ✅ Resumen

**Problema:** El túnel de Cloudflare se desconecta periódicamente, causando que los health checks fallen.

**Causa:** El proceso puede seguir corriendo pero el túnel puede estar desconectado. `KeepAlive` solo reinicia si el proceso muere, no si el túnel se desconecta.

**Solución:** Script de monitoreo automático que verifica periódicamente la conexión del túnel y los endpoints, y reinicia automáticamente si detecta problemas.

**Resultado:** El túnel se mantiene conectado automáticamente, los health checks permanecen verdes, y no se requiere intervención manual.

---

**Última actualización:** 2025-12-22  
**Estado:** ✅ **SOLUCIÓN DISPONIBLE** - Ejecutar `./scripts/setup-cloudflare-monitor.sh` para configurar

