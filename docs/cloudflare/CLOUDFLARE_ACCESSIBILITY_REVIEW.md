# Revisión de Accesibilidad de Cloudflare Tunnel

**Fecha de revisión:** 2025-12-05  
**Estado actual:** ⚠️ Endpoints externos no accesibles (timeout)

---

## 📊 Estado Actual

### ✅ Componentes Funcionando

1. **cloudflared instalado y funcionando**
   - Versión: 2025.11.1
   - Ubicación: `/opt/homebrew/bin/cloudflared`

2. **Proceso cloudflared activo**
   - PID: 35398 (corriendo como root)
   - Comando: `cloudflared tunnel run shogun-tunnel`
   - Estado: ✅ Corriendo

3. **Túnel con conexiones activas**
   - Túnel ID: `5adc17fe-7cf4-468e-8bef-a3264ec7e67f`
   - Nombre: `shogun-tunnel`
   - Conexiones: 4 activas (2xmad01, 1xmad05, 1xmad06)
   - CONNECTOR ID presente: ✅

4. **Configuración correcta**
   - Archivo `~/.cloudflared/config.yml` existe y está bien configurado
   - Rutas configuradas:
     - `shogunapi.uliber.com` → `localhost:3002`
     - `shogunweb.uliber.com` → `localhost:3003`
     - `shogunminio.uliber.com` → `localhost:9010`

5. **Servicios locales responden**
   - API local: ✅ HTTP 200
   - Web local: ✅ HTTP 200
   - MinIO local: ⚠️ No verificado

6. **DNS resuelve correctamente**
   - `shogunapi.uliber.com` → `188.114.96.5, 188.114.97.5` (IPs de Cloudflare)
   - `shogunweb.uliber.com` → `188.114.97.5, 188.114.96.5` (IPs de Cloudflare)

### ❌ Problemas Identificados

1. **Endpoints externos no accesibles**
   - `https://shogunapi.uliber.com` → Timeout (código 000)
   - `https://shogunweb.uliber.com` → Timeout (código 000)
   - `https://shogunminio.uliber.com` → Timeout (código 000)

2. **Servicio launchd no configurado**
   - No existe `~/Library/LaunchAgents/com.cloudflare.cloudflared.plist`
   - El proceso está corriendo manualmente (probablemente iniciado como root)

3. **Proceso corriendo como root**
   - El proceso cloudflared está corriendo como usuario `root`
   - Esto puede causar problemas de permisos y no es la práctica recomendada

---

## 🔍 Análisis del Problema

### Síntomas

- El túnel tiene conexiones activas con Cloudflare
- Los servicios locales responden correctamente
- El DNS resuelve a las IPs correctas de Cloudflare
- **PERO** las conexiones HTTPS hacen timeout

### Posibles Causas

1. **Configuración SSL/TLS incorrecta en Cloudflare Dashboard**
   - El modo SSL/TLS puede estar en "Full" o "Full (strict)" en lugar de "Flexible"
   - Esto causa que Cloudflare intente validar certificados SSL en el origen, lo cual falla con túneles

2. **Registros DNS CNAME no configurados correctamente**
   - Los CNAME pueden no estar apuntando al túnel correcto
   - Pueden estar apuntando a un túnel diferente o eliminado

3. **Firewall o restricciones de red**
   - Puede haber un firewall bloqueando las conexiones salientes del túnel
   - Restricciones de red en el servidor

4. **Proceso corriendo como root**
   - Puede haber problemas de permisos o configuración

---

## ✅ Acciones Recomendadas

### 1. Verificar y Corregir Configuración SSL/TLS en Cloudflare

**Paso crítico:** Verifica que el modo SSL/TLS esté en "Flexible"

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Selecciona tu dominio (`uliber.com`)
3. Ve a **SSL/TLS** → **Overview**
4. Verifica que el modo esté en **"Flexible"** (NO "Full" ni "Full (strict)")
5. Si no está en "Flexible", cámbialo y guarda
6. Espera 1-2 minutos para que los cambios se propaguen

**¿Por qué Flexible?**

- Cloudflare Tunnel no usa certificados SSL tradicionales en el origen
- El túnel cifra la conexión con su propio protocolo
- "Flexible" cifra entre cliente ↔ Cloudflare (HTTPS)
- "Full" intenta validar certificados SSL en el origen y falla con túneles

### 2. Verificar Registros DNS en Cloudflare Dashboard

1. Ve a Cloudflare Dashboard → Tu dominio → **DNS** → **Records**
2. Verifica que existen estos CNAME:
   - `shogunapi.uliber.com` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com`
   - `shogunweb.uliber.com` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com`
   - `shogunminio.uliber.com` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com`

3. Si no existen o apuntan a otro túnel, créalos o corrígelos:
   ```bash
   cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com
   cloudflared tunnel route dns shogun-tunnel shogunweb.uliber.com
   cloudflared tunnel route dns shogun-tunnel shogunminio.uliber.com
   ```

### 3. Configurar el Servicio launchd Correctamente

El proceso está corriendo manualmente como root. Debería estar configurado como servicio launchd del usuario.

**Crear LaunchAgent:**

```bash
cat > ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.cloudflared</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/cloudflared</string>
        <string>tunnel</string>
        <string>run</string>
        <string>shogun-tunnel</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/com.cloudflare.cloudflared.out.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/com.cloudflare.cloudflared.err.log</string>
    <key>ThrottleInterval</key>
    <integer>30</integer>
