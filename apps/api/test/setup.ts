/**
 * Global test setup
 * This file is run once before all test suites
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-e2e-tests';
process.env.JWT_EXPIRES_IN = '24h';

// Database configuration for E2E tests
// These values must match docker-compose.test.yml and use the same variable names as app.module.ts
process.env.DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
process.env.DATABASE_PORT = process.env.DATABASE_PORT || '5434'; // Port 5434 matches docker-compose.test.yml (mapped from 5432)
process.env.DATABASE_USERNAME = process.env.DATABASE_USERNAME || 'shogun_test'; // Matches POSTGRES_USER in docker-compose.test.yml
process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'shogun_test_password'; // Matches POSTGRES_PASSWORD in docker-compose.test.yml
process.env.DATABASE_NAME = process.env.DATABASE_NAME || 'shogun_test'; // Matches POSTGRES_DB in docker-compose.test.yml

// MinIO configuration for E2E tests
// These values must match docker-compose.test.yml
process.env.MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
process.env.MINIO_PORT = process.env.MINIO_PORT || '9012'; // Port 9012 matches docker-compose.test.yml (mapped from 9000)
process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin'; // Matches MINIO_ROOT_USER in docker-compose.test.yml
process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin'; // Matches MINIO_ROOT_PASSWORD in docker-compose.test.yml
process.env.MINIO_USE_SSL = process.env.MINIO_USE_SSL || 'false';
process.env.THUMBNAIL_MAX_SIZE_MB = process.env.THUMBNAIL_MAX_SIZE_MB || '5';
process.env.ATTACHMENT_MAX_SIZE_MB = process.env.ATTACHMENT_MAX_SIZE_MB || '10';
process.env.MEDIA_MAX_SIZE_MB = process.env.MEDIA_MAX_SIZE_MB || '200';

// Auth configuration for E2E tests
// Allow all emails for registration in tests
process.env.ALLOWED_REGISTRATION_EMAILS = '*'; // Allow all emails in test environment
// Ensure auth is enabled in tests (use real JWT validation)
process.env.AUTH_ENABLED = 'true';

// Throttler configuration for E2E tests
// Disable throttler in tests to avoid rate limiting issues
process.env.THROTTLER_ENABLED = 'false';

// Audit Logger configuration for E2E tests
// Disable audit logger in tests to avoid conflicts with response serialization
process.env.AUDIT_LOGGER_ENABLED = 'false';

// Email configuration for tests
process.env.EMAIL_FROM_EMAIL = 'test@shogun.com';
process.env.EMAIL_FROM_NAME = 'Shogun Test';
process.env.PASSWORD_RESET_URL = 'http://localhost:3000/reset-password';

// Slack mock configuration (opcional)
process.env.SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

// Set test timeout
jest.setTimeout(30000); // 30 seconds

// Global test configuration
beforeAll(() => {});

afterAll(() => {});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
