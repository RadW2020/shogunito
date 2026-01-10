# Solución: Problemas de Router/Firewall con Cloudflare Tunnel

**Problema identificado:** El router/firewall está cerrando conexiones UDP (QUIC), causando errores "timeout: no recent network activity" y desconexiones constantes.

**Fecha:** 2025-12-23

---

## 🔍 Análisis del Problema

### Síntomas en Logs

```
ERR failed to run the datagram handler error="timeout: no recent network activity"
ERR failed to accept incoming stream requests error="failed to accept QUIC stream: timeout: no recent network activity"
```

**Frecuencia:** Errores constantes cada pocos minutos

### Causa Raíz

1. **QUIC (UDP) bloqueado por router:**
   - QUIC usa UDP, que puede ser bloqueado por routers con NAT agresivo
   - Los routers cierran conexiones UDP inactivas más rápido que TCP
   - Firewalls pueden bloquear UDP más agresivamente

2. **NAT agresivo:**
   - El router cierra conexiones inactivas después de un tiempo
   - UDP no tiene un mecanismo de keepalive tan robusto como TCP
   - Las conexiones QUIC se pierden cuando el router las cierra

3. **Firewall bloqueando UDP:**
   - Algunos firewalls bloquean UDP saliente
   - UDP es más difícil de mantener abierto que TCP

---

## ✅ Solución: Cambiar a HTTP/2 (TCP)

### Por qué HTTP/2 funciona mejor

- ✅ **TCP es más compatible:** Los routers/firewalls manejan TCP mejor que UDP
- ✅ **TCP keepalive más robusto:** Funciona mejor que UDP keepalive
- ✅ **Menos bloqueado:** Los firewalls raramente bloquean TCP saliente
- ✅ **NAT más estable:** TCP mantiene conexiones abiertas mejor que UDP

### Cambios en la Configuración

**Antes (QUIC - UDP):**
```yaml
protocol: quic
```

**Después (HTTP/2 - TCP):**
```yaml
protocol: http2
originRequest:
  tcpKeepAlive: 10s  # Más frecuente
  keepAliveTimeout: 30s  # Más corto
```

---

## 🚀 Aplicar la Solución

### Opción 1: Script Automatizado (Recomendado)

```bash
sudo ./scripts/fix-router-firewall-issues.sh
```

Este script:
- Cambia el protocolo de QUIC a HTTP/2
- Ajusta keepalive más agresivo (cada 10s)
- Reduce timeouts para reconexión rápida
- Limpia conectores zombie
- Reinicia el servicio

### Opción 2: Manual

1. **Editar configuración:**
   ```bash
   nano ~/.cloudflared/config.yml
   ```

2. **Cambiar protocolo:**
   ```yaml
   # Cambiar de:
   protocol: quic
   
   # A:
   protocol: http2
   ```

3. **Ajustar keepalive:**
   ```yaml
   originRequest:
     tcpKeepAlive: 10s  # Más frecuente
     keepAliveTimeout: 30s  # Más corto
   ```

4. **Reiniciar:**
   ```bash
   sudo launchctl kickstart system/com.cloudflare.cloudflared
   ```

---

## 🔍 Verificación

### Verificar que Usa HTTP/2

```bash
# Ver configuración
cat ~/.cloudflared/config.yml | grep protocol

# Debe mostrar: protocol: http2
```

### Verificar que Funciona

```bash
# Verificar túnel
cloudflared tunnel info shogun-tunnel
# Debe mostrar CONNECTOR ID

# Verificar endpoints
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
# Deben mostrar HTTP 200
```

### Monitorear Logs

```bash
# Ver logs en tiempo real
sudo tail -f /var/log/cloudflared.err.log

# Deberías ver menos errores de "timeout: no recent network activity"
```

---

## 📊 Comparación: QUIC vs HTTP/2

| Aspecto | QUIC (UDP) | HTTP/2 (TCP) |
|---------|------------|--------------|
| **Compatibilidad router** | ❌ Puede ser bloqueado | ✅ Mejor compatible |
| **NAT** | ❌ Más difícil mantener | ✅ Más estable |
| **Firewall** | ❌ Puede bloquear UDP | ✅ Raramente bloquea TCP |
| **Keepalive** | ⚠️ Menos robusto | ✅ Más robusto |
| **Velocidad** | ✅ Más rápido | ⚠️ Ligeramente más lento |
| **Estabilidad** | ❌ Menos estable | ✅ Más estable |

**Para tu caso (problemas de router):** HTTP/2 es la mejor opción.

---

## ⚠️ Si el Problema Persiste

### 1. Verificar Configuración del Router

**Configuraciones a revisar:**
- **NAT timeout:** Aumentar timeout de NAT (si es posible)
- **Firewall:** Verificar que no bloquea conexiones salientes
- **UPnP:** Activar UPnP puede ayudar (aunque no es necesario para Cloudflare Tunnel)

### 2. Verificar Firewall de macOS

```bash
# Verificar estado del firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Si está activo, verificar reglas
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --listapps
```

### 3. Probar desde Otra Red

Si funciona desde otra red (otro router), confirma que el problema es del router.

### 4. Contactar al Proveedor de Internet

Si el problema persiste, puede ser:
- **ISP bloqueando UDP:** Algunos ISPs bloquean UDP saliente
- **Router defectuoso:** El router puede tener problemas con NAT
- **Configuración del router:** Puede necesitar ajustes específicos

---

## 🔗 Referencias

- [Cloudflare Tunnel Protocol Options](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/configuration/configuration-file/)
- [QUIC vs HTTP/2](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/configuration/configuration-file/#protocol)
- [Solución de Problemas - Cloudflare Tunnel](./CLOUDFLARE_TUNNEL_TROUBLESHOOTING.md)

---

## ✅ Resumen

**Problema:** Router/firewall está cerrando conexiones UDP (QUIC), causando desconexiones constantes.

**Causa:** QUIC usa UDP que es más difícil de mantener abierto a través de routers con NAT agresivo.

**Solución:** Cambiar a HTTP/2 (TCP) que es más compatible con routers y firewalls.

**Resultado:** Conexiones más estables, menos desconexiones, mejor compatibilidad con routers.

---

**Última actualización:** 2025-12-23  
**Estado:** ✅ **SOLUCIÓN DISPONIBLE** - Ejecutar `sudo ./scripts/fix-router-firewall-issues.sh`


