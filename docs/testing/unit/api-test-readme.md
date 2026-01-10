# Tests E2E - Shogun API

Este directorio contiene los tests end-to-end (e2e) para la API de Shogun.

## Pre-requisitos

Para ejecutar los tests e2e, necesitas tener corriendo:

1. **PostgreSQL** en `localhost:5432`
   - Usuario: `dev`
   - Contraseña: `dev`
   - Base de datos: `shogun`

2. **MinIO** (opcional, algunos tests pueden fallar sin él)
   - Endpoint: `localhost:9000`
   - Access Key: `minio`
   - Secret Key: `minio123`

## Configuración

### Opción 1: Docker Compose

```bash
# Desde la raíz del monorepo
docker-compose up -d postgres minio
```

### Opción 2: Instalación manual

#### PostgreSQL

```bash
# Crear usuario y base de datos
createuser dev
createdb shogun -O dev
psql shogun -c "ALTER USER dev WITH PASSWORD 'dev';"
```

#### MinIO (opcional)

```bash
# Instalar y configurar MinIO según la documentación oficial
```

## Ejecutar Tests

```bash
# Todos los tests e2e
npm run test:e2e

# Solo tests de recuperación de contraseña
npm run test:e2e -- --testPathPatterns=auth-password-recovery

# Con verbose
npm run test:e2e -- --verbose

# Solo un test específico
npm run test:e2e -- --testPathPatterns=auth-password-recovery -t "should send password reset email"
```

## Tests de Recuperación de Contraseña

El archivo `auth-password-recovery.e2e-spec.ts` contiene tests completos para el flujo de recuperación de contraseña:

### Cobertura de Tests

1. **POST /auth/forgot-password**
   - ✓ Enviar email para usuario válido
   - ✓ Mensaje genérico para usuario inexistente (seguridad)
   - ✓ Mensaje genérico para usuario inactivo (seguridad)
   - ✓ Rechazo de email inválido
   - ✓ Rechazo de petición sin email
   - ✓ Creación de token en base de datos

2. **POST /auth/validate-reset-token**
   - ✓ Validación de token válido
   - ✓ Rechazo de token inválido
   - ✓ Rechazo de token expirado
   - ✓ Rechazo de petición sin token

3. **POST /auth/reset-password**
   - ✓ Reset exitoso con token válido
   - ✓ Validación de contraseña (min 8 caracteres)
   - ✓ Validación de contraseña (requiere mayúscula)
   - ✓ Validación de contraseña (requiere minúscula)
   - ✓ Validación de contraseña (requiere número)
   - ✓ Rechazo de token inválido
   - ✓ Rechazo de token expirado
   - ✓ Rechazo para usuario inactivo
   - ✓ Invalidación de refresh tokens
   - ✓ Login con nueva contraseña
   - ✓ No login con contraseña antigua

4. **Flujo Completo (Integración)**
   - ✓ Flujo completo de recuperación
   - ✓ No reutilización de tokens
   - ✓ Generación de nuevo token en nueva solicitud

## Estructura de Tests

```typescript
beforeAll(); // Inicializa la app NestJS y la base de datos
beforeEach(); // Limpia la BD y crea usuario de prueba
afterAll(); // Cierra la app

describe(); // Agrupa tests por endpoint
it(); // Test individual
```

## Mocks

Los tests utilizan mocks para:

- **EmailService**: No envía emails reales durante los tests
  - `sendPasswordResetEmail`: mockeado
  - `sendPasswordChangedEmail`: mockeado

## Troubleshooting

### Error: Cannot connect to database

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solución**: Asegúrate de que PostgreSQL esté corriendo en el puerto 5432.

### Error: Timeout en beforeAll

```
Exceeded timeout of 5000 ms for a hook
```

**Solución**: Aumenta el timeout en jest o asegúrate de que la base de datos esté accesible.

### Tests pasan pero la base de datos no se limpia

**Solución**: Los tests limpian la base de datos en `beforeEach()`. Si esto falla, puedes limpiar manualmente:

```sql
TRUNCATE TABLE users CASCADE;
```

## Configuración Adicional

### jest-e2e.json

