# Solución: Activar LaunchDaemon para Cloudflare Tunnel

**Problema:** El proceso cloudflared está corriendo manualmente como root en lugar de estar gestionado por launchd  
**Solución:** Activar el LaunchDaemon existente que corre como root pero está gestionado correctamente  
**Fecha:** 2025-12-08

---

## 🔍 Situación Actual

### Estado Actual

- ✅ **LaunchDaemon existe:** `/Library/LaunchDaemons/com.cloudflare.cloudflared.plist`
- ❌ **Servicio no activo:** No está cargado en launchd
- ⚠️ **Proceso manual:** Corriendo como root (PID 38567) sin gestión de launchd
- ✅ **Configuración correcta:** El plist está bien configurado

### ¿Por qué usar LaunchDaemon en lugar de LaunchAgent?

**LaunchDaemon (system-level):**

- ✅ Funciona sin sesión de usuario activa
- ✅ Se inicia automáticamente al arrancar el sistema
- ✅ Puede escribir logs en `/var/log/` (requiere root)
- ✅ Más robusto y confiable
- ✅ No depende de que el usuario inicie sesión

**LaunchAgent (user-level):**

- ❌ Solo funciona con sesión de usuario activa
- ❌ No puede escribir en `/var/log/` sin permisos especiales
- ❌ Puede tener problemas de permisos

**Conclusión:** Para un servicio que necesita persistencia y escribir logs, LaunchDaemon es la mejor opción.

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar el LaunchDaemon Existente

El LaunchDaemon ya existe y está correctamente configurado:

```bash
cat /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

**Configuración actual:**

- ✅ Ejecuta como root (necesario para `/var/log/`)
- ✅ Variables de entorno configuradas (`HOME`, `TUNNEL_ORIGIN_CERT`)
- ✅ `RunAtLoad: true` (inicia automáticamente)
- ✅ `KeepAlive: true` (reinicia si falla)
- ✅ Logs en `/var/log/cloudflared.*.log`

### Paso 2: Detener el Proceso Manual Actual

```bash
# Detener el proceso manual actual
sudo pkill -f "cloudflared tunnel run"

# Verificar que se detuvo
ps aux | grep "[c]loudflared tunnel run"
# No debe mostrar ningún proceso
```

### Paso 3: Verificar Permisos del LaunchDaemon

```bash
# Verificar permisos
ls -la /Library/LaunchDaemons/com.cloudflare.cloudflared.plist

# Debe ser: -rw-r--r-- root wheel
# Si no, corregir:
sudo chown root:wheel /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo chmod 644 /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

### Paso 4: Descargar el Servicio si Está Cargado (Limpieza)

```bash
# Descargar el servicio si está cargado (puede dar error si no está cargado, es normal)
sudo launchctl bootout system/com.cloudflare.cloudflared 2>/dev/null || echo "No estaba cargado"
```

### Paso 5: Cargar el LaunchDaemon

Usa el método moderno `bootstrap`:

```bash
# Cargar el LaunchDaemon
sudo launchctl bootstrap system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

**Si da error, intenta el método tradicional:**

```bash
sudo launchctl load -w /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

### Paso 6: Iniciar el Servicio

```bash
# Iniciar el servicio
sudo launchctl kickstart system/com.cloudflare.cloudflared
```

**Alternativa:**

```bash
sudo launchctl start com.cloudflare.cloudflared
```

### Paso 7: Esperar y Verificar

Espera 10-15 segundos para que el túnel se conecte:

```bash
sleep 15
```

Luego verifica:

```bash
# 1. Verificar que el servicio está cargado
sudo launchctl list | grep cloudflare
# Debe mostrar: com.cloudflare.cloudflared

# 2. Verificar que el proceso está corriendo
ps aux | grep "[c]loudflared tunnel run"
# Debe mostrar el proceso corriendo como root

# 3. Verificar que el túnel está conectado
cloudflared tunnel info shogun-tunnel
# Debe mostrar CONNECTOR ID

# 4. Verificar que los endpoints funcionan
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
# Deben mostrar HTTP 200
```

---

## 🔍 Verificación Completa

### Comandos de Verificación

```bash
# 1. Verificar servicio launchd
sudo launchctl list | grep cloudflare
# Debe mostrar: com.cloudflare.cloudflared

# 2. Verificar proceso
ps aux | grep "[c]loudflared tunnel run"
# Debe mostrar: root ... /opt/homebrew/bin/cloudflared tunnel run shogun-tunnel

# 3. Verificar túnel
cloudflared tunnel info shogun-tunnel
# Debe mostrar: CONNECTOR ID presente

# 4. Verificar logs
sudo tail -20 /var/log/cloudflared.out.log
sudo tail -20 /var/log/cloudflared.err.log
```

### Resultado Esperado

**Antes:**

```
❌ Servicio launchd: No activo
⚠️ Proceso: Corriendo manualmente como root (sin gestión)
```

**Después:**

```
✅ Servicio launchd: Activo (com.cloudflare.cloudflared)
✅ Proceso: Gestionado por launchd como root
✅ Túnel: Conectado (CONNECTOR ID presente)
✅ Endpoints: Funcionando (HTTP 200)
```

