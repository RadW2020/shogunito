# Guía de Producción en macOS

## 🎯 Introducción

Esta guía te ayudará a configurar y mantener un servidor de producción en macOS. Aunque macOS no está diseñado específicamente para servidores, **puede funcionar bien** para producción con la configuración adecuada.

---

## ⚠️ Limitaciones de macOS en producción

### 1. **Servicios del sistema (launchd)**

- Los servicios de usuario (`LaunchAgents`) solo funcionan cuando hay una sesión activa
- Si cierras sesión, los servicios se detienen
- Los servicios de sistema requieren privilegios de root y son más complejos
- Reinicios del sistema pueden causar problemas

### 2. **Actualizaciones del sistema**

- macOS puede forzar actualizaciones que reinician el sistema
- Las actualizaciones pueden romper servicios
- Menos control sobre cuándo actualizar

### 3. **Soporte y herramientas**

- Menos herramientas de monitoreo para servidores
- Menos documentación para servidores macOS
- Comunidad más pequeña para problemas de servidor
- Muchas herramientas asumen Linux

---

## ✅ Configuración de producción en macOS

### Requisitos previos

1. **Docker Desktop instalado y configurado**
   - Activar "Start Docker Desktop when you log in"
   - Configurar recursos adecuados (RAM, CPU)

2. **Cloudflare Tunnel configurado**
   - Ver `CLOUDFLARE_TUNNEL.md` para detalles
   - Túnel funcionando y accesible

3. **Servicios Docker corriendo**
   - Base de datos (PostgreSQL)
   - Storage (MinIO)
   - API y Frontend

---

## 🔧 Mejores prácticas para producción en macOS

### 1. **Usar Docker para todo**

**Ventajas:**

- ✅ Aislamiento completo de servicios
- ✅ Mismo comportamiento que en otros sistemas
- ✅ Fácil gestión y actualización
- ✅ Portabilidad del código

```bash
# Levantar todos los servicios de producción
docker-compose -f docker-compose.production.yml up -d

# Verificar que todos están corriendo
docker-compose -f docker-compose.production.yml ps
```

### 2. **Configurar auto-inicio de Docker**

**Docker Desktop:**

- Preferencias → General → "Start Docker Desktop when you log in" ✅

**O usando launchd (alternativa):**

```bash
# Crear LaunchAgent para Docker
cat > ~/Library/LaunchAgents/com.docker.docker.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.docker.docker</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Applications/Docker.app/Contents/MacOS/Docker</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.docker.docker.plist
```

### 3. **Configurar Cloudflare Tunnel como servicio**

Ver `CLOUDFLARE_TUNNEL.md` para configuración completa.

**Resumen:**

```bash
# Instalar como servicio
cloudflared service install

# Cargar y iniciar
launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
launchctl start com.cloudflare.cloudflared
```

**Si el servicio no funciona bien, usar script de respaldo:**

```bash
# Crear script de inicio
cat > ~/start-cloudflare.sh << 'EOF'
#!/bin/bash
# Esperar a que Docker esté listo
sleep 10

# Verificar si ya está corriendo
if ! pgrep -f "cloudflared tunnel run" > /dev/null; then
    nohup cloudflared tunnel run shogun-tunnel > ~/Library/Logs/com.cloudflare.cloudflared.out.log 2> ~/Library/Logs/com.cloudflare.cloudflared.err.log &
fi
EOF

chmod +x ~/start-cloudflare.sh
```

### 4. **Script de monitoreo y reinicio automático**

Crear un script que verifique y reinicie servicios si es necesario:

```bash
# Crear script de verificación
cat > ~/check-services.sh << 'EOF'
#!/bin/bash

# Verificar Docker
if ! docker info > /dev/null 2>&1; then
    echo "$(date): Docker no está corriendo, iniciando..."
    open -a Docker
    sleep 10
fi

# Verificar servicios Docker
cd ~/Projects/shogun
if ! docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    echo "$(date): Servicios Docker caídos, reiniciando..."
    docker-compose -f docker-compose.production.yml up -d
fi

# Verificar Cloudflare Tunnel
if ! pgrep -f "cloudflared tunnel run" > /dev/null; then
    echo "$(date): Cloudflare Tunnel caído, reiniciando..."
    nohup cloudflared tunnel run shogun-tunnel > ~/Library/Logs/com.cloudflare.cloudflared.out.log 2> ~/Library/Logs/com.cloudflare.cloudflared.err.log &
fi
EOF

chmod +x ~/check-services.sh
```

