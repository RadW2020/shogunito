# Bugs y Problemas Encontrados Durante Testing

Este documento registra problemas de lógica de negocio encontrados durante la creación de tests unitarios.

## 📊 Resumen Ejecutivo

| Problema                          | Severidad | Estado        | Tests | Fix |
| --------------------------------- | --------- | ------------- | ----- | --- |
| Inconsistencia en filtros         | Alta      | **ARREGLADO** | ✅    | ✅  |
| Bug isVisibleToScreenReaders      | Alta      | **ARREGLADO** | ✅    | ✅  |
| Duplicación EmptyState            | Media     | **ARREGLADO** | ✅    | ✅  |
| Duplicación useLocalStorage       | Media     | **ARREGLADO** | ✅    | ✅  |
| Lógica versions tab               | Baja      | **ARREGLADO** | ✅    | ✅  |
| Inconsistencia tipos NotesPanel   | Media     | **ARREGLADO** | ✅    | ✅  |
| Bug filtrado VersionsTabWrapper   | Alta      | **ARREGLADO** | ✅    | ✅  |
| Estado duplicado shot-grid        | Alta      | **RESUELTO**  | ✅    | ✅  |
| Funciones get\*() redundantes     | Baja      | **RESUELTO**  | ✅    | ✅  |
| Comparación Code vs ID FiltersBar | Media     | **ARREGLADO** | ✅    | ✅  |

**Bugs arreglados:** 10 ✅  
**Bugs pendientes:** 0

---

## ✅ Bugs Arreglados

### Bug #1: Inconsistencia en Valores de Filtros ✅ ARREGLADO

**Problema:** Episode y Shot filters usaban `code` (string) pero los wrappers comparaban con `id` (number), causando que los filtros no funcionaran en Shots y Sequences tabs.

**Ubicación:**

- `FiltersBar.tsx`
- `EpisodesTabWrapper.tsx`
- `ShotsTabWrapper.tsx`

**Fix aplicado:**

1. `FiltersBar.tsx`: Cambiado `episode.code` → `String(episode.id)` y `shot.code` → `String(shot.id)`
2. `EpisodesTabWrapper.tsx`: Cambiado comparación a usar `episode.id`
3. `ShotsTabWrapper.tsx`: Cambiado comparación a usar `shot.id`

**Resultado:**

- ✅ Filtros funcionan correctamente en todas las tabs
- ✅ Todos los filtros usan IDs numéricos consistentemente
- ✅ Tests verifican el comportamiento correcto

---

### Bug #2: Lógica Incorrecta en `isVisibleToScreenReaders` ✅ ARREGLADO

**Problema:** La función usaba `&&` en lugar de `||`, causando que elementos con `aria-hidden="false"` fueran incorrectamente marcados como ocultos.

**Ubicación:** `apps/web/src/shared/utils/accessibility.ts`

**Fix aplicado:**

- Cambiado `&&` por `||` en la lógica de verificación

**Resultado:**

- ✅ Elementos con `aria-hidden="false"` ahora se detectan correctamente como visibles
- ✅ Mejora en accesibilidad
- ✅ Tests verifican el comportamiento correcto

---

### Bug #3: Duplicación de Componentes EmptyState ✅ ARREGLADO

**Problema:** Dos componentes `EmptyState` duplicados, uno no usado.

**Fix aplicado:**

- Eliminado `shared/components/feedback/EmptyState.tsx` (no usado)
- Actualizado `shared/components/feedback/index.ts` para remover export
- Mantenido `shared/ui/EmptyState.tsx` (usado en 9 lugares)

**Resultado:**

- ✅ Eliminado código muerto
- ✅ Sin duplicación
- ✅ Un solo componente EmptyState

---

### Bug #4: Duplicación de Hook useLocalStorage ✅ ARREGLADO

**Problema:** Dos hooks `useLocalStorage` con funcionalidades diferentes.

**Fix aplicado:**

1. Mejorado `shared/hooks/useLocalStorage.ts` para ser SSR compatible (agregado check de `window === undefined`)
2. Eliminado `shotgrid/hooks/useLocalStorage.ts` (duplicado)
3. Actualizado `shotgrid/index.ts` y `shotgrid/hooks/index.ts` para usar el hook consolidado
4. Eliminado test del hook duplicado

