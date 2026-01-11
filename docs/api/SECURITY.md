# Shogunito API - Security Guide

This document outlines all security measures implemented in the Shogunito API and best practices for deployment.

## Table of Contents

1. [Security Features](#security-features)
2. [Authentication & Authorization](#authentication--authorization)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [Audit Logging](#audit-logging)
5. [CORS Configuration](#cors-configuration)
6. [Database Security](#database-security)
7. [Production Deployment Checklist](#production-deployment-checklist)
8. [Security Best Practices](#security-best-practices)
9. [Incident Response](#incident-response)

---

## Security Features

The Shogunito API implements multiple layers of security:

✅ **JWT-based Authentication** - Secure token-based auth
✅ **Role-Based Access Control (RBAC)** - 42 granular permissions across 6 roles
✅ **Input Sanitization** - XSS and SQL injection prevention
✅ **Audit Logging** - Complete audit trail of all mutations
✅ **CORS Protection** - Restrictive cross-origin policies
✅ **Database Migrations** - Safe schema changes without data loss
✅ **Input Validation** - Schema validation with class-validator
✅ **Password Hashing** - Bcrypt for secure password storage
✅ **Environment-based Configuration** - Separate dev/prod settings

---

## Authentication & Authorization

### JWT Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

**Token Configuration:**

- Expiration: 24 hours (configurable via `JWT_EXPIRES_IN`)
- Algorithm: HS256
- Secret: Stored in `JWT_SECRET` environment variable

**IMPORTANT:** Use a strong, randomly generated secret (minimum 32 characters) in production.

### Role-Based Access Control (RBAC)

The API implements 6 predefined roles with 42 granular permissions:

| Role       | Permissions | Use Case                       |
| ---------- | ----------- | ------------------------------ |
| `admin`    | 42 (all)    | System administrators          |
| `director` | 35          | Project directors, supervisors |
| `producer` | 20          | Production managers            |
| `artist`   | 15          | Animators, VFX artists         |
| `reviewer` | 10          | QA, reviewers                  |
| `viewer`   | 8           | Read-only access               |
| `user`     | 8           | Default authenticated user     |

**Permission Examples:**

```typescript
Permission.PROJECT_CREATE;
Permission.EPISODE_UPDATE;
Permission.VERSION_APPROVE;
Permission.USER_MANAGE_ROLES;
Permission.ADMIN_ACCESS;
```

**Controller Protection:**

```typescript
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(Permission.PROJECT_CREATE)
@Post()
create(@Body() dto: CreateProjectDto) {
  // Only users with PROJECT_CREATE permission can access
}
```

**All controllers are protected with appropriate permissions.**

---

## Input Validation & Sanitization

### Sanitization Pipeline

The API implements a **multi-layer validation strategy**:

1. **SanitizationPipe** (first layer) - XSS and SQL injection prevention
2. **ValidationPipe** (second layer) - Schema validation with class-validator

**Applied globally in `main.ts`:**

```typescript
app.useGlobalPipes(new SanitizationPipe());
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

### What Gets Sanitized

The `SanitizationPipe` protects against:

**XSS (Cross-Site Scripting):**

- Removes dangerous HTML tags: `<script>`, `<iframe>`, `<object>`, etc.
- Strips event handlers: `onclick`, `onerror`, `onload`, etc.
- Encodes HTML entities: `<`, `>`, `&`, `"`, `'`, `/`
- Removes inline JavaScript: `javascript:`, `vbscript:`, `data:text/html`

**SQL Injection:**

- Detects and blocks SQL patterns:
  - `OR 1=1--`
  - `UNION SELECT`
  - `DROP TABLE`
  - `INSERT INTO`
  - `DELETE FROM`
  - `UPDATE ... SET`
  - `EXEC()`

**Example:**

```javascript
// Input
{
  "name": "<script>alert('XSS')</script>John",
  "description": "Test' OR '1'='1"
}

// After sanitization
{
  "name": "John",  // Script tags removed
  "description": "Test' OR '1'='1"  // Would throw BadRequestException
}
```

### Schema Validation

After sanitization, the `ValidationPipe` validates data structure:

```typescript
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
```

**Validation Options:**

- `whitelist: true` - Strip unknown properties
- `forbidNonWhitelisted: true` - Reject requests with extra fields
- `transform: true` - Auto-transform to correct types

---

## Audit Logging

Complete audit trail of all CREATE, UPDATE, DELETE operations for compliance and forensics.

### What Gets Logged

The `AuditLoggerInterceptor` automatically captures:

- ✅ User who performed the action (userId, username)
- ✅ Action type (CREATE, UPDATE, DELETE)
- ✅ Entity type and ID (Project, Episode, Shot, etc.)
- ✅ Changes made (before/after, request body)
- ✅ HTTP method and endpoint
- ✅ IP address (proxy-aware)
- ✅ User agent
- ✅ Response status code
- ✅ Error messages (if failed)
- ✅ Metadata (duration, response size)
- ✅ Timestamp

### Audit Log Schema

```typescript
{
  id: uuid,
  userId: string,
  username: string,
  action: string,              // CREATE, UPDATE, DELETE
  entityType: string,          // Project, Episode, Shot, etc.
  entityId: string,            // PRJ_001, EP_001, etc.
  changes: jsonb,              // Full object or before/after
  ipAddress: string,           // Real IP (considers x-forwarded-for)
  userAgent: string,
  method: string,              // POST, PATCH, DELETE
  endpoint: string,            // /projects/PRJ_001
  statusCode: number,          // 200, 201, 400, etc.
  errorMessage: string,        // If failed
  metadata: jsonb,             // { duration: 123, responseDataSize: 456 }
  createdAt: timestamp
}
```

### Query Audit Logs

**Find all logs for a user:**

```typescript
await auditService.findByUser('user-id', page, limit);
```

**Find all logs for an entity:**

```typescript
await auditService.findByEntity('Project', 'PRJ_001', page, limit);
```

**Get statistics:**

```typescript
await auditService.getStatistics(startDate, endDate);
// Returns: { total, byAction, byEntityType, byUser }
```

**Retention Policy:**

```typescript
// Delete logs older than 90 days
await auditService.deleteOldLogs(90);
```

### Performance

Audit logs are stored in a separate table with **6 optimized indexes**:

- `IDX_audit_logs_userId`
- `IDX_audit_logs_entityType`
- `IDX_audit_logs_action`
- `IDX_audit_logs_createdAt`
- `IDX_audit_logs_entityType_entityId` (composite)
- `IDX_audit_logs_userId_createdAt` (composite)

**Applied globally** - no controller changes needed.

---

## CORS Configuration

Cross-Origin Resource Sharing (CORS) is configured with **strict production settings**.

### Development Mode

Allows multiple localhost origins for development:

```javascript
[
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
];
```

### Production Mode

**Strictly validates origins** against whitelist:

```javascript
// Only origins in FRONTEND_URL are allowed
FRONTEND_URL=https://app.example.com,https://admin.example.com
```

**Production CORS behavior:**

1. Validates every request origin
2. Rejects requests from unlisted origins
3. Caches preflight requests for 1 hour
4. Exposes necessary headers (Content-Range, X-Content-Range)

### Configuration

```typescript
app.enableCors({
  origin:
    process.env.NODE_ENV === 'production'
      ? (origin, callback) => {
          if (!origin || corsOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`Origin ${origin} not allowed by CORS policy`));
          }
        }
      : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 3600,
  optionsSuccessStatus: 204,
});
```

---

## Database Security

### Production Safety

**CRITICAL:** Never use `synchronize: true` in production.

```typescript
TypeOrmModule.forRoot({
  synchronize: process.env.NODE_ENV !== 'production',  // ✅ Safe
  migrations: [...],
  migrationsRun: process.env.NODE_ENV === 'production',
})
```

### Migrations

Use TypeORM migrations for all schema changes:

```bash
# Generate migration from entity changes
npm run migration:generate -- src/migrations/AddNewColumn

# Create empty migration
npm run migration:create -- src/migrations/CustomChanges

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Connection Security

**Production database configuration:**

```env
DATABASE_HOST=your-db-host.com
DATABASE_PORT=5432
DATABASE_USERNAME=shogunito_prod_user
DATABASE_PASSWORD=STRONG_RANDOM_PASSWORD
DATABASE_NAME=shogunito_production
```

**Best Practices:**

- Use SSL/TLS for database connections
- Use strong, randomly generated passwords
- Restrict database user permissions (no CREATE USER, etc.)
- Enable database audit logging
- Regular backups with encryption
- Use connection pooling
- Monitor slow queries

### SQL Injection Prevention

1. **TypeORM QueryBuilder** - Parameterized queries
2. **Input Sanitization** - Blocks SQL patterns
3. **Validation** - Type checking and constraints

**Safe query example:**

```typescript
// ✅ SAFE - Parameterized
await repository.findOne({ where: { code: userInput } });

// ✅ SAFE - QueryBuilder with parameters
await repository.createQueryBuilder().where('code = :code', { code: userInput }).getOne();

// ❌ UNSAFE - String concatenation (NEVER DO THIS)
await repository.query(`SELECT * FROM project WHERE code = '${userInput}'`);
```

---

## Production Deployment Checklist

### Environment Variables

- [ ] Set `NODE_ENV=production`
- [ ] Configure strong `JWT_SECRET` (min 32 chars, random)
- [ ] Set production `DATABASE_*` credentials
- [ ] Configure `FRONTEND_URL` (comma-separated if multiple)
- [ ] Set `MINIO_*` credentials with SSL enabled
- [ ] Review all environment variables in `.env.production`

### Security Configuration

- [ ] Verify `synchronize: false` in TypeORM config
- [ ] Run all database migrations (`npm run migration:run`)
- [ ] Test CORS with production frontend URL
- [ ] Test RBAC permissions for all roles
- [ ] Enable audit logging
- [ ] Configure SSL/TLS for database
- [ ] Set up HTTPS for API (reverse proxy/load balancer)

### Application Security

- [ ] Remove Swagger in production (or protect with auth)
- [ ] Set secure cookie flags (httpOnly, secure, sameSite)
- [ ] Enable HSTS headers
- [ ] Configure CSP headers
- [ ] Set up monitoring and alerting
- [ ] Configure centralized logging (ELK, Datadog, etc.)

- [ ] Implement health checks (`/health`, `/ready`)

### Infrastructure

- [ ] Configure firewall rules (restrict database access)
- [ ] Set up WAF (Web Application Firewall)
- [ ] Enable DDoS protection
- [ ] Configure automated backups (daily recommended)
- [ ] Test backup restoration procedure
- [ ] Set up monitoring (CPU, memory, disk, network)
- [ ] Configure log rotation
- [ ] Set up SSL certificates with auto-renewal

### Testing

- [ ] Run all E2E tests in production-like environment
- [ ] Perform penetration testing
- [ ] Verify RBAC with all roles
- [ ] Test CORS with actual frontend
- [ ] Load testing (concurrent users, requests/sec)
- [ ] Test migration rollback procedures

### Documentation

- [ ] Document all environment variables
- [ ] Create runbook for common operations
- [ ] Document incident response procedures
- [ ] Create deployment guide
- [ ] Document rollback procedures

---

## Security Best Practices

### Password Security

```typescript
// ✅ ALWAYS hash passwords with bcrypt
import * as bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashedPassword);
```

**Password Requirements:**

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### JWT Security

```typescript
// ✅ Include minimal user data in JWT payload
const payload = {
  sub: user.id,
  username: user.username,
  role: user.role,
};

// ❌ NEVER include sensitive data
// password, credit cards, SSN, etc.
```

**Best Practices:**

- Short expiration times (24h max)
- Rotate JWT secrets periodically
- Implement refresh tokens for long sessions

### File Upload Security

```typescript
// ✅ Validate file types and sizes
const allowedMimeTypes = ['image/jpeg', 'image/png', 'video/mp4'];
const maxSize = 100 * 1024 * 1024; // 100MB

if (!allowedMimeTypes.includes(file.mimetype)) {
  throw new BadRequestException('Invalid file type');
}

if (file.size > maxSize) {
  throw new BadRequestException('File too large');
}

// ✅ Sanitize filenames
const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
```

### Error Handling

```typescript
// ✅ Generic error messages to users
throw new UnauthorizedException('Invalid credentials');

// ❌ NEVER expose internal details
throw new Error(`User ${email} not found in database`);
```

### Logging

```typescript
// ✅ Log security events
logger.log(`User ${userId} logged in from ${ipAddress}`);
logger.warn(`Failed login attempt for ${username} from ${ipAddress}`);
logger.error(`Unauthorized access attempt to ${endpoint} by ${userId}`);

// ❌ NEVER log sensitive data
logger.log(`Password: ${password}`); // NEVER DO THIS
logger.log(`JWT: ${token}`); // NEVER DO THIS
```

---

## Incident Response

### Security Incident Procedure

1. **Detect and Assess**
   - Monitor audit logs for suspicious activity
   - Check rate limit violations
   - Review failed authentication attempts
   - Analyze unusual traffic patterns

2. **Contain**
   - Immediately revoke compromised JWT tokens
   - Block malicious IP addresses
   - Disable compromised user accounts
   - Isolate affected systems

3. **Investigate**
   - Query audit logs for timeline of events
   - Identify affected users and data
   - Determine attack vector
   - Assess damage

4. **Recover**
   - Restore from backups if needed
   - Reset compromised credentials
   - Patch vulnerabilities
   - Update security rules

5. **Review and Improve**
   - Document the incident
   - Update security policies
   - Improve monitoring and alerts
   - Conduct team training

### Common Audit Log Queries

**Find failed login attempts:**

```sql
SELECT * FROM audit_logs
WHERE action = 'LOGIN_FAILED'
  AND "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;
```

**Find all actions by a suspicious user:**

```sql
SELECT * FROM audit_logs
WHERE "userId" = 'suspicious-user-id'
ORDER BY "createdAt" DESC;
```

**Find all changes to critical entities:**

```sql
SELECT * FROM audit_logs
WHERE "entityType" = 'User'
  AND action IN ('UPDATE', 'DELETE')
  AND "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;
```

**Find requests from specific IP:**

```sql
SELECT * FROM audit_logs
WHERE "ipAddress" = '123.456.789.012'
ORDER BY "createdAt" DESC;
```

---

## Security Contacts

For security vulnerabilities, please contact:

- **Email:** security@example.com
- **GitHub:** Create a private security advisory

**DO NOT** disclose security vulnerabilities publicly.

---

## Compliance and Standards

This API follows industry best practices and standards:

- ✅ **OWASP Top 10** - Protection against common vulnerabilities
- ✅ **GDPR** - Audit logging and data protection
- ✅ **SOC 2** - Security controls and monitoring
- ✅ **ISO 27001** - Information security management

---

## License

Proprietary - All rights reserved

---

**Last Updated:** 2024-11-18

**Security Review Date:** 2024-11-18
