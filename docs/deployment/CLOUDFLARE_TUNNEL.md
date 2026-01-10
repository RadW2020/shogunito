# Guía Completa: Cloudflare Tunnel para Shogun

## 📋 Resumen

Esta guía cubre la configuración, gestión y solución de problemas del túnel de Cloudflare que expone los servicios de Shogun a internet.

**Servicios expuestos:**

- **API**: `http://localhost:3002` → `https://shogunapi.uliber.com`
- **Frontend**: `http://localhost:3003` → `https://shogunweb.uliber.com`
- **MinIO**: `http://localhost:9010` → `https://shogunminio.uliber.com`

**Beneficios:**

- ✅ No requiere abrir puertos en el router
- ✅ HTTPS/SSL automático gestionado por Cloudflare
- ✅ Protección DDoS integrada
- ✅ Túnel persistente como servicio del sistema (systemd)

---

## 🚀 Instalación Inicial

### Paso 1: Instalar cloudflared


**Linux (Debian/Ubuntu):**

```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
cloudflared --version
```

**Linux (RHEL/CentOS):**

```bash
curl -L --output cloudflared.rpm https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
sudo yum localinstall cloudflared.rpm
cloudflared --version
```

### Paso 2: Autenticarse con Cloudflare

```bash
cloudflared tunnel login
```

Este comando:

1. Abre tu navegador automáticamente
2. Te pide iniciar sesión en tu cuenta de Cloudflare
3. Autoriza el acceso del túnel a tu dominio
4. Descarga un certificado en `~/.cloudflared/cert.pem`

### Paso 3: Crear el túnel

```bash
cloudflared tunnel create shogun-tunnel
```

**Salida esperada:**

```
Created tunnel shogun-tunnel with id: 46bef1c2-a3d7-4538-8eab-22ee5acabf66
Tunnel credentials written to ~/.cloudflared/46bef1c2-a3d7-4538-8eab-22ee5acabf66.json
```

**Guarda el ID del túnel** para la configuración.

### Paso 4: Configurar el dominio en Cloudflare

**Si usas un dominio existente (ej: Strato):**

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com) → "Add a Site"
2. Ingresa tu dominio (ej: `uliber.com`)
3. Cloudflare escaneará tus registros DNS actuales
4. Cloudflare te dará 2 nameservers (ej: `alice.ns.cloudflare.com` y `bob.ns.cloudflare.com`)
5. Ve al panel de tu proveedor de dominio (Strato) → Gestión de Dominios → DNS
6. Cambia los nameservers a los que Cloudflare proporcionó
7. Espera 24-48 horas para la propagación (normalmente es más rápido)

**Nota:** El túnel funcionará incluso si los nameservers aún no están completamente propagados.

---

## ⚙️ Configuración

### Paso 5: Crear archivo de configuración

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

**Contenido del archivo `~/.cloudflared/config.yml`:**

```yaml
tunnel: shogun-tunnel
credentials-file: /Users/TU_USUARIO/.cloudflared/TUNNEL_ID.json

ingress:
  # API - shogunapi.uliber.com → localhost:3002
  - hostname: shogunapi.uliber.com
    service: http://localhost:3002

  # Frontend - shogunweb.uliber.com → localhost:3003
  - hostname: shogunweb.uliber.com
    service: http://localhost:3003

  # MinIO - shogunminio.uliber.com → localhost:9010
  - hostname: shogunminio.uliber.com
    service: http://localhost:9010

  # Regla catch-all: devuelve 404 para cualquier otra petición
  - service: http_status:404
```

**⚠️ IMPORTANTE:** Reemplaza:

- `TU_USUARIO` con tu nombre de usuario (`echo $HOME`)
- `TUNNEL_ID` con el ID real del túnel (`ls ~/.cloudflared/*.json`)

**Ejemplo real:**

```yaml
tunnel: shogun-tunnel
credentials-file: /Users/antoniojimenez/.cloudflared/46bef1c2-a3d7-4538-8eab-22ee5acabf66.json

ingress:
  - hostname: shogunapi.uliber.com
    service: http://localhost:3002
  - hostname: shogunweb.uliber.com
    service: http://localhost:3003
  - hostname: shogunminio.uliber.com
    service: http://localhost:9010
  - service: http_status:404
```

### Paso 6: Configurar registros DNS

```bash
cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunweb.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunminio.uliber.com
```

**Salida esperada:**

```
2024-01-XX INFO: Added CNAME shogunapi.uliber.com which will route to this tunnel
2024-01-XX INFO: Added CNAME shogunweb.uliber.com which will route to this tunnel
```

