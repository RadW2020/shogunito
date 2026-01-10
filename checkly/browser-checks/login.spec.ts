import { test, expect } from '@playwright/test';

// Monitor #8: Login Flow (360 min)
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
  // Try multiple possible redirect patterns
  try {
    await page.waitForURL(/\/(dashboard|home|projects|$)/, { timeout: 15000 });
  } catch (e) {
    // If redirect doesn't happen, check if we're still on login page
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error('Login failed - still on login page');
    }
  }

  // Verify we're logged in (not on login page)
  expect(page.url()).not.toContain('/login');
});



