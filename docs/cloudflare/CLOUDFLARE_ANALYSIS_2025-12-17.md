# Análisis: Estado de Cloudflare Tunnel - 2025-12-17

**Fecha del análisis:** 2025-12-17  
**Estado general:** ⚠️ Funcionando con problemas intermitentes

---

## 📊 Resumen Ejecutivo

El túnel de Cloudflare está **técnicamente funcionando** y los endpoints externos responden correctamente (HTTP 200). Sin embargo, se detectan **errores periódicos de timeout** en los logs que causan reconexiones automáticas cada hora aproximadamente.

### Estado Actual

- ✅ **Túnel conectado:** CONNECTOR ID activo presente
- ✅ **Endpoints externos:** Responden con HTTP 200
- ✅ **Servicios locales:** API y Web funcionando correctamente
- ⚠️ **Errores de timeout:** Reconexiones cada hora
- ⚠️ **Contenedor API:** Marcado como "unhealthy" por Docker

---

## 🔍 Diagnóstico Detallado

### 1. Estado del Túnel

```bash
NAME:     shogun-tunnel
ID:       5adc17fe-7cf4-468e-8bef-a3264ec7e67f
CONNECTOR ID: 4a5a4701-75d4-4200-92c2-12e26a7e8d32
EDGE:     1xmad06
```

**✅ Estado:** Túnel conectado y activo

### 2. Proceso cloudflared

```bash
PID: 55028
Usuario: root
Comando: /opt/homebrew/bin/cloudflared tunnel run shogun-tunnel
Uptime: Desde 8Dec25 (18:57.66)
```

**✅ Estado:** Proceso corriendo correctamente

### 3. Conectividad Externa

```bash
✅ https://shogunapi.uliber.com/api/v1/health → HTTP 200
✅ https://shogunweb.uliber.com → HTTP 200
✅ SSL/TLS: Certificado válido
✅ DNS: Resuelve a IPs de Cloudflare (188.114.97.5, 188.114.96.5)
```

**✅ Estado:** Endpoints accesibles y funcionando

### 4. Servicios Locales

```bash
✅ API local (localhost:3002): HTTP 200
✅ Web local (localhost:3003): HTTP 200
⚠️ Contenedor API: "unhealthy" (pero responde correctamente)
```

**✅ Estado:** Servicios locales funcionando

---

## ⚠️ Problemas Identificados

### Problema 1: Errores de Timeout Periódicos

**Síntomas en logs:**

```
ERR failed to accept incoming stream requests error="failed to accept QUIC stream: timeout: no recent network activity"
ERR failed to run the datagram handler error="timeout: no recent network activity"
ERR failed to serve tunnel connection error="accept stream listener encountered a failure while serving"
WRN Serve tunnel error error="accept stream listener encountered a failure while serving"
INF Retrying connection in up to 1s
```

**Frecuencia:** Aproximadamente cada hora (07:02, 08:03, 09:04, 09:55)

**Impacto:**
- El túnel se reconecta automáticamente
- No afecta la funcionalidad (los endpoints siguen respondiendo)
- Puede causar latencia temporal durante la reconexión

**Causas posibles:**
1. **Inactividad prolongada:** Si no hay tráfico durante mucho tiempo, Cloudflare puede cerrar la conexión
2. **Problemas de red intermitentes:** Latencia o pérdida de paquetes
3. **Configuración de keepalive:** El túnel puede necesitar ajustes en los timeouts

### Problema 2: Contenedor API Marcado como "Unhealthy"

**Estado Docker:**
```
shogun-api-prod: Up 2 days (unhealthy)
```

**Observaciones:**
- El contenedor responde correctamente a las peticiones HTTP
- El healthcheck de Docker está fallando
- Los logs muestran queries normales a la base de datos

**Impacto:**
- No afecta directamente al túnel de Cloudflare
- Puede indicar un problema con el healthcheck del contenedor
- Puede causar reinicios automáticos si Docker está configurado para ello

---

## 🔧 Soluciones Recomendadas

### Solución 1: Configurar Keepalive en el Túnel

Agregar configuración de keepalive para evitar timeouts por inactividad:

**Editar `~/.cloudflared/config.yml`:**

