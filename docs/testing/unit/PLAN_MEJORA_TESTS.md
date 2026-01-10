# 🛠️ Plan de Mejora de Tests - Implementación Detallada

**Fecha:** 2025-11-29  
**Objetivo:** Alcanzar 100% de tests passing y mejorar confiabilidad

---

## 🎯 Problemas a Resolver

### 1. Tests de Optimistic Updates Fallando (8 tests)

**Archivos:**

- `useProjectsOptimistic.test.tsx` (4/6 failing)
- `useNotesOptimistic.test.tsx` (4/8 failing)

**Tests que fallan:**

```
✗ should create project with optimistic update (expects temp ID to be replaced)
✗ should rollback on error (create)
✗ should rollback on error (update)
✗ should rollback on error (delete)
✗ should handle toggle error (notes)
```

**Root Cause:**

El hook `useOptimisticMutation` hace rollback correctamente, pero hay un **timing issue**:

1. Cuando hay error, `onError` ejecuta:

   ```typescript
   queryClient.setQueryData(ctx.queryKey, ctx.previousData);
   ```

2. Pero React Query puede:
   - Procesar el cambio de forma asíncrona internamente
   - Tener race conditions con invalidaciones pendientes
   - No reflejar el cambio inmediatamente en `getQueryData()`

3. Los tests usan `waitFor` con timeout de 5000ms, pero aún así fallan porque:
   - `waitFor` revisa el estado cada 50ms por defecto
   - Si el rollback toma más de 5000ms = timeout
   - Si hay race condition = estado inconsistente

**Solución:**

Modificar `useOptimisticMutation.ts` para:

1. Cancelar queries pendientes ANTES del rollback
2. Usar `await` para asegurar que se procesa
3. No invalidar queries cuando hay error (ya está implementado)

---

### 2. PrivateRoute Tests No Ejecutados (6 tests)

**Archivo:** `PrivateRoute.test.tsx`

**Root Cause:**

Conflicto en mocks:

```typescript
// Línea 74-79: Mock de AuthProvider
vi.mock('../../../contexts/AuthContext', () => ({
  AuthContext: {
    Provider: ({ children }: any) => children,
  },
  AuthProvider: ({ children }: any) => children,
}));

// Línea 82-84: Mock de useAuth
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockAuthContext,
}));

// Pero TestWrapper usa AuthProvider real (línea 56)
<AuthProvider>
  <MemoryRouter>{children}</MemoryRouter>
</AuthProvider>
```

Esto crea una circularidad y previene ejecución.

**Solución:**

Refactorizar TestWrapper para NO usar AuthProvider, solo el contexto mockeado.

---

## 🔧 Implementación

### Fix #1: useOptimisticMutation.ts

**Cambios en `onError` (líneas 131-154):**

```typescript
// ❌ ANTES (PROBLEMÁTICO)
onError: (error, variables, context, ...args: any[]) => {
  if (optimistic && context && typeof context === 'object') {
    const ctx = context as any;
    if (ctx.previousData !== undefined && ctx.queryKey) {
      // Restore previous data synchronously
      queryClient.setQueryData(ctx.queryKey, ctx.previousData);
    }
  }
  // ...
};

// ✅ DESPUÉS (CORREGIDO)
onError: async (error, variables, context, ...args: any[]) => {
  if (optimistic && context && typeof context === 'object') {
    const ctx = context as any;
    if (ctx.previousData !== undefined && ctx.queryKey) {
      // Cancel any pending queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ctx.queryKey });
      // Restore previous data
      queryClient.setQueryData(ctx.queryKey, ctx.previousData);
    }
  }
  // ...
};
```

**Justificación:**

- `await cancelQueries()` asegura que no hay queries pendientes
- Elimina race conditions
- Rollback es inmediato y confiable

---

### Fix #2: useProjectsOptimistic.test.tsx y useNotesOptimistic.test.tsx

**Cambios en tests de rollback:**