**Añadir a crontab (verificar cada 5 minutos):**

```bash
crontab -e
# Añadir esta línea:
*/5 * * * * /Users/antoniojimenez/check-services.sh >> ~/Library/Logs/check-services.log 2>&1
```

### 5. **Evitar suspensión y cierre de sesión**

**Configurar caffeinate como servicio launchd (Recomendado):**

Esta es la mejor opción porque se ejecuta automáticamente al iniciar sesión y previene que el Mac se suspenda:

```bash
# Paso 1: Crear script wrapper (funciona mejor con launchd)
cat > ~/caffeinate-server.sh << 'SCRIPT_EOF'
#!/bin/bash
# Script wrapper para caffeinate que funciona mejor con launchd
# Previene que el Mac se suspenda

/usr/bin/caffeinate -d -i -m -s
SCRIPT_EOF

chmod +x ~/caffeinate-server.sh

# Paso 2: Crear LaunchAgent para caffeinate
cat > ~/Library/LaunchAgents/com.shogun.caffeinate.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.shogun.caffeinate</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/antoniojimenez/caffeinate-server.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/antoniojimenez/Library/Logs/caffeinate.out.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/antoniojimenez/Library/Logs/caffeinate.err.log</string>
</dict>
</plist>
EOF

# Paso 3: Cargar el servicio
launchctl load ~/Library/LaunchAgents/com.shogun.caffeinate.plist

# Paso 4: Iniciar el servicio
launchctl start com.shogun.caffeinate

# Paso 5: Verificar que está corriendo
sleep 2
ps aux | grep caffeinate | grep -v grep
```

**Nota:** Reemplaza `/Users/antoniojimenez` con tu ruta de usuario real si es diferente.

**Si el servicio launchd no inicia automáticamente (común en macOS):**

Usa el script directamente en el script de inicio (`start-production.sh`) o añádelo a crontab:

```bash
# Añadir al script de inicio o ejecutar manualmente
nohup ~/caffeinate-server.sh > /dev/null 2>&1 &

# O añadir a crontab para verificar cada 5 minutos
crontab -e
# Añadir esta línea:
*/5 * * * * pgrep -f "caffeinate.*-d.*-i.*-m.*-s" > /dev/null || nohup ~/caffeinate-server.sh > /dev/null 2>&1 &
```

**Explicación de las opciones de caffeinate:**

- `-d` - Previene que la pantalla se apague
- `-i` - Previene que el sistema se suspenda por inactividad (idle sleep)
- `-m` - Previene que el disco se suspenda
- `-s` - Previene que el sistema se suspenda (solo funciona cuando está conectado a corriente)

**Alternativa: Script manual (si launchd no funciona):**

```bash
# Crear script de respaldo
cat > ~/prevent-sleep.sh << 'EOF'
#!/bin/bash
# Prevenir suspensión mientras el script esté corriendo
caffeinate -d -i -m -s
EOF

chmod +x ~/prevent-sleep.sh

# Ejecutar en background
nohup ~/prevent-sleep.sh > /dev/null 2>&1 &
```

**Configurar para no cerrar sesión automáticamente:**

- System Preferences → Security & Privacy → General
- Desactivar "Log out after X minutes of inactivity"

**Verificar que caffeinate está funcionando:**

```bash
# Ver procesos caffeinate
ps aux | grep caffeinate | grep -v grep

# Ver estado del servicio
launchctl list | grep caffeinate

# Ver logs
tail -f ~/Library/Logs/caffeinate.out.log
```

**Nota:** Si el servicio no aparece en `launchctl list`, es normal. Lo importante es que el proceso `caffeinate` esté corriendo. Puedes verificar con `ps aux | grep caffeinate`.

**Si el servicio no inicia automáticamente:**

