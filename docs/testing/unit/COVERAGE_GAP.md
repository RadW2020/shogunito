# Análisis de Cobertura de Tests Unitarios

Este documento identifica los módulos y componentes que aún no tienen tests unitarios o tienen cobertura baja.

## 📊 Resumen Ejecutivo

- **Tests actuales:** 540 tests pasando ✅
- **Archivos de test:** 34 archivos
- **Cobertura actual:**
  - Statements: 73.06%
  - Branches: 73.94%
  - Functions: 67.83%
  - Lines: 73.49%
- **Cobertura objetivo:** >80% en componentes críticos

---

## 🔴 Prioridad Alta - Componentes Críticos Sin Tests

### 1. Modales (18 modales sin tests)

**Ubicación:** `apps/web/src/shared/components/modals/`

**Tests existentes:** ✅ `AddProjectModal`, `AddEpisodeModal`, `AddShotModal`

**Falta testear:**

#### Modales de Creación

- [ ] `AddSequenceModal.tsx` - Modal para crear secuencias
- [ ] `AddAssetModal.tsx` - Modal para crear assets
- [ ] `AddPlaylistModal.tsx` - Modal para crear playlists
- [ ] `AddStatusModal.tsx` - Modal para crear status

#### Modales de Edición

- [ ] `ProjectEditModal.tsx` - Modal para editar proyectos
- [ ] `EpisodeEditModal.tsx` - Modal para editar episodios
- [ ] `SequenceEditModal.tsx` - Modal para editar secuencias
- [ ] `ShotEditModal.tsx` - Modal para editar shots
- [ ] `AssetEditModal.tsx` - Modal para editar assets
- [ ] `VersionEditModal.tsx` - Modal para editar versiones
- [ ] `PlaylistEditModal.tsx` - Modal para editar playlists
- [ ] `StatusEditModal.tsx` - Modal para editar status

#### Modales de Notas

- [ ] `NotesViewerModal.tsx` - Modal para ver notas
- [ ] `GeneralNoteCreatorModal.tsx` - Modal para crear notas
- [ ] `NoteEditModal.tsx` - Modal para editar notas

#### Modales de Media

- [ ] `VideoModal.tsx` - Modal para reproducir videos
- [ ] `PlaylistPlayerModal.tsx` - Modal para reproducir playlists
- [ ] `CreatePlaylistFromVersionsModal.tsx` - Modal para crear playlist desde versiones

**Impacto:** Los modales manejan la mayoría de las operaciones CRUD. Sin tests, es difícil garantizar que los formularios funcionen correctamente.

---

### 2. Tab Wrappers (7 sin tests)

**Ubicación:** `apps/web/src/features/*/components/`

**Tests existentes:** ✅ `ProjectsTabWrapper`, `EpisodesTabWrapper`, `ShotsTabWrapper`

**Falta testear:**

- [ ] `SequencesTabWrapper.tsx` - Wrapper para tab de secuencias
- [ ] `AssetsTabWrapper.tsx` - Wrapper para tab de assets
- [ ] `VersionsTabWrapper.tsx` - Wrapper para tab de versiones
- [ ] `VersionsTabWrapperWithPagination.tsx` - Wrapper con paginación
- [ ] `PlaylistsTabWrapper.tsx` - Wrapper para tab de playlists
- [ ] `NotesTabWrapper.tsx` - Wrapper para tab de notas
- [ ] `ProjectsTabWrapperWithPagination.tsx` - Wrapper con paginación

**Impacto:** Estos componentes contienen lógica de filtrado crítica. Ya encontramos bugs en `EpisodesTabWrapper` y `ShotsTabWrapper` relacionados con filtros.

---

### 3. Tabs (10 sin tests)

**Ubicación:** `apps/web/src/features/shotgrid/components/shotgrid/tabs/`

**Falta testear:**

- [ ] `ProjectsTab.tsx` - Tab de proyectos
- [ ] `EpisodesTab.tsx` - Tab de episodios
- [ ] `SequencesTab.tsx` - Tab de secuencias
- [ ] `ShotsTab.tsx` - Tab de shots
- [ ] `AssetsTab.tsx` - Tab de assets
- [ ] `VersionsTab.tsx` - Tab de versiones
- [ ] `PlaylistsTab.tsx` - Tab de playlists
- [ ] `NotesTab.tsx` - Tab de notas
- [ ] `StatusTab.tsx` - Tab de status
- [ ] `UsersTab.tsx` - Tab de usuarios

**Impacto:** Estos componentes renderizan los datos principales. Tests ayudarían a verificar el renderizado correcto y la interacción.

---

### 4. Componente Principal ShotGrid (0% cobertura)

**Ubicación:** `apps/web/src/features/shotgrid/components/shot-grid.tsx`

- [ ] `shot-grid.tsx` - Componente principal de la aplicación (1200+ líneas)

**Impacto:** Este es el componente más grande y complejo. Contiene toda la lógica de navegación, modales, y estado global.

---

### 5. Hook Crítico: useOptimisticMutation (0% cobertura)

**Ubicación:** `apps/web/src/shared/hooks/useOptimisticMutation.ts`

- [ ] `useOptimisticMutation.ts` - Hook para actualizaciones optimistas

