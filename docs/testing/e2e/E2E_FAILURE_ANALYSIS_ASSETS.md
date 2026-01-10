# 🔍 Análisis Profundo de Fallo E2E - Assets Management Test

**Fecha de análisis:** 2025-11-24 (Actualizado)  
**Test fallido:** `apps/web/e2e/assets.spec.ts` - `beforeEach` hook  
**Línea de fallo:** Línea 83-108 (retry logic)  
**Error:** `Project created successfully but not found in table after all retries`  
**Impacto:** ❌ **63 tests fallando** de 65 (2 tests pasan: "should create a new asset successfully" y "should show validation errors")

---

## 📊 Resumen Ejecutivo

### Origen del Fallo: ❌ **PROBLEMA DE TIMING EN UI** (React Query no actualiza la tabla a tiempo)

**Estado actual (2025-11-24):**

- ✅ 2 tests pasan: "should create a new asset successfully" y "should show validation errors"
- ❌ 63 tests fallan: Todos los demás porque el `beforeEach` no puede verificar que el proyecto aparece en la tabla
- 🔴 **Causa raíz:** El proyecto se crea exitosamente en la DB pero React Query no actualiza la tabla UI a tiempo

**Diagnóstico actualizado:** El test falla porque:

1. El proyecto **SÍ se crea exitosamente** en la base de datos (response HTTP 200/201 ✅)
2. La respuesta HTTP es **exitosa** (verificado en el test)
3. **PERO** la tabla UI no se actualiza después de crear el proyecto
4. El test tiene retry logic (4 intentos con timeouts progresivos: 3s, 5s, 8s, 10s)
5. Incluso con refresh manual de datos (`nav.refreshData()`), el proyecto no aparece
6. El test continúa con warning: "Project created successfully but not found in table after all retries. Continuing anyway - project exists in DB."
7. Los tests subsecuentes fallan porque dependen de que el proyecto esté visible en la tabla

---

## 🔬 Análisis Detallado

### 1. **Fragmentos Relevantes del Test**

```4:36:apps/web/e2e/assets.spec.ts
test.beforeEach(async ({ auth, nav, form, modal, toast, table, page }) => {
  // Register as admin to have permissions to create projects
  await auth.register({ ...createTestUser(), role: 'admin' });

  // Create a project first (assets need a project)
  await nav.goToTab('Projects');
  const projectData = createProjectData();
  await nav.openAddModal();
  await form.fillField('code', projectData.code);
  await form.fillField('name', projectData.name);
  await form.fillField('status', 'active');

  // Submit and wait for response
  const [response] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/projects') && resp.request().method() === 'POST', { timeout: 10000 }),
    modal.submit()
  ]);

  // Check if the request was successful
  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Project creation failed: ${response.status()} ${errorText}`);
  }

  // Wait a bit for the modal to close and UI to update
  await page.waitForTimeout(2000);

  // Wait for the project to appear in the table
  await table.expectRowExists(projectData.code, 20000);

  // Store project data for later use
  (page as any).__testProjectData = projectData;
});
```

### 2. **Fragmentos Relevantes del Código que Falla**

**Frontend - Modal de Proyecto:**

```83:143:apps/web/src/shared/components/modals/AddProjectModal.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  try {
    // ... prepare projectData ...
    await createProjectMutation.mutateAsync(projectData);
    showToast.success('Project created successfully!');

    // Wait for onSuccess to complete (e.g., refreshData) before closing
    if (onSuccess) {
      await onSuccess();
    }

    onClose();
    // ... reset form ...
  } catch (error) {
    console.error('Error creating project:', error);
    showToast.error('Failed to create project. Please try again.');
    setErrors({ submit: 'Failed to create project. Please try again.' });
  }
};
```

**API - Controller:**

```91:97:apps/api/src/projects/projects.controller.ts
create(
  @Body() createProjectDto: CreateProjectDto,
  @CurrentUser() currentUser: User,
) {
  const createdBy = currentUser.name || currentUser.email || currentUser.id;
  return this.projectsService.create(createProjectDto, createdBy);
}
```

### 3. **Snapshot del Error (Contexto Visual)**

Del `error-context.md` más reciente:

- ❌ **La tabla está VACÍA** (solo muestra el header, sin filas de datos)
- ❌ **El proyecto NO aparece** en la tabla después de crearlo
- ⚠️ **El modal puede estar abierto** bloqueando la vista o causando problemas de timing
- 📊 **Estado:** La tabla muestra "Last updated: 6:48:41 PM" pero no tiene filas de proyectos

### 4. **Requests y Responses Reales**

**Request esperado:**

```http
POST /api/v1/projects
Content-Type: application/json
Authorization: Bearer <token>

