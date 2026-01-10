# Configuración del Router NAT/Firewall para Cloudflare Tunnel

**Problema:** El router está cerrando conexiones UDP (QUIC) por inactividad, causando errores "timeout: no recent network activity".

**Fecha:** 2025-12-23

---

## 🔍 Análisis: Router vs Cambio de Protocolo

### Opción 1: Configurar el Router (NAT/Firewall)

**Ventajas:**
- ✅ Mantiene QUIC (más rápido)
- ✅ Solución directa al problema
- ✅ No requiere cambiar configuración de cloudflared

**Desventajas:**
- ❌ Requiere acceso administrativo al router
- ❌ Puede ser complejo dependiendo del router
- ❌ Puede afectar otras conexiones
- ❌ No todos los routers permiten ajustar timeouts UDP
- ❌ Si el router es del ISP, puede no ser posible

### Opción 2: Cambiar a HTTP/2 (TCP)

**Ventajas:**
- ✅ No requiere tocar el router
- ✅ Funciona con cualquier router
- ✅ Más compatible por defecto
- ✅ TCP keepalive es más robusto
- ✅ Solución inmediata

**Desventajas:**
- ⚠️ Ligeramente más lento que QUIC
- ⚠️ Requiere cambiar configuración

**Recomendación:** Si tienes acceso al router y sabes configurarlo, puedes intentar la Opción 1. Si no, la Opción 2 es más rápida y segura.

---

## 🛠️ Opción 1: Configurar Router Movistar

### Paso 1: Acceder al Router

Tu router está en `192.168.1.2` (gateway por defecto).

1. **Abrir navegador:** `http://192.168.1.2`
2. **Credenciales:** 
   - Usuario: `admin` (o el que configuraste)
   - Contraseña: La que viene en la etiqueta del router o la que configuraste

### Paso 2: Buscar Configuración NAT/Firewall

Los routers Movistar suelen tener estas opciones en diferentes lugares:

**Ubicaciones comunes:**
- `Configuración Avanzada` → `NAT` → `Timeouts`
- `Firewall` → `Configuración NAT`
- `Red` → `NAT` → `Timeouts de Conexión`
- `Seguridad` → `Firewall` → `Timeouts UDP`

### Paso 3: Ajustar Timeouts UDP

**Configuraciones a cambiar:**

1. **UDP Timeout:**
   - **Valor actual:** Probablemente 30-60 segundos
   - **Valor recomendado:** 300 segundos (5 minutos) o más
   - **Ubicación:** `NAT Timeout UDP` o `UDP Session Timeout`

2. **NAT Keepalive:**
   - **Activar:** `NAT Keepalive` o `Persistent NAT`
   - **Intervalo:** 30-60 segundos

3. **Firewall UDP:**
   - **Verificar:** Que no esté bloqueando UDP saliente
   - **Puertos:** Asegurar que UDP 7844 (QUIC) no esté bloqueado

### Paso 4: Configuraciones Específicas por Modelo

#### Router Movistar HGU (Huawei/Technicolor)

```
1. Acceder: http://192.168.1.2
2. Menú: Configuración Avanzada → NAT
3. Buscar: "UDP Timeout" o "Tiempo de espera UDP"
4. Cambiar: De 60s a 300s (5 minutos)
5. Guardar y reiniciar router
```

#### Router Movistar Smart WiFi

```
1. Acceder: http://192.168.1.2
2. Menú: Red → NAT
3. Buscar: "UDP Session Timeout"
4. Cambiar: De 30s a 300s
5. Guardar
```

#### Router Movistar con Firmware Personalizado

```
1. Acceder: http://192.168.1.2
2. Menú: Firewall → NAT
3. Buscar: "UDP Connection Timeout"
4. Cambiar: A 300 segundos mínimo
5. Activar: "NAT Keepalive"
6. Guardar y aplicar
```

### Paso 5: Verificar Cambios

Después de cambiar la configuración:

```bash
# Esperar 2-3 minutos para que se apliquen los cambios
sleep 180

# Verificar que cloudflared se reconecta
cloudflared tunnel info shogun-tunnel

# Monitorear logs para ver si desaparecen los errores
sudo tail -f /var/log/cloudflared.err.log
```

**Indicadores de éxito:**
- ✅ No más errores "timeout: no recent network activity"
- ✅ Conexiones más estables
- ✅ Túnel permanece conectado sin SSH

---

## 🔧 Opción 2: Cambiar a HTTP/2 (Si no puedes tocar el router)

