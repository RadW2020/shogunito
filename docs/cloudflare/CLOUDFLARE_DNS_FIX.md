# Solución: Problema de DNS con Cloudflare Tunnel

**Problema identificado:** Los registros DNS están configurados como **A records** (IPs directas) en lugar de **CNAME** apuntando al túnel.

**Fecha:** 2025-12-07

---

## 🔍 Diagnóstico

### Problema Actual

```bash
$ dig shogunapi.uliber.com +short
188.114.96.5
188.114.97.5
```

**Esto está MAL.** Los registros están como **A records** apuntando directamente a las IPs de Cloudflare.

### Lo que Debería Ser

Los registros DNS deben ser **CNAME** apuntando al túnel:

```
shogunapi.uliber.com → 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com
```

---

## ✅ Solución

### Paso 1: Eliminar los A Records en Cloudflare Dashboard

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Selecciona tu dominio (`uliber.com`)
3. Ve a **DNS** → **Records**
4. Busca y **ELIMINA** estos registros A:
   - `shogunapi.uliber.com` → `188.114.96.5` (A record)
   - `shogunweb.uliber.com` → `188.114.96.5` (A record)
   - `shogunminio.uliber.com` → `188.114.96.5` (A record)

**⚠️ IMPORTANTE:** Elimina TODOS los A records de estos subdominios.

### Paso 2: Crear los CNAME Correctos

Ejecuta estos comandos para crear los CNAME apuntando al túnel:

```bash
# Crear CNAME para API
cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com

# Crear CNAME para Web
cloudflared tunnel route dns shogun-tunnel shogunweb.uliber.com

# Crear CNAME para MinIO
cloudflared tunnel route dns shogun-tunnel shogunminio.uliber.com
```

**Salida esperada:**

```
2025-12-07 INFO: Added CNAME shogunapi.uliber.com which will route to this tunnel
2025-12-07 INFO: Added CNAME shogunweb.uliber.com which will route to this tunnel
2025-12-07 INFO: Added CNAME shogunminio.uliber.com which will route to this tunnel
```

### Paso 3: Verificar en Cloudflare Dashboard

1. Ve a Cloudflare Dashboard → DNS → Records
2. Debes ver estos CNAME:
   - `shogunapi.uliber.com` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com` (CNAME)
   - `shogunweb.uliber.com` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com` (CNAME)
   - `shogunminio.uliber.com` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com` (CNAME)

### Paso 4: Esperar Propagación DNS

Espera 2-5 minutos para que los cambios DNS se propaguen.

### Paso 5: Verificar DNS

```bash
# Verificar que ahora son CNAME
dig shogunapi.uliber.com CNAME +short

# Debe mostrar:
# 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com
```

### Paso 6: Verificar Accesibilidad

Después de esperar 5 minutos:

```bash
# Verificar desde el servidor (puede seguir dando timeout, es normal)
curl -I https://shogunapi.uliber.com/api/v1/health

# IMPORTANTE: Prueba desde otro dispositivo/red
# Desde tu móvil o otro ordenador:
# https://shogunweb.uliber.com
```

---

## 🔍 Verificación Completa

### Comandos de Verificación

```bash
# 1. Verificar que los CNAME existen
dig shogunapi.uliber.com CNAME +short
dig shogunweb.uliber.com CNAME +short
dig shogunminio.uliber.com CNAME +short

# 2. Verificar que el túnel está conectado
cloudflared tunnel info shogun-tunnel

# 3. Verificar servicios locales
curl http://localhost:3002/api/v1/health
curl http://localhost:3003

# 4. Verificar accesibilidad (desde otro dispositivo)
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
```

### Resultado Esperado

- ✅ DNS muestra CNAME apuntando a `*.cfargotunnel.com`
- ✅ Túnel tiene conexiones activas (CONNECTOR ID presente)
- ✅ Servicios locales responden
- ✅ Endpoints accesibles desde internet (verificar desde otro dispositivo)

---

## ⚠️ Notas Importantes

1. **NO uses A records para túneles de Cloudflare**
   - Los túneles requieren CNAME apuntando a `[tunnel-id].cfargotunnel.com`
   - Los A records no funcionan con túneles

2. **Propagación DNS**
   - Los cambios DNS pueden tardar 2-5 minutos en propagarse
   - Usa `dig` con diferentes servidores DNS para verificar

3. **Timeout desde el servidor**
   - Si `curl` desde el servidor da timeout, es normal
   - Prueba desde otro dispositivo para confirmar que funciona

4. **SSL/TLS debe estar en "Flexible"**
   - Verifica que en Cloudflare Dashboard → SSL/TLS → Overview esté en "Flexible"

---

## 🐛 Si Aún No Funciona

Si después de estos pasos aún no funciona:

1. **Verifica que los CNAME están correctos:**

   ```bash
   dig shogunapi.uliber.com CNAME +short
   # Debe mostrar: 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com
   ```

2. **Verifica que no hay A records conflictivos:**

   ```bash
   dig shogunapi.uliber.com A +short
   # No debe mostrar IPs, solo el CNAME debe existir
   ```

3. **Limpia y reinicia el túnel:**

   ```bash
   cloudflared tunnel cleanup shogun-tunnel
   sudo launchctl kickstart system/com.cloudflare.cloudflared
   sleep 30
   cloudflared tunnel info shogun-tunnel
   ```

4. **Verifica los logs del túnel:**
   ```bash
   sudo tail -f /var/log/cloudflared.out.log
   sudo tail -f /var/log/cloudflared.err.log
   ```

---

## 📝 Resumen de Comandos

```bash
# 1. Eliminar A records en Cloudflare Dashboard (manual)

# 2. Crear CNAME correctos
cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunweb.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunminio.uliber.com

# 3. Esperar 5 minutos

# 4. Verificar
dig shogunapi.uliber.com CNAME +short
cloudflared tunnel info shogun-tunnel

# 5. Probar desde otro dispositivo
# https://shogunweb.uliber.com
```

---

---

## ✅ Estado Final (2025-12-08)

**Pruebas de conectividad confirmadas:**

```bash
# DNS funcionando correctamente
✅ shogunweb.uliber.com → Resuelve a IPs de Cloudflare
✅ shogunapi.uliber.com → Resuelve a IPs de Cloudflare
✅ shogunminio.uliber.com → Resuelve a IPs de Cloudflare

# Endpoints funcionando
✅ shogunweb.uliber.com → HTTP 200, SSL válido
✅ shogunapi.uliber.com → HTTP 200, SSL válido
✅ shogunminio.uliber.com → HTTP 403 (esperado), SSL válido
```

**✅ Problema resuelto:**

- ✅ CNAME configurados correctamente
- ✅ DNS funcionando perfectamente
- ✅ Túnel conectado y funcionando
- ✅ Todos los endpoints accesibles
- ✅ Certificados SSL válidos

**Última actualización:** 2025-12-08  
**Estado:** ✅ **RESUELTO** - DNS funcionando correctamente
