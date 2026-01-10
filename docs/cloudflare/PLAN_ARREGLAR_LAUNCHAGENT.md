# Plan para Arreglar LaunchAgent de Cloudflare

## 🔍 Diagnóstico del Problema

### Situación Actual

- ✅ **Archivo plist existe**: `~/Library/LaunchAgents/com.cloudflare.cloudflared.plist`
- ✅ **Formato correcto**: El plist es válido (verificado con `plutil`)
- ✅ **Ruta de cloudflared correcta**: `/opt/homebrew/bin/cloudflared` existe
- ✅ **Configuración correcta**: `RunAtLoad: true`, `KeepAlive: true`
- ❌ **Error al cargar**: Exit code 134 (falso positivo conocido en macOS)
- ❌ **Servicio no aparece**: `launchctl list | grep cloudflare` no devuelve nada
- ❌ **Proceso no se inicia**: No hay proceso gestionado por launchd

### Sistema

- **macOS**: 15.7 (Sequoia)
- **launchctl**: Versión 7.0.0
- **Problema**: Error 134 al cargar, pero el servicio realmente no se carga

---

## 🎯 Plan de Acción

### Fase 1: Diagnóstico Profundo

#### Paso 1.1: Verificar permisos y estructura

```bash
# Verificar permisos del archivo
ls -la ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist

# Verificar que el directorio existe y tiene permisos correctos
ls -ld ~/Library/LaunchAgents/

# Verificar permisos de ejecución de cloudflared
ls -l /opt/homebrew/bin/cloudflared
```

#### Paso 1.2: Probar carga con diferentes métodos

```bash
# Método 1: load tradicional (el que estamos usando)
launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist

# Método 2: bootstrap (método moderno)
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist

# Método 3: load con flag -w (write)
launchctl load -w ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
```

#### Paso 1.3: Verificar logs del sistema

```bash
# Ver logs de launchd
log show --predicate 'subsystem == "com.apple.launchd"' --last 1h | grep cloudflare

# Ver logs de Console.app
# Abrir Console.app y buscar "cloudflare" o "com.cloudflare.cloudflared"
```

#### Paso 1.4: Verificar si hay conflictos

```bash
# Ver si hay otros servicios de cloudflare
launchctl list | grep -i cloudflare

# Ver si hay procesos zombie
ps aux | grep cloudflared
```

---

### Fase 2: Implementación - Usar LaunchDaemon

**Estrategia**: Usar LaunchDaemon en lugar de LaunchAgent.

**Ventajas**:

- ✅ Funciona sin sesión de usuario activa
- ✅ Se inicia automáticamente al arrancar el sistema
- ✅ Más robusto y confiable que LaunchAgent
- ✅ No depende de que el usuario inicie sesión

**Requisitos**: Permisos de administrador (sudo)

**Paso 2.1**: Eliminar LaunchAgent existente (si existe)

```bash
# Detener y descargar el LaunchAgent si está cargado
launchctl unload ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist 2>/dev/null
launchctl stop com.cloudflare.cloudflared 2>/dev/null

# Eliminar el archivo del LaunchAgent
rm ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist 2>/dev/null
```

**Paso 2.2**: Detener proceso manual si está corriendo

```bash
# Detener cualquier proceso manual de cloudflared
pkill -f "cloudflared tunnel run" 2>/dev/null
sleep 2
```

**Paso 2.3**: Crear directorio de logs (si no existe)

```bash
# Crear directorio de logs para el LaunchDaemon
sudo mkdir -p /var/log/cloudflared
```

**Paso 2.4**: Crear LaunchDaemon

```bash
sudo tee /Library/LaunchDaemons/com.cloudflare.cloudflared.plist > /dev/null << 'EOF'
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
    <string>/var/log/cloudflared.out.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/cloudflared.err.log</string>
</dict>
</plist>
EOF

sudo chown root:wheel /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
sudo chmod 644 /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

**Paso 2.5**: Cargar y iniciar el LaunchDaemon

```bash
# Cargar el LaunchDaemon
sudo launchctl load /Library/LaunchDaemons/com.cloudflare.cloudflared.plist