Si no puedes o no quieres tocar el router, cambiar a HTTP/2 puede ser una solución:

```bash
sudo ./scripts/fix-router-firewall-issues.sh
```

Este script:
- Cambia de QUIC (UDP) a HTTP/2 (TCP)
- Ajusta keepalive más agresivo
- No requiere tocar el router

**⚠️ Nota importante:** HTTP/2 puede fallar en algunos casos (ver sección "Problema Conocido: HTTP/2 Puede Fallar" más abajo). Si HTTP/2 no funciona, la mejor opción es configurar el router (Opción 1) o usar SSH keepalive como solución temporal.

---

## 🔍 Observación: Conexión SSH Mantiene Conexiones Activas

### ¿Por qué una conexión SSH previene que se caigan las conexiones?

**Observación:** Mantener una conexión SSH activa desde fuera hace que las conexiones de Cloudflare Tunnel no se caigan.

**Explicación técnica:**

Esto tiene **total sentido** y es un comportamiento esperado del router NAT/Firewall:

1. **NAT Keepalive automático:**
   - Las conexiones SSH envían paquetes keepalive periódicamente (cada 30-60 segundos por defecto)
   - Estos paquetes mantienen la tabla NAT del router activa
   - El router ve tráfico continuo y no cierra las entradas NAT por inactividad

2. **Firewall State Table:**
   - El router mantiene una tabla de estado de conexiones establecidas
   - Cuando hay tráfico activo (SSH), el router mantiene el estado de otras conexiones relacionadas
   - Esto puede ayudar a mantener conexiones UDP/QUIC activas también

3. **Traffic Flow:**
   - El tráfico continuo de SSH "mantiene caliente" la conexión del router
   - El router no considera que la red está inactiva
   - Las conexiones UDP/QUIC se benefician de este tráfico continuo

### Implicaciones

**Esto confirma que el problema es el timeout del router:**
- ✅ Si SSH (con keepalive) mantiene las conexiones activas, el problema es definitivamente el timeout del router
- ✅ El router está cerrando conexiones UDP por inactividad
- ✅ Necesitas aumentar el timeout UDP o usar TCP (HTTP/2) con keepalive más agresivo

**Solución temporal:**
- Mantener una conexión SSH abierta puede ser una solución temporal
- Pero no es una solución permanente (requiere mantener SSH activo siempre)
- Para optimizar SSH keepalive, configura en `~/.ssh/config`:
  ```
  Host *
      ServerAliveInterval 30
      ServerAliveCountMax 3
  ```
  Esto envía keepalive cada 30 segundos y desconecta después de 3 fallos.

**Solución permanente:**
- Configurar el router para aumentar timeout UDP (Opción 1)
- O cambiar a HTTP/2 con keepalive más agresivo (Opción 2)

---

## 🔍 Diagnóstico: ¿Qué Opción Elegir?

### Si puedes acceder al router:

1. **Intenta Opción 1 primero:**
   - Accede al router
   - Busca configuración NAT/Firewall
   - Aumenta timeout UDP a 300s
   - Verifica si funciona

2. **Si no funciona o no encuentras la opción:**
   - Usa Opción 2 (cambiar a HTTP/2)

### Si NO puedes acceder al router:

- **Usa directamente Opción 2** (cambiar a HTTP/2)

---

## 📋 Configuraciones Adicionales del Router (Opcional)

### 1. Port Forwarding (No necesario para Cloudflare Tunnel)

Cloudflare Tunnel no requiere port forwarding porque establece conexiones salientes. Sin embargo, si quieres asegurarte:

```
Puerto: 7844 (UDP) - QUIC
Protocolo: UDP
IP Local: 192.168.1.115 (tu Mac)
```

### 2. DMZ (No recomendado)

No es necesario y puede ser un riesgo de seguridad. Cloudflare Tunnel no lo requiere.

### 3. UPnP

Puede ayudar, pero no es necesario para Cloudflare Tunnel. Si está desactivado, puedes activarlo, pero no debería ser necesario.

---

## ⚠️ Problema Conocido: HTTP/2 Puede Fallar

### Síntoma

Al cambiar a HTTP/2, `cloudflared` puede fallar o no conectarse correctamente.

**Posibles causas:**

1. **Versión de cloudflared incompatible:**
   - Algunas versiones antiguas tienen problemas con HTTP/2
   - Verificar versión: `cloudflared --version`
   - Actualizar si es necesario: `brew upgrade cloudflared`

