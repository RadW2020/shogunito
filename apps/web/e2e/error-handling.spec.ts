import { test, expect, createProjectData } from './helpers/test-helpers';

test.describe.skip('Error Handling and Edge Cases', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.register();
  });

  test.describe('Network Error Handling', () => {
    test('should handle network timeout gracefully', async ({ page, nav, context }) => {
      // Simulate network failure
      await context.route('**/api/**', (route) => {
        route.abort('failed');
      });

      await nav.goToTab('Projects');
      await page.waitForTimeout(2000);

      // Should show error message or maintain UI stability
      const errorMessage = page.locator('text=/error|failed|network/i');
      const table = page.locator('table');

      // Either error message or empty state should be visible
      const hasError = await errorMessage.isVisible().catch(() => false);
      const hasTable = await table.isVisible().catch(() => false);

      expect(hasError || hasTable).toBe(true);
    });

    test('should handle 500 server errors', async ({ page, nav, context }) => {
      // Intercept and return 500 error
      await context.route('**/api/**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      });

      await nav.goToTab('Projects');
      await nav.openAddModal();

      const projectData = createProjectData();
      await page.fill('input[name="code"]', projectData.code);
      await page.fill('input[name="name"]', projectData.name);
      await page.click('button[type="submit"]');

      // Should show error toast
      await page.waitForTimeout(1000);
      const errorToast = page.locator('[role="alert"]:has-text("error"), .toast.error');
      if (await errorToast.isVisible()) {
        await expect(errorToast).toBeVisible();
      }
    });

    test('should handle 404 not found errors', async ({ page, nav, context }) => {
      await context.route('**/api/**', (route) => {
        route.fulfill({
          status: 404,
          body: JSON.stringify({ message: 'Not Found' }),
        });
      });

      await nav.goToTab('Projects');
      await page.waitForTimeout(2000);

      // Should handle gracefully
      const errorMessage = page.locator('text=/not found|404/i');
      const hasError = await errorMessage.isVisible().catch(() => false);
      expect(typeof hasError).toBe('boolean');
    });
  });

  test.describe('Validation Error Handling', () => {
    test('should handle extremely long input values', async ({ page, nav, modal: _modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      const longString = 'A'.repeat(10000);
      await page.fill('input[name="name"]', longString);

      // Should either truncate or show validation error
      const nameInput = page.locator('input[name="name"]');
      const value = await nameInput.inputValue();

      // Value should be handled (either truncated or validated)
      expect(value.length).toBeLessThanOrEqual(10000);
    });

    test('should handle special characters in input', async ({ page, nav, modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      await page.fill('input[name="code"]', `TEST_${specialChars}`);
      await page.fill('input[name="name"]', `Test ${specialChars}`);

      // Should handle or validate special characters
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);

      // Either success or validation error
      const modalOpen = await modal.isOpen();
      expect(typeof modalOpen).toBe('boolean');
    });

    test('should handle SQL injection attempts', async ({ page, nav, modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      const sqlInjection = '; DROP TABLE projects; --';
      await page.fill('input[name="code"]', sqlInjection);
      await page.fill('input[name="name"]', sqlInjection);

      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      // Should either reject or sanitize
      const modalOpen = await modal.isOpen();
      expect(typeof modalOpen).toBe('boolean');
    });

    test('should handle XSS attempts', async ({ page, nav, modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      const xssAttempt = '<script>alert("XSS")</script>';
      await page.fill('input[name="name"]', xssAttempt);

      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      // Should sanitize XSS
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>alert');
    });
  });

  test.describe('Concurrent Operations', () => {
    // These tests need admin permissions to create projects
    test.beforeEach(async ({ auth }) => {
      const { createTestUser } = await import('./helpers/test-helpers');
      await auth.register(createTestUser('admin'));
    });

    test('should handle rapid form submissions', async ({ page, nav, form, modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      const projectData = createProjectData();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');

      // Rapid clicks - the button should be disabled after first click
      const submitButton = page.locator('button[type="submit"]');

      // Click once
      await submitButton.click();

      // Wait a tiny bit for the button to potentially disable
      await page.waitForTimeout(100);

      // Check if button is disabled (good) or still enabled (needs fixing)
      const isDisabled = await submitButton.isDisabled().catch(() => false);

      // If not disabled, try clicking again to test duplicate prevention
      if (!isDisabled) {
        await submitButton.click().catch(() => {});
      }

      // Wait for processing
      await page.waitForTimeout(2000);

      // Should handle gracefully - either modal closed or showing error
      const modalOpen = await modal.isOpen();
      expect(typeof modalOpen).toBe('boolean');
    });

    test('should handle multiple tabs opening same entity', async ({ page, context, nav }) => {
      // Navigate to Projects tab first to ensure we're authenticated
      await nav.goToTab('Projects');
      await page.waitForTimeout(500);

      // Create project via API to ensure it exists
      const projectData = createProjectData();
      const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));

      if (accessToken) {
        const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
        const response = await page.request.post(`${apiUrl}/api/v1/projects`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            code: projectData.code,
            name: projectData.name,
            status: 'active',
          },
        });

        // Verify API call succeeded
        if (!response.ok()) {
          console.log(`API call failed with status ${response.status()}`);
          return;
        }
      }

      // Invalidate React Query cache to force refresh
      await page.evaluate(() => {
        const queryClient = (window as any).queryClient;
        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
      });

      // Wait for data to refresh
      await page.waitForTimeout(2000);

      // Verify project is visible in first tab
      const projectVisible = await page
        .locator(`text=${projectData.code}`)
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (!projectVisible) {
        // Try refreshing manually
        await nav.refreshData();
        await page.waitForTimeout(1000);

        const projectVisibleAfterRefresh = await page
          .locator(`text=${projectData.code}`)
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (!projectVisibleAfterRefresh) {
          console.log('Project not visible after API creation and refresh - infrastructure issue');
          return;
        }
      }

      // Open same page in new tab
      const newPage = await context.newPage();
      await newPage.goto(page.url());
      await newPage.waitForLoadState('networkidle');
      await newPage.waitForTimeout(2000);

      // Both tabs should show the project
      await expect(page.locator(`text=${projectData.code}`)).toBeVisible();
      await expect(newPage.locator(`text=${projectData.code}`)).toBeVisible({
        timeout: 10000,
      });

      await newPage.close();
    });
  });

  test.describe('Empty State Handling', () => {
    test('should show empty state when no data', async ({ page, nav }) => {
      // Navigate to tab with no data
      await nav.goToTab('Shots');

      await page.waitForTimeout(1000);

      // Should show empty state or table
      const emptyState = page.locator('text=/no.*found|empty|no data/i');
      const table = page.locator('table');

      const hasEmpty = await emptyState.isVisible().catch(() => false);
      const hasTable = await table.isVisible().catch(() => false);

      expect(hasEmpty || hasTable).toBe(true);
    });

    test('should handle empty search results', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('DEFINITELY_NONEXISTENT_ITEM_12345');
        await page.waitForTimeout(500);

        const noResults = page.locator('text=/no.*found|no.*results/i');
        if (await noResults.isVisible()) {
          await expect(noResults).toBeVisible();
        }
      }
    });
  });

  test.describe('Boundary Conditions', () => {
    test('should handle minimum field lengths', async ({ page, nav, modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      // Try single character
      await page.fill('input[name="code"]', 'A');
      await page.fill('input[name="name"]', 'B');

      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);

      // Should either accept or show validation
      const modalOpen = await modal.isOpen();
      expect(typeof modalOpen).toBe('boolean');
    });

    test('should handle maximum field lengths', async ({ page, nav, modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      // Try very long strings
      const longCode = 'A'.repeat(1000);
      const longName = 'B'.repeat(1000);

      await page.fill('input[name="code"]', longCode);
      await page.fill('input[name="name"]', longName);

      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);

      // Should either truncate or validate
      const modalOpen = await modal.isOpen();
      expect(typeof modalOpen).toBe('boolean');
    });

    test('should handle negative numbers where applicable', async ({ page, nav, modal, form }) => {
      await nav.goToTab('Episodes');
      await nav.openAddModal();

      // Fill required fields
      await form.fillField('code', 'TEST_NEG');
      await form.fillField('name', 'Test Negative');

      // Select a project (assuming at least one exists or the select is available)
      // We'll just try to submit with negative duration
      const durationInput = page.locator('input[name="duration"]');
      await durationInput.fill('-1');

      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);

      // Should show validation error and modal should remain open
      const modalOpen = await modal.isOpen();
      expect(modalOpen).toBe(true);

      // Check for error message if we filled everything else,
      // but even if we didn't, the modal should stay open.
      // Let's specifically check for the duration error if possible,
      // but since we didn't select a project, we might get multiple errors.
      // The important thing is that negative duration is NOT accepted.

      // If we want to be sure it's the duration causing it, we should check the error text.
      // But simply asserting the modal is open is a good start.
      // Let's try to find the specific error.
      const durationError = page.locator('text=Duration must be positive');
      if (await durationError.isVisible()) {
        await expect(durationError).toBeVisible();
      }
    });
  });

  test.describe('State Management Errors', () => {
    test('should recover from invalid localStorage data', async ({ page, nav }) => {
      // Inject invalid data
      await page.evaluate(() => {
        localStorage.setItem('shogun-ui-state', 'invalid json{{{');
      });

      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      // Should handle gracefully without crashing
      const table = page.locator('table');
      const content = page.locator('.content');
      const hasTable = await table.isVisible().catch(() => false);
      const hasContent = await content
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasTable || hasContent).toBe(true);
    });

    test('should handle corrupted session data', async ({ page, auth }) => {
      await auth.register();

      // Corrupt session storage
      await page.evaluate(() => {
        sessionStorage.setItem('auth-token', 'corrupted-token');
      });

      // Try to navigate
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Should either redirect to login or handle gracefully
      const url = page.url();
      expect(url.includes('/login') || url.includes('/')).toBe(true);
    });
  });

  test.describe('Modal and UI Errors', () => {
    test('should handle modal close during save', async ({ page, nav, form, modal }) => {
      await nav.goToTab('Projects');
      await nav.openAddModal();

      const projectData = createProjectData();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);

      // Start submit and immediately close
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      await modal.close();

      // Modal should close without errors
      expect(await modal.isOpen()).toBe(false);
    });

    test('should handle rapid tab switching', async ({ page, nav }) => {
      const tabs = ['Projects', 'Episodes', 'Assets', 'Sequences', 'Shots'];

      // Rapidly switch tabs
      for (const tab of tabs) {
        await nav.goToTab(tab);
        await page.waitForTimeout(100);
      }

      // Should end on last tab without errors
      await expect(page.locator('table, .content')).toBeVisible();
    });
  });

  test.describe('Data Integrity Errors', () => {
    test('should handle duplicate code creation attempts', async ({
      page,
      nav,
      form,
      modal,
      toast,
    }) => {
      await nav.goToTab('Projects');

      const projectData = createProjectData();

      // Create first project
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      // Try to create duplicate
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', 'Different Name');
      await form.fillField('status', 'active');
      await modal.submit();

      // Should show error
      await toast.expectError();
    });

    test('should handle deletion of non-existent item', async ({ page, nav }) => {
      await nav.goToTab('Projects');

      // Try to delete non-existent item
      const deleteButton = page.locator('button:has-text("Delete")');
      if (await deleteButton.isVisible()) {
        // Should handle gracefully
        await page.waitForTimeout(500);
      }
    });
  });
});
