# Pasos para Corregir el Servicio de Cloudflare Tunnel

**Problema identificado:** El proceso está corriendo manualmente como root en lugar de estar gestionado por el LaunchDaemon.

**Fecha:** 2025-12-05

---

## 📋 Pasos a Seguir

### Paso 1: Detener el proceso actual

El proceso está corriendo manualmente como root (PID: 35398). Deténlo:

```bash
sudo pkill -f "cloudflared tunnel run"
```

Verifica que se detuvo:

```bash
ps aux | grep "[c]loudflared tunnel run"
```

No debería mostrar ningún proceso.

---

### Paso 2: Verificar el LaunchDaemon

El LaunchDaemon ya existe en `/Library/LaunchDaemons/com.cloudflare.cloudflared.plist`. Verifica su contenido:

```bash
cat /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

**Debería mostrar:**

- Variables de entorno `HOME` y `TUNNEL_ORIGIN_CERT` configuradas
- Ruta correcta a cloudflared: `/opt/homebrew/bin/cloudflared`
- Comando: `tunnel run shogun-tunnel`

---

### Paso 3: Verificar permisos del LaunchDaemon

```bash
sudo chown root:wheel /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo chmod 644 /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

---

### Paso 4: Descargar el LaunchDaemon si está cargado

```bash
sudo launchctl bootout system/com.cloudflare.cloudflared 2>/dev/null || echo "No estaba cargado"
```

---

### Paso 5: Cargar el LaunchDaemon

Usa el método moderno `bootstrap`:

```bash
sudo launchctl bootstrap system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

Si da error, intenta el método tradicional:

```bash
sudo launchctl load -w /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

---

### Paso 6: Iniciar el servicio

```bash
sudo launchctl kickstart system/com.cloudflare.cloudflared
```

O alternativamente:

```bash
sudo launchctl start com.cloudflare.cloudflared
```

---

### Paso 7: Esperar y verificar

Espera 10-15 segundos para que el túnel se conecte:

```bash
sleep 15
```

Luego verifica:

```bash
# Verificar proceso
ps aux | grep "[c]loudflared tunnel run"

# Verificar conexiones del túnel
cloudflared tunnel info shogun-tunnel

# Verificar servicio launchd
sudo launchctl list | grep cloudflare
```

**Resultado esperado:**

- ✅ Proceso corriendo (pero ahora gestionado por launchd)
- ✅ Túnel con conexiones activas (CONNECTOR ID presente)
- ✅ Servicio aparece en `launchctl list`

---

### Paso 8: Verificar logs

Si hay problemas, revisa los logs:

```bash
# Logs de salida
sudo tail -f /var/log/cloudflared.out.log

# Logs de error
sudo tail -f /var/log/cloudflared.err.log
```

---

### Paso 9: Verificar accesibilidad

Después de que el servicio esté corriendo correctamente, verifica la accesibilidad:

```bash
./scripts/check-cloudflare-accessibility.sh
```

O manualmente:

```bash
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
```

---

## 🔍 Diagnóstico Adicional

Si después de estos pasos los endpoints aún no son accesibles, el problema puede ser:

### 1. Verificar configuración SSL/TLS en Cloudflare Dashboard

Ya verificaste que está en modo "Flexible", pero confirma:

- Ve a https://dash.cloudflare.com
- Tu dominio → SSL/TLS → Overview
- Debe estar en **"Flexible"**

### 2. Verificar registros DNS CNAME

Ya verificaste que están bien, pero confirma que apuntan al túnel correcto:

- `shogunapi.uliber.com` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com`
- `shogunweb.uliber.com` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com`
- `shogunminio.uliber.com` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com`

### 3. Probar desde otro dispositivo/red

El problema puede ser que desde el mismo servidor no puedas conectarte a través de Cloudflare. Prueba:

- Desde otro dispositivo en otra red
- Desde tu móvil con datos
- Desde otro ordenador

### 4. Verificar que el túnel tiene conexiones activas

```bash
cloudflared tunnel info shogun-tunnel
```

Debe mostrar:

```
CONNECTOR ID                         CREATED              EDGE
69b8788a-d62d-48f5-a940-5896739576ea 2025-12-05T13:48:43Z 2xmad01, 1xmad05, 1xmad06
```

Si no muestra `CONNECTOR ID`, el túnel no está conectado correctamente.

---

## 📝 Comandos Completos (Copia y Pega)

Si prefieres ejecutar todo de una vez:

```bash
# 1. Detener proceso actual
sudo pkill -f "cloudflared tunnel run"
sleep 2

# 2. Verificar permisos
sudo chown root:wheel /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo chmod 644 /Library/LaunchDaemons/com.cloudflare.cloudflared.plist

# 3. Descargar si está cargado
sudo launchctl bootout system/com.cloudflare.cloudflared 2>/dev/null || true

# 4. Cargar LaunchDaemon
sudo launchctl bootstrap system /Library/LaunchDaemons/com.cloudflare.cloudflared.plist || \
sudo launchctl load -w /Library/LaunchDaemons/com.cloudflare.cloudflared.plist

# 5. Iniciar servicio
sudo launchctl kickstart system/com.cloudflare.cloudflared || \
sudo launchctl start com.cloudflare.cloudflared

# 6. Esperar conexión
sleep 15

# 7. Verificar
ps aux | grep "[c]loudflared tunnel run"
cloudflared tunnel info shogun-tunnel
sudo launchctl list | grep cloudflare
```

---

## ⚠️ Nota Importante

Si después de corregir el servicio los endpoints **aún no son accesibles desde el servidor**, pero el túnel tiene conexiones activas, esto puede ser **normal**. Algunos servidores tienen restricciones de red que impiden conectarse a sí mismos a través de Cloudflare.

**Para verificar que realmente funciona:**

1. Prueba desde otro dispositivo/red
2. Prueba desde tu móvil con datos
3. El script de diagnóstico puede mostrar timeout pero el túnel está funcionando correctamente

---

## 🔗 Referencias

- [Guía Completa de Cloudflare Tunnel](./deployment/CLOUDFLARE_TUNNEL.md)
- [Revisión de Accesibilidad](./CLOUDFLARE_ACCESSIBILITY_REVIEW.md)
- [Solución de Problemas](./CLOUDFLARE_TUNNEL_TROUBLESHOOTING.md)

---

**Última actualización:** 2025-12-05