```yaml
tunnel: shogun-tunnel
credentials-file: /Users/antoniojimenez/.cloudflared/5adc17fe-7cf4-468e-8bef-a3264ec7e67f.json

# Configuración de keepalive
keepalive: 30s
keepalive-connections: 4

ingress:
  - hostname: shogunapi.uliber.com
    service: http://localhost:3002
  - hostname: shogunweb.uliber.com
    service: http://localhost:3003
  - hostname: shogunminio.uliber.com
    service: http://localhost:9010
  - service: http_status:404
```

**Reiniciar el túnel después del cambio:**

```bash
sudo launchctl kickstart system/com.cloudflare.cloudflared
# O si no está en launchd:
pkill -f "cloudflared tunnel run"
cloudflared tunnel run shogun-tunnel &
```

### Solución 2: Revisar Healthcheck del Contenedor API

Verificar y ajustar el healthcheck en `docker-compose.production.yml`:

```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Solución 3: Monitoreo y Alertas

Configurar monitoreo para detectar problemas tempranamente:

```bash
# Script de monitoreo básico
#!/bin/bash
while true; do
    STATUS=$(curl -s -o /dev/null -w '%{http_code}' https://shogunapi.uliber.com/api/v1/health)
    if [ "$STATUS" != "200" ]; then
        echo "ALERT: API returned $STATUS at $(date)"
        # Enviar notificación (email, Slack, etc.)
    fi
    sleep 60
done
```

### Solución 4: Limpiar Conectores Zombie (si persisten los problemas)

Si los errores de timeout se vuelven más frecuentes:

```bash
# Limpiar conectores zombie
cloudflared tunnel cleanup shogun-tunnel

# Reiniciar el túnel
pkill -9 cloudflared
sleep 5
cloudflared tunnel run shogun-tunnel &
```

---

## 📋 Checklist de Verificación

### Verificación Inmediata

- [x] Túnel tiene CONNECTOR ID activo
- [x] Endpoints externos responden (HTTP 200)
- [x] Servicios locales funcionan
- [x] Proceso cloudflared corriendo
- [ ] Revisar configuración de keepalive
- [ ] Verificar healthcheck del contenedor API

### Verificación Periódica (Recomendado)

- [ ] Revisar logs de errores diariamente
- [ ] Monitorear frecuencia de reconexiones
- [ ] Verificar estado de contenedores Docker
- [ ] Comprobar métricas en Cloudflare Zero Trust Dashboard

---

## 🔍 Comandos de Diagnóstico

### Diagnóstico Rápido

```bash
# Estado del túnel
cloudflared tunnel info shogun-tunnel

# Proceso cloudflared
ps aux | grep "[c]loudflared tunnel run"

# Endpoints externos
curl -s -o /dev/null -w '%{http_code}' https://shogunapi.uliber.com/api/v1/health
curl -s -o /dev/null -w '%{http_code}' https://shogunweb.uliber.com

# Servicios locales
curl -s http://localhost:3002/api/v1/health
curl -s http://localhost:3003 | head -5

# Estado Docker
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Ver Logs de Errores

```bash
# Logs de errores del túnel
sudo tail -50 /var/log/cloudflared.err.log

# Logs del contenedor API
docker logs shogun-api-prod --tail 50
```

---

## 🎯 Conclusión

**Estado actual:** El túnel de Cloudflare está **funcionando correctamente** desde el punto de vista técnico. Los endpoints son accesibles y responden adecuadamente.

**Problemas menores:**
- Errores de timeout periódicos que causan reconexiones automáticas (no crítico)
- Contenedor API marcado como unhealthy (revisar healthcheck)

**Recomendaciones:**
1. **Corto plazo:** Configurar keepalive para reducir timeouts
2. **Medio plazo:** Revisar y ajustar healthcheck del contenedor API
3. **Largo plazo:** Implementar monitoreo y alertas

**Prioridad:** Media - Los problemas no afectan la funcionalidad actual, pero deben monitorearse para evitar degradación del servicio.

---

## 📚 Referencias

- [Documentación Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com)
- [Guía de Troubleshooting](./CLOUDFLARE_TUNNEL_TROUBLESHOOTING.md)
- [Solución Crítica CNAME](./CLOUDFLARE_CRITICAL_FIX.md)

---

**Última actualización:** 2025-12-17  
**Próxima revisión recomendada:** 2025-12-24



