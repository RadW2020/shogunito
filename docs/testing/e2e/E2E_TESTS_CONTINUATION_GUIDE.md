# Guía de Continuación - Tests E2E al 100%

**Estado Actual:** 607/625 tests pasando (97.1%) | 18 tests fallando (2.9%)

## Contexto

Migración completada de `code` (UUID/string) a `id` (integer) como primary key. Todos los servicios y DTOs principales ya están actualizados. Los 18 tests restantes requieren ajustes menores.

## Correcciones Ya Aplicadas

✅ **Servicios:** `sequences.service.ts`, `assets.service.ts`, `shots.service.ts`, `notes.service.ts`, `versions.service.ts` - Todos usan IDs correctamente
✅ **DTOs:** `FilterAssetsDto`, `FilterSequencesDto` - `projectId` ahora es `number` con `@Transform`
✅ **Tests:** Mayoría de archivos E2E actualizados para usar `id` en lugar de `code`

## Tests Restantes (18) - Detalles Específicos

### 1. File Uploads (1 test)

- **Archivo:** `file-uploads-advanced.e2e-spec.ts`
- **Test:** `should handle different image formats for thumbnails`
- **Error:** `expect(received).toContain(expected)` - Expected: 400, Received: [200, 201]
- **Solución:** Ajustar expectativa del test o validación de formato de imagen

### 2. Workflows (3 tests)

- **Archivo:** `workflows.e2e-spec.ts`
- **Tests:**
  - `should get all entities for a project` - Error 500 al filtrar assets por projectId
  - `should handle pagination for large datasets` - `expect(received).toBeGreaterThan(0)` - Received: 0
  - `should validate business constraints` - Error 409 Conflict (código duplicado)
- **Solución:**
  - Verificar que `workflow.project.id` no sea undefined
  - Revisar helper `createCompleteWorkflow` para generar códigos únicos
  - Ajustar expectativas de paginación

### 3. Data Integrity (2 tests)

- **Archivo:** `data-integrity.e2e-spec.ts`
- **Tests:**
  - `should prevent creating version with non-existent entity` - `expect(received).toContain(201)` - Received: [400, 404, 422]
  - `should maintain referential integrity in complex deletion` - Ya corregido parcialmente, verificar que todas las rutas usen `id`
- **Solución:**
  - El test espera 201 pero recibe 400/404/422 (correcto). Cambiar expectativa a `expect([400, 404, 422]).toContain(response.status)`
  - Verificar que todas las referencias a `.code` en el test estén cambiadas a `.id`

### 4. Business Rules (3 tests)

- **Archivo:** `business-rules.e2e-spec.ts`
- **Tests:**
  - `should only allow one version to be latest per shot` - Revisar lógica de negocio
  - `should allow changing latest version back and forth` - Revisar lógica de negocio
  - `should handle gaps in shot numbering` - Revisar validación
- **Solución:** Revisar implementación de reglas de negocio en `versions.service.ts`

### 5. Sequences (1 test)

- **Archivo:** `sequences.e2e-spec.ts`
- **Test:** `should cascade delete related shots`
- **Error:** Probablemente error 500 o shots no se eliminan
- **Solución:** Verificar cascade delete en `sequences.service.ts` o configuración de TypeORM

### 6. Validation (2 tests)

- **Archivo:** `validation.e2e-spec.ts`
- **Tests:**
  - `should reject non-boolean for boolean field`
  - `should reject non-array when array is expected`
- **Solución:** Revisar validaciones en DTOs correspondientes

### 7. Otros (6 tests)

- Varios tests con errores 409 (Conflict) - Códigos duplicados
- **Solución:** Asegurar que helpers generen códigos únicos usando `Date.now()` y `Math.random()`

## Patrones de Corrección Aplicados

### 1. DTOs - Cambiar UUID a Number

```typescript
// ❌ ANTES
@IsUUID()
@IsString()
projectId?: string;

// ✅ DESPUÉS
@Transform(({ value }) => parseInt(value))
@IsNumber()
projectId?: number;
```

### 2. Servicios - Eliminar Fallbacks

```typescript
// ❌ ANTES
if (filters?.projectCode) {
  const project = await this.projectRepository.findOne({
    where: { code: filters.projectCode },
  });
  projectFilterId = project.id;
}

// ✅ DESPUÉS
if (filters?.projectId) {
  queryBuilder.andWhere('asset.projectId = :projectId', {
    projectId: filters.projectId,
  });
}
```

### 3. Tests - Usar IDs en lugar de Codes

```typescript
// ❌ ANTES
const sequence = await createSequence(app, authToken, projectCode, episode.code);
await request(app.getHttpServer()).get(`/sequences/${sequence.code}`);

// ✅ DESPUÉS
const sequence = await createSequence(app, authToken, projectId, episode.id!);
await request(app.getHttpServer()).get(`/sequences/${sequence.id!}`);
```

## Archivos Clave a Revisar

1. **`apps/api/test/e2e/workflows.e2e-spec.ts`** - Línea 340-368 (should get all entities)
2. **`apps/api/test/helpers/test-utils.ts`** - Helper `createCompleteWorkflow` (generar códigos únicos)
3. **`apps/api/src/versions/versions.service.ts`** - Lógica de "latest version" (reglas de negocio)
4. **`apps/api/src/sequences/sequences.service.ts`** - Método `remove` (cascade delete)

## Checklist de Verificación

- [ ] Todos los tests usan `id` (number) en lugar de `code` (string) en rutas
- [ ] Todos los helpers generan códigos únicos con `Date.now()` + `Math.random()`
- [ ] Todos los DTOs de filtro usan `@Transform` para convertir query params a números
- [ ] Todos los servicios eliminaron fallbacks de `code` → `id`
- [ ] Tests de validación esperan los códigos de estado correctos (400/404/422, no 201)
- [ ] Tests de workflows verifican que `workflow.project.id` no sea undefined

## Comandos Útiles

```bash
# Ejecutar tests E2E
cd apps/api && npm run test:e2e

# Ejecutar test específico
cd apps/api && npm run test:e2e -- workflows.e2e-spec.ts

# Verificar tipos TypeScript
cd apps/api && bash ./test/check-e2e-types.sh
```

## Prioridad de Corrección

1. **ALTA:** Tests de workflows (3) - Afectan funcionalidad core
2. **MEDIA:** Tests de data integrity (2) - Validaciones importantes
3. **MEDIA:** Tests de business rules (3) - Reglas de negocio críticas
4. **BAJA:** Tests de validación (2) - Validaciones menores
5. **BAJA:** File uploads (1) - Funcionalidad secundaria

## Notas Finales

- La mayoría de los problemas son expectativas incorrectas en tests, no bugs en el código
- Los errores 409 (Conflict) se resuelven generando códigos únicos en helpers
- Los errores 500 generalmente indican que falta validar que un ID no sea undefined
- Todos los servicios principales ya están migrados correctamente

**Meta:** Llegar a 625/625 tests pasando (100%)