**Verificar en Cloudflare Dashboard:**

- DNS → Records
- Debes ver CNAMEs apuntando a `[tunnel-id].cfargotunnel.com`

### Paso 7: Configurar SSL/TLS en Cloudflare

**⚠️ CRÍTICO:** Configura el modo SSL/TLS correcto:

1. Ve a Cloudflare Dashboard → Tu dominio → SSL/TLS → Overview
2. Selecciona **"Flexible"** (NO "Full" ni "Full (strict)")
3. Guarda los cambios y espera 1-2 minutos

**¿Por qué Flexible?**

- Cloudflare Tunnel no usa certificados SSL tradicionales en el origen
- El túnel cifra la conexión con su propio protocolo
- "Flexible" cifra entre cliente ↔ Cloudflare (HTTPS)
- "Full" intenta validar certificados SSL en el origen y falla con túneles

---

## 🧪 Prueba Manual

Antes de configurarlo como servicio, prueba que funciona:

```bash
# Asegúrate de que tus servicios estén corriendo
# API en localhost:3002
# Frontend en localhost:3003

# Ejecutar el túnel en modo foreground para ver logs
cloudflared tunnel run shogun-tunnel
```

**Qué esperar:**

- Verás logs como: `INF +--------------------------------------------------------------------------------------------+`
- El túnel se conectará a Cloudflare
- No deberías ver errores

**Prueba en otro terminal:**

```bash
curl -I https://shogunapi.uliber.com
curl -I https://shogunweb.uliber.com
```

**Si funciona:** Presiona `Ctrl+C` para detener el túnel y continúa al siguiente paso.

---


## 🔧 Instalación como Servicio (Linux)

### Paso 8: Instalar servicio systemd

Cloudflared puede instalarse como un servicio del sistema automáticamente:

```bash
# Instalar el servicio
sudo cloudflared service install

# Iniciar el servicio
sudo systemctl start cloudflared

# Verificar estado
sudo systemctl status cloudflared
```

---

## ✅ Verificación

### Verificar que todo funciona

```bash
# 1. Verificar proceso
ps aux | grep "[c]loudflared tunnel run"

# 2. Verificar conexiones activas del túnel
cloudflared tunnel info shogun-tunnel

# 3. Verificar servicios locales
curl http://localhost:3002/api/v1/health
curl http://localhost:3003
curl http://localhost:9010/minio/health/live

# 4. Verificar conectividad externa
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
curl -I https://shogunminio.uliber.com
```

### Estado esperado

- ✅ Proceso `cloudflared tunnel run shogun-tunnel` corriendo
- ✅ Túnel con **4 conexiones activas** (ej: `2xmad01, 2xmad06`) - debería mostrar `CONNECTOR ID`
- ✅ Endpoints externos respondiendo con código 200
- ✅ Certificado SSL válido (candado verde en el navegador)

---

## 🛠️ Gestión del Servicio


### Comandos básicos

```bash
# Iniciar servicio
sudo systemctl start cloudflared

# Detener servicio
sudo systemctl stop cloudflared

# Reiniciar servicio
sudo systemctl restart cloudflared

# Ver estado
sudo systemctl status cloudflared
```

### Ver logs

```bash
# Systemd logs
journalctl -u cloudflared -f
```

### Información del túnel

```bash
# Ver información del túnel
cloudflared tunnel info shogun-tunnel

# Listar todos los túneles
cloudflared tunnel list

# Ver rutas DNS configuradas
cloudflared tunnel route dns list
```

---

## 🐛 Solución de Problemas

### Diagnóstico Rápido

Para un diagnóstico rápido del estado del túnel, ejecuta este comando:

```bash
# Diagnóstico rápido (copiar y pegar)
cloudflared tunnel info shogun-tunnel && \
curl -s -o /dev/null -w "API: %{http_code}\n" https://shogunapi.uliber.com/api/v1/health && \
curl -s -o /dev/null -w "Web: %{http_code}\n" https://shogunweb.uliber.com
```

**Salida esperada:**

- Información del túnel con 4 conexiones activas
- `API: 200` (o 301/302)
- `Web: 200` (o 301/302)

### El túnel no inicia automáticamente

1. **Verificar que el plist está en la ubicación correcta:**

   ```bash
   ls -la ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
   ```

2. **Verificar que el plist es válido:**

   ```bash
   plutil -lint ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
   ```