```bash
# Reiniciar el servicio manualmente
launchctl unload ~/Library/LaunchAgents/com.shogun.caffeinate.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.shogun.caffeinate.plist
launchctl start com.shogun.caffeinate

# O iniciar caffeinate directamente como respaldo
nohup caffeinate -d -i -m -s > /dev/null 2>&1 &
```

### 6. **Backup automático**

**Backup de base de datos:**

```bash
# Crear script de backup
cat > ~/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups/shogun
mkdir -p $BACKUP_DIR

# Backup de PostgreSQL
docker exec shogun-postgres-prod pg_dump -U shogun_prod shogun_prod > $BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql

# Mantener solo los últimos 7 días
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
EOF

chmod +x ~/backup-database.sh
```

**Añadir a crontab (backup diario a las 2 AM):**

```bash
crontab -e
# Añadir esta línea:
0 2 * * * /Users/antoniojimenez/backup-database.sh >> ~/Library/Logs/backup.log 2>&1
```

### 7. **Monitoreo externo**

Usar servicios de monitoreo para alertas:

- **UptimeRobot** (gratis): https://uptimerobot.com
  - Monitorea tus URLs cada 5 minutos
  - Alertas por email/SMS si cae

- **Pingdom** (freemium): https://www.pingdom.com
  - Monitoreo más avanzado
  - Alertas y métricas

**Configurar:**

1. Crear cuenta en UptimeRobot
2. Añadir monitor para:
   - `https://shogunapi.uliber.com/health`
   - `https://shogunweb.uliber.com`
3. Configurar alertas por email

### 8. **Gestión de actualizaciones**

**Desactivar actualizaciones automáticas:**

- System Preferences → Software Update
- Desactivar "Automatically keep my Mac up to date"
- Revisar manualmente antes de actualizar

**Antes de actualizar macOS:**

1. Hacer backup completo
2. Verificar que Docker y servicios funcionan
3. Actualizar en horario de bajo tráfico
4. Probar que todo funciona después

---

## 🚀 Script de inicio completo

Crear un script maestro que inicie todo al arrancar:

```bash
cat > ~/start-production.sh << 'EOF'
#!/bin/bash

echo "🚀 Iniciando servicios de producción..."

# 1. Esperar a que el sistema esté listo
sleep 5

# 2. Iniciar Docker si no está corriendo
if ! docker info > /dev/null 2>&1; then
    echo "📦 Iniciando Docker..."
    open -a Docker
    sleep 15
fi

# 3. Iniciar servicios Docker
echo "🐳 Iniciando contenedores Docker..."
cd ~/Projects/shogun
docker-compose -f docker-compose.production.yml up -d

# 4. Esperar a que los servicios estén listos
sleep 10

# 5. Verificar servicios Docker
if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
    echo "✅ Servicios Docker iniciados"
else
    echo "❌ Error iniciando servicios Docker"
fi

# 6. Iniciar Cloudflare Tunnel
if ! pgrep -f "cloudflared tunnel run" > /dev/null; then
    echo "🌐 Iniciando Cloudflare Tunnel..."
    nohup cloudflared tunnel run shogun-tunnel > ~/Library/Logs/com.cloudflare.cloudflared.out.log 2> ~/Library/Logs/com.cloudflare.cloudflared.err.log &
    sleep 3
    if pgrep -f "cloudflared tunnel run" > /dev/null; then
        echo "✅ Cloudflare Tunnel iniciado"
    else
        echo "❌ Error iniciando Cloudflare Tunnel"
    fi
else
    echo "✅ Cloudflare Tunnel ya está corriendo"
fi

# 7. Iniciar caffeinate (prevenir suspensión)
if ! pgrep -f "caffeinate.*-d.*-i.*-m.*-s" > /dev/null; then
    echo "☕ Iniciando caffeinate (prevenir suspensión)..."
    nohup ~/caffeinate-server.sh > /dev/null 2>&1 &
    sleep 2
    if pgrep -f "caffeinate.*-d.*-i.*-m.*-s" > /dev/null; then
        echo "✅ Caffeinate iniciado"
    else
        echo "❌ Error iniciando caffeinate"
    fi
else
    echo "✅ Caffeinate ya está corriendo"
fi

echo "✨ Inicio completado"
EOF

chmod +x ~/start-production.sh
```

