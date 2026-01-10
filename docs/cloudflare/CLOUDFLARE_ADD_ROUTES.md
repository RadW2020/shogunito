# Solución: Agregar Routes en Zero Trust Dashboard

**Problema identificado:** El túnel está HEALTHY pero no tiene Routes configuradas en Zero Trust Dashboard.

**Fecha:** 2025-12-07

---

## 🔴 Problema

En Zero Trust Dashboard, el túnel `shogun-tunnel` muestra:

- ✅ Status: HEALTHY
- ✅ Connector: Conectado
- ❌ **Routes: "--" (vacío)**

Sin Routes configuradas, Cloudflare no sabe a dónde enrutar el tráfico, por eso el navegador se queda en "pending forever".

---

## ✅ Solución: Agregar Public Hostnames

### Paso 1: Acceder a la Configuración del Túnel

1. Ve a: https://one.dash.cloudflare.com
2. Ve a: **Networks** → **Connectors** → **Cloudflare Tunnels**
3. **Click en el túnel:** `shogun-tunnel` (el nombre en azul)

### Paso 2: Agregar Public Hostnames

En la página del túnel, busca la sección **"Public Hostnames"** o **"Routes"**.

**Si ves un botón "Add a public hostname" o "Configure":**

1. **Click en "Add a public hostname"** o **"Configure"**
2. Para cada subdominio, agrega:

#### Para `shogunapi.uliber.com`:

- **Subdomain:** `shogunapi`
- **Domain:** `uliber.com`
- **Service:** `http://localhost:3002`
- **Path:** (dejar vacío)
- **Save**

#### Para `shogunweb.uliber.com`:

- **Subdomain:** `shogunweb`
- **Domain:** `uliber.com`
- **Service:** `http://localhost:3003`
- **Path:** (dejar vacío)
- **Save**

#### Para `shogunminio.uliber.com`:

- **Subdomain:** `shogunminio`
- **Domain:** `uliber.com`
- **Service:** `http://localhost:9010`
- **Path:** (dejar vacío)
- **Save**

### Paso 3: Verificar que las Routes Aparecen

Después de agregar las rutas, vuelve a la lista de túneles y verifica que en la columna "Routes" ahora muestra el número de rutas configuradas (ej: "3 routes").

---

## 🔍 Si No Ves la Opción de Agregar Routes

### Opción A: Migrar el Túnel a Configuración Remota

Si ves un mensaje sobre "migrate to remote configuration" o "verify remote configuration":

1. **Sigue el wizard de migración**
2. Esto moverá la configuración del archivo local `~/.cloudflared/config.yml` a Cloudflare Dashboard
3. Después de la migración, podrás gestionar las rutas desde el dashboard

### Opción B: Verificar la Configuración Local

Si el túnel usa configuración local (archivo `config.yml`), las rutas pueden estar definidas ahí pero no sincronizadas con el dashboard.

Verifica que el archivo `~/.cloudflared/config.yml` tiene:

```yaml
tunnel: shogun-tunnel
credentials-file: /Users/antoniojimenez/.cloudflared/5adc17fe-7cf4-468e-8bef-a3264ec7e67f.json

ingress:
  - hostname: shogunapi.uliber.com
    service: http://localhost:3002
  - hostname: shogunweb.uliber.com
    service: http://localhost:3003
  - hostname: shogunminio.uliber.com
    service: http://localhost:9010
  - service: http_status:404
```

Si el archivo está correcto, reinicia el túnel:

```bash
sudo launchctl kickstart system/com.cloudflare.cloudflared
sleep 30
cloudflared tunnel info shogun-tunnel
```

---

## ⚠️ Advertencia sobre `origincert`

Si ves una advertencia sobre flags `origincert`:

- Esta advertencia indica que el túnel está usando configuración local
- No es un error crítico, pero significa que algunas configuraciones solo se aplican localmente
- Para gestionar todo desde el dashboard, considera migrar a configuración remota

---

## 📋 Checklist

- [ ] Accedido a Zero Trust Dashboard → Networks → Tunnels
- [ ] Click en `shogun-tunnel`
- [ ] Agregadas 3 Public Hostnames:
  - [ ] `shogunapi.uliber.com` → `http://localhost:3002`
  - [ ] `shogunweb.uliber.com` → `http://localhost:3003`
  - [ ] `shogunminio.uliber.com` → `http://localhost:9010`
- [ ] Verificado que Routes muestra "3 routes" (o similar)
- [ ] Esperado 2-3 minutos para que los cambios se apliquen
- [ ] Probado desde otro dispositivo/red

---

## 🧪 Verificación

Después de agregar las rutas:

1. **Espera 2-3 minutos** para que Cloudflare actualice la configuración
2. **Reinicia el túnel** (opcional pero recomendado):
   ```bash
   sudo launchctl kickstart system/com.cloudflare.cloudflared
   sleep 30
   ```
3. **Verifica el túnel:**
   ```bash
   cloudflared tunnel info shogun-tunnel
   ```
4. **Prueba desde otro dispositivo/red:**
   - Abre el navegador
   - Ve a: `https://shogunweb.uliber.com`
   - Debería cargar correctamente

---

## 🔗 Referencias

- [Zero Trust Dashboard](https://one.dash.cloudflare.com)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

---

---

## ✅ Estado Final (2025-12-08)

**Pruebas de conectividad confirmadas:**

```bash
# Todas las rutas funcionando
✅ shogunweb.uliber.com → HTTP 200, SSL válido
✅ shogunapi.uliber.com → HTTP 200, SSL válido
✅ shogunminio.uliber.com → HTTP 403 (esperado), SSL válido

# Configuración verificada
✅ Rutas configuradas en Zero Trust Dashboard
✅ Túnel funcionando correctamente
✅ Certificados SSL válidos
```

**✅ Rutas configuradas y funcionando:**

- ✅ shogunapi.uliber.com → http://localhost:3002 (funcionando)
- ✅ shogunweb.uliber.com → http://localhost:3003 (funcionando)
- ✅ shogunminio.uliber.com → http://localhost:9010 (funcionando)
- ✅ Todas las rutas accesibles
- ✅ No hay "pending forever" - problema resuelto

**Última actualización:** 2025-12-08  
**Estado:** ✅ **COMPLETADO** - Rutas configuradas y funcionando correctamente