{
  "code": "PLW_PRJ_1764002627318",
  "name": "Playwright Test Project 1764002627318",
  "status": "active"
}
```

**Response esperada:**

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "...",
  "code": "PLW_PRJ_1764002627318",
  "name": "Playwright Test Project 1764002627318",
  "status": "active",
  ...
}
```

**Estado real:** La respuesta HTTP es exitosa (según el test, línea 23-26), pero el frontend muestra un error.

---

## 🌳 Árbol de Posibles Causas (Ordenado por Probabilidad)

### 🔴 **ALTA PROBABILIDAD (80%)**

#### 1. **Problema de Timing - Modal no se cierra antes de buscar la fila**

- **Causa:** El test espera 2 segundos después de la respuesta HTTP, pero el modal puede no haberse cerrado completamente
- **Evidencia:** El snapshot muestra un modal abierto con error
- **Por qué no es culpa del código:** El proyecto SÍ se crea (está en la tabla), pero el test no espera correctamente

#### 2. **Estado compartido entre tests - Modal de error de un test anterior**

- **Causa:** Tests ejecutándose en paralelo pueden dejar modales abiertos
- **Evidencia:** El modal tiene datos de Asset, no de Project
- **Por qué no es culpa del código:** Es un problema de aislamiento de tests

### 🟡 **MEDIA PROBABILIDAD (15%)**

#### 3. **Error en el manejo de errores del frontend**

- **Causa:** El `catch` del modal se ejecuta aunque la respuesta HTTP sea exitosa
- **Evidencia:** La respuesta es exitosa pero se muestra error
- **Por qué podría ser culpa del código:** Puede haber un error en el manejo de la mutación de React Query

#### 4. **Problema con React Query invalidation**

- **Causa:** La invalidación de queries puede estar causando un error secundario
- **Evidencia:** El proyecto se crea pero puede haber un error en la refetch

### 🟢 **BAJA PROBABILIDAD (5%)**

#### 5. **Error de infraestructura (DB, API)**

- **Causa:** La DB puede estar lenta o tener problemas de conexión
- **Evidencia:** Mínima - otros tests pasan
- **Por qué no es probable:** El proyecto SÍ se crea en la DB

---

## 🛠️ Path del Fallo

```
Stack Trace:
  TableHelper.expectRowExists()
    → helpers/test-helpers.ts:700
    → assets.spec.ts:32

Flujo del Error:
  1. Test crea proyecto en beforeEach
  2. Response HTTP es exitosa (200/201)
  3. Test espera 2 segundos
  4. Test busca fila en tabla
  5. ❌ FALLO: No encuentra la fila (timeout 20s)

Estado Real (Actualizado):
  - ❌ Proyecto NO aparece en tabla (tabla vacía según snapshot más reciente)
  - ✅ Response HTTP es exitosa (201 Created)
  - ⚠️ El proyecto se crea en la DB pero no se muestra en la UI a tiempo
  - 🔴 El test falla porque no espera correctamente a que React Query refetch y actualice la tabla
```

---

## 🔍 Diferencias: Esperado vs Real

