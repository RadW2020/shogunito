# Cloudflare Tunnel - Guía Consolidada

**Última actualización:** 2025-12-08  
**Estado:** ✅ Funcionando correctamente

## 📋 Índice

1. [Estado Actual](#estado-actual)
2. [Configuración Inicial](#configuración-inicial)
3. [Solución de Problemas](#solución-de-problemas)
4. [Documentación de Referencia](#documentación-de-referencia)

---

## ✅ Estado Actual

### Servicio LaunchDaemon

- ✅ **LaunchDaemon cargado:** `com.cloudflare.cloudflared` (PID: 38567)
- ✅ **Proceso gestionado por launchd:** Corriendo como servicio del sistema
- ✅ **Túnel con conexiones activas:** CONNECTOR ID presente
- ✅ **Servicios locales responden:** API, Web y MinIO funcionando

### Configuración

- ✅ **SSL/TLS:** Modo "Flexible" (verificado)
- ✅ **DNS CNAME:** Configurados correctamente (verificado)
- ✅ **Configuración del túnel:** Correcta

### Endpoints Funcionando

```bash
✅ shogunweb.uliber.com → HTTP 200, SSL válido
✅ shogunapi.uliber.com → HTTP 200, SSL válido
✅ shogunminio.uliber.com → HTTP 403 (esperado), SSL válido
```

---

## 🚀 Configuración Inicial

### Requisitos Previos

1. Cuenta de Cloudflare con dominio configurado
2. `cloudflared` instalado en el servidor
3. Acceso SSH al servidor

### Pasos de Configuración

#### 1. Instalar cloudflared

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
# Descargar desde: https://github.com/cloudflare/cloudflared/releases
```

#### 2. Autenticar

```bash
cloudflared tunnel login
```

#### 3. Crear Túnel

```bash
cloudflared tunnel create shogun-tunnel
```

#### 4. Configurar Rutas DNS

```bash
cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunweb.uliber.com
cloudflared tunnel route dns shogun-tunnel shogunminio.uliber.com
```

#### 5. Configurar LaunchDaemon (macOS)

Ver: [Guía Completa de Cloudflare Tunnel](../deployment/CLOUDFLARE_TUNNEL.md)

---

## 🔧 Solución de Problemas

### Problema: Timeout desde el Servidor

**Síntoma:** `curl` desde el servidor da timeout (`código: 000000`)

**Causa:** Algunos servidores tienen restricciones de red que impiden conectarse a sí mismos a través de Cloudflare.

**Solución:** Esto es **NORMAL** y no afecta la funcionalidad real del túnel.

**Verificación:**
- Prueba desde otro dispositivo/red
- Prueba desde tu móvil con datos
- Usa un servicio externo como https://downforeveryoneorjustme.com

### Problema: DNS no Resuelve Correctamente

**Síntoma:** Los endpoints no son accesibles desde internet

**Causa:** Los registros DNS están configurados como **A records** en lugar de **CNAME**

**Solución:**

1. **Verificar CNAME:**
   ```bash
   dig shogunapi.uliber.com CNAME +short
   # Debe mostrar: [tunnel-id].cfargotunnel.com
   ```

2. **Crear CNAME si no existe:**
   ```bash
   cloudflared tunnel route dns shogun-tunnel shogunapi.uliber.com
   ```

3. **Eliminar A records en Cloudflare Dashboard:**
   - Ve a https://dash.cloudflare.com
   - Selecciona tu dominio
   - Ve a **DNS** → **Records**
   - **ELIMINA** los A records conflictivos

4. **Esperar propagación DNS (5-10 minutos)**

### Problema: SSL/TLS No Funciona

**Síntoma:** Errores de certificado SSL

**Solución:**

1. Verifica que SSL/TLS está en modo **"Flexible"** en Cloudflare Dashboard
2. Verifica que los CNAME están configurados correctamente
3. Espera 5-10 minutos para que los certificados se generen

### Problema: Túnel No Conecta

**Síntoma:** `cloudflared tunnel info shogun-tunnel` no muestra CONNECTOR ID

**Solución:**

1. **Verificar que el túnel existe:**
   ```bash
   cloudflared tunnel list
   ```

2. **Verificar autenticación:**
   ```bash
   ls -la ~/.cloudflared/cert.pem
   ```

3. **Reiniciar el servicio:**
   ```bash
   sudo launchctl kickstart system/com.cloudflare.cloudflared
   ```

4. **Verificar logs:**
   ```bash
   sudo tail -f /var/log/cloudflared.out.log
   sudo tail -f /var/log/cloudflared.err.log
   ```

### Problema: Servicios Locales No Responden

**Síntoma:** El túnel conecta pero los servicios no responden

**Solución:**

1. **Verificar que los servicios están corriendo:**
   ```bash
   curl http://localhost:3002/api/v1/health
   curl http://localhost:3003
   ```

2. **Verificar configuración del túnel:**
   - Asegúrate de que el archivo de configuración apunta a los puertos correctos
   - Verifica que los servicios están escuchando en las interfaces correctas

---

## 📚 Documentación de Referencia

### Guías Principales

- **[Guía Completa de Cloudflare Tunnel](../deployment/CLOUDFLARE_TUNNEL.md)** - Configuración completa paso a paso
- **[Solución Completa: Cloudflare Tunnel No Accesible](./CLOUDFLARE_SOLUTION.md)** - Solución detallada del problema de DNS
- **[Estado Final de Cloudflare Tunnel](./CLOUDFLARE_FINAL_STATUS.md)** - Estado actual y verificación

### Documentos Técnicos

- **[Análisis Cloudflare 2025-12-17](./CLOUDFLARE_ANALYSIS_2025-12-17.md)** - Análisis técnico detallado
- **[Corrección Crítica de Cloudflare](./CLOUDFLARE_CRITICAL_FIX.md)** - Correcciones críticas aplicadas
- **[Diagnóstico de Cloudflare](./CLOUDFLARE_DIAGNOSTIC_REPORT.md)** - Reporte de diagnóstico
- **[Corrección de DNS](./CLOUDFLARE_DNS_FIX.md)** - Corrección específica de DNS
- **[Corrección de ECH Error](./CLOUDFLARE_ECH_ERROR_FIX.md)** - Corrección de errores ECH
- **[Corrección de CNAME](./CLOUDFLARE_FIX_CNAME.md)** - Corrección de CNAME
- **[Corrección de LaunchDaemon](./CLOUDFLARE_FIX_LAUNCHD.md)** - Corrección de LaunchDaemon
- **[Análisis Final](./CLOUDFLARE_FINAL_ANALYSIS.md)** - Análisis final
- **[Migración Exitosa](./CLOUDFLARE_MIGRATION_SUCCESS.md)** - Documentación de migración
- **[Bloqueo en España](./CLOUDFLARE_SPAIN_BLOCK.md)** - Problema de bloqueo geográfico
- **[Corrección de SSL No Seguro](./CLOUDFLARE_SSL_NOT_SECURE_FIX.md)** - Corrección de SSL
- **[Troubleshooting del Túnel](./CLOUDFLARE_TUNNEL_TROUBLESHOOTING.md)** - Guía de troubleshooting
- **[Pasos para Corregir el Servicio](./FIX_CLOUDFLARE_SERVICE_STEPS.md)** - Pasos de corrección
- **[Configuración de WARP](./WARP_CONFIGURATION.md)** - Configuración de WARP
- **[Revisión de Accesibilidad](./CLOUDFLARE_ACCESSIBILITY_REVIEW.md)** - Revisión de accesibilidad
- **[Añadir Rutas](./CLOUDFLARE_ADD_ROUTES.md)** - Añadir nuevas rutas

### Scripts y Utilidades

- **[Plan para Arreglar LaunchAgent](./PLAN_ARREGLAR_LAUNCHAGENT.md)** - Plan de corrección
- **[Revertir a Cloudflare](./REVERT_TO_CLOUDFLARE.md)** - Guía de reversión

---

## ✅ Verificación Rápida

### Checklist de Verificación

- [ ] **cloudflared instalado:** `cloudflared --version`
- [ ] **Túnel creado:** `cloudflared tunnel list`
- [ ] **CNAME configurados:** `dig shogunapi.uliber.com CNAME +short`
- [ ] **A records eliminados:** Verificado en Cloudflare Dashboard
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

## 📝 Notas Importantes

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

## 🔗 Enlaces Útiles

- [Documentación Oficial de Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [Status Page de Cloudflare](https://www.cloudflarestatus.com/)

---

**Última actualización:** 2025-12-08  
**Estado:** ✅ **FUNCIONANDO CORRECTAMENTE** - Todas las pruebas de conectividad exitosas