2. **Configuración incorrecta:**
   - HTTP/2 requiere configuración específica
   - Algunos parámetros pueden ser incompatibles
   - Verificar sintaxis YAML

3. **Problemas de conectividad TCP:**
   - Aunque TCP es más compatible, puede haber problemas específicos
   - Firewall bloqueando TCP en puertos específicos
   - Problemas de red temporales

4. **Conectores zombie:**
   - Conexiones antiguas pueden interferir
   - Requiere limpieza antes de cambiar protocolo

### Soluciones si HTTP/2 Falla

#### 1. Verificar y Actualizar cloudflared

```bash
# Ver versión actual
cloudflared --version

# Actualizar si es necesario
brew upgrade cloudflared

# Verificar que funciona
cloudflared tunnel info shogun-tunnel
```

#### 2. Limpiar Conectores Antes de Cambiar

```bash
# Limpiar conectores zombie
cloudflared tunnel cleanup shogun-tunnel

# Esperar 30 segundos
sleep 30

# Luego cambiar a HTTP/2
sudo ./scripts/fix-router-firewall-issues.sh
```

#### 3. Verificar Configuración HTTP/2

Si HTTP/2 falla, verificar que la configuración es correcta:

```bash
# Ver configuración actual
cat ~/.cloudflared/config.yml

# Verificar sintaxis YAML
python3 -c "import yaml; yaml.safe_load(open('~/.cloudflared/config.yml'))"
```

#### 4. Probar Configuración HTTP/2 Mínima

Si el script falla, probar configuración mínima:

```yaml
tunnel: shogun-tunnel
credentials-file: /Users/antoniojimenez/.cloudflared/5adc17fe-7cf4-468e-8bef-a3264ec7e67f.json

protocol: http2

ingress:
  - hostname: shogunapi.uliber.com
    service: http://localhost:3002
  - hostname: shogunweb.uliber.com
    service: http://localhost:3003
  - hostname: shogunminio.uliber.com
    service: http://localhost:9010
  - service: http_status:404
```

#### 5. Revertir a QUIC si HTTP/2 No Funciona

Si HTTP/2 no funciona después de intentar las soluciones anteriores:

```bash
# Restaurar configuración QUIC
# (buscar backup en ~/.cloudflared/config.yml.backup.*)

# O usar configuración QUIC con keepalive más agresivo
# Ver: scripts/update-cloudflare-config-issue-1225.sh
```

**Nota:** Si HTTP/2 falla, la mejor opción es configurar el router (Opción 1) para aumentar el timeout UDP y mantener QUIC funcionando.

---

## ⚠️ Problemas Comunes

### "No encuentro la opción de timeout UDP"

**Solución:** Muchos routers Movistar no permiten cambiar timeouts UDP. En este caso, usa la Opción 2 (cambiar a HTTP/2).

### "Cambié la configuración pero sigue igual"

**Posibles causas:**
1. El router necesita reinicio
2. El cambio no se aplicó correctamente
3. El router tiene limitaciones de firmware

**Solución:** Reinicia el router y verifica. Si persiste, usa Opción 2.

### "No tengo acceso administrativo al router"

**Solución:** Intenta la Opción 2 (cambiar a HTTP/2). Si HTTP/2 falla, considera usar SSH keepalive como solución temporal mientras buscas otra alternativa.

### "HTTP/2 falla o cloudflared no conecta"

**Solución:** 
1. Verifica y actualiza cloudflared: `brew upgrade cloudflared`
2. Limpia conectores: `cloudflared tunnel cleanup shogun-tunnel`
3. Si persiste, mantén QUIC y configura el router (Opción 1) o usa SSH keepalive como solución temporal

---

## ✅ Resumen

**Para tu caso (Router Movistar en 192.168.1.2):**

1. **Intenta primero:** Acceder al router y aumentar timeout UDP a 300s
2. **Si no funciona:** Cambiar a HTTP/2 con `sudo ./scripts/fix-router-firewall-issues.sh`

**Recomendación final:** 
- **Si puedes configurar el router:** Usa la Opción 1 (aumentar timeout UDP) - es la solución más estable
- **Si no puedes configurar el router y HTTP/2 funciona:** Usa la Opción 2 (HTTP/2)
- **Si HTTP/2 falla:** Mantén QUIC y usa SSH keepalive como solución temporal, o considera otras alternativas (VPN, otro router, etc.)

---

**Última actualización:** 2025-12-23