3. **Cargar manualmente:**
   ```bash
   launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
   launchctl start com.cloudflare.cloudflared
   ```

### El túnel se detiene frecuentemente

1. **Verificar logs de error:**

   ```bash
   tail -50 ~/Library/Logs/com.cloudflare.cloudflared.err.log
   ```

2. **Verificar que los servicios locales están corriendo:**

   ```bash
   curl http://localhost:3002/api/v1/health
   curl http://localhost:3003
   ```

3. **Verificar recursos del sistema:**
   ```bash
   top -pid $(pgrep -f "cloudflared tunnel run")
   ```

### Múltiples procesos cloudflared

Si ves múltiples procesos o conectores zombie, sigue estos pasos para limpiar completamente:

```bash
# 1. Detener servicio
launchctl unload ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist

# 2. Matar todos los procesos
pkill -9 cloudflared

# 3. Limpiar conectores zombie
cloudflared tunnel cleanup shogun-tunnel

# 4. Esperar a que se complete la limpieza
sleep 30

# 5. Verificar que la limpieza fue exitosa
cloudflared tunnel info shogun-tunnel

# 6. Reiniciar servicio
launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
launchctl start com.cloudflare.cloudflared

# 7. Esperar y verificar conexiones
sleep 30
cloudflared tunnel info shogun-tunnel
```

### Error: "tunnel not found"

```bash
# Listar túneles disponibles
cloudflared tunnel list

# Verificar que el nombre en config.yml coincide
cat ~/.cloudflared/config.yml | grep tunnel:
```

### Error: "credentials file not found"

```bash
# Buscar el archivo de credenciales
ls -la ~/.cloudflared/*.json

# Actualizar la ruta en config.yml con la ruta correcta
nano ~/.cloudflared/config.yml
```

### Los dominios no resuelven

1. **Verificar en Cloudflare Dashboard** que los CNAME existen
2. **Esperar 5-10 minutos** para la propagación DNS
3. **Verificar con dig:**
   ```bash
   dig shogunapi.uliber.com
   dig shogunweb.uliber.com
   ```

### Error 502 Bad Gateway

**Causa:** Servicios locales no están corriendo o puertos incorrectos.

**Solución:**

```bash
# Verificar servicios locales
curl http://localhost:3002
curl http://localhost:3003

# Verificar logs del túnel
tail -f ~/Library/Logs/com.cloudflare.cloudflared.out.log

# Verificar puertos en config.yml
cat ~/.cloudflared/config.yml
```

### Error 1033: "Cloudflare Tunnel error"

**Síntoma:** No se puede acceder desde fuera del WiFi, aparece Error 1033.

**Causa:** El túnel no tiene conexiones activas con Cloudflare o hay conectores zombie.

**Solución:**

```bash
# 1. Verificar estado del túnel
cloudflared tunnel info shogun-tunnel

# 2. Si no hay conexiones o hay conectores zombie, limpiar
cloudflared tunnel cleanup shogun-tunnel

# 3. Detener servicio
launchctl stop com.cloudflare.cloudflared

# 4. Matar procesos
pkill -9 cloudflared

# 5. Esperar
sleep 10

# 6. Reiniciar servicio
launchctl start com.cloudflare.cloudflared

# 7. Esperar 30 segundos y verificar nuevamente
sleep 30
cloudflared tunnel info shogun-tunnel
```

**Debe mostrar:**

```
CONNECTOR ID                         CREATED              EDGE
d89b8d1d-42e6-4998-97de-c15b97489f83 2025-11-30T22:17:56Z 2xmad01, 2xmad06
```

**Nota:** Si hay conectores zombie que no se limpian, el comando `cloudflared tunnel cleanup shogun-tunnel` es clave para resolver el problema.

### El certificado SSL no es válido / HTTPS no funciona

**Solución:**

1. Ve a Cloudflare Dashboard → SSL/TLS → Overview
2. Selecciona **"Flexible"** (NO "Full" ni "Full (strict)")
3. Guarda los cambios y espera 1-2 minutos
4. Limpia la caché del navegador y vuelve a intentar

### No funciona desde el servidor pero sí desde fuera

**Síntoma:** `curl` desde el servidor da timeout, pero funciona desde fuera.

**Causa:** Restricciones de red/firewall en el servidor.

**Solución:** Esto es **normal**. El túnel funciona correctamente, pero el servidor no puede conectarse a sí mismo a través de Cloudflare por restricciones de red.

**Verificar que funciona:**

