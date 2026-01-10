# Solución Completa: Cloudflare Tunnel No Accesible

**Problema identificado:** Los registros DNS estaban configurados como **A records** (IPs directas) en lugar de **CNAME** apuntando al túnel.

**Fecha:** 2025-12-07

---

## 🔍 Problema Raíz

Los túneles de Cloudflare **REQUIEREN** que los registros DNS sean **CNAME** apuntando a `[tunnel-id].cfargotunnel.com`.

**Estado anterior (INCORRECTO):**

```
shogunapi.uliber.com → 188.114.96.5 (A record) ❌
```

**Estado correcto:**

```
shogunapi.uliber.com → 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com (CNAME) ✅
```

---

## ✅ Solución Aplicada

### Paso 1: Crear CNAME Correctos

Se ejecutaron los siguientes comandos:

```bash
cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunweb.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunminio.uliber.com
```

### Paso 2: Eliminar A Records en Cloudflare Dashboard

**⚠️ IMPORTANTE:** Debes eliminar manualmente los A records en Cloudflare Dashboard:

1. Ve a https://dash.cloudflare.com
2. Selecciona tu dominio: `uliber.com`
3. Ve a **DNS** → **Records**
4. Busca y **ELIMINA** estos registros A:
   - `shogunapi.uliber.com` → `188.114.96.5` (A record)
   - `shogunweb.uliber.com` → `188.114.96.5` (A record)
   - `shogunminio.uliber.com` → `188.114.96.5` (A record)

**Razón:** Los A records tienen prioridad sobre los CNAME y causan conflictos.

### Paso 3: Esperar Propagación DNS

Espera 5-10 minutos para que los cambios DNS se propaguen completamente.

### Paso 4: Verificar

```bash
# Verificar que ahora son CNAME
dig shogunapi.uliber.com CNAME +short
# Debe mostrar: 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com

# Verificar que no hay A records
dig shogunapi.uliber.com A +short
# No debe mostrar IPs (o debe mostrar las IPs resueltas del CNAME)
```

---

## 🔍 Verificación Completa

### Checklist de Verificación

- [ ] **CNAME creados:** Los comandos `cloudflared tunnel route dns` se ejecutaron correctamente
- [ ] **A records eliminados:** Eliminaste los A records en Cloudflare Dashboard
- [ ] **DNS propagado:** `dig shogunapi.uliber.com CNAME +short` muestra el CNAME correcto
- [ ] **Túnel conectado:** `cloudflared tunnel info shogun-tunnel` muestra CONNECTOR ID
- [ ] **Servicios locales:** `curl http://localhost:3002` funciona
- [ ] **SSL/TLS Flexible:** Verificado en Cloudflare Dashboard
- [ ] **Accesibilidad:** Prueba desde otro dispositivo/red

### Comandos de Verificación

```bash
# 1. Verificar CNAME
dig shogunapi.uliber.com CNAME +short
dig shogunweb.uliber.com CNAME +short
dig shogunminio.uliber.com CNAME +short

# 2. Verificar túnel
cloudflared tunnel info shogun-tunnel

# 3. Verificar servicios locales
curl http://localhost:3002/api/v1/health
curl http://localhost:3003

# 4. Verificar accesibilidad (desde otro dispositivo)
curl -I https://shogunapi.uliber.com/api/v1/health
curl -I https://shogunweb.uliber.com
```

---

## ⚠️ Notas Importantes

### 1. Eliminar A Records es Crítico

Si no eliminas los A records en Cloudflare Dashboard, seguirán teniendo prioridad sobre los CNAME y el túnel no funcionará.

### 2. Propagación DNS

Los cambios DNS pueden tardar:

- **Mínimo:** 2-5 minutos
- **Normal:** 5-10 minutos
- **Máximo:** 24 horas (raro)

### 3. Timeout desde el Servidor

Si `curl` desde el servidor da timeout, **es normal**. Algunos servidores no pueden conectarse a sí mismos a través de Cloudflare.

**Para verificar que realmente funciona:**

- Prueba desde otro dispositivo/red
- Prueba desde tu móvil con datos
- Usa un servicio externo como https://downforeveryoneorjustme.com

### 4. SSL/TLS Debe Estar en "Flexible"

Verifica en Cloudflare Dashboard:

- SSL/TLS → Overview → Modo: **"Flexible"**

---

## 🐛 Solución de Problemas

### Si los CNAME no se crean

```bash
# Verificar que el túnel existe
cloudflared tunnel list

# Verificar autenticación
ls -la ~/.cloudflared/cert.pem

# Si no existe, autenticar
cloudflared tunnel login
```

### Si los CNAME se crean pero no funcionan

1. **Verifica que no hay A records conflictivos:**

   ```bash
   dig shogunapi.uliber.com A +short
   # Si muestra IPs, elimínalos en Cloudflare Dashboard
   ```

2. **Limpia y reinicia el túnel:**

   ```bash
   cloudflared tunnel cleanup shogun-tunnel
   sudo launchctl kickstart system/com.cloudflare.cloudflared
   sleep 30
   cloudflared tunnel info shogun-tunnel
   ```

3. **Verifica los logs:**
   ```bash
   sudo tail -f /var/log/cloudflared.out.log
   sudo tail -f /var/log/cloudflared.err.log
   ```

### Si aún no funciona después de 10 minutos

1. Verifica que los CNAME están correctos en Cloudflare Dashboard
2. Verifica que SSL/TLS está en modo "Flexible"
3. Prueba desde otro dispositivo/red (no desde el servidor)
4. Contacta con el soporte de Cloudflare si persiste

---

## 📝 Resumen de Comandos

```bash
# 1. Crear CNAME (ya ejecutado)
cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunweb.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunminio.uliber.com

# 2. Eliminar A records en Cloudflare Dashboard (MANUAL)

# 3. Esperar 5-10 minutos

# 4. Verificar
dig shogunapi.uliber.com CNAME +short
cloudflared tunnel info shogun-tunnel

# 5. Probar desde otro dispositivo
# https://shogunweb.uliber.com
```

---

## 🔗 Referencias

- [Corrección de DNS](./CLOUDFLARE_DNS_FIX.md)
- [Guía Completa de Cloudflare Tunnel](./deployment/CLOUDFLARE_TUNNEL.md)
- [Revisión de Accesibilidad](./CLOUDFLARE_ACCESSIBILITY_REVIEW.md)

---

---

## ✅ Estado Final (2025-12-08)

**Pruebas de conectividad confirmadas:**

```bash
# Todos los endpoints funcionando
✅ shogunweb.uliber.com → HTTP 200, SSL válido
✅ shogunapi.uliber.com → HTTP 200, SSL válido
✅ shogunminio.uliber.com → HTTP 403 (esperado), SSL válido

# DNS
✅ CNAME configurados correctamente
✅ Resuelve a IPs de Cloudflare
```

**✅ Solución completada:**

- ✅ CNAME creados correctamente
- ✅ DNS funcionando
- ✅ Túnel conectado
- ✅ Todos los endpoints accesibles
- ✅ Certificados SSL válidos

**Última actualización:** 2025-12-08  
**Estado:** ✅ **RESUELTO** - Todo funcionando correctamente