---

## 🐛 Solución de Problemas

### Si el servicio no se carga

1. **Verificar permisos:**

   ```bash
   ls -la /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
   sudo chown root:wheel /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
   sudo chmod 644 /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
   ```

2. **Verificar sintaxis del plist:**

   ```bash
   plutil -lint /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
   # Debe mostrar: OK
   ```

3. **Ver logs del sistema:**
   ```bash
   log show --predicate 'subsystem == "com.apple.launchd"' --last 10m | grep cloudflare
   ```

### Si el proceso no se inicia

1. **Verificar que cloudflared existe:**

   ```bash
   ls -la /opt/homebrew/bin/cloudflared
   ```

2. **Verificar variables de entorno:**

   ```bash
   # Verificar que el certificado existe
   ls -la /Users/antoniojimenez/.cloudflared/cert.pem
   ```

3. **Ver logs de error:**
   ```bash
   sudo tail -50 /var/log/cloudflared.err.log
   ```

### Si el túnel no se conecta

1. **Verificar configuración:**

   ```bash
   cat ~/.cloudflared/config.yml
   ```

2. **Verificar autenticación:**

   ```bash
   ls -la ~/.cloudflared/5adc17fe-7cf4-468e-8bef-a3264ec7e67f.json
   ```

3. **Reiniciar el servicio:**
   ```bash
   sudo launchctl kickstart system/com.cloudflare.cloudflared
   sleep 30
   cloudflared tunnel info shogun-tunnel
   ```

---

## 📋 Checklist

- [ ] Proceso manual detenido
- [ ] Permisos del LaunchDaemon verificados
- [ ] Servicio descargado (si estaba cargado)
- [ ] LaunchDaemon cargado con `bootstrap`
- [ ] Servicio iniciado con `kickstart`
- [ ] Esperado 15 segundos
- [ ] Servicio aparece en `launchctl list`
- [ ] Proceso corriendo gestionado por launchd
- [ ] Túnel conectado (CONNECTOR ID presente)
- [ ] Endpoints funcionando (HTTP 200)

---

## 🔄 Gestión del Servicio

### Comandos Útiles

```bash
# Ver estado del servicio
sudo launchctl list | grep cloudflare

# Reiniciar el servicio
sudo launchctl kickstart system/com.cloudflare.cloudflared

# Detener el servicio
sudo launchctl stop com.cloudflare.cloudflared

# Iniciar el servicio
sudo launchctl start com.cloudflare.cloudflared

# Ver logs en tiempo real
sudo tail -f /var/log/cloudflared.out.log
sudo tail -f /var/log/cloudflared.err.log

# Verificar estado del túnel
cloudflared tunnel info shogun-tunnel
```

### Reinicio Automático

El servicio está configurado con:

- ✅ **RunAtLoad:** Se inicia automáticamente al arrancar el sistema
- ✅ **KeepAlive:** Se reinicia automáticamente si el proceso muere

**No necesitas hacer nada más** - el servicio se gestionará automáticamente.

---

## ⚠️ Notas Importantes

### Seguridad

- El proceso corre como root, pero esto es necesario para:
  - Escribir logs en `/var/log/`
  - Funcionar sin sesión de usuario activa
- Cloudflared no requiere privilegios especiales, solo acceso a archivos de configuración
- Los archivos de configuración están en `~/.cloudflared/` y son accesibles

### Persistencia

- El servicio se iniciará automáticamente después de reiniciar el sistema
- No necesitas iniciar sesión para que funcione
- Si el proceso muere, launchd lo reiniciará automáticamente

### Logs

- Los logs están en `/var/log/cloudflared.out.log` y `/var/log/cloudflared.err.log`
- Requieren `sudo` para leerlos
- Se rotan automáticamente por el sistema

---

## 🔗 Referencias

- [Apple LaunchDaemon Documentation](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Guía Completa de Cloudflare Tunnel](./deployment/CLOUDFLARE_TUNNEL.md)

---

---

## ✅ Estado Final (2025-12-08 15:40)

**Activación completada exitosamente:**

```bash
# Servicio activo
✅ com.cloudflare.cloudflared (PID: 55028)

# Proceso gestionado
✅ Proceso corriendo como root, gestionado por launchd
✅ PID: 55028

# Túnel conectado
✅ CONNECTOR ID: 4a5a4701-75d4-4200-92c2-12e26a7e8d32
✅ Conexiones: 2xmad01, 1xmad05, 1xmad06

# Endpoints funcionando
✅ API: HTTP 200
✅ Web: HTTP 200
```

**✅ Problema resuelto:**

- ✅ Servicio launchd activo y gestionando el proceso
- ✅ Proceso corriendo correctamente como root (necesario para logs)
- ✅ Túnel conectado y funcionando
- ✅ Se reiniciará automáticamente después de reinicios
- ✅ Gestión automática con KeepAlive activo

**Última actualización:** 2025-12-08 15:40  
**Estado:** ✅ **COMPLETADO** - LaunchDaemon activo y funcionando correctamente
