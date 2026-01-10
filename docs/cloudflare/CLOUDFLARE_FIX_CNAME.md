# CNAME No Visible en DNS - Comportamiento Normal

**Estado:** Los CNAME no se muestran con `dig` aunque están configurados correctamente  
**Causa:** Comportamiento normal de Cloudflare cuando los registros están "Proxied"  
**Conclusión:** ✅ NO ES UN PROBLEMA - Es el comportamiento esperado  
**Fecha:** 2025-12-08

---

## 🔍 Diagnóstico

### Estado Actual

```bash
# Los CNAME están configurados en cloudflared
$ cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com
✅ shogunapi.uliber.com is already configured to route to your tunnel

# No se muestran con dig (COMPORTAMIENTO NORMAL)
$ dig shogunapi.uliber.com CNAME +short
(no output - vacío)

# DNS resuelve a IPs de Cloudflare (CORRECTO)
$ dig shogunapi.uliber.com A +short
188.114.97.5
188.114.96.5

# Los endpoints funcionan correctamente
$ curl -I https://shogunapi.uliber.com/api/v1/health
HTTP/2 200 ✅
```

**✅ Conclusión:** Esto es el **comportamiento normal y esperado** cuando los registros están "Proxied" en Cloudflare. No es un problema.

---

## ✅ ¿Por qué no se muestran los CNAME?

### Comportamiento de Cloudflare con "Proxied"

Cuando un registro DNS está configurado como **"Proxied"** (naranja ☁️) en Cloudflare:

1. **Cloudflare resuelve el CNAME internamente**
   - El CNAME existe y está configurado correctamente
   - Pero Cloudflare lo resuelve internamente antes de responder

2. **Cloudflare devuelve directamente las IPs**
   - En lugar de devolver el CNAME, Cloudflare devuelve sus propias IPs
   - Esto es para optimizar el rendimiento y seguridad

3. **Resultado en `dig`:**
   - `dig CNAME` no muestra nada (normal)
   - `dig A` muestra las IPs de Cloudflare (correcto)
   - Los endpoints funcionan perfectamente (correcto)

### Verificación de que los CNAME están correctos

Puedes verificar que los CNAME están configurados correctamente en Cloudflare Dashboard:

1. Ve a: https://dash.cloudflare.com
2. Selecciona: `uliber.com`
3. Ve a: **DNS** → **Records**
4. Verifica que existen estos CNAME:
   - `shogunapi` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com` (Proxied ☁️)
   - `shogunweb` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com` (Proxied ☁️)
   - `shogunminio` → `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com` (Proxied ☁️)

**Si ves estos CNAME en Cloudflare Dashboard y están "Proxied", todo está correcto.**

---

## ✅ Verificación (No se requiere acción)

### Comandos de Verificación

```bash
# 1. Verificar que los endpoints funcionan (lo importante)
curl -I https://shogunapi.uliber.com/api/v1/health
# Debe mostrar: HTTP/2 200 ✅

curl -I https://shogunweb.uliber.com
# Debe mostrar: HTTP/2 200 ✅

# 2. Verificar DNS (resuelve a IPs de Cloudflare)
dig shogunapi.uliber.com A +short
# Debe mostrar: 188.114.x.x (IPs de Cloudflare) ✅

# 3. Verificar CNAME (no se mostrará - esto es normal)
dig shogunapi.uliber.com CNAME +short
# No muestra nada - esto es NORMAL cuando está Proxied ✅
```

### Resultado Esperado

**Todo está correcto si:**

- ✅ Los endpoints funcionan (HTTP 200)
- ✅ DNS resuelve a IPs de Cloudflare
- ✅ Los CNAME están configurados en Cloudflare Dashboard como "Proxied"
- ✅ `dig CNAME` no muestra nada (esto es normal)

---

## ⚠️ Nota Importante

**NO necesitas hacer nada.** El hecho de que `dig CNAME` no muestre el CNAME es completamente normal cuando los registros están "Proxied" en Cloudflare. Esto no afecta la funcionalidad en absoluto.

---

## 🔍 Si Realmente Necesitas Ver el CNAME

Si por alguna razón necesitas ver el CNAME explícitamente (por ejemplo, para debugging), puedes:

### Opción 1: Consultar directamente a Cloudflare

```bash
# Consultar directamente a los nameservers de Cloudflare
dig @alla.ns.cloudflare.com shogunapi.uliber.com CNAME +short
```

