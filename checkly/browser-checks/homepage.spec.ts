import { test, expect } from '@playwright/test';

// Monitor #4: Frontend Homepage (180 min)
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



