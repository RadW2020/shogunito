# Refactorización del Seed - Producción Segura

## 📋 Resumen de Cambios

Se ha refactorizado completamente el sistema de seed para hacerlo **seguro para entornos productivos** y **ultra-ligero** para desarrollo y testing.

## ✅ Cambios Realizados

### 1. **Eliminación de `dropSchema`** (`seed.ts`)

- ❌ **ANTES**: `dropSchema: process.env.NODE_ENV === 'development'`
- ✅ **AHORA**: `dropSchema: false` (NUNCA borra la BBDD)

### 2. **Seed Ultra-Ligero** (`seed.service.ts`)

#### Eliminado:

- ❌ Generación de videos con FFmpeg
- ❌ Uploads a MinIO
- ❌ Múltiples proyectos, episodios, secuencias, etc.
- ❌ Métodos complejos: `seedSimple()`, `uploadFile()`, `generateAndUploadVideo()`, etc.
- ❌ Dependencias: `MinioService`, `DirectFFmpegGenerator`, `fs`, `path`

#### Mantenido (Simplificado):

- ✅ **Statuses**: 7 estados básicos del sistema
- ✅ **Usuario Admin**: 1 usuario admin (admin@shogun.com / Admin123!)
- ✅ **Datos Mínimos**: 1 proyecto, 1 episodio, 1 secuencia, 1 shot, 1 asset, 2 versiones

### 3. **Seguridad Producción**

El seed ahora es **100% seguro**:

```typescript
// ✅ Verifica si los datos ya existen antes de crear
const existingCount = await this.statusRepository.count();
if (existingCount > 0) {
  console.log('ℹ️  Statuses already exist, skipping...');
  return;
}
```

## 📊 Comparación Antes/Después

| Aspecto              | Antes                   | Después              |
| -------------------- | ----------------------- | -------------------- |
| **Borra BBDD**       | ✅ Sí (en dev)          | ❌ Nunca             |
| **Proyectos**        | 1 (RAT)                 | 1 (DEMO)             |
| **Episodios**        | 1                       | 1                    |
| **Secuencias**       | 1                       | 1                    |
| **Shots**            | 1                       | 1                    |
| **Assets**           | 1                       | 1                    |
| **Versiones**        | 2                       | 2                    |
| **Genera Videos**    | ✅ Sí (FFmpeg)          | ❌ No                |
| **Sube a MinIO**     | ✅ Sí                   | ❌ No                |
| **Líneas de código** | ~782                    | ~379 (51% reducción) |
| **Dependencias**     | MinIO, FFmpeg, fs, path | Solo bcrypt          |

## 🎯 Datos Creados

### Statuses (7)

- `waiting`, `in_progress`, `review`, `approved`, `final`, `active`, `wip`

### Usuario Admin (1)

- **Email**: admin@shogun.com
- **Password**: Admin123!
- **Role**: admin

### Datos de Ejemplo (Mínimos)

```
DEMO (Project)
└── EP01 (Episode)
    └── EP01_SEQ01 (Sequence)
        └── EP01_SEQ01_SH01 (Shot)
            └── EP01_SEQ01_SH01_V001 (Version)

DEMO (Project)
└── DEMO_ASSET_01 (Asset)
    └── DEMO_ASSET_01_V001 (Version)
```

## 🚀 Uso

### Ejecutar el Seed

```bash
# Solo se ejecuta en development o test
NODE_ENV=development npm run seed

# En producción, el seed se salta automáticamente
NODE_ENV=production npm run seed  # ⚠️ No hace nada
```

### Comportamiento

1. **Verifica** si los datos ya existen
2. **Crea** solo si no existen
3. **Nunca borra** datos existentes
4. **Logs claros** de lo que está haciendo

## 📝 Notas Importantes

### Para Desarrollo/Test

- El seed es **idempotente**: puedes ejecutarlo múltiples veces sin problemas
- Si los datos ya existen, se salta la creación
- Perfecto para resetear entornos de desarrollo

### Para Producción

- **SEGURO**: No borra ni modifica datos existentes
- Solo crea datos si la BBDD está vacía
- Útil para inicialización de nuevos entornos

## 🔧 Próximos Pasos (Opcional)

Si necesitas más datos para testing, considera:

1. Crear un seed separado para testing: `seed.test.ts`
2. Usar factories para generar datos de prueba
3. Mantener este seed mínimo para producción

## ⚠️ Advertencias

- **NO** ejecutar `dropSchema: true` en producción
- **NO** añadir lógica de borrado de datos al seed
- **SÍ** verificar siempre que los datos existen antes de crear

---

**Autor**: Refactorización realizada el 2025-11-30
**Objetivo**: Seed seguro para producción y ligero para desarrollo
