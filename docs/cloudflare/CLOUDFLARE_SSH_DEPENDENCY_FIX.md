# Solución: Cloudflare Tunnel se Levanta Solo Después de SSH

**Problema identificado:** El acceso externo a través de Cloudflare estaba caído hasta que se inició una conexión SSH, momento en el que el servicio se levantó automáticamente.

**Fecha:** 2025-12-21

---

## 🔍 Análisis del Problema

### Síntomas

- ❌ El acceso externo a través de Cloudflare estaba caído
- ✅ Después de iniciar una conexión SSH, el servicio se levantó automáticamente
- ⚠️ El proceso `cloudflared` está corriendo manualmente (no gestionado por launchd)

### Causa Raíz

El problema es que el proceso `cloudflared` está corriendo **manualmente** en lugar de estar gestionado por **launchd**. Esto significa:

1. **No se inicia automáticamente al arrancar el sistema**
2. **No se reinicia automáticamente si el proceso muere**
3. **Depende de que algo lo inicie manualmente** (por eso funciona después de SSH)

Cuando haces SSH, probablemente:
- Algún script de inicio de sesión inicia el servicio
- O algún proceso relacionado con la sesión activa el servicio
- O simplemente el proceso manual se mantiene activo mientras hay una sesión

### Estado Actual

```bash
# El proceso está corriendo manualmente
$ ps aux | grep "[c]loudflared tunnel run"
root  19275  ...  /opt/homebrew/bin/cloudflared tunnel run shogun-tunnel

# Pero NO está gestionado por launchd
$ sudo launchctl list | grep cloudflare
# (vacío - no hay servicio cargado)
```

---

## ✅ Solución

### Configurar el Servicio para Auto-Inicio

El LaunchDaemon ya existe en `/Library/LaunchDaemons/com.cloudflare.cloudflared.plist`, pero **no está cargado** en launchd. Necesitamos cargarlo para que el servicio se gestione automáticamente.

### Pasos para Corregir

#### Opción 1: Usar el Script Automatizado (Recomendado)

```bash
# Ejecutar el script de corrección
./scripts/fix-cloudflare-auto-start.sh
```

El script realizará automáticamente:
1. Verificación del LaunchDaemon
2. Detención del proceso manual
3. Carga del LaunchDaemon en launchd
4. Inicio del servicio gestionado
5. Verificación del estado final

#### Opción 2: Pasos Manuales

Si prefieres hacerlo manualmente:

```bash
# 1. Detener el proceso manual actual
sudo pkill -f "cloudflared tunnel run"

# 2. Verificar permisos del LaunchDaemon
sudo chown root:wheel /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo chmod 644 /Library/LaunchDaemons/com.cloudflare.cloudflared.plist

# 3. Descargar el servicio si está cargado (limpieza)
sudo launchctl bootout system/com.cloudflare.cloudflared 2>/dev/null || echo "No estaba cargado"

# 4. Cargar el LaunchDaemon
sudo launchctl bootstrap system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist

# 5. Iniciar el servicio
sudo launchctl kickstart system/com.cloudflare.cloudflared

# 6. Esperar conexión (15 segundos)
sleep 15

# 7. Verificar estado
sudo launchctl list | grep cloudflare
ps aux | grep "[c]loudflared tunnel run"
cloudflared tunnel info shogun-tunnel
```

---

## 🔍 Verificación

### Comandos de Verificación

```bash
# 1. Verificar que el servicio está cargado en launchd
sudo launchctl list | grep cloudflare
# Debe mostrar: com.cloudflare.cloudflared

# 2. Verificar que el proceso está corriendo
ps aux | grep "[c]loudflared tunnel run"
# Debe mostrar el proceso corriendo como root

# 3. Verificar que el túnel está conectado
cloudflared tunnel info shogun-tunnel
# Debe mostrar: CONNECTOR ID presente

# 4. Verificar que los endpoints funcionan
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
# Deben mostrar HTTP 200
```

### Resultado Esperado

**Antes:**
```
❌ Servicio launchd: No activo
⚠️ Proceso: Corriendo manualmente (sin gestión)
❌ Auto-inicio: No funciona
```

**Después:**
```
✅ Servicio launchd: Activo (com.cloudflare.cloudflared)
✅ Proceso: Gestionado por launchd como root
✅ Auto-inicio: Funciona automáticamente
✅ Túnel: Conectado (CONNECTOR ID presente)
✅ Endpoints: Funcionando (HTTP 200)
```

---

## 🔄 Beneficios de la Solución

Una vez configurado correctamente, el servicio:

1. **✅ Se inicia automáticamente al arrancar el sistema**
   - No necesitas iniciar sesión
   - No necesitas hacer SSH
   - Funciona incluso después de reinicios

2. **✅ Se reinicia automáticamente si el proceso muere**
   - `KeepAlive: true` en el LaunchDaemon
   - Gestión automática de fallos

3. **✅ No depende de sesiones de usuario**
   - Funciona como servicio del sistema (LaunchDaemon)
   - Más robusto y confiable

4. **✅ Gestión centralizada**
   - Puedes reiniciar con: `sudo launchctl kickstart system/com.cloudflare.cloudflared`
   - Logs centralizados en `/var/log/cloudflared.*.log`

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
   ls -la ~/.cloudflared/cert.pem
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

## 📋 Gestión del Servicio

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

---

## ⚠️ Notas Importantes

### Por qué LaunchDaemon y no LaunchAgent

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
- ❌ Requiere que el usuario inicie sesión

**Conclusión:** Para un servicio que necesita persistencia y escribir logs, LaunchDaemon es la mejor opción.

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

---

## 🔗 Referencias

- [Apple LaunchDaemon Documentation](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Guía Completa de Cloudflare Tunnel](./deployment/CLOUDFLARE_TUNNEL.md)
- [Solución: Activar LaunchDaemon](./CLOUDFLARE_FIX_LAUNCHD.md)

---

## ✅ Resumen

**Problema:** El servicio Cloudflare Tunnel no se inicia automáticamente y solo funciona después de hacer SSH.

**Causa:** El proceso está corriendo manualmente en lugar de estar gestionado por launchd.

**Solución:** Cargar el LaunchDaemon existente para que el servicio se gestione automáticamente.

**Resultado:** El servicio ahora se inicia automáticamente al arrancar el sistema y se reinicia automáticamente si falla, sin depender de sesiones de usuario o conexiones SSH.

---

**Última actualización:** 2025-12-21  
**Estado:** ✅ **SOLUCIÓN DISPONIBLE** - Ejecutar `./scripts/fix-cloudflare-auto-start.sh` para corregir


