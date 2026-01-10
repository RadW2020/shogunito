# Plan de Refactorización para shot-grid.tsx

## 📊 Análisis Actual

### Estado del Componente

- **Líneas de código:** 1219
- **Responsabilidades:** Múltiples (violación del principio de responsabilidad única)
- **Complejidad:** Alta (muy difícil de mantener y testear)

### Problemas Identificados

1. **Componente Monolítico**
   - Maneja todo el estado de UI
   - Carga datos de múltiples APIs
   - Renderiza diferentes tabs
   - Maneja modales
   - Maneja filtros
   - Maneja selección de items
   - Maneja operaciones CRUD

2. **Estado Duplicado**
   - Estado local (`apiProjects`, `apiEpisodes`, etc.)
   - Estado en Zustand store (`filters`, `activeTab`, etc.)
   - Estado en React Query (caché de queries)
   - Puede causar inconsistencias

3. **Funciones Helper Simples**
   - `getProjects()`, `getEpisodes()`, etc. solo retornan arrays
   - No agregan valor, solo añaden complejidad

4. **Handlers Repetitivos**
   - `handleEditProject`, `handleEditEpisode`, etc. tienen lógica similar
   - `handleAddNoteToProject`, `handleAddNoteToEpisode`, etc. son casi idénticos

5. **Lógica de Filtrado Compleja**
   - Filtrado se hace en múltiples lugares
   - `FiltersBar` tiene su propia lógica de filtrado
   - `TabWrappers` también filtran datos
   - Puede causar inconsistencias

## 🎯 Objetivos del Refactor

1. **Separar responsabilidades** en módulos más pequeños
2. **Eliminar duplicación** de código
3. **Mejorar testabilidad** de cada módulo
4. **Reducir complejidad** ciclomática
5. **Mantener funcionalidad** existente (protegida por tests)

## 📁 Estructura Propuesta

```
shotgrid/
├── components/
│   ├── shot-grid.tsx (Componente principal - orquestador)
│   ├── shotgrid/
│   │   ├── ShotGridTabs.tsx (Navegación de tabs)
│   │   ├── ShotGridContent.tsx (Renderizado de contenido)
│   │   ├── ShotGridDetailPanel.tsx (Panel de detalles)
│   │   ├── ShotGridModals.tsx (Gestión de modales)
│   │   └── ...
│   └── __tests__/
│       └── shot-grid.test.tsx
├── hooks/
│   ├── useShotGridData.ts (Carga de datos)
│   ├── useShotGridModals.ts (Estado de modales)
│   ├── useShotGridSelection.ts (Selección de items)
│   ├── useShotGridFilters.ts (Filtros)
│   └── useShotGridActions.ts (Acciones CRUD)
└── utils/
    ├── tabHandlers.ts (Handlers por tab)
    └── dataHelpers.ts (Helpers de datos)
```

## 🔧 Plan de Refactorización (Paso a Paso)

### Fase 1: Extraer Hooks (Bajo Riesgo)

**Objetivo:** Extraer lógica de estado a hooks personalizados

1. **`useShotGridData.ts`**
   - Mover carga de datos de API
   - Consolidar `refreshData()`
   - Eliminar funciones `get*()` simples

2. **`useShotGridModals.ts`**
   - Consolidar todos los estados de modales
   - Crear handlers genéricos para abrir/cerrar modales

3. **`useShotGridSelection.ts`**
   - Mover lógica de selección de items
   - `handleItemSelect`, `handleSelectAll`

4. **`useShotGridActions.ts`**
   - Mover handlers de CRUD
   - Consolidar handlers repetitivos (edit, add note, etc.)

### Fase 2: Extraer Componentes (Riesgo Medio)

**Objetivo:** Dividir el componente principal en componentes más pequeños

1. **`ShotGridTabs.tsx`**
   - Extraer renderizado de tabs
   - Manejar cambio de tab

2. **`ShotGridContent.tsx`**
   - Extraer `renderTabContent()`
   - Renderizar el tab activo

3. **`ShotGridDetailPanel.tsx`**
   - Extraer panel de detalles
   - Manejar visualización de detalles

4. **`ShotGridModals.tsx`**
   - Extraer todos los modales
   - Centralizar lógica de modales

### Fase 3: Consolidar Lógica (Riesgo Alto)

**Objetivo:** Eliminar duplicación y simplificar

1. **Consolidar Handlers**
   - Crear factory functions para handlers similares
   - Reducir código repetitivo

2. **Simplificar Filtrado**
   - Centralizar lógica de filtrado
   - Asegurar consistencia entre FiltersBar y TabWrappers

3. **Eliminar Estado Duplicado**
   - Usar React Query como fuente única de verdad
   - Eliminar estado local redundante

### Fase 4: Optimizaciones (Post-Refactor)

**Objetivo:** Mejorar rendimiento y mantenibilidad

1. **Memoización**
   - Memoizar componentes pesados
   - Memoizar callbacks

2. **Lazy Loading**
   - Cargar datos solo cuando se necesitan
   - Lazy load de modales

3. **Type Safety**
   - Mejorar tipos
   - Eliminar `any` types

## 🐛 Bugs Potenciales a Verificar

### 1. Sincronización de Estado

- **Problema:** Estado local vs React Query puede desincronizarse
- **Solución:** Usar React Query como fuente única de verdad

### 2. Filtrado Inconsistente

- **Problema:** Filtros aplicados en múltiples lugares
- **Solución:** Centralizar lógica de filtrado

### 3. Manejo de IDs

- **Problema:** Algunos usan `id`, otros `code`
- **Solución:** Estandarizar uso de IDs

### 4. Refresh de Datos

- **Problema:** `refreshData()` puede causar race conditions
- **Solución:** Usar React Query invalidation

## ✅ Checklist de Refactorización

### Antes de Empezar

- [x] Tests básicos creados
- [ ] Tests de filtrado creados
- [ ] Tests de CRUD creados
- [ ] Documentar bugs encontrados

### Durante el Refactor

- [ ] Extraer hooks uno por uno
- [ ] Ejecutar tests después de cada extracción
- [ ] Verificar que no se rompe funcionalidad
- [ ] Documentar cambios

### Después del Refactor

- [ ] Todos los tests pasan
- [ ] Cobertura de tests > 80%
- [ ] Código más legible
- [ ] Menos líneas de código
- [ ] Menor complejidad ciclomática

## 📝 Notas de Implementación

### Orden Recomendado

1. **Primero:** Extraer hooks (menos invasivo)
2. **Segundo:** Extraer componentes pequeños
3. **Tercero:** Refactorizar componente principal
4. **Último:** Optimizaciones

### Estrategia de Testing

- Mantener tests existentes funcionando
- Agregar tests para cada nuevo módulo
- Usar tests como "red de seguridad"

### Migración Gradual

- No hacer todo de una vez
- Hacer cambios incrementales
- Verificar después de cada cambio
- Hacer commits frecuentes

## 🎯 Métricas de Éxito

### Antes del Refactor

- Líneas: 1219
- Complejidad: Alta
- Testabilidad: Baja
- Mantenibilidad: Baja

### Después del Refactor (Objetivo)

- Líneas: < 800 (componente principal)
- Complejidad: Media
- Testabilidad: Alta
- Mantenibilidad: Alta

## 📚 Referencias

- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/best-practices)
- [Component Composition Patterns](https://react.dev/learn/passing-data-deeply-with-context)
- [Custom Hooks Patterns](https://react.dev/learn/reusing-logic-with-custom-hooks)
