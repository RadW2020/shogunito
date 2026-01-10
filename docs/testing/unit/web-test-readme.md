# Unit Tests - Shogun Web

Este directorio contiene la configuración y setup para tests unitarios usando Vitest.

## 📋 Configuración

- **Framework**: Vitest v4.0.14
- **Testing Library**: React Testing Library
- **Environment**: jsdom (simula DOM del navegador)
- **Coverage**: v8

## 🚀 Comandos

```bash
# Ejecutar todos los tests
npm run test

# Ejecutar tests en modo watch (desarrollo)
npm run test:watch

# Ejecutar tests con UI interactiva
npm run test:ui

# Ejecutar tests con coverage
npm run test:coverage
```

## 📁 Estructura de Tests

Los tests deben seguir esta estructura:

```
src/
├── features/
│   └── shotgrid/
│       └── components/
│           └── shotgrid/
│               └── hooks/
│                   └── __tests__/
│                       └── useSorting.test.ts
├── shared/
│   └── utils/
│       └── __tests__/
│           └── formatDuration.test.ts
└── test/
    └── setup.ts          # Configuración global de tests
```

## ✅ Estado Actual de Tests

**Última actualización:** Diciembre 2024

- **Tests ejecutados:** 540 ✅
- **Tests pasados:** 540 (100%) ✅
- **Archivos de test:** 34
- **Cobertura actual:**
  - Statements: 73.06%
  - Branches: 73.94%
  - Functions: 67.83%
  - Lines: 73.49%

### Tests por Categoría

#### Componentes (340+ tests)

- ✅ Modales: `AddProjectModal`, `AddEpisodeModal`, `AddShotModal`
- ✅ Componentes compartidos: `FileUpload`, `FormField`, `Modal`, `ModalFooter`, `NoteCreator`, `NoteBadge`
- ✅ Uploads: `VersionFileUpload`, `AssetThumbnailUpload`, `NoteAttachmentUpload`
- ✅ UI: `LoadingSpinner`, `StatusBadge`, `EmptyState`, `ErrorBoundary`, `LoadingSkeleton`
- ✅ ShotGrid: `DataTable`, `DataTableMobileCard`, `FiltersBar`, `Toolbar`, `ScrollIndicator`

#### Hooks (64 tests)

- ✅ `useSorting` (18 tests) - Lógica de ordenamiento de tablas
- ✅ `useNotesSorting` (10 tests) - Ordenamiento por notas con API
- ✅ `useStatusHelper` (13 tests) - Helper para manejo de status
- ✅ `useLocalStorage` (7 tests) - Hook con soporte SSR y función updater
- ✅ `useKeyboardNavigation` (18 tests) - Navegación por teclado

#### Utilidades (67 tests)

- ✅ `formatDuration` (7 tests) - Formateo de duraciones
- ✅ `pagination` (23 tests) - Utilidades de paginación
- ✅ `accessibility` (37 tests) - Utilidades de accesibilidad (WCAG 2.1 AA)

#### Stores (18 tests)

- ✅ `uiStore` (18 tests) - Store de Zustand con persistencia
  - Gestión de tabs, filtros, visibilidad, panel de detalles, selección de items

#### Tab Wrappers (26 tests)

- ✅ `ProjectsTabWrapper` (7 tests)
- ✅ `EpisodesTabWrapper` (9 tests)
- ✅ `ShotsTabWrapper` (10 tests)

## 🐛 Bugs Encontrados y Arreglados

Durante la creación de tests, se encontraron y arreglaron varios problemas de lógica de negocio. Ver [BUGS.md](./BUGS.md) para detalles completos.

**Bugs arreglados:** 5 ✅

- Inconsistencia en filtros (Alta) - EpisodesTabWrapper y ShotsTabWrapper
- Bug `isVisibleToScreenReaders` (Alta) - Lógica incorrecta con `&&` vs `||`
- Duplicación EmptyState (Media) - Eliminado código muerto
- Duplicación useLocalStorage (Media) - Consolidado en hook unificado
- Lógica versions tab (Baja) - Documentación mejorada

Todos los bugs documentados han sido arreglados y los tests verifican el comportamiento correcto.

## 📝 Escribir Nuevos Tests

### Ejemplo: Test de Hook

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('should do something', async () => {
    const { result } = renderHook(() => useMyHook());
    await waitFor(() => {
      expect(result.current.value).toBe(expected);
    });
  });
});
```

### Ejemplo: Test de Componente

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', async () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## 🎯 Próximos Tests a Implementar

**📋 Ver [COVERAGE_GAP.md](./COVERAGE_GAP.md) para un análisis completo de qué falta por testear.**

### Prioridad Alta

- [ ] Modales restantes (18 modales sin tests)
  - `AddSequenceModal`, `AddAssetModal`, `AddPlaylistModal`, `AddStatusModal`
  - Modales de edición (Project, Episode, Sequence, Shot, Asset, Version, Playlist, Status)
  - `NotesViewerModal`, `GeneralNoteCreatorModal`, `NoteEditModal`
  - `VideoModal`, `PlaylistPlayerModal`, `CreatePlaylistFromVersionsModal`
- [ ] Tab Wrappers restantes (7 sin tests)
  - `SequencesTabWrapper`, `AssetsTabWrapper`, `VersionsTabWrapper`, `VersionsTabWrapperWithPagination`
  - `PlaylistsTabWrapper`, `NotesTabWrapper`, `ProjectsTabWrapperWithPagination`
- [ ] Tabs (10 sin tests)
  - Todos los tabs en `features/shotgrid/components/shotgrid/tabs/`
- [ ] `useOptimisticMutation` (crítico para rollback en operaciones CRUD)
- [ ] `shot-grid.tsx` (componente principal, 1200+ líneas)

### Prioridad Media

- [ ] `NotesPanel` (358 líneas, componente complejo)
- [ ] Hooks: `useDarkMode`, `useErrorHandler`, `useLazyImage`, `usePaginatedQuery`
- [ ] Componentes de paginación: `InfiniteScrollList`, `VirtualTable`
- [ ] Hooks de API (considerar tests de integración)

## 📋 Buenas Prácticas

### Cuando Encontrar un Bug Durante Testing:

1. **Documentar el problema** - Ver `BUGS.md`
2. **Crear test que demuestre el bug** - Usar `.skip()` si no se arregla inmediatamente
3. **Decidir prioridad:**
   - **Crítico**: Arreglar inmediatamente
   - **Alto**: Arreglar en la misma sesión
   - **Medio/Bajo**: Documentar y crear issue
4. **Si es crítico, arreglar primero** - Escribir fix, actualizar test
5. **Si no es crítico, continuar** - Documentar y marcar como `@todo` o `@bug`

### Manejo de Errores en Tests

- Usar `act()` de React Testing Library para envolver actualizaciones de estado
- Capturar promesas rechazadas en mocks para evitar "unhandled rejections"
- Usar `waitFor()` para esperar actualizaciones asíncronas

## 📊 Coverage

Ejecuta `npm run test:coverage` para ver el reporte de cobertura.

**Objetivo:** >80% de cobertura en componentes críticos.

**Estado actual:** 73.06% statements, 73.94% branches, 67.83% functions, 73.49% lines