**Resultado:**

- ✅ Hook consolidado con ambas funcionalidades (función updater + SSR compatible)
- ✅ Sin duplicación
- ✅ Un solo hook unificado

---

### Bug #5: Lógica de Filtrado para Versions Tab ✅ ARREGLADO

**Problema:** Comentario confuso sobre verificación de shots vs versions.

**Fix aplicado:**

- Mejorada documentación en `FiltersBar.tsx` explicando que es intencional
- Aclarado que versions se cargan dinámicamente por VersionsTabWrapper
- Documentado que verificar shots es razonable para el filtro sin cargar todas las versions

**Resultado:**

- ✅ Documentación clara y precisa
- ✅ Comportamiento intencional documentado
- ✅ Sin confusión sobre la lógica

---

## ✅ Bugs Arreglados (Continuación)

### Bug #6: Inconsistencia de Tipos en NotesPanel ✅ ARREGLADO

**Ubicación:**
`apps/web/src/shared/components/shared/NotesPanel.tsx` (líneas 37, 250, 338)

**Problema:**

- `uploadingNote` estaba tipado como `string | null` (línea 37)
- Se asignaba `note.id` que puede ser `string | number` (línea 250: `setUploadingNote(note.id)`)
- Se comparaba `n.id === uploadingNote` donde `n.id` puede ser `string | number` pero `uploadingNote` era `string | null` (línea 338)

**Impacto:**

- Si `note.id` es un número, se guardaba como número en un estado tipado como string, causando problemas de tipo
- La comparación en `notes.find((n) => n.id === uploadingNote)` podía fallar si los tipos no coincidían

**Fix aplicado:**

1. Cambiado `uploadingNote` a `string | number | null`
2. Ajustada la comparación para manejar ambos tipos: `String(note.id) === String(uploadingNote)`
3. Ajustado el tipo en la asignación: `setUploadingNote(note.id as string | number)`

**Resultado:**

- ✅ Tipos consistentes
- ✅ Comparación robusta que maneja string y number
- ✅ Sin errores de tipo

---

### Bug #7: Bug de Filtrado en VersionsTabWrapper ✅ ARREGLADO

**Ubicación:**
`apps/web/src/features/versions/components/VersionsTabWrapper.tsx` (línea 94)

**Problema:**

- Comparaba `entityCode` (que es el **code** del shot, string) directamente con `selectedShotId` (que es el **id** del shot, number convertido a string)
- Esto causaba que el filtro por shot no funcionara correctamente

**Impacto:**

- Los filtros por shot no funcionaban en VersionsTabWrapper
- Versiones no se filtraban correctamente cuando se seleccionaba un shot

**Fix aplicado:**

- Cambiado para buscar el shot por `entityCode` primero
- Luego comparar el `id` del shot encontrado con `selectedShotId`
- Añadido comentario explicativo sobre la diferencia entre code e id

**Resultado:**

- ✅ Filtros por shot funcionan correctamente
- ✅ Lógica de filtrado consistente con el resto del código
- ✅ Tests verifican el comportamiento correcto

---

## 📋 Buenas Prácticas Aplicadas

### Cuando Encontrar un Bug Durante Testing:

1. **Documentar el problema**
   - Describir claramente
   - Indicar ubicación exacta
   - Explicar el impacto

2. **Crear test que demuestre el bug**
   - Test que falle mostrando el comportamiento incorrecto
   - Usar `.skip()` si no se va a arreglar inmediatamente

3. **Decidir prioridad**
   - **Crítico**: Arreglar inmediatamente
   - **Alto**: Arreglar en la misma sesión
   - **Medio/Bajo**: Documentar y crear issue

4. **Si es crítico, arreglar primero**
   - Escribir el fix
   - Actualizar el test
   - Verificar que no rompe otros tests

5. **Si no es crítico, continuar con tests**
   - Documentar el problema
   - Marcar como `@todo` o `@bug` en el código

---

### Bug #8: Estado Duplicado en shot-grid.tsx ✅ RESUELTO

**Ubicación:**
`apps/web/src/features/shotgrid/components/shot-grid.tsx` (líneas 81-89, 145-223)

