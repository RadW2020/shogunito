# Solución: "Not Secure" con HTTPS Tachado

**Problema:** El navegador muestra "Not Secure" con HTTPS tachado  
**Fecha:** 2025-12-07

---

## 🔴 Problema

El navegador muestra "Not Secure" con HTTPS tachado, lo que indica un problema con el certificado SSL/TLS.

**Posibles causas:**

1. **Modo SSL/TLS incorrecto** en Cloudflare Dashboard
2. **Certificado no válido** o no emitido correctamente
3. **Problema con la validación del certificado**
4. **Configuración incorrecta de Edge Certificates**

---

## ✅ Soluciones

### Solución 1: Verificar y Corregir Modo SSL/TLS (CRÍTICO)

El modo SSL/TLS debe estar correctamente configurado:

1. **Ve a:** https://dash.cloudflare.com
2. **Selecciona:** `uliber.com`
3. **Ve a:** **SSL/TLS** → **Overview**
4. **Verifica el modo actual:**
   - **Para túneles:** Debe estar en **"Flexible"** o **"Full"**
   - **NO debe estar en:** "Off" o "Full (strict)" sin certificado válido

5. **Si está en "Off":**
   - Cámbialo a **"Flexible"**
   - Guarda y espera 2-3 minutos

6. **Si está en "Full (strict)":**
   - Los túneles no usan certificados tradicionales
   - Cámbialo a **"Flexible"** o **"Full"**
   - Guarda y espera 2-3 minutos

### Solución 2: Verificar Edge Certificates

Asegúrate de que los certificados están correctamente emitidos:

1. **Ve a:** Cloudflare Dashboard → `uliber.com` → **SSL/TLS** → **Edge Certificates**
2. **Verifica:**
   - **"Always Use HTTPS"** está **activado** ✅
   - **"Automatic HTTPS Rewrites"** está **activado** ✅
   - Los certificados están **"Active"** ✅
   - **"Minimum TLS Version"** está en **TLS 1.2** o superior

3. **Si los certificados no están activos:**
   - Espera 5-10 minutos para que Cloudflare los emita
   - O fuerza la emisión desde el dashboard

### Solución 3: Verificar que el Dominio Está Proxied

Los certificados SSL solo funcionan si el dominio está "Proxied" (naranja):

1. **Ve a:** Cloudflare Dashboard → `uliber.com` → **DNS** → **Records**
2. **Verifica los CNAME:**
   - `shogunapi.uliber.com` → Debe tener el **icono naranja** (Proxied) ☁️
   - `shogunweb.uliber.com` → Debe tener el **icono naranja** (Proxied) ☁️
   - `shogunminio.uliber.com` → Debe tener el **icono naranja** (Proxied) ☁️

3. **Si están en gris (DNS only):**
   - Click en cada registro
   - Cambia "Proxy status" a **"Proxied"** (naranja)
   - Guarda y espera 2-3 minutos

### Solución 4: Forzar Emisión de Certificado

Si el certificado no se ha emitido:

1. **Ve a:** Cloudflare Dashboard → `uliber.com` → **SSL/TLS** → **Edge Certificates**
2. **Scroll hasta:** "Certificate Transparency Monitoring"
3. **Busca:** "Re-key Certificate" o "Force Certificate"
4. **Click en:** "Re-key Certificate"
5. **Espera 5-10 minutos** para que se emita el nuevo certificado

### Solución 5: Limpiar Caché del Navegador

1. **Chrome/Edge:**
   - Ctrl+Shift+Delete (Windows) o Cmd+Shift+Delete (Mac)
   - Selecciona "Cached images and files" y "Cookies"
   - Limpia todo

2. **Prueba en modo incógnito/privado**

3. **Prueba en otro navegador**

---

## 🔍 Verificación

### Verificar Configuración Actual

```bash
# Verificar DNS (debe mostrar IPs de Cloudflare)
dig shogunweb.uliber.com +short
# Debe mostrar: 188.114.96.5 o similar (IPs de Cloudflare)

# Verificar CNAME
dig shogunweb.uliber.com CNAME +short
# Debe mostrar: 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com
```

### Verificar Certificado SSL (si es posible)

```bash
# Intentar verificar el certificado (puede dar timeout si hay bloqueo)
openssl s_client -connect shogunweb.uliber.com:443 -servername shogunweb.uliber.com 2>&1 | grep -E "(subject|issuer|Verify)"
```

---

## 📋 Checklist de Solución

- [ ] Modo SSL/TLS en "Flexible" o "Full" (NO "Off" ni "Full (strict)")
- [ ] "Always Use HTTPS" activado
- [ ] "Automatic HTTPS Rewrites" activado
- [ ] CNAME records están "Proxied" (naranja, no gris)
- [ ] Certificados Edge están "Active"
- [ ] Caché del navegador limpiada
- [ ] Probado en modo incógnito/privado
- [ ] Esperado 5-10 minutos después de cambios

---

## ⚠️ Nota sobre el Bloqueo en España

Si estás en España y ves el bloqueo legal, el "Not Secure" puede aparecer porque:

1. El navegador no puede validar el certificado debido al bloqueo
2. La conexión se interrumpe antes de completar el handshake SSL

**Solución:** Prueba desde fuera de España (VPN) para verificar si el certificado funciona correctamente.

---

## 🔗 Referencias

- [Cloudflare SSL/TLS Settings](https://dash.cloudflare.com)
- [Cloudflare Edge Certificates](https://dash.cloudflare.com)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

---

---

## ✅ Estado Actual (2025-12-08)

**Pruebas de conectividad realizadas:**

```bash
# shogunweb.uliber.com
HTTP Status: 200
SSL Verify: 0 (éxito)
Time: 0.35s
Certificado SSL válido: Verify return code: 0 (ok)

# shogunapi.uliber.com
HTTP Status: 200 (endpoint /api/v1/health)
SSL Verify: 0 (éxito)
Time: 0.26s

# shogunminio.uliber.com
HTTP Status: 403 (esperado para MinIO)
SSL Verify: 0 (éxito)

# DNS
shogunweb.uliber.com → 188.114.97.5, 188.114.96.5 (Cloudflare IPs)
shogunapi.uliber.com → 188.114.97.5, 188.114.96.5 (Cloudflare IPs)
```

**✅ Todo funciona correctamente:**

- ✅ Certificados SSL válidos y verificados
- ✅ HTTPS funcionando correctamente
- ✅ DNS resuelve a IPs de Cloudflare
- ✅ Todos los endpoints accesibles
- ✅ No se muestra "Not Secure" - problema resuelto

**Última actualización:** 2025-12-08  
**Estado:** ✅ **FUNCIONANDO CORRECTAMENTE** - Certificados SSL válidos, HTTPS operativo
