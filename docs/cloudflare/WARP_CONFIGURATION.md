# Configuración de Cloudflare WARP

## 📋 Estado Actual

**Fecha de revisión:** 2025-12-03

### Estado del Servicio

- ✅ **WARP está conectado y funcionando**
- ✅ **Modo:** WarpProxy (SOCKS5 proxy)
- ✅ **Puerto:** 40000
- ✅ **Estado de red:** healthy
- ✅ **Proceso activo:** `/Applications/Cloudflare WARP.app/Contents/Resources/CloudflareWARP`

### Configuración Actual

```
Mode: WarpProxy on port 40000
WARP tunnel protocol: MASQUE
Post-quantum support: Enabled (downgrades allowed)
Always On: true
Switch Locked: false
```

### Puerto del Proxy

El proxy SOCKS5 está escuchando en:

- **Host:** 127.0.0.1
- **Puerto:** 40000
- **Protocolo:** SOCKS5

---

## 🔍 Verificación

### Comandos de Verificación

```bash
# Ver estado de WARP
warp-cli status

# Ver configuración completa
warp-cli settings

# Verificar que el puerto está escuchando
lsof -i :40000
# o
netstat -an | grep 40000

# Probar el proxy SOCKS5
curl --proxy socks5h://127.0.0.1:40000 https://www.cloudflare.com/cdn-cgi/trace
```

### Estado Esperado

- ✅ `warp-cli status` muestra: `Status update: Connected` y `Network: healthy`
- ✅ `lsof -i :40000` muestra un proceso escuchando en el puerto
- ✅ `curl` a través del proxy funciona correctamente

---

## ⚙️ Gestión de WARP

### Comandos Básicos

```bash
# Conectar
warp-cli connect

# Desconectar
warp-cli disconnect

# Ver estado
warp-cli status

# Ver configuración
warp-cli settings
```

### Cambiar Modo

WARP soporta varios modos:

```bash
# Modo proxy (SOCKS5) - actual
warp-cli mode proxy

# Modo WARP completo (túnel VPN) cuidado esto tira el SSH
warp-cli mode warp

# Modo DoH (DNS over HTTPS)
warp-cli mode doh

# Modo WARP + DoH
warp-cli mode warp+doh
```

### Configurar Puerto del Proxy

```bash
# Cambiar puerto del proxy (por defecto 40000)
warp-cli proxy port 40000
```

---

## 🔗 Integración con Shogun

### Nota Importante

**WARP y Cloudflare Tunnel son servicios diferentes:**

- **WARP (warp-cli):** Proxy/VPN personal para el tráfico del sistema
- **Cloudflare Tunnel (cloudflared):** Túnel para exponer servicios locales a internet

El proyecto Shogun usa **Cloudflare Tunnel** para exponer los servicios (API, Web, MinIO) a través de dominios públicos. WARP no está directamente integrado con el proyecto, pero puede ser útil para:

1. **Navegación segura:** Enrutar el tráfico del navegador a través de WARP
2. **Aplicaciones que usen el proxy:** Configurar aplicaciones para usar `socks5://127.0.0.1:40000`
3. **Pruebas de conectividad:** Verificar que el tráfico pasa por Cloudflare

### Uso del Proxy en Aplicaciones

Si necesitas que alguna aplicación use el proxy WARP:

```bash
# Variables de entorno para usar el proxy
export ALL_PROXY=socks5://127.0.0.1:40000
export HTTP_PROXY=socks5://127.0.0.1:40000
export HTTPS_PROXY=socks5://127.0.0.1:40000

# Ejemplo: curl a través del proxy
curl --proxy socks5h://127.0.0.1:40000 https://api.example.com
```

---

## 🐛 Solución de Problemas

### WARP no se conecta

```bash
# Desconectar y reconectar
warp-cli disconnect
sleep 3
warp-cli connect

# Verificar estado
warp-cli status
```

### El puerto 40000 no está escuchando

```bash
# Verificar que WARP está en modo proxy
warp-cli settings | grep Mode

# Si no está en modo proxy, cambiarlo
warp-cli mode proxy
warp-cli proxy port 40000

# Verificar el puerto
lsof -i :40000
```

### El proxy no funciona

```bash
# Verificar que WARP está conectado
warp-cli status

# Probar el proxy
curl --proxy socks5h://127.0.0.1:40000 https://www.cloudflare.com/cdn-cgi/trace

# Si falla, verificar logs (si están disponibles)
# En macOS, los logs pueden estar en:
# ~/Library/Logs/CloudflareWARP/
```

### Cambiar de modo

Si necesitas cambiar del modo proxy a otro modo:

```bash
# Ver modos disponibles
warp-cli mode --help

# Cambiar a modo WARP completo
warp-cli mode warp

# Volver a modo proxy
warp-cli mode proxy
warp-cli proxy port 40000
```

---

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Tu Mac                               │
│                                                          │
│  ┌──────────────┐         ┌──────────────┐            │
│  │  Aplicación  │────────▶│  WARP Proxy  │            │
│  │  (navegador) │         │  :40000      │            │
│  └──────────────┘         └──────┬───────┘            │
│                                   │                     │
│                                   │ SOCKS5              │
│                                   ▼                     │
│                          ┌──────────────┐              │
│                          │ Cloudflare   │              │
│                          │ WARP Network │              │
│                          └──────────────┘              │
│                                   │                     │
└───────────────────────────────────┼─────────────────────┘
                                     │
                                     │ Internet
                                     ▼
                            ┌─────────────────┐
                            │   Destino       │
                            │   (web, API)    │
                            └─────────────────┘
```

**Nota:** WARP es independiente de Cloudflare Tunnel. El túnel (`cloudflared`) expone servicios locales, mientras que WARP enruta el tráfico saliente del sistema.

---

## ✅ Checklist de Configuración

- [x] WARP instalado y funcionando
- [x] Modo proxy configurado
- [x] Puerto 40000 escuchando
- [x] Estado: Connected
- [x] Red: healthy
- [ ] (Opcional) Aplicaciones configuradas para usar el proxy
- [ ] (Opcional) Variables de entorno configuradas

---

## 🔗 Referencias

- [Cloudflare WARP Documentation](https://developers.cloudflare.com/warp-client/)
- [Cloudflare WARP CLI](https://developers.cloudflare.com/warp-client/get-started/linux/)
- [SOCKS5 Proxy](https://en.wikipedia.org/wiki/SOCKS)

---

**Última actualización:** 2025-12-03  
**Versión de WARP probada:** Cloudflare WARP.app (macOS)  
**Versión de macOS probada:** macOS 24.6.0 (Sequoia)
