import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Shogun UI E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Timeout for each action (click, fill, etc) */
    actionTimeout: 10000, // Increased from 5000 to handle slow React renders

    /* Timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Global timeout for each test */
  timeout: 60000, // Increased from 30000 to handle complex auth flows

  /* Global timeout for the whole test run */
  globalTimeout: 600000,

  /* Expect timeout */
  expect: {
    timeout: 10000, // Increased from 5000 for more reliable assertions
  },

  /* Configure projects for supported browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true, // Always reuse to avoid port conflicts
      timeout: 120000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        NODE_OPTIONS: '--no-deprecation',
      },
    },
    // API server for E2E tests - uses test infrastructure (docker-compose.test.yml)
    // Make sure to run: docker-compose -f docker-compose.test.yml up -d first
    // Note: TypeORM will retry database connection up to 10 times automatically
    // Using /api/v1/ endpoint which doesn't require database connection
    {
      command: 'bash test/scripts/start-with-migrations.sh',
      cwd: '../../apps/api',
      url: 'http://localhost:3000/api/v1/',
      reuseExistingServer: true, // Reuse existing server if already running
      timeout: 90000, // 90 seconds - increased for migrations + database initialization
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        NODE_OPTIONS: '--no-deprecation',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5434',
        DATABASE_USERNAME: 'shogun_test',
        DATABASE_PASSWORD: 'shogun_test_password',
        DATABASE_NAME: 'shogun_test',
        // TypeORM connection options for better reliability
        TYPEORM_CONNECTION_TIMEOUT: '30000', // 30 seconds
        TYPEORM_POOL_SIZE: '10',
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: '9012',
        MINIO_ACCESS_KEY: 'minioadmin',
        MINIO_SECRET_KEY: 'minioadmin',
        MINIO_USE_SSL: 'false',
        JWT_SECRET: 'test-secret-key-for-e2e-tests',
        JWT_EXPIRES_IN: '24h',
        ALLOWED_REGISTRATION_EMAILS: '*',
        AUTH_ENABLED: 'true',
        THROTTLER_ENABLED: 'false',
        AUDIT_LOGGER_ENABLED: 'false',
        ALLOWED_ORIGINS: 'http://localhost:5173,http://localhost:3000',
      },
    },
  ],
});
