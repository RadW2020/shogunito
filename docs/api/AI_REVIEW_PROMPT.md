# Prompt para Revisión de Tests E2E y Código Base - Shogun API

## Contexto del Proyecto

Eres un experto en desarrollo de software, testing y arquitectura de APIs. Estás revisando un proyecto NestJS llamado **Shogun API**, una plataforma para gestión de producción audiovisual con soporte para workflows de generación de video por IA.

### Dominio de Negocio

**Shogun** gestiona proyectos de producción audiovisual organizados jerárquicamente:

```
Project (Proyecto)
  └── Episode (Episodio)
      └── Sequence (Secuencia)
          └── Shot (Plano/Toma)
              └── Version (Versión de contenido)
  └── Asset (Recurso: personajes, props, entornos, etc.)
      └── Version (Versión del asset)
  └── Playlist (Lista de reproducción para revisión)
      └── Version (Versiones incluidas)
```

**Entidades transversales:**

- **Users:** Con roles (admin, producer, reviewer, artist, member)
- **Statuses:** Estados personalizados aplicables a múltiples entidades
- **Notes:** Sistema de feedback colaborativo vinculado a cualquier entidad

### Reglas de Negocio Críticas

1. **Control de Versiones:**
   - Solo una versión puede ser "latest" por entidad (shot, asset, sequence, playlist)
   - Las versiones mantienen metadatos de IA (prompts, seeds, modelos, lineage)
   - Historial completo de versiones debe preservarse

2. **Jerarquía y Permisos:**
   - Permisos se heredan jerárquicamente (proyecto → episodio → secuencia → shot)
   - Roles determinan operaciones permitidas
   - Estados de proyecto afectan qué operaciones están disponibles

3. **Integridad de Datos:**
   - Códigos únicos por tipo de entidad (project.code, episode.code, etc.)
   - Cascade deletes en jerarquía (eliminar proyecto elimina episodios, secuencias, shots)
   - No se permiten registros huérfanos
   - Foreign keys deben mantenerse consistentes

4. **Seguridad:**
   - Autenticación JWT requerida para todas las operaciones
   - Rate limiting por usuario e IP
   - Validación contra SQL injection y XSS
   - Sanitización de entrada de datos

## Problema Actual

**Estado:** Todos los tests E2E (25 suites) fallan antes de ejecutarse debido a un error de configuración de Jest.

**Error específico:**

```
SyntaxError: Unexpected token 'export'
/packages/shared/dist/index.js:1
export const BaseStatus = {
^^^^^^
```

**Causa:** El paquete `@shogun/shared` está compilado como ES Module (`"type": "module"`), pero Jest está configurado para CommonJS y no puede transformar el paquete compartido.

**Archivos afectados:**

- `apps/api/test/jest-e2e.json` - Configuración de Jest
- `packages/shared/package.json` - Paquete compartido con ES modules
- Todos los archivos de test que importan desde `@shogun/shared`

## Tu Tarea

### Fase 1: Corregir el Problema de Configuración

1. **Analizar la configuración actual:**
   - Revisar `apps/api/test/jest-e2e.json`
   - Revisar `packages/shared/package.json`
   - Revisar `apps/api/test/tsconfig.e2e.json`

2. **Proponer y aplicar solución:**
   - Opción A: Configurar `transformIgnorePatterns` en Jest para transformar el paquete compartido
   - Opción B: Usar `moduleNameMapper` para mockear o transformar el paquete
   - Opción C: Recompilar el paquete compartido como CommonJS para tests
   - Opción D: Configurar Jest para soportar ES modules nativamente

3. **Verificar que los tests puedan ejecutarse:**
   - Ejecutar `npm run test:e2e` y confirmar que al menos se inician los tests

### Fase 2: Ejecutar y Analizar Tests

Una vez corregido el problema de configuración:

1. **Ejecutar todos los tests E2E:**

   ```bash
   cd apps/api
   npm run test:e2e
   ```

2. **Clasificar los resultados:**
   - ✅ Tests que pasan correctamente
   - ⚠️ Tests que fallan por problemas en el código base (bugs reales)
   - 🔧 Tests que fallan por problemas en los tests mismos (expectativas incorrectas, datos de prueba incorrectos, etc.)
   - 📝 Tests que necesitan mejoras o están incompletos

3. **Para cada test que falle, determinar:**
   - ¿El código base tiene un bug que necesita corrección?
   - ¿El test tiene expectativas incorrectas o datos de prueba mal formados?
   - ¿Falta implementar alguna funcionalidad que el test espera?
   - ¿El test está probando un caso edge que no debería ser válido?

### Fase 3: Revisar Reglas de Negocio

Analizar el código base y los tests para verificar que las reglas de negocio críticas estén correctamente implementadas y probadas:

1. **Control de Versiones:**
   - Verificar que solo una versión puede ser "latest" por entidad
   - Verificar que el cambio de "latest" actualiza correctamente otras versiones
   - Verificar que los metadatos de IA se guardan correctamente

2. **Jerarquía y Permisos:**
   - Verificar herencia de permisos en la jerarquía
   - Verificar que los roles restringen operaciones correctamente
   - Verificar que los estados afectan operaciones disponibles

