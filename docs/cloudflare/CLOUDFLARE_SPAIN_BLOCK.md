# Bloqueo de IPs de Cloudflare en España

**Problema:** Bloqueo legal de IPs de Cloudflare por orden judicial española  
**Fecha:** 2025-12-07

---

## 🔴 Problema Identificado

El mensaje que estás viendo indica que:

> "El acceso a la presente dirección IP ha sido bloqueado en cumplimiento de lo dispuesto en la Sentencia de 18 de diciembre de 2024, dictada por el Juzgado de lo Mercantil nº 6 de Barcelona..."

**Esto NO es un problema técnico del túnel**, sino un **bloqueo legal** de ciertas IPs de Cloudflare en España debido a una orden judicial relacionada con LaLiga y prácticas ilegales.

---

## 🔍 Verificación

### ¿Desde dónde estás accediendo?

- **Si estás en España:** El bloqueo afecta a ciertas IPs de Cloudflare
- **Si estás fuera de España:** El problema puede ser diferente

### Verificar si el problema es solo desde España

1. **Prueba desde una VPN fuera de España:**
   - Conecta a un servidor VPN en otro país
   - Intenta acceder a `https://shogunweb.uliber.com`
   - Si funciona, confirma que es un bloqueo geográfico

2. **Prueba desde otro dispositivo/red fuera de España:**
   - Si tienes acceso a otro dispositivo fuera de España
   - Prueba desde ahí

---

## ✅ Soluciones Posibles

### Solución 1: Esperar a que Cloudflare Cambie las IPs

Cloudflare está trabajando para resolver este problema cambiando las IPs bloqueadas. Esto puede tardar días o semanas.

### Solución 2: Usar Cloudflare Workers o Pages

Si necesitas una solución inmediata, considera:

- **Cloudflare Workers:** Para APIs
- **Cloudflare Pages:** Para aplicaciones web estáticas

### Solución 3: Usar un Proxy Inverso Alternativo

Considera usar otros servicios de proxy/túnel:

- **Ngrok** (temporal)
- **Tailscale Funnel**
- **LocalTunnel**

### Solución 4: Configurar un Proxy Inverso Propio

Si tienes acceso a un servidor fuera de España:

- Configura un proxy inverso (nginx, Caddy)
- Expone el túnel a través de ese servidor

### Solución 5: Contactar con Cloudflare

Contacta con el soporte de Cloudflare explicando el problema:

- Menciona el bloqueo legal en España
- Pregunta sobre IPs alternativas
- Solicita asistencia para resolver el bloqueo

---

## 🔍 Verificación del Túnel

El túnel en sí está funcionando correctamente. Verifica:

```bash
# Verificar estado del túnel
cloudflared tunnel info shogun-tunnel

# Verificar servicios locales
curl http://localhost:3002/api/v1/health
curl http://localhost:3003
```

Si estos funcionan, el problema es solo el bloqueo de IPs en España.

---

## 📋 Estado Actual

- ✅ **Túnel:** Funcionando correctamente
- ✅ **Rutas:** Configuradas en Zero Trust Dashboard
- ✅ **Servicios locales:** Responden correctamente
- ❌ **Acceso desde España:** Bloqueado por orden judicial

---

## 🔗 Referencias

- [Nota informativa de LaLiga](https://www.laliga.com/noticias/nota-informativa-en-relacion-con-el-bloqueo-de-ips-durante-las-ultimas-jornadas-de-laliga-ea-sports-vinculadas-a-las-practicas-ilegales-de-cloudflare)
- [Cloudflare Status](https://www.cloudflarestatus.com/)
- [Cloudflare Support](https://support.cloudflare.com/)

---

## 💡 Recomendación

1. **Verifica si funciona desde fuera de España** (VPN u otro dispositivo)
2. **Si funciona desde fuera:** El problema es el bloqueo legal en España
3. **Contacta con Cloudflare** para obtener IPs alternativas o asistencia
4. **Considera alternativas temporales** si necesitas acceso inmediato

---

---

## ✅ Estado Técnico (2025-12-08)

**Pruebas de conectividad confirmadas:**

```bash
# Todos los endpoints funcionando técnicamente
✅ shogunweb.uliber.com → HTTP 200, SSL válido
✅ shogunapi.uliber.com → HTTP 200, SSL válido
✅ shogunminio.uliber.com → HTTP 403 (esperado), SSL válido

# Certificado SSL
✅ Verify return code: 0 (ok)
✅ Certificado válido emitido por Google Trust Services
```

**✅ Estado técnico:**

- ✅ Túnel funcionando perfectamente
- ✅ Certificados SSL válidos
- ✅ HTTPS funcionando correctamente
- ✅ Todos los endpoints técnicamente accesibles
- ✅ Configuración correcta

**Nota sobre el bloqueo en España:**

- El bloqueo legal de IPs de Cloudflare en España puede afectar el acceso desde ese país
- Sin embargo, técnicamente todo funciona correctamente
- El problema es geográfico/legal, no técnico

**Última actualización:** 2025-12-08  
**Estado:** ✅ **TÉCNICAMENTE FUNCIONANDO** - Bloqueo geográfico/legal en España (no técnico)