# Iniciar el servicio
sudo launchctl start com.cloudflare.cloudflared
```

**Nota**: Los LaunchDaemons se cargan automáticamente al arrancar el sistema, no necesitan sesión de usuario.

---

### Fase 3: Verificación y Testing

#### Paso 3.1: Verificar que el servicio está cargado

```bash
# Verificar en el dominio del sistema
sudo launchctl list | grep cloudflare

# O verificar directamente
sudo launchctl list com.cloudflare.cloudflared
```

#### Paso 3.2: Verificar que el proceso está corriendo

```bash
ps aux | grep "[c]loudflared tunnel run"
```

#### Paso 3.3: Verificar que el túnel está conectado

```bash
cloudflared tunnel info shogun-tunnel
```

#### Paso 3.4: Verificar endpoints externos

```bash
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
```

#### Paso 3.5: Verificar logs

```bash
# Logs del LaunchDaemon (ubicación: /var/log/)
sudo tail -f /var/log/cloudflared.out.log
sudo tail -f /var/log/cloudflared.err.log
```

---

### Fase 4: Testing de Reinicio

#### Paso 4.1: Simular reinicio (sin reiniciar realmente)

```bash
# Detener el servicio
sudo launchctl stop com.cloudflare.cloudflared

# Verificar que se detuvo
ps aux | grep cloudflared

# Iniciar el servicio
sudo launchctl start com.cloudflare.cloudflared

# Verificar que se inició
ps aux | grep cloudflared
```

#### Paso 4.2: Reinicio real (cuando estés listo)

```bash
# Reiniciar la máquina
sudo reboot

# Después del reinicio, verificar:
sudo launchctl list | grep cloudflare
ps aux | grep cloudflared
cloudflared tunnel info shogun-tunnel
```

```

---

## 🔧 Posibles Causas del Error 134

1. **Problema conocido de macOS Sequoia**: Algunas versiones tienen bugs con launchctl
2. **Permisos**: El archivo o directorio puede tener permisos incorrectos
3. **Conflicto**: Puede haber un servicio anterior que no se desactivó correctamente
4. **Variables de entorno**: launchd puede no tener acceso al PATH correcto
5. **Configuración del plist**: Puede faltar alguna clave necesaria

---

## 📋 Checklist de Ejecución

- [ ] Fase 1: Diagnóstico completo
- [ ] Fase 2: Implementar LaunchDaemon
  - [ ] Eliminar LaunchAgent existente
  - [ ] Detener proceso manual
  - [ ] Crear directorio de logs
  - [ ] Crear LaunchDaemon
  - [ ] Cargar y iniciar el servicio
- [ ] Fase 3: Verificación completa
- [ ] Fase 4: Testing de reinicio

---

## 🎯 Resultado Esperado

Después de aplicar el plan:
- ✅ El servicio aparece en `sudo launchctl list`
- ✅ El proceso se inicia automáticamente al arrancar el sistema (sin necesidad de iniciar sesión)
- ✅ El proceso se reinicia automáticamente si falla (KeepAlive)
- ✅ Los logs se escriben correctamente
- ✅ El túnel está conectado y funcionando
- ✅ Funciona incluso si no hay sesión de usuario activa

---

## 📝 Notas

- **LaunchDaemon vs LaunchAgent**:
  - LaunchDaemon: Funciona sin sesión de usuario, requiere root, se carga al arrancar el sistema
  - LaunchAgent: Solo funciona con sesión de usuario activa, no requiere root
- El LaunchDaemon es la solución elegida porque es más robusto y funciona independientemente de la sesión de usuario
- Siempre verifica los logs si algo no funciona: `sudo tail -f /var/log/cloudflared.out.log`
- Los logs están en `/var/log/` porque el LaunchDaemon corre como root
- Para gestionar el servicio: `sudo launchctl start/stop/restart com.cloudflare.cloudflared`

```