**Impacto:** Usado extensivamente para operaciones CRUD. Sin tests, es difícil garantizar el rollback correcto en caso de error.

---

## 🟡 Prioridad Media - Hooks y Utilidades

### 6. Hooks Sin Tests

**Ubicación:** `apps/web/src/shared/hooks/`

- [ ] `useDarkMode.ts` - Hook para modo oscuro
- [ ] `useErrorHandler.ts` - Hook para manejo de errores
- [ ] `useLazyImage.ts` - Hook para carga lazy de imágenes
- [ ] `usePaginatedQuery.ts` - Hook para queries paginadas

---

### 7. Componentes de Paginación (0% cobertura)

**Ubicación:** `apps/web/src/shared/components/pagination/`

- [ ] `InfiniteScrollList.tsx` - Lista con scroll infinito
- [ ] `VirtualTable.tsx` - Tabla virtualizada

**Impacto:** Componentes de rendimiento crítico. Tests ayudarían a verificar el comportamiento de scroll y virtualización.

---

### 8. NotesPanel (0% cobertura)

**Ubicación:** `apps/web/src/shared/components/shared/NotesPanel.tsx`

- [ ] `NotesPanel.tsx` - Panel completo de notas (358 líneas)

**Impacto:** Componente complejo que maneja creación, edición, eliminación y adjuntos de notas. **Ya documentamos un bug de tipos en este componente (ver BUGS.md).**

---

## 🟢 Prioridad Baja - Mejora de Cobertura

### 9. Componentes con Cobertura Baja

**NoteAttachmentUpload** (65% cobertura)

- Líneas sin cubrir: 38-47, 95-140
- Falta testear: `handleRemoveAttachment`, manejo de attachments existentes

**VersionFileUpload** (76% cobertura)

- Líneas sin cubrir: 117-151
- Falta testear: Visualización de thumbnail/video actual, interacción con video

**FileUpload** (93% cobertura)

- Líneas sin cubrir: 119-120
- Falta testear: Edge cases de hover states

**FormField** (94% cobertura)

- Líneas sin cubrir: 68
- Falta testear: Edge case específico

**NoteCreator** (92% cobertura)

- Líneas sin cubrir: 67
- Falta testear: Manejo de errores en creación

**NoteBadge** (95% cobertura)

- Líneas sin cubrir: 105
- Falta testear: Edge case específico

**useKeyboardNavigation** (88% cobertura)

- Líneas sin cubrir: 65-75
- Falta testear: Edge cases de navegación

**useLocalStorage** (93% cobertura)

- Líneas sin cubrir: 23
- Falta testear: SSR edge case

---

## 📋 Hooks de API Sin Tests

**Ubicación:** `apps/web/src/features/*/api/`

Los hooks de API usan React Query y son críticos para el funcionamiento. **Nota:** Considerar tests de integración en lugar de unitarios puros.

### Projects

- [ ] `useProjects.ts` (4.54% cobertura)
- [ ] `useProjectsOptimistic.ts`
- [ ] `useProjectsPaginated.ts`

### Episodes

- [ ] `useEpisodes.ts`

### Sequences

- [ ] `useSequences.ts`

### Shots

- [ ] `useShots.ts`
- [ ] `useShotsOptimistic.ts`

### Assets

- [ ] `useAssets.ts`
- [ ] `useAssetsOptimistic.ts`

### Versions

- [ ] `useVersions.ts`
- [ ] `useVersionsPaginated.ts`

### Playlists

- [ ] `usePlaylists.ts`

### Notes

- [ ] `useNotes.ts` (4.54% cobertura)
- [ ] `useNotesOptimistic.ts`

**Nota:** `useNotes.ts` y `shared/api/client.ts` tienen cobertura muy baja (3-4%). Estos son críticos para el funcionamiento de la aplicación.

---

## 🎯 Plan de Acción Recomendado

### Fase 1: Componentes Críticos (2-3 días)

1. Tests para modales principales restantes (Add/Edit Sequence, Asset, Playlist)
2. Tests para TabWrappers restantes (Sequences, Assets, Versions)
3. Tests para `useOptimisticMutation` (crítico para rollback)

### Fase 2: Componentes de UI (2-3 días)

4. Tests para tabs principales (ProjectsTab, EpisodesTab, ShotsTab)
5. Tests para componentes de paginación
6. Tests para NotesPanel

### Fase 3: Mejora de Cobertura (1-2 días)

7. Aumentar cobertura de componentes existentes
8. Tests para hooks restantes
9. Tests para componentes de feedback

### Fase 4: Hooks de API (Opcional)

10. Tests para hooks de API (considerar tests de integración)

---

## 📊 Métricas Objetivo

- **Cobertura total objetivo:** >80%
- **Componentes críticos:** >90%
- **Hooks:** >85%
- **Utilidades:** >95% (ya está en 97%)

**Estado actual:** 73.06% statements, 73.94% branches, 67.83% functions, 73.49% lines

---

## 🔍 Notas

- Los modales son el área más crítica sin tests (18 modales pendientes)
- `useOptimisticMutation` es crítico para garantizar rollback correcto
- Los TabWrappers ya han mostrado bugs relacionados con filtros
- `useNotes.ts` y `client.ts` tienen cobertura muy baja (3-4%) y son críticos
- Considerar tests de integración para hooks de API en lugar de unitarios puros
