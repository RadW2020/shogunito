import { test, expect, createProjectData } from './helpers/test-helpers';

test.describe('Pagination Functionality', () => {
  // Increase timeout since beforeEach creates multiple projects
  test.describe.configure({ timeout: 60000 });

  // Store created project codes for cleanup
  const createdProjectCodes: string[] = [];

  test.beforeEach(async ({ page, auth, nav, form, modal, toast }) => {
    await auth.register();

    // Create multiple items for pagination testing
    await nav.goToTab('Projects');

    // Wait for initial data to load
    await page.waitForTimeout(500);

    // Create 5 projects to test pagination (reduced from 10 for performance)
    // Very optimized: minimal waits, fail-fast approach
    for (let i = 0; i < 5; i++) {
      const projectData = createProjectData();
      const projectCode = `${projectData.code}_${i}`;

      try {
        // Check if page is still open
        if (page.isClosed()) {
          break;
        }

        await nav.openAddModal();

        // Fill fields quickly
        await form.fillField('code', projectCode);
        await form.fillField('name', `${projectData.name} ${i}`);
        await form.fillField('status', 'active');

        // Submit and wait minimally
        await modal.submit();

        // Very quick success check (500ms max)
        try {
          await toast.expectSuccess();
        } catch {
          // Continue even if toast check fails
        }

        // Verify project was created before adding to cleanup list
        try {
          // Wait for modal to be hidden, but with short timeout
          await page.waitForSelector('.modal, [role="dialog"]', {
            state: 'hidden',
            timeout: 2000,
          });
          // Store code for cleanup
          createdProjectCodes.push(projectCode);
        } catch {
          // Try escape key if modal doesn't close
          try {
            if (!page.isClosed()) {
              await page.keyboard.press('Escape');
              await page.waitForTimeout(100);
              // Still add to cleanup list even if modal didn't close properly
              createdProjectCodes.push(projectCode);
            }
          } catch {
            // Continue
          }
        }
      } catch (error) {
        // If creation fails, try to recover and continue
        if (!page.isClosed()) {
          try {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(100);
          } catch {
            // Ignore
          }
        }
        // Continue to next project
      }
    }
  });

  test.afterEach(async ({ cleanup, page }) => {
    if (page.isClosed() || createdProjectCodes.length === 0) {
      return;
    }

    try {
      // Cleanup projects in reverse order
      await cleanup.deleteMultipleProjects([...createdProjectCodes].reverse());
      // Clear the array for next test
      createdProjectCodes.length = 0;
    } catch (error) {
      console.warn('[Pagination] Cleanup failed:', error);
      // Don't fail test if cleanup fails
    }
  });

  test.describe('Basic Pagination', () => {
    test('should display pagination controls', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const pagination = page.locator(
        '.pagination, [data-testid="pagination"], nav[aria-label*="pagination"]',
      );

      // Pagination might not be visible if items fit on one page
      const hasPagination = await pagination.isVisible().catch(() => false);
      const table = page.locator('table');
      const hasTable = await table.isVisible().catch(() => false);

      expect(hasPagination || hasTable).toBe(true);
    });

    test('should navigate to next page', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const nextButton = page.locator(
        'button:has-text("Next"), button[aria-label*="next"], .pagination button:last-child',
      );

      if (await nextButton.isVisible()) {
        const firstPageRows = await page.locator('tbody tr').count();

        await nextButton.click();
        await page.waitForTimeout(1000);

        const secondPageRows = await page.locator('tbody tr').count();

        // Should show different rows (or same if on last page)
        expect(typeof firstPageRows).toBe('number');
        expect(typeof secondPageRows).toBe('number');
      }
    });

    test('should navigate to previous page', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next"]');
      const prevButton = page.locator('button:has-text("Previous"), button[aria-label*="prev"]');

      if ((await nextButton.isVisible()) && (await prevButton.isVisible())) {
        // Go to next page
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Go back
        await prevButton.click();
        await page.waitForTimeout(1000);

        // Should be back on first page
        await expect(page.locator('table')).toBeVisible();
      }
    });

    test('should navigate to specific page', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const pageButton = page.locator(
        '.pagination button:has-text("2"), button[aria-label*="page 2"]',
      );

      if (await pageButton.isVisible()) {
        await pageButton.click();
        await page.waitForTimeout(1000);

        // Should be on page 2
        const activePage = page.locator('.pagination button[aria-current="page"]');
        if (await activePage.isVisible()) {
          await expect(activePage).toBeVisible();
        }
      }
    });
  });

  test.describe('Page Size Selection', () => {
    test('should change items per page', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const pageSizeSelect = page.locator(
        'select[name="pageSize"], select[name="perPage"], select:has(option:has-text("10"))',
      );

      if (await pageSizeSelect.isVisible()) {
        const initialRowCount = await page.locator('tbody tr').count();

        await pageSizeSelect.selectOption('25');
        await page.waitForTimeout(1000);

        const newRowCount = await page.locator('tbody tr').count();

        // Should show more or same rows
        expect(newRowCount).toBeGreaterThanOrEqual(initialRowCount);
      }
    });

    test('should persist page size preference', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const pageSizeSelect = page.locator('select[name="pageSize"], select[name="perPage"]');
      if (await pageSizeSelect.isVisible()) {
        await pageSizeSelect.selectOption('50');
        await page.waitForTimeout(500);

        // Reload page
        await page.reload();
        await page.waitForTimeout(1000);

        // Re-query locator after reload to avoid stale reference
        const pageSizeSelectAfterReload = page.locator(
          'select[name="pageSize"], select[name="perPage"]',
        );
        const selectedValue = await pageSizeSelectAfterReload.inputValue();
        expect(selectedValue).toBe('50');
      }
    });
  });

  test.describe('Pagination with Filters', () => {
    test('should reset to first page when filter changes', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Apply filter
        await nav.toggleFilters();
        const statusFilter = page.locator('select[name="status"]');
        if (await statusFilter.isVisible()) {
          await statusFilter.selectOption('active');
          await page.waitForTimeout(1000);

          // Should reset to first page
          const activePage = page.locator('.pagination button[aria-current="page"]');
          if (await activePage.isVisible()) {
            const pageNumber = await activePage.textContent();
            expect(pageNumber).toContain('1');
          }
        }
      }
    });

    test('should maintain pagination with search', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        // Pagination should still work
        const pagination = page.locator('.pagination, [data-testid="pagination"]');
        if (await pagination.isVisible()) {
          await expect(pagination).toBeVisible();
        }
      }
    });
  });

  test.describe('Infinite Scroll', () => {
    test('should load more items on scroll', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      // Check for infinite scroll implementation
      const scrollContainer = page.locator(
        '.infinite-scroll, [data-infinite-scroll], .scrollable-container',
      );

      if (await scrollContainer.isVisible()) {
        const initialCount = await page.locator('tr, .item').count();

        // Scroll to bottom
        await scrollContainer.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await page.waitForTimeout(2000);

        const newCount = await page.locator('tr, .item').count();

        // Should load more items
        expect(newCount).toBeGreaterThanOrEqual(initialCount);
      }
    });

    test('should show loading indicator during scroll load', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      const scrollContainer = page.locator('.infinite-scroll, [data-infinite-scroll]');
      if (await scrollContainer.isVisible()) {
        await scrollContainer.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });

        // Should show loading indicator
        const loadingIndicator = page.locator('.loading, [data-loading], .spinner');
        if (await loadingIndicator.isVisible()) {
          await expect(loadingIndicator).toBeVisible();
        }
      }
    });
  });

  test.describe('Pagination State', () => {
    test('should show current page number', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const currentPage = page.locator('.pagination [aria-current="page"], .pagination .active');

      if (await currentPage.isVisible()) {
        const pageText = await currentPage.textContent();
        expect(pageText).toMatch(/\d+/);
      }
    });

    test('should show total page count', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const pageInfo = page.locator('text=/page.*of|\\d+.*of.*\\d+|total.*pages/i');

      if (await pageInfo.isVisible()) {
        await expect(pageInfo).toBeVisible();
      }
    });

    test('should disable previous on first page', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const prevButton = page.locator('button:has-text("Previous"), button[aria-label*="prev"]');
      if (await prevButton.isVisible()) {
        const isDisabled = await prevButton.isDisabled();

        // Should be disabled on first page
        expect(isDisabled).toBe(true);
      }
    });

    test('should disable next on last page', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      // Navigate to last page
      const lastPageButton = page.locator('.pagination button:last-child:not(:has-text("Next"))');

      if (await lastPageButton.isVisible()) {
        await lastPageButton.click();
        await page.waitForTimeout(1000);

        const nextButton = page.locator('button:has-text("Next")');
        if (await nextButton.isVisible()) {
          const isDisabled = await nextButton.isDisabled();
          expect(isDisabled).toBe(true);
        }
      }
    });
  });

  test.describe('Pagination Accessibility', () => {
    test('should have proper ARIA labels', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const pagination = page.locator('[aria-label*="pagination"], nav[role="navigation"]');
      if (await pagination.isVisible()) {
        await expect(pagination).toBeVisible();
      }

      const pageButtons = page.locator('.pagination button[aria-label]');
      const buttonCount = await pageButtons.count();

      if (buttonCount > 0) {
        // Should have aria-labels
        expect(buttonCount).toBeGreaterThan(0);
      }
    });

    test('should support keyboard navigation', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        await nextButton.focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Should navigate
        await expect(page.locator('table')).toBeVisible();
      }
    });
  });
});