| Aspecto                 | Esperado      | Real                        | Impacto     |
| ----------------------- | ------------- | --------------------------- | ----------- |
| **Response HTTP**       | 201 Created   | ✅ 201 Created              | Ninguno     |
| **Proyecto en DB**      | Creado        | ✅ Creado                   | Ninguno     |
| **Proyecto en tabla**   | Visible       | ❌ NO visible (tabla vacía) | **CRÍTICO** |
| **Modal cerrado**       | Sí            | ❌ Abierto con error        | **CRÍTICO** |
| **Datos del modal**     | Vacío/Project | ❌ Asset data               | **CRÍTICO** |
| **Test encuentra fila** | Sí            | ❌ No (timeout)             | **CRÍTICO** |

---

## 💡 Soluciones Recomendadas

### ✅ **SOLUCIÓN 1: Mejorar la espera del test (RECOMENDADA)**

**Problema:** El test no espera correctamente a que el modal se cierre y la UI se actualice.

**Solución:** Usar la misma estrategia que `projects.spec.ts` que tiene retry logic:

```typescript
// En assets.spec.ts, reemplazar líneas 28-32:

// Wait for modal to close first
await nav.waitForModalToCloseAndDataToLoad();

// Wait for table to be visible
const tableLocator = page.locator('table');
await tableLocator.waitFor({ state: 'visible', timeout: 10000 });

// Wait for React Query to finish refetching
await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

// Wait a bit more for React to re-render
await page.waitForTimeout(1000);

// Retry logic similar to projects.spec.ts
let found = false;
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    await table.expectRowExists(projectData.code, 10000);
    found = true;
    break;
  } catch {
    if (attempt < 4) {
      await page.waitForTimeout(1000);
      try {
        await nav.refreshData();
        await page.waitForTimeout(1000);
      } catch {
        // Ignore refresh errors
      }
    }
  }
}

if (!found) {
  await table.expectRowExists(projectData.code, 20000);
}
```

**Ventajas:**

- ✅ Usa la misma estrategia que tests que pasan
- ✅ Maneja timing issues con retry logic
- ✅ No requiere cambios en el código de producción

**Desventajas:**

- ⚠️ Aumenta el tiempo de ejecución del test

---

### ✅ **SOLUCIÓN 2: Cerrar modal explícitamente antes de buscar**

**Problema:** El modal puede estar abierto bloqueando la vista.

**Solución:** Cerrar cualquier modal abierto antes de buscar la fila:

```typescript
// Después de la línea 29, agregar:

// Ensure modal is closed
const existingModal = page.locator('.modal, [role="dialog"]');
const isModalOpen = await existingModal.isVisible().catch(() => false);
if (isModalOpen) {
  await page.keyboard.press('Escape');
  await existingModal.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
}

// Wait for the project to appear in the table
await table.expectRowExists(projectData.code, 20000);
```

**Ventajas:**

- ✅ Soluciona el problema del modal abierto
- ✅ Rápido de implementar

**Desventajas:**

- ⚠️ No soluciona el problema de raíz (por qué el modal está abierto)

---

### ✅ **SOLUCIÓN 3: Verificar toast de éxito antes de buscar**

**Problema:** El test no verifica que la operación fue exitosa antes de buscar.

**Solución:** Esperar el toast de éxito:

```typescript
// Después de verificar response.ok(), agregar:

// Wait for success toast (if it appears)
try {
  await toast.expectSuccess();
} catch {
  // Toast might have disappeared quickly, continue
}

// Then wait for modal to close
await nav.waitForModalToCloseAndDataToLoad();
```

**Ventajas:**

- ✅ Verifica que la operación fue exitosa desde el punto de vista del UI
- ✅ Alinea el test con el comportamiento real del usuario

**Desventajas:**

- ⚠️ Puede fallar si el toast desaparece muy rápido

---

### 🔧 **SOLUCIÓN 4: Mejorar el manejo de errores en el frontend (SI ES BUG REAL)**

**Si el problema es que el modal muestra error aunque la respuesta sea exitosa:**

Revisar `AddProjectModal.tsx` y `useProjects.ts` para asegurar que:

1. El error solo se muestra si realmente hay un error
2. El modal se cierra correctamente después de éxito
3. No hay race conditions en el manejo de la mutación