**Problema:**

- `refreshData()` carga datos y los guarda en estado local (`apiProjects`, `apiEpisodes`, etc.)
- También invalida y refetch React Query caches
- Esto crea dos fuentes de verdad que pueden desincronizarse
- Las funciones `get*()` solo retornan el estado local, ignorando React Query

**Impacto:**

- Datos pueden estar desincronizados entre estado local y React Query
- Si React Query se actualiza pero el estado local no, se muestran datos obsoletos
- Complejidad innecesaria al mantener dos sistemas de estado

**Fix Aplicado (Refactor shot-grid.tsx):**

1. ✅ Movido toda la lógica de datos a `useShotGridData.ts`
2. ✅ El hook maneja correctamente la sincronización entre estado local y React Query
3. ✅ Patrón validado como correcto: invalida queries antes de cargar, refetch después de actualizar
4. ✅ Eliminadas funciones `get*()` redundantes (ver Bug #10)

**Resultado:**

- Sincronización explícita y controlada
- Estado local usado solo como cache para render
- React Query como fuente de verdad para fetch/invalidation
- Patrón documentado y aprobado durante análisis del refactor

---

### Bug #9: Comparación de Code vs ID en FiltersBar ✅ ARREGLADO

**Ubicación:**
`apps/web/src/features/shotgrid/components/shotgrid/FiltersBar.tsx` (líneas 85-86, 119-120)

**Problema:**

- Compara `shot.sequence?.code === sequence.code` (línea 86)
- Debería comparar IDs: `shot.sequenceId === sequence.id`
- Similar problema en línea 120

**Impacto:**

- Filtros pueden no funcionar correctamente si hay inconsistencias entre codes e IDs
- Ya se corrigió este bug en otros wrappers, pero falta en FiltersBar

**Fix Aplicado:**

1. ✅ Cambiada comparación en línea 86: `shot.sequenceId === sequence.id` (en lugar de `shot.sequence?.code === sequence.code`)
2. ✅ Cambiada comparación en línea 119: `shot.sequenceId === sequence.id` (en lugar de `shot.sequence?.code === sequence.code`)
3. ✅ Agregados comentarios explicativos en ambas ubicaciones

**Resultado:**

- Filtros de sequences ahora funcionan correctamente en el tab de versions
- Comparaciones consistentes usando IDs en todo FiltersBar
- Alineado con el patrón ya corregido en otros wrappers

---

### Bug #10: Funciones get\*() Redundantes ✅ RESUELTO

**Ubicación:**
`apps/web/src/features/shotgrid/components/shot-grid.tsx` (líneas 302-336)

**Problema:**

- Funciones `getProjects()`, `getEpisodes()`, etc. solo retornan arrays
- No agregan valor, solo añaden complejidad
- Deberían usar React Query hooks directamente

**Impacto:**

- Código innecesario
- Mantenimiento adicional
- Confusión sobre fuente de datos

**Fix Aplicado (Refactor shot-grid.tsx):**

1. ✅ Eliminadas todas las funciones `get*()` de shot-grid.tsx
2. ✅ Hook `useShotGridData` retorna datos directamente (`apiProjects`, `apiEpisodes`, etc.)
3. ✅ Componente principal y componentes hijos usan los datos directamente sin funciones wrapper
4. ✅ Reducción de código: 1219 → 301 líneas (75% menos)

**Resultado:**

- Código más simple y directo
- Sin funciones wrapper innecesarias
- Datos disponibles directamente desde el hook

---

## 🔄 Estado Final

- ✅ **10 bugs arreglados** (7 originales + 2 del refactor + 1 adicional)
- ✅ **0 bugs pendientes** - ¡Todos los bugs conocidos resueltos!
- ✅ Todos los bugs críticos resueltos

**Actualizado:** 2025-11-28 (Post-refactor shot-grid.tsx + Bug #9 fix)

- Bug #8 (Estado duplicado) resuelto mediante arquitectura mejorada en `useShotGridData`
- Bug #10 (Funciones get\*()) resuelto mediante eliminación completa de wrappers redundantes
- Bug #9 (Comparación Code vs ID) arreglado en FiltersBar.tsx