Configuración de Jest para tests e2e con soporte para TypeScript.

### tsconfig.e2e.json

Configuración de TypeScript específica para tests e2e que usa `commonjs` en lugar de `nodenext`.

## CI/CD

Para ejecutar estos tests en CI/CD, asegúrate de:

1. Tener un servicio de PostgreSQL disponible
2. Configurar las variables de entorno correctas
3. Ejecutar `npm run test:e2e` como parte del pipeline

Ejemplo para GitHub Actions:

```yaml
services:
  postgres:
    image: postgres:14
    env:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: shogun
    ports:
      - 5432:5432

steps:
  - name: Run e2e tests
    run: npm run test:e2e
```

## Notas

- Los tests son **destructivos**: limpian la base de datos antes de cada test
- No ejecutar tests e2e contra una base de datos de producción
- El EmailService está mockeado para evitar envíos reales
- Los tests usan la configuración del `.env` o valores por defecto

# API E2E Tests

Comprehensive end-to-end test suite for the Shogun API.

## Test Structure

```
test/
├── e2e/                      # E2E test suites
│   ├── auth.e2e-spec.ts     # Authentication & authorization tests
│   ├── validation.e2e-spec.ts # Input validation tests
│   ├── projects.e2e-spec.ts  # Projects CRUD tests
│   ├── versions.e2e-spec.ts  # Versions management tests
│   └── workflows.e2e-spec.ts # Integration workflow tests
├── helpers/                  # Test utilities
│   └── test-utils.ts        # Common test helpers and factories
├── setup.ts                  # Global test setup
└── app.e2e-spec.ts          # Basic app tests
```

## Running Tests

### Quick Start with Infrastructure

The easiest way to run E2E tests with all required infrastructure:

```bash
# From apps/api/test/ or project root
./apps/api/test/run-e2e-tests.sh

# With coverage
./apps/api/test/run-e2e-tests.sh --coverage

# Keep infrastructure running after tests
./apps/api/test/run-e2e-tests.sh --keep-running
```

This script automatically:

- ✅ Starts Docker containers (PostgreSQL, MinIO)
- ✅ Waits for services to be ready
- ✅ Runs the E2E tests
- ✅ Cleans up containers (unless --keep-running)

### Manual Setup

If you prefer manual control:

```bash
# 1. Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# 2. Wait for services to be ready (~5-10 seconds)

# 3. Run tests from apps/api/
cd apps/api
npm run test:e2e

# 4. Stop infrastructure when done
docker-compose -f ../../docker-compose.test.yml down -v
```

### All E2E Tests

```bash
npm run test:e2e
```

### Specific Test Suite

```bash
npm run test:e2e -- auth.e2e-spec.ts
```

### Watch Mode

```bash
npm run test:e2e -- --watch
```

### With Coverage

```bash
npm run test:e2e -- --coverage
```

## Test Infrastructure

The `docker-compose.test.yml` file provides dedicated testing infrastructure:

### PostgreSQL Test Database

- **Port:** 5434 (to avoid conflicts with development DB (5432) and production (5433))
- **Database:** shogun_test
- **User:** shogun_test
- **Password:** shogun_test_password
- Automatically cleaned between test runs

### MinIO Object Storage

- **API Port:** 9012 (to avoid conflicts with development MinIO (9000) and production (9010))
- **Console:** http://localhost:9013
- **Access Key:** minioadmin
- **Secret Key:** minioadmin
- Test buckets are automatically created

### Why Dedicated Infrastructure?

- **Isolation:** Tests don't interfere with development data
- **Speed:** Optimized for test performance
- **Reliability:** Consistent environment across machines
- **Safety:** Can be destroyed and recreated without losing dev data

## Test Coverage

### Authentication & Authorization (auth.e2e-spec.ts)

- ✅ User registration with validation
- ✅ User login with credentials
- ✅ Token-based authentication
- ✅ Token refresh mechanism
- ✅ Protected endpoint access
- ✅ Profile management
- ✅ Duplicate email/username handling
- ✅ Invalid credentials handling
- ✅ Token security

### Validation (validation.e2e-spec.ts)