3. **Integridad de Datos:**
   - Verificar constraints de unicidad (códigos)
   - Verificar cascade deletes funcionan correctamente
   - Verificar que no se permiten registros huérfanos
   - Verificar foreign keys se mantienen consistentes

4. **Seguridad:**
   - Verificar autenticación JWT funciona correctamente
   - Verificar rate limiting está implementado
   - Verificar validación contra SQL injection y XSS
   - Verificar sanitización de datos

### Fase 4: Proponer Tests Adicionales

Identificar puntos críticos del negocio que NO están cubiertos por tests actuales y proponer nuevos tests:

1. **Flujos de producción completos:**
   - ¿Hay tests para workflows completos de principio a fin?
   - ¿Se prueban transiciones de estado complejas?
   - ¿Se prueban operaciones en batch?

2. **Casos edge críticos:**
   - ¿Qué pasa si se elimina una entidad padre mientras hay operaciones en curso?
   - ¿Qué pasa con versiones cuando se elimina la entidad padre?
   - ¿Cómo se manejan conflictos de concurrencia?

3. **Rendimiento y escalabilidad:**
   - ¿Hay tests de carga para operaciones críticas?
   - ¿Se prueban queries complejas con grandes volúmenes de datos?
   - ¿Se prueban operaciones concurrentes?

4. **Seguridad avanzada:**
   - ¿Se prueban todos los vectores de ataque comunes?
   - ¿Se prueban bypass de autenticación?
   - ¿Se prueban inyecciones en diferentes contextos?

## Archivos Clave para Revisar

### Configuración

- `apps/api/test/jest-e2e.json`
- `apps/api/test/tsconfig.e2e.json`
- `apps/api/test/tsconfig.jest.json`
- `packages/shared/package.json`
- `apps/api/package.json` (script test:e2e)

### Tests Críticos (revisar en detalle)

- `test/e2e/business-rules.e2e-spec.ts` - Reglas de negocio complejas
- `test/e2e/workflows.e2e-spec.ts` - Flujos completos de trabajo
- `test/e2e/data-integrity.e2e-spec.ts` - Integridad de datos
- `test/e2e/security.e2e-spec.ts` - Seguridad
- `test/e2e/versions.e2e-spec.ts` - Control de versiones

### Código Base Relevante

- `src/entities/*.entity.ts` - Todas las entidades del dominio
- `src/auth/auth.service.ts` - Lógica de autenticación
- `src/auth/guards/*.guard.ts` - Guards de autorización
- `src/common/interceptors/*.interceptor.ts` - Interceptores
- `src/common/pipes/*.pipe.ts` - Pipes de validación
- `src/*/services/*.service.ts` - Servicios de negocio

### Helpers de Test

- `test/helpers/test-utils.ts` - Utilidades para tests

## Entregables Esperados

1. **Corrección del problema de configuración:**
   - Cambios aplicados en archivos de configuración
   - Tests pueden ejecutarse (aunque algunos puedan fallar)

2. **Reporte de análisis de tests:**
   - Lista de tests que pasan
   - Lista de tests que fallan con análisis de causa
   - Clasificación: bug en código vs problema en test

3. **Correcciones propuestas:**
   - Correcciones al código base donde haya bugs reales
   - Correcciones a tests donde las expectativas sean incorrectas
   - Mejoras a tests existentes

4. **Propuesta de nuevos tests:**
   - Lista de puntos críticos no cubiertos
   - Tests propuestos con descripción de qué prueban
   - Priorización (crítico, alto, medio, bajo)

5. **Documentación:**
   - Resumen ejecutivo de hallazgos
   - Recomendaciones para mejorar la suite de tests
   - Mejores prácticas identificadas y áreas de mejora

## Criterios de Éxito

- ✅ Todos los tests pueden ejecutarse sin errores de configuración
- ✅ Al menos 80% de los tests pasan (objetivo ideal: 95%+)
- ✅ Todos los bugs críticos en código base están identificados y corregidos
- ✅ Tests con expectativas incorrectas están corregidos
- ✅ Se proponen al menos 10 nuevos tests para puntos críticos no cubiertos
- ✅ El reporte es claro, accionable y priorizado

## Notas Importantes

- **Priorizar correcciones:** Enfocarse primero en bugs críticos de negocio (integridad de datos, seguridad, control de versiones)
- **Mantener coherencia:** Los tests deben reflejar el comportamiento real esperado del sistema, no solo lo que el código hace actualmente
- **Considerar el negocio:** Al decidir si corregir código o test, pensar en qué es lo correcto desde la perspectiva del dominio de negocio
- **Documentar decisiones:** Explicar el razonamiento detrás de cada corrección o propuesta

## Comenzar Aquí

1. Primero, corrige el problema de configuración de Jest para que los tests puedan ejecutarse
2. Luego ejecuta todos los tests y analiza los resultados
3. Revisa el código base para entender la implementación actual
4. Compara las expectativas de los tests con la implementación real
5. Toma decisiones informadas sobre qué corregir (código vs tests)
6. Propone mejoras y nuevos tests

¡Buena suerte con la revisión!
