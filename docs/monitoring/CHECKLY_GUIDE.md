# Guía de Checkly para Shogun - Free Tier (CLI)

## Tabla de Contenidos

1. [Resumen](#resumen)
2. [Free Tier - Límites](#free-tier---límites)
3. [Setup con CLI](#setup-con-cli)
4. [Monitores (10 máximo)](#monitores-10-máximo)
5. [Código de los Checks](#código-de-los-checks)
6. [Troubleshooting](#troubleshooting)
7. [Checklist](#checklist)

---

## Resumen

**Checkly** proporciona monitoreo 24/7 de producción con alertas automáticas. **No se usa en CI**, solo para monitoreo continuo post-deploy.

| Aspecto | Checkly | CI/CD | E2E Tests |
|---------|---------|-------|-----------|
| **Propósito** | Monitoreo producción | Validación código | Validación funcional |
| **Cuándo** | 24/7 | PRs/push | Manual/CI |
| **Cobertura** | 10 smoke tests | Build, lint, unit | 300+ API + 450+ Web |

### Arquitectura Monitoreada

- **API**: `https://shogunapi.uliber.com` (NestJS)
- **Frontend**: `https://shogunweb.uliber.com` (React + Vite)
- **MinIO**: `https://shogunminio.yourdomain.com`

---

## Free Tier - Límites

| Recurso | Límite | Estrategia |
|---------|--------|------------|
| **Uptime Monitors** | 10 | Priorizar críticos |
| **API checks/mes** | 10,000 | ~9,500 planificados |
| **Browser checks/mes** | 1,000 | ~720 planificados |
| **Frecuencia mínima** | 2 min | Balancear según criticidad |
| **Ubicaciones** | 4 | Usar `us-east-1` |
| **Alertas** | Ilimitadas | Email + Slack |

### Distribución de Ejecuciones

| Monitor | Frecuencia | Ejecuciones/mes |
|---------|------------|-----------------|
| API Health Básico | 10 min | 4,320 |
| API Health Completo | 20 min | 2,160 |
| Authentication | 60 min | 720 |
| Get Projects | 60 min | 720 |
| MinIO Health | 60 min | 720 |
| Swagger Docs | 120 min | 360 |
| **Total Browser** | - | **~720** ✅ |

---

## Setup con CLI

### 1. Instalación

```bash
# Como dev dependency (recomendado)
npm install --save-dev @checkly/cli

# O globalmente
npm install -g @checkly/cli
```

### 2. Autenticación con API Key

**Opción A: Usar API Key de Checkly (Recomendado para CI/CD)**

1. **Obtener API Key desde Checkly Dashboard**:
   - Ir a **Account Settings** → **API Keys**
   - Crear nueva API Key
   - Copiar el **API Key** y el **Account ID**

2. **Configurar variables de entorno**:
   ```bash
   export CHECKLY_API_KEY=your_checkly_api_key
   export CHECKLY_ACCOUNT_ID=your_account_id
   ```

3. **Verificar autenticación**:
   ```bash
   npx checkly whoami
   ```

**Opción B: Login interactivo (Para desarrollo local)**

```bash
npx checkly login
```

### 3. Configuración del Proyecto

Crear `checkly.config.ts` en la raíz:

```typescript
import { defineConfig } from 'checkly';

export default defineConfig({
  projectName: 'Shogun Production',
  logicalId: 'shogun-monitoring',
  repoUrl: 'https://github.com/oinotna/shogun',
  checks: {
    locations: ['us-east-1'],
    tags: ['production'],
    runtimeId: '2024.02',
    checkMatch: 'checkly/**/*.check.ts',
    browserChecks: {
      testMatch: 'checkly/**/*.spec.ts',
    },
  },
  cli: {
    runLocation: 'us-east-1',
  },
});
```

### 4. Estructura de Directorios

```bash
mkdir -p checkly/{api-checks,browser-checks}
```

```
checkly/
├── api-checks/
│   ├── health.check.ts
│   ├── auth.check.ts
│   └── services.check.ts
└── browser-checks/
    ├── homepage.spec.ts
    └── login.spec.ts
```

### 5. Variables de Entorno

Configurar en Checkly Dashboard → Settings → Environment Variables:

| Variable | Descripción |
|----------|-------------|
| `CHECKLY_TEST_USER_EMAIL` | Email del usuario de prueba de Shogun |
| `CHECKLY_TEST_USER_PASSWORD` | Password del usuario de prueba de Shogun |

> ⚠️ **Importante**: 
> - Crear un usuario específico para monitoring con permisos mínimos
> - Los checks hacen login automáticamente usando estas credenciales
> - No es necesario generar tokens JWT manualmente

### 7. Comandos CLI

```bash
# Probar checks localmente
npx checkly test

# Desplegar a Checkly
npx checkly deploy

# Ver checks desplegados
npx checkly list

# Destruir checks (con cuidado)
npx checkly destroy
```

---

## Monitores (10 máximo)

### Críticos (5)

| # | Monitor | Tipo | Frecuencia | Propósito |
|---|---------|------|------------|-----------|
| 1 | API Health Básico | API | 10 min | Verifica `/health` |
| 2 | API Health Completo | API | 20 min | Verifica `/api/v1/health` (DB, MinIO) |
| 3 | Frontend Homepage | Browser | 90 min | Carga y conectividad |

### Importantes (3)

| # | Monitor | Tipo | Frecuencia | Propósito |
|---|---------|------|------------|-----------|
| 6 | Authentication Login | API | 60 min | Verifica que login funciona |
| 7 | Get Projects | API | 60 min | API autenticada funciona |
| 8 | Login Flow | Browser | 180 min | Flujo completo de login |

### Informativos (2)

| # | Monitor | Tipo | Frecuencia | Propósito |
|---|---------|------|------------|-----------|
| 9 | Swagger Docs | API | 120 min | Documentación disponible |
| 10 | MinIO Health | API | 60 min | Storage accesible |

---

## Código de los Checks

### `checkly/api-checks/health.check.ts`

```typescript
import { ApiCheck, AssertionBuilder } from 'checkly/constructs';

// Monitor #1: API Health Básico (10 min)
new ApiCheck('api-health-basic', {
  name: 'API Health - Basic',
  activated: true,
  frequency: 10,
  locations: ['us-east-1'],
  request: {
    method: 'GET',
    url: 'https://shogunapi.uliber.com/health',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody('$.status').equals('ok'),
      AssertionBuilder.responseTime().lessThan(500),
    ],
  },
  tags: ['api', 'health', 'critical'],
});

// Monitor #2: API Health Completo (20 min)
new ApiCheck('api-health-complete', {
  name: 'API Health - Complete (Terminus)',
  activated: true,
  frequency: 20,
  locations: ['us-east-1'],
  request: {
    method: 'GET',
    url: 'https://shogunapi.uliber.com/api/v1/health',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody('$.status').equals('ok'),
      AssertionBuilder.jsonBody('$.info.database.status').equals('up'),
      AssertionBuilder.responseTime().lessThan(2000),
    ],
  },
  tags: ['api', 'health', 'database', 'critical'],
});
```


### `checkly/api-checks/auth.check.ts`

```typescript
import { ApiCheck, AssertionBuilder } from 'checkly/constructs';

// Monitor #6: Authentication - Login (60 min)
// Verifica que el login con email/password funciona correctamente
new ApiCheck('auth-login', {
  name: 'Authentication - Login',
  activated: true,
  frequency: 60,
  locations: ['us-east-1'],
  request: {
    method: 'POST',
    url: 'https://shogunapi.uliber.com/auth/login',
    headers: [{ key: 'Content-Type', value: 'application/json' }],
    body: JSON.stringify({
      email: '{{CHECKLY_TEST_USER_EMAIL}}',
      password: '{{CHECKLY_TEST_USER_PASSWORD}}',
    }),
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.jsonBody('$.tokens.accessToken').notEmpty(),
      AssertionBuilder.jsonBody('$.user.email').notEmpty(),
      AssertionBuilder.responseTime().lessThan(2000),
    ],
  },
  tags: ['auth', 'login', 'important'],
});
```

### `checkly/api-checks/services.check.ts`

```typescript
import { ApiCheck, AssertionBuilder } from 'checkly/constructs';

// Monitor #7: Get Projects (60 min) - Hace login primero para obtener token
new ApiCheck('get-projects', {
  name: 'API - Get Projects (Authenticated)',
  activated: true,
  frequency: 60,
  locations: ['us-east-1'],
  setupScript: {
    content: `
      const loginResponse = await fetch('https://shogunapi.uliber.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.CHECKLY_TEST_USER_EMAIL,
          password: process.env.CHECKLY_TEST_USER_PASSWORD,
        }),
      });
      const loginData = await loginResponse.json();
      request.headers = request.headers || {};
      request.headers['Authorization'] = 'Bearer ' + loginData.tokens.accessToken;
    `,
  },
  request: {
    method: 'GET',
    url: 'https://shogunapi.uliber.com/projects',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(3000),
    ],
  },
  tags: ['api', 'projects', 'authenticated', 'important'],
});

// Monitor #9: Swagger Docs (120 min)
new ApiCheck('swagger-docs', {
  name: 'Swagger Documentation',
  activated: true,
  frequency: 120,
  locations: ['us-east-1'],
  request: {
    method: 'GET',
    url: 'https://shogunapi.uliber.com/api',
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(5000),
    ],
  },
  tags: ['docs', 'swagger', 'informative'],
});
```

### `checkly/browser-checks/homepage.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

// Monitor #4: Frontend Homepage (90 min)
test('Homepage loads correctly', async ({ page }) => {
  // Navigate to homepage
  const response = await page.goto('https://shogunweb.uliber.com', {
    waitUntil: 'networkidle',
    timeout: 15000,
  });

  // Verify page loaded
  expect(response?.status()).toBe(200);
  await expect(page.locator('body')).toBeVisible();

  // Verify no critical console errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  // Verify API is reachable from frontend
  const apiResponse = await page.request.get('https://shogunapi.uliber.com/health');
  expect(apiResponse.status()).toBe(200);

  // Assert no critical errors
  expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
});
```

### `checkly/browser-checks/login.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

// Monitor #8: Login Flow (180 min)
test('Login flow works correctly', async ({ page }) => {
  // Navigate to login
  await page.goto('https://shogunweb.uliber.com/login', {
    waitUntil: 'networkidle',
    timeout: 15000,
  });

  // Verify login page loaded
  await expect(page.locator('form')).toBeVisible();

  // Fill credentials
  await page.fill('[name="email"], [type="email"]', process.env.CHECKLY_TEST_USER_EMAIL!);
  await page.fill('[name="password"], [type="password"]', process.env.CHECKLY_TEST_USER_PASSWORD!);

  // Submit form
  await page.click('[type="submit"], button:has-text("Login"), button:has-text("Iniciar")');

  // Wait for navigation (successful login redirects)
  await page.waitForURL(/\/(dashboard|home|projects)/, { timeout: 10000 });

  // Verify we're logged in
  expect(page.url()).not.toContain('/login');
});
```

---


---

## Troubleshooting

### Diagnóstico Rápido

```bash
# Verificar procesos
ps aux | grep "node"

# Verificar servicios locales
curl http://localhost:3002/health   # API
curl http://localhost:3003          # Frontend
curl http://localhost:9010/minio/health/live

# Verificar desde internet
curl -I https://shogunapi.uliber.com/health
curl -I https://shogunweb.uliber.com
```

**Servicio local no responde:**
```bash
docker ps
docker-compose -f docker-compose.production.yml restart api
docker-compose -f docker-compose.production.yml restart web
```

### Problemas Comunes

| Problema | Solución |
|----------|----------|
| Checks fallan sin razón | Aumentar timeout, revisar assertions |
| Alertas muy frecuentes | Configurar 2 fallos consecutivos |
| False positives | Ajustar thresholds de response time |

---

## Checklist

### Día 1: Setup

- [ ] Crear cuenta Checkly (plan Hobby/gratuito)
- [ ] Instalar CLI: `npm install -D @checkly/cli`
- [ ] Login: `npx checkly login`
- [ ] Crear `checkly.config.ts`
- [ ] Crear estructura de directorios
- [ ] Crear usuario de prueba en la app
- [ ] Configurar variables de entorno en Checkly Dashboard

### Día 2: Checks Críticos

- [ ] Crear `health.check.ts` (Monitores #1, #2)
- [ ] Probar: `npx checkly test`
- [ ] Desplegar: `npx checkly deploy`
- [ ] Verificar alertas funcionan

### Día 3: Checks Restantes

- [ ] Crear `auth.check.ts` (Monitor #6)
- [ ] Crear `services.check.ts` (Monitores #7, #9)
- [ ] Crear `homepage.spec.ts` (Monitor #4)
- [ ] Crear `login.spec.ts` (Monitor #8)
- [ ] Desplegar: `npx checkly deploy`
- [ ] Verificar 10 monitores activos

### Día 4: Validación

- [ ] Verificar todos los checks pasan
- [ ] Revisar métricas en Dashboard
- [ ] Confirmar alertas configuradas
- [ ] Documentar cualquier ajuste

---

## Métricas Objetivo

| Métrica | Objetivo |
|---------|----------|
| Uptime | > 99.9% |
| API Response Time (p95) | < 500ms |
| Frontend Load Time | < 3s |
| Time to Detect | < 20 min |
| MTTR | < 15 min |

---

## Seguridad

- ✅ Variables de entorno para credenciales (nunca hardcodear)
- ✅ Usuario de prueba con permisos mínimos
- ✅ Rotar credenciales periódicamente

## Mantenimiento

- **Semanal**: Revisar métricas
- **Mensual**: Actualizar checks si hay cambios en endpoints
- **Trimestral**: Revisar estrategia de monitoreo

---

**Última actualización**: 2025-12-17  
**Plan**: Hobby (Free Tier) - 10 Monitors  
**Configuración**: CLI (Infrastructure as Code)