- ✅ Required fields validation
- ✅ Data type validation
- ✅ Enum validation
- ✅ String length constraints
- ✅ Number range validation
- ✅ UUID format validation
- ✅ Empty values handling
- ✅ Special characters handling
- ✅ Additional fields rejection
- ✅ Array validation
- ✅ Query parameter validation
- ✅ Content-type validation

### Projects (projects.e2e-spec.ts)

- ✅ Project creation with valid data
- ✅ Project listing with pagination
- ✅ Project filtering by status
- ✅ Project search by name
- ✅ Project retrieval by ID
- ✅ Project updates
- ✅ Project deletion
- ✅ Cascade delete validation
- ✅ Duplicate code prevention
- ✅ Concurrent operations
- ✅ Edge cases (long descriptions, etc.)

### Versions (versions.e2e-spec.ts)

- ✅ Version creation for shots/assets
- ✅ Version listing with filters
- ✅ Version updates
- ✅ Version deletion
- ✅ Thumbnail upload
- ✅ File upload
- ✅ Latest flag management
- ✅ Entity relationship validation
- ✅ Multiple version handling
- ✅ Version comparison

### Custom Validators (custom-validators.e2e-spec.ts) 🆕

- ✅ SQL injection prevention (@IsNotSQLInjection)
- ✅ XSS attack prevention (@IsNotXSS)
- ✅ Safe filename validation (@IsSafeFilename)
- ✅ Video codec validation (@IsValidVideoCodec)
- ✅ Number range validation (@IsReasonableNumber)
- ✅ Strict email validation (@IsStrictEmail)
- ✅ URL protocol whitelisting (@IsWhitelistedURL)
- ✅ String trimming with length (@IsTrimmedLength)
- ✅ Edge cases and unicode handling

### Rate Limiting (rate-limiting.e2e-spec.ts) 🆕

- ✅ User-specific rate limits (per endpoint)
- ✅ IP-based global rate limiting
- ✅ Rate limit reset after TTL
- ✅ Concurrent request handling
- ✅ Separate limits for different users
- ✅ Separate limits for different endpoints
- ✅ Rate limit bypass prevention
- ✅ Performance under load

### User Preferences (user-preferences.e2e-spec.ts) 🆕

- ✅ Dark mode toggle and persistence
- ✅ Theme preferences (dark/light/system)
- ✅ Locale preferences
- ✅ Timezone preferences
- ✅ Notification preferences (email/push/slack)
- ✅ Display preferences
- ✅ Batch and partial updates
- ✅ Cross-user access prevention
- ✅ Input validation and sanitization

### Workflow Integration (workflows.e2e-spec.ts)

- ✅ Complete project hierarchy creation
- ✅ Project lifecycle management
- ✅ Shot versioning workflow
- ✅ Playlist creation and management
- ✅ Notes and feedback workflow
- ✅ Cascade delete verification
- ✅ Cross-entity queries
- ✅ Performance and load testing
- ✅ Data integrity validation
- ✅ Business rule enforcement
- ✅ Error recovery

## Mocks and Test Doubles

### Future Mocks

As the application grows, add more mocks to `__mocks__/` for:

- External APIs (weather, geocoding, etc.)
- Payment gateways
- Third-party authentication providers
- File processing services

## Test Utilities

The `test-utils.ts` file provides comprehensive helpers:

### Data Factories

- `createTestUserData()` - Generate test user data
- `createTestProjectData()` - Generate test project data
- `createTestEpisodeData()` - Generate test episode data
- `createTestSequenceData()` - Generate test sequence data
- `createTestShotData()` - Generate test shot data
- `createTestAssetData()` - Generate test asset data
- `createTestVersionData()` - Generate test version data
- `createTestPlaylistData()` - Generate test playlist data
- `createTestNoteData()` - Generate test note data

### Authentication Helpers

- `registerUser()` - Register a test user
- `loginUser()` - Login and get token
- `createAuthenticatedUser()` - Create user with token
- `createAdminUser()` - Create admin user
- `getAuthHeader()` - Get auth header for requests

### Entity Creation Helpers

