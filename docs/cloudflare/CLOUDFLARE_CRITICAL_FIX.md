# Solución Crítica: Cloudflare Tunnel "Pending Forever"

**Problema:** El navegador se queda en "pending forever" al intentar acceder a los endpoints.

**Causa raíz identificada:** Los registros DNS NO están configurados como CNAME en Cloudflare Dashboard.

**Fecha:** 2025-12-07

---

## 🔴 Problema Crítico

El diagnóstico muestra que:

- ❌ **NO hay CNAME** en el DNS
- ❌ El DNS solo muestra IPs directas (188.114.96.5, 188.114.97.5)
- ✅ El túnel está conectado y funcionando
- ✅ Los servicios locales responden
- ❌ Pero Cloudflare no puede enrutar el tráfico porque no hay CNAME

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar en Cloudflare Dashboard

**CRÍTICO:** Ve a Cloudflare Dashboard y verifica manualmente:

1. **Ve a:** https://dash.cloudflare.com
2. **Selecciona:** `uliber.com`
3. **Ve a:** DNS → Records
4. **Busca estos subdominios:**
   - `shogunapi.uliber.com`
   - `shogunweb.uliber.com`
   - `shogunminio.uliber.com`

**¿Qué debes ver?**

✅ **CORRECTO:**

```
shogunapi.uliber.com    CNAME    5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com
```

❌ **INCORRECTO (elimina estos):**

```
shogunapi.uliber.com    A        188.114.96.5
shogunapi.uliber.com    AAAA     2a06:98c1:3121::5
```

### Paso 2: Si NO Existen los CNAME

Si no ves los CNAME en Cloudflare Dashboard, créalos manualmente:

1. **En Cloudflare Dashboard → DNS → Records:**
2. **Click en "Add record"**
3. **Configura:**
   - **Type:** CNAME
   - **Name:** `shogunapi` (sin .uliber.com)
   - **Target:** `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com`
   - **Proxy status:** 🟠 Proxied (naranja)
4. **Repite para:**
   - `shogunweb` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com`
   - `shogunminio` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com`

### Paso 3: Eliminar TODOS los A y AAAA Records

**IMPORTANTE:** Si existen A o AAAA records para estos subdominios, **ELIMÍNALOS TODOS**.

Los A/AAAA records tienen prioridad sobre los CNAME y bloquean el túnel.

### Paso 4: Verificar Configuración del Túnel en Zero Trust

**NUEVO:** Cloudflare ahora requiere que los túneles estén configurados en Zero Trust:

1. **Ve a:** https://one.dash.cloudflare.com
2. **Ve a:** Networks → Tunnels
3. **Busca:** `shogun-tunnel`
4. **Verifica:**
   - ✅ Túnel está **Active**
   - ✅ Estado muestra **Connected**
   - ✅ Hay **Routes** configuradas para:
     - `shogunapi.uliber.com`
     - `shogunweb.uliber.com`
     - `shogunminio.uliber.com`

**Si no hay Routes configuradas:**

1. Click en el túnel `shogun-tunnel`
2. Ve a la pestaña **"Public Hostnames"** o **"Routes"**
3. **Agrega rutas:**
   - **Subdomain:** `shogunapi`
   - **Domain:** `uliber.com`
   - **Service:** `http://localhost:3002`
   - **Path:** (dejar vacío)
4. **Repite para:** `shogunweb` y `shogunminio`

### Paso 5: Verificar SSL/TLS

1. **Ve a:** Cloudflare Dashboard → `uliber.com` → SSL/TLS → Overview
2. **Verifica que está en modo:** **"Flexible"**
3. **Si está en "Full" o "Full (strict)", cámbialo a "Flexible"**

**⚠️ NOTA:** Algunas fuentes recomiendan "Full" para túneles, pero la documentación oficial de Cloudflare Tunnel dice "Flexible". Si "Flexible" no funciona, prueba "Full".