- Prueba desde fuera del WiFi
- Prueba desde otro dispositivo
- El script de diagnóstico puede mostrar "timeout" pero el túnel está funcionando

---


---

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTPS (puerto 443)
                             │
                ┌────────────▼────────────┐
                │   Cloudflare Edge       │
                │   (CDN + SSL/TLS)       │
                └────────────┬────────────┘
                             │
                             │ Tunnel (WebSocket/QUIC)
                             │ (sin abrir puertos)
                ┌────────────▼────────────┐
                │   cloudflared           │
                │   (servicio systemd)    │
                └────────────┬────────────┘
                             │
                ┌────────────┼────────────┬────────────┐
                │            │            │            │
        ┌───────▼──────┐ ┌──▼──────────┐ ┌──▼──────────┐
        │  localhost   │ │  localhost   │ │  localhost   │
        │   :3002      │ │   :3003      │ │   :9010      │
        │              │ │              │ │              │
        │   API        │ │  Frontend    │ │   MinIO      │
        │  (NestJS)    │ │  (React)     │ │  (Storage)   │
        └──────────────┘ └──────────────┘ └──────────────┘

Flujo de petición:
1. Usuario → https://shogunapi.uliber.com (o shogunweb.uliber.com, shogunminio.uliber.com)
2. Cloudflare DNS resuelve → CNAME → túnel
3. Cloudflare Edge → establece conexión con cloudflared
4. cloudflared → reenvía a http://localhost:3002 (o :3003, :9010)
5. Respuesta → mismo camino de vuelta
```

---

## 📝 Comandos Útiles

### Gestión del túnel

```bash
# Ver información del túnel
cloudflared tunnel info shogun-tunnel

# Listar todos los túneles
cloudflared tunnel list

# Ver rutas DNS configuradas
cloudflared tunnel route dns list

# Limpiar conectores zombie (importante si hay problemas de conexión)
cloudflared tunnel cleanup shogun-tunnel

# Eliminar túnel (si es necesario)
cloudflared tunnel route dns delete shogunapi.uliber.com
cloudflared tunnel route dns delete shogunweb.uliber.com
cloudflared tunnel route dns delete shogunminio.uliber.com
cloudflared tunnel delete shogun-tunnel
```

### Diagnóstico

```bash
# Verificar versión
cloudflared --version

# Ver procesos
ps aux | grep cloudflared | grep -v grep

# Ver servicio systemd
sudo systemctl status cloudflared

# Ver logs
tail -f ~/Library/Logs/com.cloudflare.cloudflared.out.log
tail -f ~/Library/Logs/com.cloudflare.cloudflared.err.log

# Verificar servicios locales
curl http://localhost:3002/api/v1/health
curl http://localhost:3003

# Verificar conectividad externa
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com

# Verificar DNS
dig shogunapi.uliber.com
dig shogunweb.uliber.com
```

---

## ✅ Checklist Final

- [ ] cloudflared instalado y funcionando
- [ ] Autenticación con Cloudflare completada
- [ ] Túnel `shogun-tunnel` creado
- [ ] Archivo `~/.cloudflared/config.yml` configurado correctamente
- [ ] Registros DNS CNAME creados
- [ ] SSL/TLS configurado en modo "Flexible"
- [ ] Servicio systemd instalado y activo
- [ ] API accesible en `https://shogunapi.uliber.com`
- [ ] Frontend accesible en `https://shogunweb.uliber.com`
- [ ] Certificado SSL válido (candado verde)
- [ ] Catch-all devuelve 404 correctamente
- [ ] Servicio configurado para iniciar automáticamente

---

## 🔒 Notas Importantes


### Reinicios Automáticos

- El túnel se reinicia automáticamente si el proceso muere (gestionado por systemd).
- No hay reinicios programados innecesarios.

### CORS

Si tu API tiene restricciones CORS, asegúrate de añadir los nuevos dominios:

```typescript
// En apps/api/src/main.ts
app.enableCors({
  origin: [
    'https://shogunweb.uliber.com',
    // ... otros orígenes
  ],
});
```

### Backup

Guarda una copia de:

- `~/.cloudflared/config.yml`
- `~/.cloudflared/*.json` (archivo de credenciales del túnel)

---

## 🔗 Referencias

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflare Tunnel Troubleshooting](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/troubleshoot-tunnels/)
- [Cloudflare Dashboard](https://dash.cloudflare.com)

---

**Última actualización:** 2026-01-10  
**Estado:** ✅ Configuración para Linux/Oracle Cloud funcionando  
**Versión de cloudflared probada:** 2025.11.1