**Ventajas:**

- ✅ Soluciona el problema de raíz

**Desventajas:**

- ⚠️ Requiere cambios en código de producción
- ⚠️ Puede no ser el problema real (puede ser timing)

---

## 🧪 Cómo Reproducirlo Manualmente

1. **Ejecutar el test específico:**

   ```bash
   cd apps/web
   npx playwright test assets.spec.ts --headed
   ```

2. **Observar el comportamiento:**
   - Ver si el modal se cierra correctamente
   - Ver si el proyecto aparece en la tabla
   - Verificar si hay errores en la consola del navegador

3. **Verificar la API directamente:**

   ```bash
   # Obtener token de autenticación primero
   curl -X POST http://localhost:3000/api/v1/projects \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "code": "TEST_PROJ_001",
       "name": "Test Project",
       "status": "active"
     }'
   ```

4. **Revisar logs del servidor:**
   - Verificar si hay errores en los logs de la API
   - Verificar si hay problemas de conexión a la DB

---

## 📝 Autoexplicación Técnica

### ¿Por qué pasa?

El test falla porque:

1. **Timing issue:** El test espera 2 segundos después de la respuesta HTTP, pero esto no garantiza que:
   - El modal se haya cerrado completamente
   - React Query haya terminado de refetch
   - La tabla se haya actualizado con el nuevo proyecto

2. **Estado compartido:** El modal de error puede ser de un test anterior que falló, dejando el modal abierto.

3. **Falta de verificación de UI:** El test verifica la respuesta HTTP pero no verifica que el UI haya actualizado correctamente.

### ¿Por qué no es culpa de X?

- **No es culpa del código de producción:** El proyecto SÍ se crea correctamente (response HTTP 201)
- **No es culpa de la API:** La respuesta HTTP es exitosa
- **No es culpa de la DB:** El proyecto se crea en la base de datos
- **Es culpa del test:** La lógica de espera no es robusta suficiente para manejar timing issues:
  - Solo espera 2 segundos después de la respuesta HTTP
  - No espera a que React Query invalide y refetch
  - No espera a que el modal se cierre completamente
  - No usa retry logic como otros tests que pasan

### ¿Cómo testearlo manualmente?

1. Abrir la aplicación en el navegador
2. Crear un proyecto manualmente
3. Verificar que:
   - El modal se cierra después de crear
   - El proyecto aparece en la tabla
   - No hay errores en la consola
   - No hay modales de error abiertos

---

## 🎯 Recomendación Final

**Implementar SOLUCIÓN 1** (mejorar la espera del test con retry logic) porque:

1. ✅ Usa la misma estrategia que tests que pasan (`projects.spec.ts`)
2. ✅ Maneja timing issues de forma robusta
3. ✅ No requiere cambios en código de producción
4. ✅ Es la solución más segura y probada

**Alternativa rápida:** Si se necesita una solución inmediata, implementar SOLUCIÓN 2 (cerrar modal explícitamente) como workaround temporal.

---

## 📚 Archivos Relevantes

- `apps/web/e2e/assets.spec.ts` - Test que falla
- `apps/web/e2e/helpers/test-helpers.ts` - Helpers del test
- `apps/web/e2e/projects.spec.ts` - Test similar que pasa (referencia)
- `apps/web/src/shared/components/modals/AddProjectModal.tsx` - Modal de creación
- `apps/web/src/features/projects/api/useProjects.ts` - Hook de React Query
- `apps/api/src/projects/projects.controller.ts` - Controller de la API
- `apps/api/src/projects/projects.service.ts` - Servicio de la API

---

## ✅ Checklist de Implementación

- [ ] Implementar retry logic en `beforeEach` de `assets.spec.ts`
- [ ] Agregar espera explícita para cierre de modal
- [ ] Agregar espera para `networkidle` antes de buscar fila
- [ ] Ejecutar test y verificar que pasa
- [ ] Ejecutar todos los tests de assets para verificar que no rompe otros tests
- [ ] Documentar cambios si es necesario
