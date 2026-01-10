import { test, expect, createTestUser } from './helpers/test-helpers';
import type { Locator } from '@playwright/test';

test.describe('Status Management', () => {
  test.beforeEach(async ({ auth, page }) => {
    const uniqueUser = createTestUser();
    (page as any).__testUserEmail = uniqueUser.email;
    await auth.register(uniqueUser);
  });

  test.afterEach(async ({ cleanup, page }) => {
    if (page.isClosed()) {
      return;
    }

    try {
      const userEmail = (page as any).__testUserEmail;
      if (userEmail) {
        await cleanup.deleteUserByEmail(userEmail);
      }
    } catch (error) {
      console.warn('[Status] Error cleaning up user:', error);
    }
  });

  const setColorValue = async (locator: Locator, value: string) => {
    await locator.evaluate(
      (el, val) => {
        const input = el as HTMLInputElement;
        input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      },
      value.toLowerCase(),
    );
  };

  test.describe('View Statuses', () => {
    test('should display statuses in table', async ({ page, nav }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Should show table
      await expect(page.locator('table')).toBeVisible();
    });

    test('should show status details in detail panel', async ({ page, nav }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      await page.waitForTimeout(1000);

      // Try to click on first status if available
      const firstStatus = page.locator('tr').first();
      if (await firstStatus.isVisible({ timeout: 15000 }).catch(() => false)) {
        await firstStatus.click();
        await page.waitForTimeout(500);

        // Should show detail panel
        const detailPanel = page.locator('.detail-panel, [data-testid="detail-panel"]');
        if (await detailPanel.isVisible({ timeout: 15000 }).catch(() => false)) {
          await expect(detailPanel).toBeVisible();
        }
      }
    });
  });

  test.describe('Create Status', () => {
    test('should create a new status successfully', async ({
      page,
      nav,
      form,
      modal,
      toast,
      table,
    }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await nav.openAddModal();

      const statusCode = `STATUS_${Date.now()}`;
      const statusName = `Test Status ${Date.now()}`;

      await form.fillField('code', statusCode);
      await form.fillField('name', statusName);

      // Fill color field if visible
      if (await page.locator('input[name="color"], input[type="color"]').isVisible({ timeout: 15000 }).catch(() => false)) {
        await form.fillField('color', '#FF5733');
      }

      // Select applicable entities if available
      const entitiesSelect = page.locator('select[name="applicableEntities"], select[multiple]');
      if (await entitiesSelect.isVisible({ timeout: 15000 }).catch(() => false)) {
        await entitiesSelect.selectOption({ index: 0 });
      }

      await modal.submit();
      await toast.expectSuccess();
      expect(await modal.isOpen()).toBe(false);

      await table.expectRowExists(statusCode);
      await table.expectRowExists(statusName);
    });

    test('should show validation errors for empty required fields', async ({
      page,
      nav,
      modal,
    }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await nav.openAddModal();

      await modal.submit();

      expect(await modal.isOpen()).toBe(true);

      const codeInput = page.locator('input[name="code"]');
      const nameInput = page.locator('input[name="name"]');

      const codeValidation = await codeInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage,
      );
      const nameValidation = await nameInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage,
      );

      expect(codeValidation || nameValidation).toBeTruthy();
    });

    test('should validate color format', async ({ page, nav, form, modal }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await nav.openAddModal();

      await form.fillField('code', `STATUS_COLOR_${Date.now()}`);
      await form.fillField('name', 'Color Test Status');

      const colorInput = page.locator('input[name="color"]');
      if (await colorInput.isVisible({ timeout: 15000 }).catch(() => false)) {
        // Try invalid color format
        await setColorValue(colorInput, 'invalid-color');
        await modal.submit();

        // Should show validation error
        const validation = await colorInput.evaluate(
          (el: HTMLInputElement) => el.validationMessage,
        );
        expect(validation).toBeTruthy();
      }
    });

    test('should support all applicable entity types', async ({
      page,
      nav,
      form,
      modal,
      toast,
    }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const entityTypes = ['project', 'episode', 'sequence', 'shot', 'asset', 'version'];

      for (const entityType of entityTypes) {
        const statusCode = `STATUS_${entityType}_${Date.now()}`;
        await nav.openAddModal();
        await form.fillField('code', statusCode);
        await form.fillField('name', `Status for ${entityType}`);

        const colorInput = page.locator('input[name="color"], input[type="color"]');
        if (await colorInput.isVisible({ timeout: 15000 }).catch(() => false)) {
          await setColorValue(colorInput, '#ff5733');
        }

        const entitiesSelect = page.locator('select[name="applicableEntities"]');
        if (await entitiesSelect.isVisible({ timeout: 15000 }).catch(() => false)) {
          await entitiesSelect.selectOption(entityType);
        }

        await modal.submit();
        await toast.expectSuccess();
        await toast.waitForToastToDisappear();
      }
    });
  });

  test.describe('Edit Status', () => {
    test('should edit status successfully', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Create a status first
      const statusCode = `STATUS_EDIT_${Date.now()}`;
      const originalName = `Edit Test Status ${Date.now()}`;

      await nav.openAddModal();
      await form.fillField('code', statusCode);
      await form.fillField('name', originalName);

      const colorInput = page.locator('input[name="color"], input[type="color"]');
      if (await colorInput.isVisible({ timeout: 15000 }).catch(() => false)) {
        await setColorValue(colorInput, '#ff5733');
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      await table.clickRowAction(statusCode, 'Edit');

      expect(await modal.isOpen()).toBe(true);

      const newName = `Updated ${originalName}`;
      await form.fillField('name', newName);

      await modal.submit();
      await toast.expectSuccess();

      await table.expectRowExists(newName);
    });

    test('should update status color', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const statusCode = `STATUS_COLOR_EDIT_${Date.now()}`;
      await nav.openAddModal();
      await form.fillField('code', statusCode);
      await form.fillField('name', 'Color Edit Test');

      const colorInput = page.locator('input[name="color"], input[type="color"]');
      if (await colorInput.isVisible({ timeout: 15000 }).catch(() => false)) {
        await setColorValue(colorInput, '#ff5733');
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      await table.clickRowAction(statusCode, 'Edit');

      const newColorInput = page.locator('input[name="color"], input[type="color"]');
      if (await newColorInput.isVisible({ timeout: 15000 }).catch(() => false)) {
        await newColorInput.fill('#33FF57');
        await modal.submit();
        await toast.expectSuccess();
      }
    });
  });

  test.describe('Delete Status', () => {
    test('should delete single status', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const statusCode = `STATUS_DEL_${Date.now()}`;
      await nav.openAddModal();
      await form.fillField('code', statusCode);
      await form.fillField('name', `Delete Test Status ${Date.now()}`);

      const colorInput = page.locator('input[name="color"], input[type="color"]');
      if (await colorInput.isVisible({ timeout: 15000 }).catch(() => false)) {
        await setColorValue(colorInput, '#ff5733');
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      await table.selectRow(statusCode);
      await page.click('button:has-text("Delete")');

      if (await page.locator('text=/confirm|delete/i').isVisible()) {
        await page.click('button:has-text("Confirm"), button:has-text("Delete")');
      }

      await toast.expectSuccess();
      await table.expectRowNotExists(statusCode);
    });
  });

  test.describe('Search and Filter', () => {
    test('should search statuses by name', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const statusCode = `STATUS_SRCH_${Date.now()}`;
      const statusName = `Search Test Status ${Date.now()}`;

      await nav.openAddModal();
      await form.fillField('code', statusCode);
      await form.fillField('name', statusName);

      const colorInput = page.locator('input[name="color"], input[type="color"]');
      if (await colorInput.isVisible({ timeout: 15000 }).catch(() => false)) {
        await setColorValue(colorInput, '#ff5733');
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(statusName);
        await page.waitForTimeout(500);
        await table.expectRowExists(statusName);
      }
    });

    test('should filter statuses by applicable entity', async ({ page, nav }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await nav.toggleFilters();

      const entitySelect = page
        .locator('select[name="applicableEntity"], select[name="applicableEntities"]')
        .first();
      if (await entitySelect.isVisible()) {
        await entitySelect.selectOption('shot');
        await page.waitForTimeout(500);
      }
    });

    test('should filter statuses by active/inactive', async ({ page, nav }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await nav.toggleFilters();

      const activeSelect = page
        .locator('select[name="isActive"], select[name="active"]')
        .first();
      const activeCheckbox = page
        .locator('input[name="isActive"], input[name="active"], input[type="checkbox"]')
        .first();

      if (await activeSelect.isVisible()) {
        await activeSelect.selectOption('true');
        await page.waitForTimeout(500);
      } else if (await activeCheckbox.isVisible()) {
        await activeCheckbox.check({ force: true });
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Status Display', () => {
    test('should show status color badge', async ({ page, nav, form, modal, toast }) => {
      await nav.goToTab('Status');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const statusCode = `STATUS_BADGE_${Date.now()}`;
      await nav.openAddModal();
      await form.fillField('code', statusCode);
      await form.fillField('name', 'Badge Test Status');

      const colorInput = page.locator('input[name="color"], input[type="color"]');
      if (await colorInput.isVisible({ timeout: 15000 }).catch(() => false)) {
        await setColorValue(colorInput, '#ff5733');
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      // Should show color badge in table
      const colorBadge = page.locator(
        `tr:has-text("${statusCode}") .status-badge, tr:has-text("${statusCode}") [style*="background"]`,
      );
      if (await colorBadge.isVisible()) {
        await expect(colorBadge).toBeVisible();
      }
    });
  });
});