</dict>
</plist>
EOF
```

**Detener proceso actual y cargar servicio:**

```bash
# Detener proceso actual (si está corriendo como root, necesitarás sudo)
sudo pkill -f "cloudflared tunnel run"

# Cargar y iniciar el servicio launchd
launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
launchctl start com.cloudflare.cloudflared

# Verificar que está corriendo
ps aux | grep "[c]loudflared tunnel run"
launchctl list | grep cloudflare
```

### 4. Verificar Firewall y Restricciones de Red

Si después de corregir SSL/TLS y DNS aún no funciona:

1. Verifica que no hay firewall bloqueando conexiones salientes
2. Verifica que el túnel puede conectarse a Cloudflare:

   ```bash
   cloudflared tunnel info shogun-tunnel
   ```

   Debe mostrar conexiones activas.

3. Prueba desde otro dispositivo/red para descartar problemas locales

### 5. Limpiar y Reiniciar el Túnel

Si persisten los problemas:

```bash
# Limpiar conectores zombie
cloudflared tunnel cleanup shogun-tunnel

# Detener proceso
sudo pkill -9 cloudflared

# Esperar
sleep 10

# Reiniciar servicio
launchctl stop com.cloudflare.cloudflared
launchctl start com.cloudflare.cloudflared

# Esperar conexión
sleep 30

# Verificar
cloudflared tunnel info shogun-tunnel
```

---

## 🧪 Verificación Post-Corrección

Después de aplicar las correcciones, ejecuta el script de diagnóstico:

```bash
./scripts/check-cloudflare-accessibility.sh
```

O verifica manualmente:

```bash
# Verificar túnel
cloudflared tunnel info shogun-tunnel

# Verificar endpoints externos
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
curl -I https://shogunminio.uliber.com
```

**Resultado esperado:**

- ✅ Códigos HTTP 200, 301 o 302
- ✅ Sin timeouts
- ✅ Certificado SSL válido (candado verde en navegador)

---

## 📝 Checklist de Verificación

- [ ] SSL/TLS en Cloudflare Dashboard está en modo "Flexible"
- [ ] Registros DNS CNAME existen y apuntan al túnel correcto
- [ ] Servicio launchd configurado y corriendo (no como root)
- [ ] Túnel tiene conexiones activas (`cloudflared tunnel info`)
- [ ] Servicios locales responden (`curl http://localhost:3002`)
- [ ] Endpoints externos accesibles (`curl https://shogunapi.uliber.com`)
- [ ] Certificado SSL válido en navegador

---

## 🔗 Referencias

- [Guía Completa de Cloudflare Tunnel](./deployment/CLOUDFLARE_TUNNEL.md)
- [Solución de Problemas](./CLOUDFLARE_TUNNEL_TROUBLESHOOTING.md)
- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

---

## 📌 Notas Importantes

1. **El problema más común es SSL/TLS en modo "Full"**
   - Si los endpoints hacen timeout, lo primero que debes verificar es el modo SSL/TLS
   - Debe estar en "Flexible" para que funcione con túneles

2. **El proceso corriendo como root no es ideal**
   - Configura el LaunchAgent para que corra como usuario normal
   - Esto mejora la seguridad y facilita la gestión

3. **Los timeouts pueden ser normales desde el mismo servidor**
   - Si el túnel funciona pero `curl` desde el servidor da timeout, prueba desde otro dispositivo
   - El servidor puede tener restricciones para conectarse a sí mismo a través de Cloudflare

4. **Espera tiempo suficiente después de cambios**
   - Los cambios en Cloudflare pueden tardar 1-2 minutos en propagarse
   - Los cambios DNS pueden tardar hasta 10 minutos

---

---

## ✅ Estado Final (2025-12-08)

**Pruebas de conectividad confirmadas:**

```bash
# Todos los endpoints funcionando correctamente
✅ shogunweb.uliber.com → HTTP 200, SSL válido (0.35s)
✅ shogunapi.uliber.com/api/v1/health → HTTP 200, respuesta JSON válida (0.26s)
✅ shogunminio.uliber.com → HTTP 403 (esperado), SSL válido

# Certificado SSL
✅ Verify return code: 0 (ok)
✅ Certificado válido emitido por Google Trust Services

# DNS
✅ Resuelve correctamente a IPs de Cloudflare (188.114.97.5, 188.114.96.5)
✅ CNAME configurados correctamente
```

**✅ Estado confirmado:**

- ✅ Túnel funcionando perfectamente
- ✅ Todos los endpoints accesibles desde internet
- ✅ Certificados SSL válidos
- ✅ HTTPS funcionando correctamente
- ✅ No hay timeouts
- ✅ Servicios locales responden correctamente

**Última actualización:** 2025-12-08  
**Estado:** ✅ **FUNCIONANDO CORRECTAMENTE** - Todos los endpoints accesibles

---

## 🔧 Corrección del Servicio LaunchDaemon

**Estado actual:** El proceso está corriendo manualmente como root en lugar de estar gestionado por el LaunchDaemon.

**Solución:** Ver [FIX_CLOUDFLARE_SERVICE_STEPS.md](./FIX_CLOUDFLARE_SERVICE_STEPS.md) para los pasos exactos a seguir.

**Resumen rápido:**

1. Detener proceso actual: `sudo pkill -f "cloudflared tunnel run"`
2. Cargar LaunchDaemon: `sudo launchctl bootstrap system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist`
3. Iniciar servicio: `sudo launchctl kickstart system/com.cloudflare.cloudflared`
4. Verificar: `cloudflared tunnel info shogun-tunnel`
