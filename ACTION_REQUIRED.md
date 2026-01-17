# 🚨 Acción Requerida: Completar la Rotación de API Key

## ✅ Lo que ya se ha hecho:

1. ✅ **Eliminado** los archivos `checkly_list.json` y `checkly_all.json` del repositorio
2. ✅ **Limpiado** el historial de Git para eliminar completamente las claves expuestas
3. ✅ **Añadido** `checkly_*.json` al `.gitignore`
4. ✅ **Force-pushed** los cambios a GitHub
5. ✅ **Creado** un nuevo check seguro usando variables de entorno: `__checks__/oracle-monitor.check.ts`
6. ✅ **Añadido** la variable de entorno `ORACLE_MONITOR_API_KEY` en Checkly (con placeholder)
7. ✅ **Creado** documentación de seguridad: `__checks__/SECURITY.md`

## ⚠️ Lo que TÚ debes hacer AHORA:

### Paso 1: Generar una nueva API Key en tu servidor Oracle

La API key comprometida era:
```
sgh7f78g789sf89g984895wtette4et423te4r0x8bb86sgfg867d
```

Esta clave se usa para el endpoint:
```
http://xs0w4oc0kww8skoo4wksk48w.80.225.189.40.sslip.io/status
```

**Acciones:**

1. **Conéctate a tu servidor Oracle Free Tier:**
   ```bash
   ssh usuario@80.225.189.40
   ```

2. **Busca el servicio que expone el endpoint `/status`:**
   ```bash
   # Ver procesos escuchando
   sudo netstat -tulpn | grep LISTEN
   
   # O con lsof
   sudo lsof -i -P -n | grep LISTEN
   ```

3. **Encuentra la configuración del servicio** (probablemente un script de monitoreo o una aplicación)

4. **Genera una nueva API key** (puede ser un hash aleatorio):
   ```bash
   # Generar una nueva API key segura
   openssl rand -hex 32
   ```

5. **Actualiza la configuración** del servicio con la nueva API key

6. **Reinicia el servicio** si es necesario

### Paso 2: Actualizar la variable de entorno en Checkly

Una vez que tengas la nueva API key:

```bash
# Desde el directorio del proyecto
cd /Users/rauljm/codeloper/shogunito

# Actualizar la variable de entorno
npx checkly env update ORACLE_MONITOR_API_KEY "TU_NUEVA_API_KEY_AQUI"
```

### Paso 3: Probar el check localmente

```bash
# Probar el check con la nueva API key
npx checkly test __checks__/oracle-monitor.check.ts
```

Si el test pasa (✓), continúa al siguiente paso.

### Paso 4: Desplegar el check a Checkly

```bash
# Desplegar todos los checks
npx checkly deploy
```

### Paso 5: Eliminar el check antiguo de Checkly

1. Ve a https://app.checklyhq.com/
2. Busca el check llamado "Oracle Free Tier Monitor" (el antiguo con la API key hardcodeada)
3. Elimínalo

### Paso 6: Verificar que todo funciona

1. Ve a https://app.checklyhq.com/
2. Verifica que el nuevo check "Oracle Free Tier Monitor" esté funcionando
3. Comprueba que use la variable de entorno `ORACLE_MONITOR_API_KEY`

### Paso 7: Revocar la API key antigua

En tu servidor Oracle, **elimina o deshabilita** la API key antigua:
```
sgh7f78g789sf89g984895wtette4et423te4r0x8bb86sgfg867d
```

## 📝 Commit de los cambios

Una vez completado todo:

```bash
git add __checks__/oracle-monitor.check.ts __checks__/SECURITY.md
git commit -m "feat: Add secure Oracle monitor check with env vars

- Created oracle-monitor.check.ts using Checkly environment variables
- Added SECURITY.md with best practices documentation
- Replaced hardcoded API key with {{ORACLE_MONITOR_API_KEY}} reference"

git push
```

## 🔍 Verificación Final

- [ ] Nueva API key generada en servidor Oracle
- [ ] Variable de entorno actualizada en Checkly
- [ ] Check local probado y funcionando
- [ ] Check desplegado a Checkly
- [ ] Check antiguo eliminado de Checkly
- [ ] API key antigua revocada en servidor
- [ ] Cambios commiteados y pusheados

## 📚 Recursos

- [Checkly Environment Variables](https://www.checklyhq.com/docs/cli/using-environment-variables/)
- [Documentación de Seguridad](./__checks__/SECURITY.md)
- [GitGuardian](https://www.gitguardian.com/)

---

**¿Necesitas ayuda?** Si tienes problemas con algún paso, revisa la documentación o contacta con soporte.
