# ✅ Rotación de API Key - CASI COMPLETADO

## ✅ Lo que YA se ha hecho automáticamente:

1. ✅ **Eliminado** los archivos `checkly_list.json` y `checkly_all.json` del repositorio
2. ✅ **Limpiado** el historial de Git para eliminar completamente las claves expuestas
3. ✅ **Añadido** `checkly_*.json` al `.gitignore`
4. ✅ **Force-pushed** los cambios a GitHub
5. ✅ **Creado** un nuevo check seguro usando variables de entorno: `__checks__/oracle-monitor.check.ts`
6. ✅ **Generado** una nueva API key: `41e6ec1e035090ca68eba803786d7f31d0dd4bcc33c767767e0fd9a2ede2f72b`
7. ✅ **Actualizado** la variable de entorno `ORACLE_MONITOR_API_KEY` en Checkly con la nueva clave
8. ✅ **Desplegado** el nuevo check a Checkly
9. ✅ **Creado** scripts de ayuda en `scripts/`
10. ✅ **Creado** documentación de seguridad: `__checks__/SECURITY.md`

## ⚠️ Lo que TÚ debes hacer AHORA (solo 2 pasos):

### Paso 1: Actualizar la API key en tu servidor Oracle (5 minutos)

**Opción A - Automática (recomendada):**

1. Conéctate a tu servidor Oracle:
   ```bash
   ssh usuario@80.225.189.40
   ```

2. Copia y ejecuta el script:
   ```bash
   # En tu máquina local
   scp scripts/update-oracle-api-key.sh usuario@80.225.189.40:~/
   
   # En el servidor Oracle
   ssh usuario@80.225.189.40
   chmod +x update-oracle-api-key.sh
   sudo ./update-oracle-api-key.sh
   ```

**Opción B - Manual:**

1. Conéctate al servidor: `ssh usuario@80.225.189.40`
2. Busca el servicio que expone `/status`
3. Reemplaza la API key antigua por la nueva:
   - **Antigua:** `sgh7f78g789sf89g984895wtette4et423te4r0x8bb86sgfg867d`
   - **Nueva:** `41e6ec1e035090ca68eba803786d7f31d0dd4bcc33c767767e0fd9a2ede2f72b`
4. Reinicia el servicio

### Paso 2: Eliminar el check antiguo de Checkly (2 minutos)

**Opción A - Desde la web (más fácil):**

1. Ve a: https://app.checklyhq.com/
2. Busca los checks llamados "Oracle Free Tier Monitor"
3. Identifica el ANTIGUO (tiene la API key hardcodeada en los headers)
4. Elimínalo (menú "..." → Delete check)

**Opción B - Script guiado:**

```bash
./scripts/delete-old-checkly-check.sh
```

---

## 📊 Estado Actual:

| Tarea | Estado |
|-------|--------|
| API key eliminada del código | ✅ Completado |
| Historial de Git limpiado | ✅ Completado |
| .gitignore actualizado | ✅ Completado |
| Check seguro creado | ✅ Completado |
| Nueva API key generada | ✅ Completado |
| Variable de entorno actualizada | ✅ Completado |
| Check nuevo desplegado | ✅ Completado |
| **API key actualizada en servidor Oracle** | ⚠️ **PENDIENTE** |
| **Check antiguo eliminado de Checkly** | ⚠️ **PENDIENTE** |

---

## 🎯 Información Importante:

### Nueva API Key:
```
41e6ec1e035090ca68eba803786d7f31d0dd4bcc33c767767e0fd9a2ede2f72b
```

### API Key Antigua (a eliminar):
```
sgh7f78g789sf89g984895wtette4et423te4r0x8bb86sgfg867d
```

### Endpoint:
```
http://xs0w4oc0kww8skoo4wksk48w.80.225.189.40.sslip.io/status
```

---

## 📁 Scripts Creados:

| Script | Descripción |
|--------|-------------|
| `scripts/update-oracle-api-key.sh` | Actualiza automáticamente la API key en el servidor Oracle |
| `scripts/delete-old-checkly-check.sh` | Guía interactiva para eliminar el check antiguo |

---

## 🔍 Verificación Final:

Una vez completados los 2 pasos pendientes:

```bash
# Verificar que el check funciona
npx checkly test __checks__/oracle-monitor.check.ts

# Si pasa, todo está correcto ✅
```

---

## 📚 Recursos:

- [Checkly Dashboard](https://app.checklyhq.com/)
- [Documentación de Seguridad](./__checks__/SECURITY.md)
- [Checkly Environment Variables](https://www.checklyhq.com/docs/cli/using-environment-variables/)

---

**Tiempo estimado para completar:** 7 minutos

**¿Necesitas ayuda?** Avísame si tienes algún problema con los pasos pendientes.