- `createProject()` - Create a test project
- `createEpisode()` - Create a test episode
- `createSequence()` - Create a test sequence
- `createShot()` - Create a test shot
- `createAsset()` - Create a test asset
- `createVersion()` - Create a test version
- `createPlaylist()` - Create a test playlist
- `createNote()` - Create a test note

### Workflow Helpers

- `createCompleteWorkflow()` - Create full project hierarchy

### Assertion Helpers

- `expectValidationError()` - Assert validation error response
- `expectNotFoundError()` - Assert 404 response
- `expectUnauthorizedError()` - Assert 401 response
- `expectForbiddenError()` - Assert 403 response
- `expectConflictError()` - Assert 409 response
- `expectSuccessResponse()` - Assert successful response

## Writing New Tests

### Example Test Suite

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { registerUser, createProject, expectSuccessResponse } from '../helpers/test-utils';

describe('Feature E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Create authenticated user
    const { token } = await registerUser(app);
    authToken = token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /endpoint', () => {
    it('should work correctly', async () => {
      const response = await request(app.getHttpServer())
        .post('/endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: 'test' })
        .expect(201);

      expectSuccessResponse(response, 201);
    });
  });
});
```

## Best Practices

1. **Use Test Utilities**: Always use helpers from `test-utils.ts` for consistency
2. **Clean Test Data**: Each test should create its own data to avoid dependencies
3. **Descriptive Names**: Use clear, descriptive test names
4. **Group Related Tests**: Use nested `describe` blocks to organize tests
5. **Test Both Success and Failure**: Always test both happy paths and error cases
6. **Assert Thoroughly**: Check all relevant fields in responses
7. **Use beforeAll/afterAll**: Set up and tear down resources efficiently
8. **Avoid Test Interdependence**: Tests should be able to run independently
9. **Mock External Services**: Don't rely on external APIs or services
10. **Keep Tests Fast**: Optimize for speed while maintaining coverage

## Coverage Goals

- **Endpoint Coverage**: 80%+ of all API endpoints
- **Error Scenarios**: All error codes (400, 401, 403, 404, 409, 500)
- **Validation Rules**: All DTO validation rules
- **Business Logic**: All critical business rules
- **Integration Flows**: Key user workflows

## Continuous Integration

Tests are automatically run on:

- Pull request creation
- Push to main/dev branches
- Pre-deployment checks

## Troubleshooting

### Infrastructure Not Starting

**PostgreSQL connection refused:**

```bash
# Check if container is running
docker ps | grep postgres-test

# View logs
docker-compose -f docker-compose.test.yml logs postgres-test

# Restart infrastructure
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
```

**MinIO connection refused:**

```bash
# Check if MinIO is healthy
curl http://localhost:9012/minio/health/live

# View logs
docker-compose -f docker-compose.test.yml logs minio-test

# Restart MinIO
docker-compose -f docker-compose.test.yml restart minio-test
```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using port 5434
lsof -i :5434

# Check what's using port 9012
lsof -i :9012

# Either stop the conflicting service or change ports in:
# - docker-compose.test.yml
# - apps/api/test/setup.ts
```

### Tests Timing Out

Increase timeout in individual tests:

```typescript
it('slow test', async () => {
  // test code
}, 60000); // 60 second timeout
```

### Database Connection Errors

```bash
# Ensure database is ready
docker exec shogun-postgres-test pg_isready -U shogun_test

# Reset database
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
```

### Clean Slate

When all else fails, nuclear option:

```bash
# Stop and remove all test containers and volumes
docker-compose -f docker-compose.test.yml down -v

# Remove Docker images (optional)
docker rmi postgres:15-alpine minio/minio:latest

# Clear Jest cache
cd apps/api
npm run test:e2e -- --clearCache

# Restart from scratch
docker-compose -f ../../docker-compose.test.yml up -d
```

### Authentication Failures

Check that JWT_SECRET is set in test environment (configured in setup.ts).

### Port Conflicts During Tests

Make sure no other services are running on the test ports (5434, 9012, 6380).

## Contributing

When adding new features:

1. Write E2E tests first (TDD approach)
2. Ensure tests cover success and error cases
3. Add test utilities for reusable logic
4. Update this README with new test coverage
5. Run full test suite before committing

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
