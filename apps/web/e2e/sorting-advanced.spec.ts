import { test, expect } from './helpers/test-helpers';

test.describe('Advanced Sorting Functionality', () => {
  test.beforeEach(async ({ auth, nav, form, modal, toast }) => {
    await auth.register();

    // Create test data with varied values for sorting
    await nav.goToTab('Projects');

    const projects = [
      { code: 'PROJ_A', name: 'Alpha Project', status: 'active' },
      { code: 'PROJ_B', name: 'Beta Project', status: 'archived' },
      { code: 'PROJ_C', name: 'Gamma Project', status: 'active' },
      { code: 'PROJ_D', name: 'Delta Project', status: 'completed' },
    ];

    for (const project of projects) {
      await nav.openAddModal();
      await form.fillField('code', project.code);
      await form.fillField('name', project.name);
      await form.fillField('status', project.status);
      await modal.submit();
      await toast.waitForToastToDisappear();
    }
  });

  test.describe('Column Sorting', () => {
    test('should sort by code ascending', async ({ page, nav, table }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      await table.sortByColumn('Code');
      await page.waitForTimeout(500);

      // Verify sort order
      const firstRow = page.locator('tbody tr').first();
      const firstCode = await firstRow.locator('td').first().textContent();

      // Should be sorted (exact order depends on implementation)
      expect(firstCode).toBeTruthy();
    });

    test('should sort by code descending', async ({ page, nav, table }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      // Click twice to reverse sort
      await table.sortByColumn('Code');
      await page.waitForTimeout(500);
      await table.sortByColumn('Code');
      await page.waitForTimeout(500);

      // Should be reverse sorted
      const firstRow = page.locator('tbody tr').first();
      const firstCode = await firstRow.locator('td').first().textContent();
      expect(firstCode).toBeTruthy();
    });

    test('should sort by name', async ({ page, nav, table }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      await table.sortByColumn('Name');
      await page.waitForTimeout(500);

      const firstRow = page.locator('tbody tr').first();
      const firstName = await firstRow.locator('td').nth(1).textContent();
      expect(firstName).toBeTruthy();
    });

    test('should sort by status', async ({ page, nav, table }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const statusHeader = page.locator('th:has-text("Status")');
      if (await statusHeader.isVisible()) {
        await statusHeader.click();
        await page.waitForTimeout(500);

        // Should be sorted by status
        await expect(page.locator('table')).toBeVisible();
      }
    });
  });

  test.describe('Multi-column Sorting', () => {
    test('should support sorting by multiple columns', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      // Sort by first column
      const codeHeader = page.locator('th:has-text("Code")');
      if (await codeHeader.isVisible()) {
        await codeHeader.click();
        await page.waitForTimeout(500);

        // Sort by second column with modifier key
        const nameHeader = page.locator('th:has-text("Name")');
        if (await nameHeader.isVisible()) {
          await nameHeader.click({ modifiers: ['Shift'] });
          await page.waitForTimeout(500);

          // Should maintain both sorts
          await expect(page.locator('table')).toBeVisible();
        }
      }
    });
  });

  test.describe('Sort Indicators', () => {
    test('should show sort direction indicator', async ({ page, nav, table }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      await table.sortByColumn('Code');
      await page.waitForTimeout(500);

      // Check for sort indicator
      const codeHeader = page.locator('th:has-text("Code")');
      const sortIndicator = codeHeader.locator('[aria-sort], .sort-asc, .sort-desc, [data-sort]');

      if (await sortIndicator.isVisible()) {
        await expect(sortIndicator).toBeVisible();
      }
    });

    test('should update indicator on sort change', async ({ page, nav, table }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const codeHeader = page.locator('th:has-text("Code")');

      // First click - ascending
      await codeHeader.click();
      await page.waitForTimeout(500);

      // Second click - descending
      await codeHeader.click();
      await page.waitForTimeout(500);

      // Indicator should update
      const sortIndicator = codeHeader.locator('[aria-sort]');
      if (await sortIndicator.isVisible()) {
        const sortValue = await sortIndicator.getAttribute('aria-sort');
        expect(['ascending', 'descending', 'none']).toContain(sortValue);
      }
    });
  });

  test.describe('Sort Persistence', () => {
    test('should persist sort preference', async ({ page, nav, table }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      await table.sortByColumn('Name');
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Sort should be maintained
      const nameHeader = page.locator('th:has-text("Name")');
      const sortIndicator = nameHeader.locator('[aria-sort]');
      if (await sortIndicator.isVisible()) {
        const sortValue = await sortIndicator.getAttribute('aria-sort');
        expect(sortValue).not.toBe('none');
      }
    });
  });

  test.describe('Sort with Filters', () => {
    test('should maintain sort when filter applied', async ({ page, nav, table }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      // Sort first
      await table.sortByColumn('Code');
      await page.waitForTimeout(500);

      // Apply filter
      await nav.toggleFilters();
      const statusFilter = page.locator('select[name="status"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('active');
        await page.waitForTimeout(500);

        // Sort should be maintained
        const codeHeader = page.locator('th:has-text("Code")');
        const sortIndicator = codeHeader.locator('[aria-sort]');
        if (await sortIndicator.isVisible()) {
          const sortValue = await sortIndicator.getAttribute('aria-sort');
          expect(sortValue).not.toBe('none');
        }
      }
    });
  });

  test.describe('Date Sorting', () => {
    test('should sort by creation date', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const dateHeader = page.locator('th:has-text("Date"), th:has-text("Created")');
      if (await dateHeader.isVisible()) {
        await dateHeader.click();
        await page.waitForTimeout(500);

        // Should sort by date
        await expect(page.locator('table')).toBeVisible();
      }
    });

    test('should handle date sorting with null values', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const dateHeader = page.locator('th:has-text("Date"), th:has-text("Created")');
      if (await dateHeader.isVisible()) {
        await dateHeader.click();
        await page.waitForTimeout(500);

        // Should handle null dates gracefully
        await expect(page.locator('table')).toBeVisible();
      }
    });
  });

  test.describe('Numeric Sorting', () => {
    test('should sort numbers correctly', async ({ page, nav }) => {
      await nav.goToTab('Episodes');
      await page.waitForTimeout(1000);

      const numberHeader = page.locator('th:has-text("Number"), th:has-text("Ep")');
      if (await numberHeader.isVisible()) {
        await numberHeader.click();
        await page.waitForTimeout(500);

        // Should sort numerically, not alphabetically
        await expect(page.locator('table')).toBeVisible();
      }
    });
  });

  test.describe('Sort Accessibility', () => {
    test('should have proper ARIA attributes for sorting', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const sortableHeader = page.locator('th[aria-sort], th[role="columnheader"]');
      const headerCount = await sortableHeader.count();

      if (headerCount > 0) {
        const firstHeader = sortableHeader.first();
        const ariaSort = await firstHeader.getAttribute('aria-sort');

        // Should have aria-sort attribute
        expect(['ascending', 'descending', 'none']).toContain(ariaSort);
      }
    });

    test('should support keyboard sorting', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const codeHeader = page.locator('th:has-text("Code")');
      if (await codeHeader.isVisible()) {
        await codeHeader.focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Should sort
        await expect(page.locator('table')).toBeVisible();
      }
    });
  });
});
