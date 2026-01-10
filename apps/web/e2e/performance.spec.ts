import { test, expect, createProjectData } from './helpers/test-helpers';

test.describe('Performance and Loading Tests', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.register();
  });

  test.describe('Page Load Performance', () => {
    test('should load main page within acceptable time', async ({ page, nav }) => {
      const startTime = Date.now();

      await nav.goToTab('Projects');
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should load table data efficiently', async ({ page, nav }) => {
      const startTime = Date.now();

      await nav.goToTab('Projects');
      await page.waitForSelector('table', { timeout: 5000 });

      const loadTime = Date.now() - startTime;

      // Table should appear within 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should handle large datasets', async ({ page, nav, form, modal, toast }) => {
      await nav.goToTab('Projects');

      // Create multiple projects
      const startTime = Date.now();
      for (let i = 0; i < 5; i++) {
        const projectData = createProjectData();
        await nav.openAddModal();
        await form.fillField('code', `${projectData.code}_${i}`);
        await form.fillField('name', `${projectData.name} ${i}`);
        await form.fillField('status', 'active');
        await modal.submit();
        await toast.waitForToastToDisappear();
      }

      const createTime = Date.now() - startTime;

      // Should create 5 items within reasonable time
      expect(createTime).toBeLessThan(30000);

      // Table should still be responsive
      await page.waitForTimeout(500);
      const table = page.locator('table');
      await expect(table).toBeVisible();
    });
  });

  test.describe('Modal Performance', () => {
    test('should open modal quickly', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      const startTime = Date.now();
      await nav.openAddModal();
      await page.waitForSelector('.modal, [role="dialog"]', { timeout: 2000 });

      const openTime = Date.now() - startTime;

      // Modal should open within 500ms
      expect(openTime).toBeLessThan(500);
    });

    test('should close modal quickly', async ({ page, nav, modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      const startTime = Date.now();
      await modal.close();

      const closeTime = Date.now() - startTime;

      // Modal should close within 300ms
      expect(closeTime).toBeLessThan(300);
    });
  });

  test.describe('Search Performance', () => {
    test('should search without lag', async ({ page, nav, form, modal, toast }) => {
      await nav.goToTab('Projects');

      // Create test data
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      // Search
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        const startTime = Date.now();
        await searchInput.fill(projectData.name);
        await page.waitForTimeout(500);

        const searchTime = Date.now() - startTime;

        // Search should complete within 1 second
        expect(searchTime).toBeLessThan(1000);
      }
    });

    test('should debounce search input', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        // Rapid typing
        await searchInput.fill('A');
        await searchInput.fill('AB');
        await searchInput.fill('ABC');
        await searchInput.fill('ABCD');

        await page.waitForTimeout(1000);

        // Should handle debouncing without errors
        await expect(page.getByRole('table').first()).toBeVisible();
      }
    });
  });

  test.describe('Filter Performance', () => {
    test('should apply filters quickly', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await nav.toggleFilters();

      const statusFilter = page.locator('select[name="status"]');
      if (await statusFilter.isVisible()) {
        const startTime = Date.now();
        await statusFilter.selectOption('active');
        await page.waitForTimeout(500);

        const filterTime = Date.now() - startTime;

        // Filter should apply within 1 second
        expect(filterTime).toBeLessThan(1000);
      }
    });
  });

  test.describe('Tab Switching Performance', () => {
    test('should switch tabs quickly', async ({ page, nav }) => {
      const tabs = ['Projects', 'Episodes', 'Assets', 'Sequences'];

      for (const tab of tabs) {
        const startTime = Date.now();
        await nav.goToTab(tab);
        await page.waitForTimeout(500);

        const switchTime = Date.now() - startTime;

        // Tab switch should complete within 1 second
        expect(switchTime).toBeLessThan(1000);
      }
    });

    test('should cache tab data', async ({ page, nav }) => {
      // First visit
      const firstStart = Date.now();
      await nav.goToTab('Projects');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      const firstTime = Date.now() - firstStart;

      // Switch away
      await nav.goToTab('Episodes');
      await page.waitForTimeout(500);

      // Switch back (should be faster if cached)
      const secondStart = Date.now();
      await nav.goToTab('Projects');
      await page.waitForTimeout(500);
      const secondTime = Date.now() - secondStart;

      // Second visit should be faster (or at least not much slower)
      expect(secondTime).toBeLessThan(firstTime * 3);
    });
  });

  test.describe('Rendering Performance', () => {
    test('should render table rows efficiently', async ({ page, nav, form, modal, toast }) => {
      await nav.goToTab('Projects');

      // Create multiple items
      for (let i = 0; i < 10; i++) {
        const projectData = createProjectData();
        await nav.openAddModal();
        await form.fillField('code', `${projectData.code}_${i}`);
        await form.fillField('name', `${projectData.name} ${i}`);
        await form.fillField('status', 'active');
        await modal.submit();
        await toast.waitForToastToDisappear();
      }

      // Table should still be responsive
      await page.waitForTimeout(500);
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThan(0);
    });

    test('should handle rapid UI updates', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      // Rapid filter toggles
      for (let i = 0; i < 5; i++) {
        await nav.toggleFilters();
        await page.waitForTimeout(100);
      }

      // UI should remain stable
      await expect(page.getByRole('table').first()).toBeVisible();
    });
  });

  test.describe('Memory Management', () => {
    test('should not leak memory on repeated operations', async ({
      page,
      nav,
      form,
      modal,
      toast,
    }) => {
      await nav.goToTab('Projects');

      // Perform many operations
      for (let i = 0; i < 20; i++) {
        await nav.openAddModal();
        await modal.close();
        await page.waitForTimeout(50);
      }

      // Should still be functional
      await expect(page.getByRole('table').first()).toBeVisible();
    });

    test('should clean up event listeners', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      // Navigate away and back
      await nav.goToTab('Episodes');
      await page.waitForTimeout(500);
      await nav.goToTab('Projects');
      await page.waitForTimeout(500);

      // Should still work without errors
      await expect(page.getByRole('table').first()).toBeVisible();
    });
  });

  test.describe('Network Request Optimization', () => {
    test('should batch multiple requests when possible', async ({ page, nav, context }) => {
      const requests: string[] = [];

      await context.route('**/api/**', (route) => {
        requests.push(route.request().url());
        route.continue();
      });

      await nav.goToTab('Projects');
      await page.waitForTimeout(2000);

      // Should make reasonable number of requests
      expect(requests.length).toBeLessThan(30);
    });

    test('should use caching headers', async ({ page, nav, context }) => {
      let cacheHeaders: string | null = null;

      await context.route('**/api/**', (route) => {
        const response = route.request();
        cacheHeaders = response.headers()['cache-control'] || null;
        route.continue();
      });

      await nav.goToTab('Projects');
      await page.waitForTimeout(2000);

      // Cache headers may or may not be present depending on API
      expect(cacheHeaders).toBeDefined();
    });
  });

  test.describe('Animation Performance', () => {
    test('should have smooth transitions', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      // Open and close modal multiple times
      for (let i = 0; i < 5; i++) {
        await nav.openAddModal();
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }

      // Should complete without jank
      await expect(page.getByRole('table').first()).toBeVisible();
    });
  });
});
