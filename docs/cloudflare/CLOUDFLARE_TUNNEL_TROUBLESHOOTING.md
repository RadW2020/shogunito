# Solución de Problemas - Cloudflare Tunnel

## 🔍 Diagnóstico Rápido

### Comando de Diagnóstico Completo

```bash
# Ejecutar diagnóstico completo
echo "=== Estado del Túnel ===" && \
cloudflared tunnel info shogun-tunnel && \
echo "" && \
echo "=== Proceso ===" && \
ps aux | grep -i "[c]loudflared tunnel run" && \
echo "" && \
echo "=== Servicios Locales ===" && \
echo "API: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/api/v1/health)" && \
echo "Web: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3003)" && \
echo "" && \
echo "=== Endpoints Externos ===" && \
echo "API: $(curl -s -o /dev/null -w '%{http_code}' https://shogunapi.uliber.com/api/v1/health)" && \
echo "Web: $(curl -s -o /dev/null -w '%{http_code}' https://shogunweb.uliber.com)"
```

---

## ❌ Problema: Error 530 - Túnel Desconectado

### Síntomas

- Los endpoints externos devuelven error **530**
- `cloudflared tunnel info shogun-tunnel` muestra: `does not have any active connection`
- No hay procesos `cloudflared` corriendo
- El servicio launchd no está activo

### Causa

El túnel de Cloudflare no está corriendo o se desconectó. Esto puede ocurrir por:

1. El servicio se detuvo después de un reinicio
2. El proceso fue terminado manualmente
3. Problemas de red temporales
4. Conectores zombie que bloquean nuevas conexiones

### Solución Paso a Paso

```bash
# 1. Verificar estado actual
cloudflared tunnel info shogun-tunnel

# 2. Limpiar conectores zombie (si los hay)
cloudflared tunnel cleanup shogun-tunnel

# 3. Terminar procesos existentes
pkill -9 cloudflared
sleep 2

# 4. Reiniciar el túnel manualmente (prueba rápida)
cloudflared tunnel run shogun-tunnel &
sleep 10

# 5. Verificar que se conectó
cloudflared tunnel info shogun-tunnel

# 6. Si funciona, reiniciar el servicio launchd
launchctl unload ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
launchctl start com.cloudflare.cloudflared

# 7. Verificar estado final
sleep 5
cloudflared tunnel info shogun-tunnel
curl -I https://shogunweb.uliber.com
```

### Verificación

Después de la solución, deberías ver:

- ✅ `CONNECTOR ID` presente en `cloudflared tunnel info`
- ✅ Proceso `cloudflared tunnel run` corriendo
- ✅ Endpoints externos respondiendo con código 200
- ✅ Servicio launchd activo

---

## 🔧 Script de Recuperación Automática

### Script: `fix-cloudflare-tunnel.sh`

```bash
#!/bin/bash

echo "🔧 Reparando Cloudflare Tunnel..."

# 1. Limpiar conectores zombie
echo "1. Limpiando conectores zombie..."
cloudflared tunnel cleanup shogun-tunnel

# 2. Terminar procesos existentes
echo "2. Terminando procesos existentes..."
pkill -9 cloudflared 2>/dev/null
sleep 3

# 3. Verificar servicios locales
echo "3. Verificando servicios locales..."
API_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/api/v1/health)
WEB_STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3003)

if [ "$API_STATUS" != "200" ] || [ "$WEB_STATUS" != "200" ]; then
    echo "⚠️  Los servicios locales no están respondiendo"
    echo "   API: $API_STATUS, Web: $WEB_STATUS"
    echo "   Asegúrate de que los contenedores Docker estén corriendo:"
    echo "   docker-compose -f docker-compose.production.yml ps"
    exit 1
fi

echo "   ✅ Servicios locales OK (API: $API_STATUS, Web: $WEB_STATUS)"

# 4. Reiniciar el túnel
echo "4. Reiniciando el túnel..."
launchctl unload ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist 2>/dev/null
sleep 2
launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.plist
launchctl start com.cloudflare.cloudflared

# 5. Esperar conexión
echo "5. Esperando conexión (30 segundos)..."
sleep 30

# 6. Verificar conexión
echo "6. Verificando conexión..."
TUNNEL_INFO=$(cloudflared tunnel info shogun-tunnel 2>&1)

if echo "$TUNNEL_INFO" | grep -q "CONNECTOR ID"; then
    echo "   ✅ Túnel conectado correctamente"

    # Verificar endpoints externos
    echo "7. Verificando endpoints externos..."
    API_EXT=$(curl -s -o /dev/null -w '%{http_code}' https://shogunapi.uliber.com/api/v1/health)
    WEB_EXT=$(curl -s -o /dev/null -w '%{http_code}' https://shogunweb.uliber.com)

    if [ "$API_EXT" = "200" ] && [ "$WEB_EXT" = "200" ]; then
        echo "   ✅ Endpoints externos funcionando (API: $API_EXT, Web: $WEB_EXT)"
        echo ""
        echo "✅ Túnel reparado y funcionando correctamente"
        exit 0
    else
        echo "   ⚠️  Endpoints externos no responden correctamente (API: $API_EXT, Web: $WEB_EXT)"
        echo "   Espera unos minutos más para la propagación DNS"
    fi
else
    echo "   ❌ El túnel no se conectó"
    echo ""
    echo "Información del túnel:"
    echo "$TUNNEL_INFO"
    echo ""
    echo "Intenta ejecutar manualmente:"
    echo "  cloudflared tunnel run shogun-tunnel"
    exit 1
fi
```

### Uso

