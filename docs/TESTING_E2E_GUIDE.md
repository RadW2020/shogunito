# E2E Testing Guide - Shogun API

Complete guide for running end-to-end tests with Docker test infrastructure.

## 🎯 Overview

**Test Infrastructure:**

- PostgreSQL test database (port 5433)
- MinIO test storage (port 9001)

**Test Suites:** 7 suites, 300+ test cases
**Coverage Target:** >80%

---

## 🚀 Quick Start

### Option 1: Automated Script (Recommended)

```bash
# From project root
./apps/api/test/run-e2e-tests.sh --coverage
```

This script:

1. Starts Docker services (PostgreSQL, MinIO)
2. Waits for services to be ready
3. Runs all E2E tests
4. Generates coverage report
5. Cleans up containers

### Option 2: Manual Execution

```bash
# 1. Start test infrastructure
docker-compose -f docker-compose.test.yml up -d

# 2. Wait for services (~10 seconds)
sleep 10

# 3. Verify services
docker ps | grep -E "(postgres-test|minio-test)"

# 4. Run tests
cd apps/api
npm run test:e2e -- --coverage

# 5. Cleanup
docker-compose -f ../../docker-compose.test.yml down -v
```

---

## 🧪 Test Suites

### 1. Business Rules (300 lines)

**File:** `business-rules.e2e-spec.ts`

**Coverage:**

- Version management (one "latest" per entity)
- Project hierarchy constraints
- Shot numbering sequences
- Asset naming conventions
- Status workflow transitions
- Permission inheritance

### 2. File Uploads (900 lines)

**File:** `file-uploads-advanced.e2e-spec.ts`

**Coverage:**

- Large file uploads (up to 2GB)
- Size limits (5MB thumbnails, 100MB attachments, 2GB media)
- MIME type validation
- Corrupted files
- Concurrent uploads
- Virus scanning simulation

### 3. Pagination & Sorting (600 lines)

**File:** `pagination-sorting-advanced.e2e-spec.ts`

**Coverage:**

- Large datasets (100+ items)
- Edge cases (negative pages, huge limits)
- Sort stability
- Multi-column sorting
- Cursor-based pagination

### 4. API Contracts (800 lines)

**File:** `api-contract.e2e-spec.ts`

**Coverage:**

- Response structure validation
- Schema validation
- Field types (UUID, timestamps, numbers, booleans)
- Error consistency (404, 400, 401, 403, 409)
- HTTP status codes
- Backward compatibility

### 5. Security (700 lines)

**File:** `security.e2e-spec.ts`

**Coverage:**

- SQL injection (7 attack vectors)
- XSS prevention
- NoSQL injection
- JWT manipulation
- Password security
- Brute force protection
- Mass assignment
- Path traversal

**Example:**

```typescript
it('should reject SQL injection in project code', async () => {
  const sqlInjections = ["TEST' OR '1'='1", "TEST'; DROP TABLE projects;--"];

  for (const injection of sqlInjections) {
    const response = await request(app.getHttpServer())
      .post('/projects')
      .send({ code: injection, name: 'Test' });

    expect([400, 422]).toContain(response.status);
  }
});
```

### 6. Data Integrity (700 lines)

**File:** `data-integrity.e2e-spec.ts`

**Coverage:**

- Referential integrity
- Cascade deletions
- Unique constraints
- Concurrent updates
- Transactional consistency
- Orphaned records prevention
- Character encoding

### 7. Performance (600 lines)

**File:** `performance.e2e-spec.ts`

**Coverage:**

- Response time benchmarks
- Throughput (10-100 concurrent requests)
- Load testing (sustained load)
- Stress testing (burst of 100 requests)
- Large datasets
- Memory leak detection

---

## 📊 Coverage Reports

### View Coverage

```bash
# After running tests with --coverage
open apps/api/coverage/e2e/index.html

# Or on Linux
xdg-open apps/api/coverage/e2e/index.html
```