### Paso 6: Esperar Propagación

Espera **10-15 minutos** después de hacer los cambios para que:

- Los cambios DNS se propaguen
- Cloudflare actualice su configuración
- El túnel se reconecte con la nueva configuración

### Paso 7: Reiniciar el Túnel

Después de esperar, reinicia el túnel:

```bash
sudo launchctl kickstart system/com.cloudflare.cloudflared
sleep 30
cloudflared tunnel info shogun-tunnel
```

---

## 🔍 Verificación Final

Después de todos los pasos, verifica:

```bash
# 1. Verificar CNAME (debe mostrar el túnel)
dig shogunapi.uliber.com CNAME +short
# Debe mostrar: 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com

# 2. Verificar que no hay A records
dig shogunapi.uliber.com A +short
# No debe mostrar IPs directas (o solo las resueltas del CNAME)

# 3. Verificar túnel
cloudflared tunnel info shogun-tunnel
# Debe mostrar CONNECTOR ID

# 4. Probar desde otro dispositivo/red
# https://shogunweb.uliber.com
```

---

## 🐛 Si Aún No Funciona

### Verificar Logs del Túnel

```bash
sudo tail -f /var/log/cloudflared.out.log
sudo tail -f /var/log/cloudflared.err.log
```

Busca errores relacionados con:

- DNS resolution
- Tunnel connection
- Route configuration

### Verificar en Zero Trust Dashboard

1. Ve a: https://one.dash.cloudflare.com → Networks → Tunnels
2. Click en `shogun-tunnel`
3. Verifica la pestaña **"Logs"** o **"Metrics"**
4. Busca errores o advertencias

### Probar Modo SSL/TLS "Full"

Si "Flexible" no funciona, prueba cambiar a "Full":

1. Cloudflare Dashboard → SSL/TLS → Overview
2. Cambia a **"Full"**
3. Espera 2 minutos
4. Prueba nuevamente

### Verificar Firewall

Asegúrate de que el firewall de macOS no esté bloqueando conexiones:

1. System Settings → Network → Firewall
2. Verifica que no esté bloqueando conexiones salientes
3. Si está activo, agrega una excepción para `cloudflared`

---

## 📋 Checklist Completo

- [ ] CNAME existen en Cloudflare Dashboard (DNS → Records)
- [ ] NO hay A records para los subdominios
- [ ] NO hay AAAA records para los subdominios
- [ ] Túnel configurado en Zero Trust (Networks → Tunnels)
- [ ] Routes configuradas en Zero Trust para cada subdominio
- [ ] SSL/TLS en modo "Flexible" (o "Full" si Flexible no funciona)
- [ ] Túnel reiniciado después de cambios
- [ ] Esperado 10-15 minutos para propagación
- [ ] Verificado CNAME con `dig`
- [ ] Probado desde otro dispositivo/red

---

## 🔗 Referencias

- [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com)
- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [Documentación de Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

---

---

## ✅ Estado Final (2025-12-08)

**Pruebas de conectividad confirmadas:**

```bash
# Todos los endpoints funcionando
✅ shogunweb.uliber.com → HTTP 200, SSL válido
✅ shogunapi.uliber.com → HTTP 200, SSL válido
✅ shogunminio.uliber.com → HTTP 403 (esperado), SSL válido

# Configuración verificada
✅ CNAME configurados correctamente
✅ Rutas configuradas en Zero Trust Dashboard
✅ SSL/TLS en modo Flexible
✅ Certificados SSL válidos
```

**✅ Problema resuelto:**

- ✅ CNAME configurados correctamente
- ✅ Rutas configuradas en Zero Trust Dashboard
- ✅ Túnel funcionando perfectamente
- ✅ Todos los endpoints accesibles
- ✅ No hay "pending forever" - problema resuelto

**Última actualización:** 2025-12-08  
**Estado:** ✅ **RESUELTO** - Todo funcionando correctamente