### Opción 2: Cambiar temporalmente a "DNS only"

**⚠️ NO RECOMENDADO:** Solo para debugging. Cambiar a "DNS only" eliminará la protección de Cloudflare.

1. En Cloudflare Dashboard, cambia el registro de "Proxied" a "DNS only"
2. Espera 2-3 minutos
3. Ejecuta: `dig shogunapi.uliber.com CNAME +short`
4. **IMPORTANTE:** Vuelve a cambiar a "Proxied" después

---

## 📋 Resumen

| Aspecto                   | Estado | Notas                                          |
| ------------------------- | ------ | ---------------------------------------------- |
| CNAME configurados        | ✅     | Configurados en Cloudflare Dashboard           |
| Registros "Proxied"       | ✅     | Todos están "Proxied" (naranja ☁️)             |
| DNS funciona              | ✅     | Resuelve a IPs de Cloudflare                   |
| Endpoints funcionan       | ✅     | HTTP 200 en todos los endpoints                |
| `dig CNAME` muestra CNAME | ❌     | **Normal** - No se muestra cuando está Proxied |
| ¿Es un problema?          | ❌     | **NO** - Es el comportamiento esperado         |

---

## ✅ Conclusión

**No hay problema que resolver.** El hecho de que `dig CNAME` no muestre el CNAME es el comportamiento normal y esperado cuando los registros están "Proxied" en Cloudflare. Todo funciona correctamente.

---

## 🔗 Referencias

