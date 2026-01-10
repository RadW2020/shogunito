# Guía: Revertir de Ngrok a Cloudflared

Esta guía te ayudará a volver a usar Cloudflared en lugar de Ngrok.

## ✅ Pasos Completados Automáticamente

- ✅ Ngrok detenido y desinstalado
- ✅ Cloudflared instalado

## 📋 Próximos Pasos (Manuales)

### Paso 1: Autenticarse con Cloudflare

```bash
cloudflared tunnel login
```

Este comando:

1. Abre tu navegador automáticamente
2. Te pide iniciar sesión en tu cuenta de Cloudflare
3. Autoriza el acceso del túnel a tu dominio
4. Descarga un certificado en `~/.cloudflared/cert.pem`

### Paso 2: Verificar o Crear el Túnel

```bash
# Listar túneles existentes
cloudflared tunnel list

# Si ya tienes un túnel llamado "shogun-tunnel", úsalo
# Si no, créalo:
cloudflared tunnel create shogun-tunnel
```

**Si creas un nuevo túnel**, guarda el ID que te da (ej: `46bef1c2-a3d7-4538-8eab-22ee5acabf66`).

### Paso 3: Configurar el Archivo de Configuración

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

**Contenido del archivo** (ajusta las rutas según tu sistema):

```yaml
tunnel: shogun-tunnel
credentials-file: /Users/antoniojimenez/.cloudflared/TUNNEL_ID.json

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

**⚠️ IMPORTANTE:**

- Reemplaza `TUNNEL_ID` con el ID real del túnel (ej: `46bef1c2-a3d7-4538-8eab-22ee5acabf66`)
- Encuentra el archivo JSON con: `ls ~/.cloudflared/*.json`

### Paso 4: Configurar Registros DNS

```bash
cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunweb.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunminio.uliber.com
```

### Paso 5: Configurar SSL/TLS en Cloudflare Dashboard

1. Ve a: https://dash.cloudflare.com
2. Selecciona tu dominio (`uliber.com`)
3. Ve a **SSL/TLS** → **Overview**
4. Selecciona **"Flexible"** (NO "Full" ni "Full (strict)")
5. Guarda los cambios

### Paso 6: Probar el Túnel Manualmente

```bash
# Asegúrate de que tus servicios Docker estén corriendo
cd /Users/antoniojimenez/Projects/shogun
docker-compose -f docker-compose.production.yml ps

# Ejecutar el túnel en modo foreground para ver logs
cloudflared tunnel run shogun-tunnel
```

**Qué esperar:**

- Verás logs como: `INF +--------------------------------------------------------------------------------------------+`
- El túnel se conectará a Cloudflare
- No deberías ver errores

**Prueba en otro terminal:**

```bash
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
```

**Si funciona:** Presiona `Ctrl+C` para detener el túnel y continúa.

### Paso 7: Instalar como Servicio (LaunchAgent)

```bash
cat > ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist << EOF
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

# Cargar y iniciar el servicio
launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
launchctl start com.cloudflare.cloudflared

# Verificar que está corriendo
launchctl list | grep cloudflare
ps aux | grep "[c]loudflared tunnel run"
```

### Paso 8: Actualizar Variables de Entorno

**En `apps/web/.env.production`:**

```bash
VITE_API_URL=https://shogunapi.uliber.com
VITE_MINIO_ENDPOINT=https://shogunminio.uliber.com
```

**En `apps/api/.env.production`:**

```bash
FRONTEND_URL=https://shogunweb.uliber.com
ALLOWED_ORIGINS=https://shogunweb.uliber.com
MINIO_PUBLIC_ENDPOINT=https://shogunminio.uliber.com
```

### Paso 9: Reconstruir Servicios

```bash
cd /Users/antoniojimenez/Projects/shogun
docker-compose -f docker-compose.production.yml build web api
docker-compose -f docker-compose.production.yml up -d
```

### Paso 10: Verificar que Todo Funciona

```bash
# Verificar proceso
ps aux | grep "[c]loudflared tunnel run"

# Verificar información del túnel
cloudflared tunnel info shogun-tunnel

# Verificar servicios locales
curl http://localhost:3002/api/v1/health
curl http://localhost:3003

# Verificar conectividad externa
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
```

## 🧹 Limpieza de Archivos de Ngrok

```bash
# Eliminar archivos de configuración de Ngrok
rm -f ~/.ngrok-domain
rm -f ~/ngrok.log
rm -f ~/ngrok.pid
rm -rf ~/.config/ngrok

# Eliminar LaunchAgent de Ngrok si existe
rm -f ~/Library/LaunchAgents/com.ngrok.shogun.plist
launchctl unload ~/Library/LaunchAgents/com.ngrok.shogun.plist 2>/dev/null
```

## 📝 Comandos Útiles de Cloudflared

```bash
# Ver información del túnel
cloudflared tunnel info shogun-tunnel

# Ver logs
tail -f ~/Library/Logs/com.cloudflare.cloudflared.out.log

# Detener servicio
launchctl stop com.cloudflare.cloudflared

# Iniciar servicio
launchctl start com.cloudflare.cloudflared

# Reiniciar servicio
launchctl stop com.cloudflare.cloudflared
launchctl start com.cloudflare.cloudflared
```

## ✅ Checklist Final

- [ ] Cloudflared instalado
- [ ] Autenticación con Cloudflare completada
- [ ] Túnel creado o verificado
- [ ] Archivo `~/.cloudflared/config.yml` configurado
- [ ] Registros DNS configurados
- [ ] SSL/TLS en modo "Flexible" en Cloudflare Dashboard
- [ ] Túnel probado manualmente
- [ ] LaunchAgent instalado y activo
- [ ] Variables de entorno actualizadas
- [ ] Servicios reconstruidos
- [ ] Todo funcionando correctamente
- [ ] Archivos de Ngrok eliminados

## 📚 Documentación Completa

Para más detalles, consulta: `docs/deployment/CLOUDFLARE_TUNNEL.md`

---

**¡Listo!** Has vuelto a Cloudflared. 🎉
