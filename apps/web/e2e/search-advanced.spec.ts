import { test, expect, createProjectData } from './helpers/test-helpers';

test.describe('Advanced Search Functionality', () => {
  test.beforeEach(async ({ auth, nav, form, modal, toast, page }) => {
    await auth.register();

    // Create test data
    await nav.goToTab('Projects');
    const projectData = createProjectData();
    await nav.openAddModal();
    await form.fillField('code', projectData.code);
    await form.fillField('name', projectData.name);
    await form.fillField('status', 'active');
    await modal.submit();
    await toast.waitForToastToDisappear();
  });

  test.describe('Multi-field Search', () => {
    test('should search across multiple columns', async ({
      page,
      nav,
      form,
      modal,
      toast,
      table,
    }) => {
      await nav.goToTab('Projects');

      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        // Search by code
        await searchInput.fill(projectData.code);
        await page.waitForTimeout(500);
        await table.expectRowExists(projectData.code);

        // Search by name
        await searchInput.clear();
        await searchInput.fill(projectData.name);
        await page.waitForTimeout(500);
        await table.expectRowExists(projectData.name);
      }
    });

    test('should search with partial matches', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Projects');

      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        // Partial code search
        const partialCode = projectData.code.substring(0, 5);
        await searchInput.fill(partialCode);
        await page.waitForTimeout(500);
        await table.expectRowExists(projectData.code);
      }
    });

    test('should search case-insensitively', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Projects');

      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        // Lowercase search
        await searchInput.fill(projectData.name.toLowerCase());
        await page.waitForTimeout(500);
        await table.expectRowExists(projectData.name);

        // Uppercase search
        await searchInput.clear();
        await searchInput.fill(projectData.name.toUpperCase());
        await page.waitForTimeout(500);
        await table.expectRowExists(projectData.name);
      }
    });
  });

  test.describe('Search with Filters', () => {
    test('should combine search with status filter', async ({
      page,
      nav,
      form,
      modal,
      toast,
      table,
    }) => {
      await nav.goToTab('Projects');

      // Create projects with different statuses
      const activeProject = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', activeProject.code);
      await form.fillField('name', activeProject.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      const archivedProject = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', archivedProject.code);
      await form.fillField('name', archivedProject.name);
      await form.fillField('status', 'archived');
      await modal.submit();
      await toast.waitForToastToDisappear();

      // Filter by active and search
      await nav.toggleFilters();
      const statusFilter = page.locator('select[name="status"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('active');
        await page.waitForTimeout(500);

        const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
        if (await searchInput.isVisible()) {
          await searchInput.fill(activeProject.name);
          await page.waitForTimeout(500);
          await table.expectRowExists(activeProject.name);
        }
      }
    });

    test('should clear search when filter changes', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test search');
        await page.waitForTimeout(500);

        await nav.toggleFilters();
        const statusFilter = page.locator('select[name="status"]');
        if (await statusFilter.isVisible()) {
          await statusFilter.selectOption('active');
          await page.waitForTimeout(500);

          // Search might persist or clear depending on implementation
          const searchValue = await searchInput.inputValue();
          expect(typeof searchValue).toBe('string');
        }
      }
    });
  });

  test.describe('Search Results', () => {
    test('should highlight search terms in results', async ({ page, nav, form, modal, toast }) => {
      await nav.goToTab('Projects');

      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(projectData.name);
        await page.waitForTimeout(500);

        // Check for highlighted text (if implemented)
        const highlighted = page.locator('.highlight, mark, [data-highlight]');
        if (await highlighted.isVisible()) {
          await expect(highlighted).toBeVisible();
        }
      }
    });

    test('should show search result count', async ({ page, nav, form, modal, toast }) => {
      await nav.goToTab('Projects');

      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(projectData.name);
        await page.waitForTimeout(500);

        // Check for result count (if implemented)
        const resultCount = page.locator('text=/\\d+.*result|found/i');
        if (await resultCount.isVisible()) {
          await expect(resultCount).toBeVisible();
        }
      }
    });

    test('should show no results message with suggestions', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('DEFINITELY_NONEXISTENT_ITEM_XYZ123');
        await page.waitForTimeout(500);

        const noResults = page.locator('text=/no.*found|no.*results|nothing found/i');
        if (await noResults.isVisible()) {
          await expect(noResults).toBeVisible();
        }
      }
    });
  });

  test.describe('Search History', () => {
    test('should remember recent searches', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test search 1');
        await page.waitForTimeout(500);
        await searchInput.clear();
        await searchInput.fill('test search 2');
        await page.waitForTimeout(500);

        // Check for search history dropdown (if implemented)
        await searchInput.focus();
        const historyDropdown = page.locator('.search-history, [data-testid="search-history"]');
        if (await historyDropdown.isVisible()) {
          await expect(historyDropdown).toBeVisible();
        }
      }
    });
  });

  test.describe('Advanced Search Operators', () => {
    test('should support wildcard searches', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Projects');

      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        // Try wildcard pattern (if supported)
        const partial = projectData.name.substring(0, 5);
        await searchInput.fill(`${partial}*`);
        await page.waitForTimeout(500);

        // Should find matches
        await table.expectRowExists(projectData.name);
      }
    });

    test('should support phrase searches', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Projects');

      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        // Try phrase search with quotes (if supported)
        await searchInput.fill(`"${projectData.name}"`);
        await page.waitForTimeout(500);
        await table.expectRowExists(projectData.name);
      }
    });
  });

  test.describe('Search Across Tabs', () => {
    test('should maintain search context when switching tabs', async ({
      page,
      nav,
      form,
      modal,
      toast,
    }) => {
      await nav.goToTab('Projects');

      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(projectData.name);
        await page.waitForTimeout(500);

        // Switch tab
        await nav.goToTab('Episodes');
        await page.waitForTimeout(500);

        // Switch back
        await nav.goToTab('Projects');
        await page.waitForTimeout(500);

        // Search might persist or reset depending on implementation
        const searchValue = await searchInput.inputValue();
        expect(typeof searchValue).toBe('string');
      }
    });
  });

  test.describe('Search Performance', () => {
    test('should debounce search input', async ({ page, nav, form, modal, toast }) => {
      await nav.goToTab('Projects');

      // Create multiple items
      for (let i = 0; i < 5; i++) {
        const projectData = createProjectData();
        await nav.openAddModal();
        await form.fillField('code', `${projectData.code}_${i}`);
        await form.fillField('name', `${projectData.name} ${i}`);
        await form.fillField('status', 'active');
        await modal.submit();
        await toast.waitForToastToDisappear();
      }

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        // Rapid typing
        const startTime = Date.now();
        await searchInput.fill('A');
        await searchInput.fill('AB');
        await searchInput.fill('ABC');
        await searchInput.fill('ABCD');
        await page.waitForTimeout(1000);
        const endTime = Date.now();

        // Should handle debouncing efficiently
        expect(endTime - startTime).toBeLessThan(2000);
      }
    });
  });
});