```bash
# Hacer ejecutable
chmod +x fix-cloudflare-tunnel.sh

# Ejecutar
./fix-cloudflare-tunnel.sh
```

---

## 📊 Códigos de Estado HTTP

### Códigos Comunes

- **200**: ✅ Todo funciona correctamente
- **301/302**: ✅ Redirección (normal en algunos casos)
- **404**: ⚠️ Ruta no encontrada (verificar configuración del túnel)
- **502**: ❌ Bad Gateway - Servicios locales no están corriendo
- **530**: ❌ Cloudflare Error - Túnel no conectado o problema de conexión

### Diagnóstico por Código

#### Error 502

**Causa:** Los servicios Docker no están corriendo o no responden

**Solución:**

```bash
# Verificar contenedores
docker ps --filter "name=shogun"

# Iniciar servicios
docker-compose -f docker-compose.production.yml up -d

# Verificar servicios locales
curl http://localhost:3002/api/v1/health
curl http://localhost:3003
```

#### Error 530

**Causa:** El túnel no está conectado

**Solución:** Ver sección "Problema: Error 530" arriba

#### Error 404

**Causa:** Configuración incorrecta del túnel o ruta no existe

**Solución:**

```bash
# Verificar configuración
cat ~/.cloudflared/config.yml

# Verificar rutas DNS
cloudflared tunnel route dns list

# Verificar que los servicios locales responden en las rutas correctas
```

---

## 🔄 Mantenimiento Preventivo

### Verificación Diaria

Agrega este comando a tu crontab o ejecútalo manualmente:

```bash
# Verificar estado del túnel
cloudflared tunnel info shogun-tunnel | grep -q "CONNECTOR ID" || {
    echo "⚠️  Túnel desconectado, reiniciando..."
    launchctl stop com.cloudflare.cloudflared
    sleep 5
    launchctl start com.cloudflare.cloudflared
}
```

### Monitoreo Continuo

Puedes verificar el estado del túnel y servicios con estos comandos:

```bash
# Verificar estado del túnel
cloudflared tunnel info shogun-tunnel

# Verificar procesos
ps aux | grep -i "[c]loudflared tunnel run"

# Verificar servicios locales
curl -s -o /dev/null -w '%{http_code}' http://localhost:3002/api/v1/health
curl -s -o /dev/null -w '%{http_code}' http://localhost:3003

# Verificar endpoints externos
curl -s -o /dev/null -w '%{http_code}' https://shogunapi.uliber.com/api/v1/health
curl -s -o /dev/null -w '%{http_code}' https://shogunweb.uliber.com
```

---

## 🐛 Problemas Conocidos

### 1. El servicio no inicia automáticamente después de reiniciar

**Causa:** Los LaunchAgents solo funcionan con sesión de usuario activa

**Solución:**

- Asegúrate de iniciar sesión después de reiniciar
- El servicio debería iniciarse automáticamente con `RunAtLoad: true`

### 2. Múltiples procesos cloudflared

**Causa:** El servicio se reinició mientras había un proceso manual

**Solución:**

```bash
# Terminar todos los procesos
pkill -9 cloudflared
sleep 5

# Reiniciar solo el servicio
launchctl stop com.cloudflare.cloudflared
launchctl start com.cloudflare.cloudflared
```

### 3. Conectores zombie

**Causa:** Conexiones antiguas que no se limpiaron correctamente

**Solución:**

```bash
cloudflared tunnel cleanup shogun-tunnel
sleep 30
launchctl restart com.cloudflare.cloudflared
```

---

## 📝 Logs

### Ubicación de Logs

```bash
# Logs de salida
tail -f ~/Library/Logs/com.cloudflare.cloudflared.out.log

# Logs de error
tail -f ~/Library/Logs/com.cloudflare.cloudflared.err.log
```

### Comando Útil

```bash
# Ver últimos 50 líneas de ambos logs
tail -50 ~/Library/Logs/com.cloudflare.cloudflared.*.log
```

---

## ✅ Checklist de Verificación

Cuando el túnel no funciona, verifica en este orden:

- [ ] ¿Los servicios Docker están corriendo? (`docker ps`)
- [ ] ¿Los servicios locales responden? (`curl http://localhost:3002`)
- [ ] ¿El proceso cloudflared está corriendo? (`ps aux | grep cloudflared`)
- [ ] ¿El túnel tiene conexiones activas? (`cloudflared tunnel info`)
- [ ] ¿El servicio launchd está cargado? (`launchctl list | grep cloudflare`)
- [ ] ¿La configuración es correcta? (`cat ~/.cloudflared/config.yml`)
- [ ] ¿Los endpoints externos responden? (`curl https://shogunweb.uliber.com`)

---

---

## ✅ Estado Actual (2025-12-08)

**Pruebas de conectividad confirmadas:**

```bash
# Todos los endpoints funcionando
✅ shogunweb.uliber.com → HTTP 200, SSL válido
✅ shogunapi.uliber.com/api/v1/health → HTTP 200, respuesta JSON válida
✅ shogunminio.uliber.com → HTTP 403 (esperado), SSL válido

# Túnel
✅ Túnel conectado y funcionando
✅ Certificados SSL válidos
✅ DNS resuelve correctamente
```

**✅ Estado:**

- ✅ Túnel funcionando perfectamente
- ✅ Todos los endpoints accesibles
- ✅ No hay errores 530, 502, o 404
- ✅ Certificados SSL válidos
- ✅ HTTPS funcionando correctamente

**Última actualización:** 2025-12-08  
**Estado:** ✅ **FUNCIONANDO CORRECTAMENTE** - Todos los problemas resueltos