### Expected Metrics

| Metric     | Target | Description              |
| ---------- | ------ | ------------------------ |
| Statements | >80%   | Lines executed           |
| Branches   | >80%   | Conditional paths tested |
| Functions  | >80%   | Functions executed       |
| Lines      | >80%   | Total lines covered      |

---

## 🔧 Configuration

### Test Infrastructure (docker-compose.test.yml)

**Services:**

- **postgres-test:** Port 5433, database `shogun_test`
- **minio-test:** Ports 9001/9091, bucket `shogun-test`

**Test Environment (apps/api/test/setup.ts):**

```typescript
process.env.NODE_ENV = 'test';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5433';
process.env.DATABASE_USERNAME = 'shogun_test';
process.env.DATABASE_PASSWORD = 'test_password';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_PORT = '9001';
```

### Jest Configuration (jest-e2e.json)

```json
{
  "moduleNameMapper": {},
  "coverageDirectory": "./coverage/e2e",
  "testTimeout": 30000
}
```

---

## 🐛 Troubleshooting

### Cannot Connect to Database

```bash
# Verify PostgreSQL is running
docker ps | grep postgres-test

# View logs
docker-compose -f docker-compose.test.yml logs postgres-test

# Restart
docker-compose -f docker-compose.test.yml restart postgres-test

# Check connection
docker exec shogun-postgres-test pg_isready -U shogun_test
```

### Port Already in Use

**Find and stop conflicting service:**

```bash
lsof -i :5433
# Kill the process or change port in docker-compose.test.yml
```

### Tests Are Slow

```bash
# Reduce workers if low on RAM
npm run test:e2e -- --maxWorkers=1

# Run specific suite
npm run test:e2e -- security.e2e-spec.ts

# Skip coverage
npm run test:e2e
```

### Services Not Starting

```bash
# Check Docker is running
docker info

# Rebuild containers
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d

# Wait longer for initialization
sleep 20
```

---

## 📝 Running Specific Tests

```bash
# All tests
npm run test:e2e

# With coverage
npm run test:e2e -- --coverage

# Specific suite
npm run test:e2e -- security.e2e-spec.ts

# Specific test case
npm run test:e2e -- -t "should reject SQL injection"

# Watch mode
npm run test:e2e -- --watch

# Verbose output
npm run test:e2e -- --verbose
```

---

## 🎯 Best Practices

### Writing New Tests

1. **Use helpers** from `test-utils.ts`
2. **Clean up** after each test
3. **Mock external services** when needed
4. **Keep tests isolated** (no dependencies between tests)
5. **Test both success and failure cases**

### Test Structure

```typescript
describe('Feature', () => {
  beforeAll(async () => {
    // Setup test module
  });

  afterAll(async () => {
    // Cleanup
  });

  beforeEach(async () => {
    // Reset database state
  });

  it('should do something', async () => {
    // Arrange
    const data = { ... };

    // Act
    const response = await request(app.getHttpServer())
      .post('/endpoint')
      .send(data);

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ... });
  });
});
```

---

## 📈 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Start test infrastructure
        run: docker-compose -f docker-compose.test.yml up -d

      - name: Wait for services
        run: sleep 15

      - name: Run E2E tests
        run: |
          cd apps/api
          npm run test:e2e -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/api/coverage/e2e/lcov.info

      - name: Cleanup
        run: docker-compose -f docker-compose.test.yml down -v
```

---

## ✅ Test Checklist

Before considering E2E tests complete:

- [ ] All 7 test suites passing
- [ ] Coverage >80% in all metrics
- [ ] Tests run in CI/CD pipeline
- [ ] Docker test infrastructure configured
- [ ] Mock services working correctly
- [ ] No flaky tests
- [ ] Test execution time <5 minutes
- [ ] Documentation up to date

---

## 📚 Resources

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Docker Compose](https://docs.docker.com/compose/)

---

**Last Updated:** 2025-01-19