- [Cloudflare DNS - Proxied Records](https://developers.cloudflare.com/dns/manage-dns-records/reference/proxied-dns-records/)
- [Cloudflare Dashboard - DNS Records](https://dash.cloudflare.com)

---

**Última actualización:** 2025-12-08  
**Estado:** ✅ **NO ES UN PROBLEMA** - Comportamiento normal de Cloudflare con registros Proxied

### Paso 1: Verificar CNAME Configurados

Los CNAME ya están configurados correctamente en cloudflared:

```bash
# Verificar que los CNAME están configurados
cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunweb.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunminio.uliber.com
```

**Salida esperada:**

```
✅ shogunapi.uliber.com is already configured to route to your tunnel
✅ shogunweb.uliber.com is already configured to route to your tunnel
✅ shogunminio.uliber.com is already configured to route to your tunnel
```

### Paso 2: Eliminar A Records en Cloudflare Dashboard

**⚠️ IMPORTANTE:** Debes eliminar manualmente los A records en Cloudflare Dashboard:

1. **Ve a:** https://dash.cloudflare.com
2. **Selecciona:** `uliber.com`
3. **Ve a:** **DNS** → **Records**
4. **Busca y ELIMINA estos registros A:**
   - `shogunapi.uliber.com` → `188.114.96.5` o `188.114.97.5` (A record)
   - `shogunweb.uliber.com` → `188.114.96.5` o `188.114.97.5` (A record)
   - `shogunminio.uliber.com` → `188.114.96.5` o `188.114.97.5` (A record)

**¿Cómo identificar los A records?**

- Busca registros de tipo **A** (no CNAME)
- Que apunten a IPs de Cloudflare (188.114.x.x)
- Para los subdominios: `shogunapi`, `shogunweb`, `shogunminio`

**⚠️ NO elimines los CNAME:**

- Los CNAME deben apuntar a: `5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com`
- Estos deben mantenerse

### Paso 3: Verificar que Solo Existen CNAME

Después de eliminar los A records, en Cloudflare Dashboard deberías ver solo:

```
shogunapi.uliber.com    CNAME    5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com    Proxied
shogunweb.uliber.com    CNAME    5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com    Proxied
shogunminio.uliber.com  CNAME    5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com    Proxied
```

**NO debe haber registros A para estos subdominios.**

### Paso 4: Esperar Propagación DNS

Después de eliminar los A records:

- Espera **2-5 minutos** para que los cambios se propaguen
- Los cambios en Cloudflare suelen ser rápidos (1-2 minutos)

### Paso 5: Verificar CNAME

Después de esperar, verifica que los CNAME ahora se muestran:

```bash
# Verificar CNAME
dig shogunapi.uliber.com CNAME +short
# Debe mostrar: 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com

dig shogunweb.uliber.com CNAME +short
# Debe mostrar: 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com

dig shogunminio.uliber.com CNAME +short
# Debe mostrar: 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com
```

**Si aún no se muestran:**

- Espera unos minutos más (propagación DNS puede tardar hasta 10 minutos)
- Prueba con diferentes servidores DNS:
  ```bash
  dig @1.1.1.1 shogunapi.uliber.com CNAME +short
  dig @8.8.8.8 shogunapi.uliber.com CNAME +short
  ```

---

## 🔍 Verificación Completa

### Comandos de Verificación

```bash
# 1. Verificar CNAME (debe mostrar el túnel)
dig shogunapi.uliber.com CNAME +short
dig shogunweb.uliber.com CNAME +short
dig shogunminio.uliber.com CNAME +short

# 2. Verificar que NO hay A records directos
dig shogunapi.uliber.com A +short
# Debe mostrar IPs resueltas del CNAME (no IPs directas)

# 3. Verificar que los endpoints siguen funcionando
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
curl -I https://shogunminio.uliber.com
```

### Resultado Esperado

**Antes (con A records):**

```bash
$ dig shogunapi.uliber.com CNAME +short
(no output)

$ dig shogunapi.uliber.com A +short
188.114.97.5
188.114.96.5
```

**Después (solo CNAME):**

```bash
$ dig shogunapi.uliber.com CNAME +short
5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com

$ dig shogunapi.uliber.com A +short
188.114.97.5
188.114.96.5
# (IPs resueltas del CNAME, no directas)
```

---

## ⚠️ Notas Importantes

### 1. ¿Por qué es importante tener CNAME en lugar de A records?

- **CNAME:** Apunta al túnel de Cloudflare, permite que Cloudflare gestione el enrutamiento
- **A records:** Apuntan directamente a IPs, no funcionan correctamente con túneles

### 2. ¿Afecta esto la funcionalidad?

**No inmediatamente:** El DNS funciona (resuelve a IPs de Cloudflare), pero:

- Los CNAME son la configuración correcta para túneles
- Los A records pueden causar problemas en el futuro
- Es mejor práctica usar CNAME

### 3. ¿Qué pasa si no elimino los A records?

- El DNS seguirá funcionando
- Pero los CNAME no se mostrarán
- Puede haber problemas de enrutamiento en el futuro
- No es la configuración recomendada para túneles

---

## 📋 Checklist

- [ ] Verificado que los CNAME están configurados en cloudflared
- [ ] Accedido a Cloudflare Dashboard → DNS → Records
- [ ] Identificados los A records para shogunapi, shogunweb, shogunminio
- [ ] Eliminados los A records (NO los CNAME)
- [ ] Verificado que solo existen CNAME para estos subdominios
- [ ] Esperado 2-5 minutos para propagación DNS
- [ ] Verificado que los CNAME ahora se muestran con `dig`
- [ ] Verificado que los endpoints siguen funcionando

---

## 🐛 Solución de Problemas

### Si los CNAME aún no se muestran después de 10 minutos

1. **Verifica en Cloudflare Dashboard:**
   - Asegúrate de que los A records fueron eliminados
   - Verifica que los CNAME existen y están "Proxied"

2. **Limpia la caché DNS local:**

   ```bash
   # macOS
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   ```

3. **Prueba con diferentes servidores DNS:**
   ```bash
   dig @1.1.1.1 shogunapi.uliber.com CNAME +short
   dig @8.8.8.8 shogunapi.uliber.com CNAME +short
   ```

### Si los endpoints dejan de funcionar

1. **Verifica que los CNAME están correctos:**

   ```bash
   cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com
   ```

2. **Verifica que el túnel está conectado:**

   ```bash
   cloudflared tunnel info shogun-tunnel
   ```

3. **Reinicia el túnel:**
   ```bash
   sudo launchctl kickstart system/com.cloudflare.cloudflared
   ```

---

## 🔗 Referencias

- [Cloudflare Dashboard - DNS Records](https://dash.cloudflare.com)
- [Cloudflare Tunnel DNS Configuration](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/configuration/local-management/ingress/)
- [Documentación de CNAME vs A Records](https://developers.cloudflare.com/dns/manage-dns-records/reference/cname-record/)

---

**Última actualización:** 2025-12-08  
**Estado:** ⚠️ Requiere eliminar A records en Cloudflare Dashboard manualmente
