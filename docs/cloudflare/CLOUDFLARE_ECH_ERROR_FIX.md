# Solución: ERR_ECH_FALLBACK_CERTIFICATE_INVALID

**Error:** `ERR_ECH_FALLBACK_CERTIFICATE_INVALID` al acceder a los endpoints  
**Fecha:** 2025-12-07

---

## 🔴 Problema

El navegador muestra `ERR_ECH_FALLBACK_CERTIFICATE_INVALID` al intentar acceder a:

- `https://shogunapi.uliber.com`
- `https://shogunweb.uliber.com`

Este error está relacionado con:

- **ECH (Encrypted Client Hello)** - una característica de privacidad de Cloudflare
- **Certificados SSL/TLS** - problemas con la validación de certificados
- **Modo SSL/TLS** - configuración incorrecta

---

## ✅ Soluciones (En Orden de Prioridad)

### Solución 1: Deshabilitar ECH en Cloudflare (Recomendado)

ECH puede causar problemas con túneles. Deshabilítalo:

1. **Ve a:** https://dash.cloudflare.com
2. **Selecciona:** `uliber.com`
3. **Ve a:** **SSL/TLS** → **Edge Certificates**
4. **Busca:** "Encrypted Client Hello (ECH)" o "TLS 1.3"
5. **Desactiva ECH** si está habilitado
6. **Guarda** los cambios
7. **Espera 2-3 minutos**

### Solución 2: Cambiar Modo SSL/TLS a "Full"

El modo "Flexible" puede causar problemas con certificados:

1. **Ve a:** Cloudflare Dashboard → `uliber.com` → **SSL/TLS** → **Overview**
2. **Cambia el modo a:** **"Full"** (en lugar de "Flexible")
3. **Guarda** los cambios
4. **Espera 2-3 minutos**

**⚠️ NOTA:** Con "Full", Cloudflare intentará validar el certificado en el origen. Como el túnel no usa certificados tradicionales, esto puede causar problemas. Si "Full" no funciona, prueba "Full (strict)" o vuelve a "Flexible".

### Solución 3: Verificar Edge Certificates

Asegúrate de que los certificados están correctamente emitidos:

1. **Ve a:** Cloudflare Dashboard → `uliber.com` → **SSL/TLS** → **Edge Certificates**
2. **Verifica:**
   - "Always Use HTTPS" está activado
   - "Automatic HTTPS Rewrites" está activado
   - Los certificados están "Active"

### Solución 4: Deshabilitar HTTP/3 (Si está habilitado)

HTTP/3 puede causar conflictos:

1. **Ve a:** Cloudflare Dashboard → `uliber.com` → **Network** → **Protocols**
2. **Desactiva:** "HTTP/3 (with QUIC)"
3. **Guarda** y espera 2-3 minutos

### Solución 5: Reiniciar el Túnel

Después de hacer cambios, reinicia el túnel:

```bash
sudo launchctl kickstart system/com.cloudflare.cloudflared
sleep 30
cloudflared tunnel info shogun-tunnel
```

### Solución 6: Limpiar Caché del Navegador

1. **Chrome/Edge:**
   - Ctrl+Shift+Delete (Windows) o Cmd+Shift+Delete (Mac)
   - Selecciona "Cached images and files" y "Cookies"
   - Limpia todo

2. **Prueba en modo incógnito/privado**

---

## 🔍 Diagnóstico

### Verificar Estado del Túnel

```bash
cloudflared tunnel info shogun-tunnel
```

Debe mostrar:

- ✅ CONNECTOR ID presente
- ✅ Conexiones activas

### Verificar Servicios Locales

```bash
curl http://localhost:3002/api/v1/health
curl http://localhost:3003
```

Deben responder con HTTP 200.

### Verificar DNS

```bash
dig shogunapi.uliber.com CNAME +short
# Debe mostrar: 5adc17fe-7cf4-468e-8bef-a3264ec7e67f.cfargotunnel.com
```

---

## 📋 Checklist de Solución

- [ ] ECH deshabilitado en Cloudflare Dashboard
- [ ] Modo SSL/TLS cambiado a "Full"
- [ ] HTTP/3 deshabilitado (si estaba habilitado)
- [ ] Edge Certificates verificados
- [ ] Túnel reiniciado después de cambios
- [ ] Caché del navegador limpiada
- [ ] Probado en modo incógnito/privado
- [ ] Esperado 2-3 minutos después de cambios

---

## 🐛 Si Aún No Funciona

### Verificar Logs del Túnel

```bash
sudo tail -f /var/log/cloudflared.out.log
sudo tail -f /var/log/cloudflared.err.log
```

Busca errores relacionados con:

- SSL/TLS
- Certificates
- ECH
- Connection errors

### Probar con curl desde el Servidor

```bash
# Probar con diferentes opciones SSL
curl -v --tlsv1.2 https://shogunapi.uliber.com/api/v1/health
curl -v --tlsv1.3 https://shogunapi.uliber.com/api/v1/health
curl -v -k https://shogunapi.uliber.com/api/v1/health  # Ignora certificados
```

### Configuración Recomendada para Túneles

Para túneles de Cloudflare, la configuración recomendada es:

- **SSL/TLS Mode:** "Flexible" (pero prueba "Full" si Flexible no funciona)
- **HTTP/3:** Deshabilitado
- **ECH:** Deshabilitado
- **Always Use HTTPS:** Activado
- **Automatic HTTPS Rewrites:** Activado

---

## 🔗 Referencias

- [Cloudflare Dashboard - SSL/TLS Settings](https://dash.cloudflare.com)
- [Cloudflare ECH Documentation](https://developers.cloudflare.com/ssl/encrypted-sni/)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

---

---

## ✅ Estado Final (2025-12-08)

**Pruebas de conectividad confirmadas:**

```bash
# Todos los endpoints funcionando sin errores ECH
✅ shogunweb.uliber.com → HTTP 200, SSL válido
✅ shogunapi.uliber.com → HTTP 200, SSL válido
✅ shogunminio.uliber.com → HTTP 403 (esperado), SSL válido

# Certificado SSL
✅ Verify return code: 0 (ok)
✅ Certificado válido emitido por Google Trust Services
✅ No hay errores ECH
```

**✅ Problema resuelto:**

- ✅ No hay errores ERR_ECH_FALLBACK_CERTIFICATE_INVALID
- ✅ Certificados SSL válidos
- ✅ HTTPS funcionando correctamente
- ✅ Todos los endpoints accesibles
- ✅ Configuración SSL/TLS correcta

**Última actualización:** 2025-12-08  
**Estado:** ✅ **RESUELTO** - No hay errores ECH, todo funcionando correctamente
