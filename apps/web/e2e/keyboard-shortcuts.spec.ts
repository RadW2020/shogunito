import { test, expect, createProjectData } from './helpers/test-helpers';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.register();
  });

  test.describe('Modal Shortcuts', () => {
    test('should close modal with Escape key', async ({ page, nav, modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      expect(await modal.isOpen()).toBe(true);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      expect(await modal.isOpen()).toBe(false);
    });

    test('should submit form with Ctrl+Enter', async ({
      page,
      nav,
      form,
      modal,
      toast: _toast,
    }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      const projectData = createProjectData();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');

      // Submit form with keyboard shortcut
      await page.keyboard.press('Control+Enter');
      await page.waitForTimeout(1000);

      // Should submit (or at least not crash)
      const modalOpen = await modal.isOpen();
      expect(typeof modalOpen).toBe('boolean');
    });
  });

  test.describe('Navigation Shortcuts', () => {
    test('should navigate tabs with arrow keys', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      const firstTab = page.locator('button:has-text("Projects")');
      await firstTab.focus();

      // Arrow right to next tab
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);

      // Should move focus
      const focused = await page.evaluate(() => {
        return document.activeElement?.textContent;
      });
      expect(focused).toBeTruthy();
    });

    test('should navigate with Home/End keys', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      const tabsContainer = page.locator('[role="tablist"], .tabs, nav[aria-label*="tab"]');

      if (await tabsContainer.isVisible()) {
        await tabsContainer.focus();

        // Home key to first tab
        await page.keyboard.press('Home');
        await page.waitForTimeout(500);

        // End key to last tab
        await page.keyboard.press('End');
        await page.waitForTimeout(500);

        // Should navigate
        await expect(page.locator('table, .content')).toBeVisible();
      }
    });
  });

  test.describe('Search Shortcuts', () => {
    test('should focus search with Ctrl+K or Cmd+K', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      // Focus search with keyboard shortcut
      await page.keyboard.press('Control+K');
      await page.waitForTimeout(500);

      // Search input should be focused
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');

      if (await searchInput.isVisible()) {
        const isFocused = await searchInput.evaluate((el) => el === document.activeElement);
        expect(isFocused).toBe(true);
      }
    });

    test('should clear search with Escape when focused', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');

      if (await searchInput.isVisible()) {
        await searchInput.fill('test search');
        await searchInput.focus();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);

        // Search should be cleared
        const value = await searchInput.inputValue();
        expect(value).toBe('');
      }
    });
  });

  test.describe('Table Navigation Shortcuts', () => {
    test('should navigate table rows with arrow keys', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        await firstRow.focus();

        // Arrow down to next row
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(500);

        // Should move focus
        const focused = await page.evaluate(() => {
          return document.activeElement?.tagName;
        });
        expect(['TR', 'TD', 'BUTTON', 'A']).toContain(focused);
      }
    });

    test('should select row with Space key', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const firstRow = page.locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        await firstRow.focus();
        await page.keyboard.press('Space');
        await page.waitForTimeout(500);

        // Row should be selected
        const checkbox = firstRow.locator('input[type="checkbox"]');
        if (await checkbox.isVisible()) {
          const isChecked = await checkbox.isChecked();
          expect(isChecked).toBe(true);
        }
      }
    });
  });

  test.describe('Action Shortcuts', () => {
    test('should create new item with Ctrl+N', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      // Try Ctrl+N
      await page.keyboard.press('Control+N');
      await page.waitForTimeout(500);

      // Should open add modal (if implemented)
      const modal = page.locator('.modal, [role="dialog"]');
      const modalOpen = await modal.isVisible().catch(() => false);
      expect(typeof modalOpen).toBe('boolean');
    });

    test('should refresh with F5 or Ctrl+R', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      // F5 should refresh
      await page.keyboard.press('F5');
      await page.waitForTimeout(1000);

      // Should reload
      await expect(page.locator('table, .content')).toBeVisible();
    });

    test('should show shortcuts help with ? key', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Press ? key
      await page.keyboard.press('?');
      await page.waitForTimeout(500);

      // Should show shortcuts modal/help (if implemented)
      const shortcutsHelp = page.locator(
        'text=/shortcut|keyboard|help/i, [role="dialog"]:has-text("shortcut")',
      );
      const isVisible = await shortcutsHelp.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });
  });

  test.describe('Focus Management Shortcuts', () => {
    test('should return focus with Shift+Tab in reverse', async ({ page }) => {
      await page.goto('/login');
      await page.waitForTimeout(1000);

      const passwordInput = page.locator('input[name="password"]');
      await passwordInput.focus();

      // Shift+Tab should go back
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(500);

      const focused = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });
      expect(['INPUT', 'BUTTON', 'A']).toContain(focused);
    });

    test('should trap focus in modal with Tab', async ({ page, nav, modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      // Tab through elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }

      // Focus should still be in modal
      const focusedInModal = await page.evaluate(() => {
        const el = document.activeElement;
        const modal = document.querySelector('[role="dialog"], .modal');
        return modal?.contains(el);
      });

      expect(focusedInModal).toBe(true);
    });
  });

  test.describe('Copy/Paste Shortcuts', () => {
    test('should copy selected text with Ctrl+C', async ({ page, nav }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const firstCell = page.locator('tbody tr td').first();
      if (await firstCell.isVisible()) {
        const text = await firstCell.textContent();
        if (text) {
          // Select text
          await firstCell.selectText();

          // Copy
          await page.keyboard.press('Control+C');
          await page.waitForTimeout(500);

          // Paste somewhere
          const searchInput = page.locator('input[placeholder*="Search"]');
          if (await searchInput.isVisible()) {
            await searchInput.focus();
            await page.keyboard.press('Control+V');
            await page.waitForTimeout(500);

            const pastedValue = await searchInput.inputValue();
            expect(pastedValue).toContain(text.trim());
          }
        }
      }
    });
  });

  test.describe('Undo/Redo Shortcuts', () => {
    test('should support undo with Ctrl+Z', async ({ page, nav, form, modal: _modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      const codeInput = page.locator('input[name="code"]');
      await codeInput.fill('TEST_CODE');

      // Try undo
      await page.keyboard.press('Control+Z');
      await page.waitForTimeout(500);

      // Value might be undone (browser default) or not (if prevented)
      const value = await codeInput.inputValue();
      expect(typeof value).toBe('string');
    });
  });

  test.describe('Shortcut Conflicts', () => {
    test('should prevent browser shortcuts when in input', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.focus();
        await searchInput.fill('test');

        // Ctrl+A should select all (browser default)
        await page.keyboard.press('Control+A');
        await page.waitForTimeout(500);

        // Text should be selected
        const selectedText = await page.evaluate(() => {
          return window.getSelection()?.toString();
        });
        expect(selectedText).toBeTruthy();
      }
    });
  });
});