**Añadir a elementos de inicio:**

- System Preferences → Users & Groups → Login Items
- Añadir `~/start-production.sh`

---

## 📊 Verificación y diagnóstico

### Script de verificación rápida

Usa el script `check-cloudflare.sh` que ya tienes:

```bash
./check-cloudflare.sh
```

### Verificación manual

```bash
# Verificar Docker
docker info
docker-compose -f docker-compose.production.yml ps

# Verificar Cloudflare Tunnel
ps aux | grep cloudflared | grep -v grep
launchctl list | grep cloudflare

# Verificar conectividad
curl http://localhost:3002/health
curl http://localhost:3003
curl https://shogunapi.uliber.com/health
curl https://shogunweb.uliber.com

# Ver logs
tail -f ~/Library/Logs/com.cloudflare.cloudflared.out.log
docker-compose -f docker-compose.production.yml logs -f
```

---

## 🔧 Solución de problemas comunes

### El túnel se cae solo

Ver `CLOUDFLARE_TUNNEL.md` para solución detallada.

**Solución rápida:**

```bash
./restart-cloudflare.sh
```

### Docker no inicia automáticamente

1. Verificar que Docker Desktop tiene "Start at login" activado
2. O usar el LaunchAgent creado arriba

### Servicios Docker se detienen

1. Verificar logs: `docker-compose -f docker-compose.production.yml logs`
2. Verificar recursos: Docker Desktop → Resources
3. Reiniciar: `docker-compose -f docker-compose.production.yml restart`

### El Mac se suspende

1. **Verificar que caffeinate está corriendo:**

   ```bash
   ps aux | grep caffeinate | grep -v grep
   ```

2. **Si no está corriendo, iniciarlo:**

   ```bash
   # Opción 1: Usar el servicio launchd
   launchctl start com.shogun.caffeinate

   # Opción 2: Iniciar directamente como respaldo
   nohup caffeinate -d -i -m -s > /dev/null 2>&1 &
   ```

3. **Verificar configuración del sistema:**
   - System Preferences → Energy Saver
   - Desactivar "Put hard disks to sleep when possible"
   - Desactivar "Prevent automatic sleeping when display is off" (si está disponible)

4. **Si el problema persiste:**
   - Verificar que el servicio launchd está cargado: `launchctl list | grep caffeinate`
   - Recargar el servicio: `launchctl unload ~/Library/LaunchAgents/com.shogun.caffeinate.plist && launchctl load ~/Library/LaunchAgents/com.shogun.caffeinate.plist`

---

## 📝 Checklist de producción

- [ ] Docker Desktop configurado para iniciar al login
- [ ] Cloudflare Tunnel configurado como servicio
- [ ] Caffeinate configurado como servicio launchd (previene suspensión)
- [ ] Script de monitoreo configurado (cron)
- [ ] Script de backup configurado (cron)
- [ ] Monitoreo externo configurado (UptimeRobot)
- [ ] Prevención de suspensión configurada y verificada
- [ ] Actualizaciones automáticas desactivadas
- [ ] Script de inicio completo configurado
- [ ] Logs configurados y accesibles
- [ ] Documentación de recuperación lista

---

## 📝 Conclusión

**macOS puede funcionar bien para producción** si:

- ✅ Configuras los servicios correctamente
- ✅ Usas Docker para aislar servicios
- ✅ Configuras monitoreo y respaldos
- ✅ Tienes scripts de recuperación automática
- ✅ Aceptas que requiere más atención que Linux

**Con esta configuración**, tu servidor macOS debería ser bastante estable y recuperarse automáticamente de la mayoría de problemas comunes.

---

## 🔗 Recursos relacionados

- `CLOUDFLARE_TUNNEL.md` - Configuración completa del túnel y solución de problemas
- `check-cloudflare.sh` - Script de diagnóstico
- `restart-cloudflare.sh` - Script de reinicio
- [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- [Cloudflare Tunnel macOS Setup](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