```typescript
// ❌ ANTES
await waitFor(
  () => {
    const data = queryClient.getQueryData(['projects']) as any[];
    expect(data).toEqual(initialProjects);
  },
  { timeout: 5000 }, // ⚠️ Muy largo
);

// ✅ DESPUÉS
await waitFor(
  () => {
    const data = queryClient.getQueryData(['projects']) as any[];
    expect(data).toEqual(initialProjects);
  },
  { timeout: 1000, interval: 10 }, // ✅ Más corto, más frecuente
);
```

**Justificación:**

- Si toma más de 1 segundo = hay un bug real
- Interval de 10ms detecta cambios más rápido
- Tests más rápidos y confiables

---

### Fix #3: PrivateRoute.test.tsx

**Refactorizar TestWrapper:**

```typescript
// ❌ ANTES
vi.mock('../../../contexts/AuthContext', () => ({
  AuthContext: {
    Provider: ({ children }: any) => children,
  },
  AuthProvider: ({ children }: any) => children,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient(...);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>  {/* ⚠️ Usa AuthProvider mockeado */}
        <MemoryRouter>{children}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// ✅ DESPUÉS
vi.mock('../../../contexts/AuthContext', () => ({
  AuthContext: React.createContext(null),
  AuthProvider: ({ children }: any) => {
    const mockValue = {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    };
    return (
      <AuthContext.Provider value={mockValue}>
        {children}
      </AuthContext.Provider>
    );
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient(...);
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};
```

**Justificación:**

- Mock más explícito y controlado
- No hay circularidad
- Tests se ejecutarán correctamente

---

## 📋 Checklist de Implementación

### Fase 1: Arreglar useOptimisticMutation (30 min)

- [x] Analizar problema en `onError`
- [ ] Hacer `onError` async
- [ ] Agregar `await cancelQueries()`
- [ ] Testing manual
- [ ] Correr tests de Projects y Notes
- [ ] Validar que pasan

### Fase 2: Ajustar Tests (1 hora)

- [ ] Reducir timeouts a 1000ms
- [ ] Agregar interval de 10ms
- [ ] Correr todos los tests
- [ ] Validar 100% passing

### Fase 3: Arreglar PrivateRoute (30 min)

- [ ] Refactorizar mocks de AuthContext
- [ ] Simplificar TestWrapper
- [ ] Correr tests de PrivateRoute
- [ ] Validar 6/6 tests passing

### Fase 4: Validación Final (30 min)

- [ ] Correr `npm test -- --run` completo
- [ ] Validar 892/892 tests passing
- [ ] Generar coverage report
- [ ] Documentar cambios

---

## 🎯 Resultados Esperados

### Antes

```
Test Files: 58 passed | 2 failed (61)
Tests: 878 passed | 8 failed (892)
Duration: 71.07s
```

### Después

```
Test Files: 61 passed (61)
Tests: 892 passed (892)
Duration: ~60s (más rápido por timeouts reducidos)
```

---

## 🚀 Próximos Pasos (Post-Fix)

1. **Agregar Coverage Report en CI**

   ```bash
   npm test -- --coverage --run
   ```

2. **Agregar Pre-commit Hook**

   ```bash
   npm test -- --run --bail
   ```

3. **Documentar Patrón de Testing**
   - Crear guía para nuevos tests
   - Ejemplos de mocking
   - Best practices

4. **Agregar Integration Tests**
   - Flujos completos
   - Error scenarios
   - Performance tests

---

## 📝 Notas de Implementación

### Cambio en onError - Consideraciones

El cambio de `onError` a `async onError` es **seguro**:

- React Query @ soporta async callbacks
- No rompe compatibilidad
- Mejora confiabilidad

### Testing Strategy

Para cada fix:

1. Implementar cambio
2. Correr test afectado
3. Si pasa: continuar
4. Si falla: debuggear y ajustar
5. Repetir hasta 100% passing

### Rollback Plan

Si algo falla:

1. Git stash/revert
2. Revisar errores
3. Ajustar approach
4. Reintentar

---

**Estado:** 🟡 READY TO IMPLEMENT  
**Tiempo estimado total:** 2.5 horas  
**Prioridad:** 🔴 CRÍTICA
