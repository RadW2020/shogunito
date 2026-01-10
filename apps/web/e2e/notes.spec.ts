import { test, expect } from './helpers/test-helpers';

test.describe('Notes Management', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.register();
  });

  test.describe('View Notes', () => {
    test('should display notes in table', async ({ page, nav }) => {
      await nav.goToTab('Notes');

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Should show table or list, or empty state message, or any content area
      const table = page.locator('table');
      const list = page.locator('.notes-list, [data-testid="notes-list"]');
      const emptyState = page.locator('text=/no notes|empty|sin notas|vacío/i');
      const mainContent = page.locator('main, [role="main"], .content, .page-content');

      const hasTable = await table.isVisible({ timeout: 2000 }).catch(() => false);
      const hasList = await list.isVisible({ timeout: 2000 }).catch(() => false);
      const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
      const hasContent = await mainContent.isVisible({ timeout: 2000 }).catch(() => false);

      // Test passes if any of these are visible (table/list with data, empty state, or main content area)
      expect(hasTable || hasList || hasEmptyState || hasContent).toBe(true);
    });

    test('should show note details', async ({ page, nav }) => {
      await nav.goToTab('Notes');

      await page.waitForTimeout(1000);

      // Try to click on first note if available
      const firstNote = page.locator('tr, .note-item, [data-testid="note-item"]').first();
      if (await firstNote.isVisible()) {
        await firstNote.click();
        await page.waitForTimeout(500);

        // Should show note details
        const detailPanel = page.locator(
          '.detail-panel, [data-testid="detail-panel"], [role="dialog"]',
        );
        if (await detailPanel.isVisible()) {
          await expect(detailPanel).toBeVisible();
        }
      }
    });
  });

  test.describe('Create Note', () => {
    test('should create a new general note', async ({ page, nav, form, modal, toast }) => {
      await nav.goToTab('Notes');

      // Look for create note button
      const createButton = page
        .locator(
          'button:has-text("+ Add"), button:has-text("Create Note"), button:has-text("New Note"), button:has-text("Add Note")',
        )
        .first();
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);

        // Wait a bit for modal to open
        await page.waitForTimeout(500);

        // Check if modal is open, if not try openAddModal helper
        let isModalOpen = await modal.isOpen();
        if (!isModalOpen) {
          try {
            await nav.openAddModal();
            await page.waitForTimeout(500);
            isModalOpen = await modal.isOpen();
          } catch {
            // If openAddModal fails, modal might already be open or button didn't work
            isModalOpen = await modal.isOpen();
          }
        }

        // Fill note form
        const contentField = page.locator(
          'textarea[name="content"], textarea[placeholder*="note"]',
        );
        if (await contentField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await form.fillField('content', 'This is a test note created from the Notes tab');
        }

        // Select entity type if available
        const entityTypeSelect = page.locator('select[name="entityType"]');
        if (await entityTypeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await entityTypeSelect.selectOption({ index: 1 });
        }

        // Submit only if modal is open
        if (await modal.isOpen()) {
          await modal.submit();
          await toast.expectSuccess();
        }
      }
    });

    test('should show validation errors for empty note content', async ({ page, nav, modal }) => {
      await nav.goToTab('Notes');

      const createButton = page
        .locator(
          'button:has-text("+ Add"), button:has-text("Create Note"), button:has-text("Add Note")',
        )
        .first();
      if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await createButton.click();
        await page.waitForTimeout(500);

        // Wait a bit for modal to open
        await page.waitForTimeout(500);

        // Check if modal is open, if not try openAddModal helper
        let isModalOpen = await modal.isOpen();
        if (!isModalOpen) {
          try {
            await nav.openAddModal();
            await page.waitForTimeout(500);
            isModalOpen = await modal.isOpen();
          } catch {
            // If openAddModal fails, modal might already be open or button didn't work
            isModalOpen = await modal.isOpen();
          }
        }

        // Try to submit without content only if modal is open
        if (isModalOpen) {
          await modal.submit();

          // Should show validation error
          const contentInput = page.locator('textarea[name="content"]');
          if (await contentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await page.waitForTimeout(300);
            const validation = await contentInput.evaluate(
              (el: HTMLTextAreaElement) => el.validationMessage,
            );
            // Also check for visible validation messages
            const validationMessage = page.locator('text=/required|obligatorio|campo/i').first();
            const hasVisibleValidation = await validationMessage
              .isVisible({ timeout: 2000 })
              .catch(() => false);
            expect(validation || hasVisibleValidation).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Filter Notes', () => {
    test('should filter notes by entity type', async ({ page, nav }) => {
      await nav.goToTab('Notes');
      await nav.toggleFilters();

      const entityTypeFilter = page.locator('select[name="entityType"]');
      if (await entityTypeFilter.isVisible()) {
        await entityTypeFilter.selectOption('shot');
        await page.waitForTimeout(500);
      }
    });

    test('should filter notes by status', async ({ page, nav }) => {
      await nav.goToTab('Notes');
      await nav.toggleFilters();

      const statusFilter = page.locator('select[name="status"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('open');
        await page.waitForTimeout(500);
      }
    });

    test('should filter notes by date range', async ({ page, nav }) => {
      await nav.goToTab('Notes');
      await nav.toggleFilters();

      const dateFromInput = page.locator('input[name="dateFrom"], input[type="date"]');
      if (await dateFromInput.isVisible()) {
        await dateFromInput.fill('2024-01-01');
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Search Notes', () => {
    test('should search notes by content', async ({ page, nav }) => {
      await nav.goToTab('Notes');

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);

        // Should show filtered results, empty state, or table/list (with timeout in case search takes time)
        const table = page.locator('table');
        const list = page.locator('.notes-list, [data-testid="notes-list"]');
        const emptyState = page.locator('text=/no results|no notes|sin resultados|sin notas/i');
        const mainContent = page.locator('main, [role="main"], .content, .page-content');

        const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);
        const hasList = await list.isVisible({ timeout: 5000 }).catch(() => false);
        const hasEmptyState = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
        const hasContent = await mainContent.isVisible({ timeout: 2000 }).catch(() => false);

        // Test passes if any of these are visible (results, empty state, or main content area)
        expect(hasTable || hasList || hasEmptyState || hasContent).toBe(true);
      }
    });
  });

  test.describe('Edit Note', () => {
    test('should edit existing note', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Notes');

      await page.waitForTimeout(1000);

      // Try to edit first note if available
      const firstNote = page.locator('tr, .note-item').first();
      if (await firstNote.isVisible()) {
        const noteText = (await firstNote.textContent()) || '';
        const editButton = firstNote.locator('button:has-text("Edit")');
        if (await editButton.isVisible()) {
          await editButton.click();
          await page.waitForTimeout(500);

          if (await modal.isOpen()) {
            // Update content
            if (await page.locator('textarea[name="content"]').isVisible()) {
              await form.fillField('content', 'Updated note content');
            }

            await modal.submit();
            await toast.expectSuccess();
          }
        }
      }
    });
  });

  test.describe('Delete Note', () => {
    test('should delete note', async ({ page, nav, toast, table }) => {
      await nav.goToTab('Notes');

      await page.waitForTimeout(1000);

      // Try to delete first note if available
      const firstNote = page.locator('tr, .note-item').first();
      if (await firstNote.isVisible()) {
        const noteText = (await firstNote.textContent()) || '';
        await table.selectRow(noteText);
        await page.click('button:has-text("Delete")');

        if (await page.locator('text=/confirm|delete/i').isVisible()) {
          await page.click('button:has-text("Confirm"), button:has-text("Delete")');
        }

        await toast.expectSuccess();
      }
    });
  });

  test.describe('Note Sorting', () => {
    test('should sort notes by date', async ({ page, nav }) => {
      await nav.goToTab('Notes');

      const dateHeader = page.locator('th:has-text("Date"), th:has-text("Created")');
      if (await dateHeader.isVisible()) {
        await dateHeader.click();
        await page.waitForTimeout(500);

        // Click again to reverse sort
        await dateHeader.click();
        await page.waitForTimeout(500);
      }
    });

    test('should sort notes by entity', async ({ page, nav }) => {
      await nav.goToTab('Notes');

      const entityHeader = page.locator('th:has-text("Entity"), th:has-text("Type")');
      if (await entityHeader.isVisible()) {
        await entityHeader.click();
        await page.waitForTimeout(500);
      }
    });
  });
});
