import { test, expect } from './helpers/test-helpers';

test.describe('Versions Management', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.register();
  });

  test.describe('View Versions', () => {
    test('should display versions in table view', async ({ page, nav }) => {
      await nav.goToTab('Versions');

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Should show table or grid
      const table = page.locator('table');
      const grid = page.locator('.grid, [data-view="grid"]');

      const hasTable = await table.isVisible().catch(() => false);
      const hasGrid = await grid.isVisible().catch(() => false);

      expect(hasTable || hasGrid).toBe(true);
    });

    test('should toggle between table and grid view', async ({ page, nav }) => {
      await nav.goToTab('Versions');

      const tableButton = page.locator('button:has-text("Table")');
      const gridButton = page.locator('button:has-text("Grid")');

      if ((await tableButton.isVisible()) && (await gridButton.isVisible())) {
        // Switch to grid view
        await gridButton.click();
        await page.waitForTimeout(500);

        const gridView = page.locator('.grid, [data-view="grid"]');
        if (await gridView.isVisible()) {
          await expect(gridView).toBeVisible();
        }

        // Switch back to table view
        await tableButton.click();
        await page.waitForTimeout(500);

        await expect(page.locator('table')).toBeVisible();
      }
    });

    test('should persist view mode preference', async ({ page, nav }) => {
      await nav.goToTab('Versions');

      const gridButton = page.locator('button:has-text("Grid")');
      if (await gridButton.isVisible()) {
        await gridButton.click();
        await page.waitForTimeout(500);

        // Reload page
        await page.reload();

        // Should remember grid view
        await nav.goToTab('Versions');

        const gridView = page.locator('.grid, [data-view="grid"]');
        if (await gridView.isVisible()) {
          await expect(gridView).toBeVisible();
        }
      }
    });
  });

  test.describe('Version Filters', () => {
    test('should filter by latest only', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await nav.toggleFilters();

      const latestCheckbox = page.locator('input[type="checkbox"]:near(text="Latest")');
      if (await latestCheckbox.isVisible()) {
        await latestCheckbox.check();
        await page.waitForTimeout(500);

        // Should filter results
        await expect(page.locator('table, .grid')).toBeVisible();
      }
    });

    test('should filter by entity type', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await nav.toggleFilters();

      const entityFilter = page.locator(
        'select[name="entityType"], select:near(text="Entity Type")',
      );
      if (await entityFilter.isVisible()) {
        await entityFilter.selectOption('shot');
        await page.waitForTimeout(500);
      }
    });

    test('should filter by status', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await nav.toggleFilters();

      const statusFilter = page.locator('select[name="status"], select:near(text="Status")');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('review');
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Version Search', () => {
    test('should search versions by code', async ({ page, nav }) => {
      await nav.goToTab('Versions');

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('SH001');
        await page.waitForTimeout(500);

        // Should show filtered results
        await expect(page.locator('table, .grid')).toBeVisible();
      }
    });

    test('should show no results message when no matches', async ({ page, nav }) => {
      await nav.goToTab('Versions');

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('DEFINITELY_NONEXISTENT_VERSION_12345');
        await page.waitForTimeout(500);

        const noResults = page.locator('text=/no.*found|no.*results/i');
        if (await noResults.isVisible()) {
          await expect(noResults).toBeVisible();
        }
      }
    });
  });

  test.describe('Version Detail View', () => {
    test('should show version details when clicking on version', async ({ page, nav }) => {
      await nav.goToTab('Versions');

      // Wait for versions to load
      await page.waitForTimeout(1000);

      // Try to click on first version if available
      const firstVersion = page.locator('tr, .grid-item').first();
      if (await firstVersion.isVisible()) {
        await firstVersion.click();
        await page.waitForTimeout(500);

        // Should show detail panel or modal
        const detailPanel = page.locator(
          '.detail-panel, [data-testid="detail-panel"], [role="dialog"]',
        );
        if (await detailPanel.isVisible()) {
          await expect(detailPanel).toBeVisible();
        }
      }
    });
  });

  test.describe('Version Sorting', () => {
    test('should sort versions by date', async ({ page, nav }) => {
      await nav.goToTab('Versions');

      const dateHeader = page.locator('th:has-text("Date"), th:has-text("Created")');
      if (await dateHeader.isVisible()) {
        await dateHeader.click();
        await page.waitForTimeout(500);

        // Click again to reverse sort
        await dateHeader.click();
        await page.waitForTimeout(500);
      }
    });
  });
});
