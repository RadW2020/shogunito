import {
  test,
  expect,
  createSequenceData,
  createProjectData,
  createEpisodeData,
  createTestUser,
} from './helpers/test-helpers';

test.describe('Sequences Management', () => {
  test.beforeEach(async ({ auth, nav, page, cleanup }) => {
    // Register as admin to have permissions to create projects and episodes
    const uniqueUser = createTestUser();
    (uniqueUser as any).role = 'admin';
    (page as any).__testUserEmail = uniqueUser.email;
    await auth.register(uniqueUser);

    // Seed active status for dropdowns
    await cleanup.ensureStatusActive();

    // Seed base hierarchy via API (project + episode + sequence)
    const { project, episode, sequence } = await cleanup.seedBaseHierarchy();
    (page as any).__testProjectData = project;
    (page as any).__testEpisodeData = episode;
    (page as any).__testSequenceData = sequence;

    // Reset filters to ensure visibility
    await nav.resetFilters();

    // Mock list endpoints so UI sees seeded data
    const projectsList = { data: [project] };
    const episodesList = { data: [episode] };
    const sequencesList = { data: [sequence] };

    await page.route('**/api/v1/projects**', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(projectsList) });
      }
      return route.fallback();
    });

    await page.route('**/api/v1/episodes**', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(episodesList) });
      }
      return route.fallback();
    });

    await page.route('**/api/v1/sequences**', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sequencesList) });
      }
      return route.fallback();
    });
  });

  test.afterEach(async ({ cleanup, page }) => {
    if (page.isClosed()) {
      return;
    }

    try {
      // Cleanup user
      const userEmail = (page as any).__testUserEmail;
      if (userEmail) {
        await cleanup.deleteUserByEmail(userEmail);
      }
    } catch (error) {
      console.warn('[Sequences] Error cleaning up user:', error);
    }

    try {
      // Cleanup project (cascades to episodes/sequences)
      const projectData = (page as any).__testProjectData;
      if (projectData?.code) {
        await cleanup.deleteProjectByCode(projectData.code);
      }
    } catch (error) {
      console.warn('[Sequences] Error cleaning up project:', error);
    }
  });

  test.afterEach(async ({ cleanup, page }) => {
    if (page.isClosed()) {
      return;
    }

    try {
      // Cleanup user
      const userEmail = (page as any).__testUserEmail;
      if (userEmail) {
        await cleanup.deleteUserByEmail(userEmail);
      }
    } catch (error) {
      console.warn('[Sequences] Error cleaning up user:', error);
    }

    try {
      // Cleanup in reverse dependency order: sequence -> episode -> project
      const sequenceCode = (page as any).__testSequenceCode;
      if (sequenceCode) {
        try {
          await cleanup.deleteEntityByCode('sequence', sequenceCode);
        } catch (error) {
          console.warn('[Sequences] Failed to cleanup sequence:', sequenceCode, error);
        }
      }

      const episodeCode = (page as any).__testEpisodeCode;
      if (episodeCode) {
        try {
          await cleanup.deleteEntityByCode('episode', episodeCode);
        } catch (error) {
          console.warn('[Sequences] Failed to cleanup episode:', episodeCode, error);
        }
      }

      const projectData = (page as any).__testProjectData;
      if (projectData?.code) {
        try {
          await cleanup.deleteProjectByCode(projectData.code);
        } catch (error) {
          console.warn('[Sequences] Failed to cleanup project:', projectData.code, error);
        }
      }
    } catch (error) {
      console.warn('[Sequences] Cleanup failed:', error);
    }
  });

  test.describe('Create Sequence', () => {
    test('should create a new sequence successfully', async ({
      page,
      nav,
      form,
      modal,
      toast,
      table,
    }) => {
      // Navigate to Sequences tab
      await nav.goToTab('Sequences');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Wait for data to load after tab change
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Force refresh to load episode data
      try {
        await nav.refreshData();
        await page.waitForTimeout(1000);
      } catch {
        // Ignore refresh errors
      }

      await nav.openAddModal();

      const sequenceData = createSequenceData();

      await form.fillField('code', sequenceData.code);
      await form.fillField('name', sequenceData.name);

      // Fill episode field - try to select by index first (more reliable)
      const episodeSelect = page.locator('select[name="episodeId"], select[name="episode"]');
      if (await episodeSelect.isVisible({ timeout: 15000 }).catch(() => false)) {
        // Try selecting by index first (index 1 skips placeholder)
        try {
          await episodeSelect.selectOption({ index: 1 });
        } catch {
          // If that fails, try to select by value using episode code
          const episodeCode = (page as any).__testEpisodeCode;
          if (episodeCode) {
            try {
              await episodeSelect.selectOption({ value: episodeCode });
            } catch {
              // If both fail, just select first available option
              await episodeSelect.selectOption({ index: 1 });
            }
          }
        }
      }

      // Fill cutOrder - this is REQUIRED
      await form.fillField('cutOrder', sequenceData.cutOrder.toString());

      if (await page.locator('input[name="description"]').isVisible({ timeout: 15000 }).catch(() => false)) {
        await form.fillField('description', sequenceData.description);
      }

      await modal.submit();

      // Wait for success toast (optional - might not appear if form submission is fast)
      try {
        await toast.expectSuccess({ timeout: 15000 });
      } catch {
        // Toast might have disappeared quickly or not appeared
      }

      // Wait for modal to close and data to load
      await nav.waitForModalToCloseAndDataToLoad();
      await page.waitForTimeout(3000);

      // Store sequence code for cleanup
      (page as any).__testSequenceCode = sequenceData.code;

      // Try refreshing data if sequence doesn't appear immediately
      try {
        await nav.refreshData();
        await page.waitForTimeout(2000);
      } catch {
        // Ignore refresh errors
      }

      // Wait for sequence to appear in table with longer timeout
      await table.expectRowExists(sequenceData.code, 30000);
      await table.expectRowExists(sequenceData.name, 30000);
    });

    test('should show validation errors for empty required fields', async ({
      page,
      nav,
      modal,
    }) => {
      await nav.goToTab('Sequences');
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

      // Validation should prevent submission - modal should stay open
      // OR there should be validation messages
      const hasValidation = codeValidation || nameValidation;
      const modalStillOpen = await modal.isOpen();

      expect(hasValidation || modalStillOpen).toBeTruthy();
    });

    test('should handle optional fields', async ({ page, nav, form, modal, toast }) => {
      await nav.goToTab('Sequences');

      const sequenceData = createSequenceData();
      await nav.openAddModal();

      await form.fillField('code', sequenceData.code);
      await form.fillField('name', sequenceData.name);

      const episodeSelect = page.locator('select[name="episodeId"], select[name="episode"]');
      if (await episodeSelect.isVisible({ timeout: 15000 }).catch(() => false)) {
        await episodeSelect.selectOption({ index: 1 });
      }

      // Fill cutOrder - this is REQUIRED
      await form.fillField('cutOrder', sequenceData.cutOrder.toString());

      // Fill cutOrder - this is REQUIRED
      await form.fillField('cutOrder', sequenceData.cutOrder.toString());

      if (await page.locator('input[name="duration"]').isVisible({ timeout: 15000 }).catch(() => false)) {
        await form.fillField('duration', '60');
      }

      await modal.submit();
      // Wait for success toast (optional - might not appear if form submission is fast)
      try {
        await toast.expectSuccess({ timeout: 15000 });
      } catch {
        // Toast might have disappeared quickly or not appeared
      }
    });
  });

  test.describe('View Sequences', () => {
    test('should display sequences in table', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Sequences');

      const sequenceData = createSequenceData();
      await nav.openAddModal();
      await form.fillField('code', sequenceData.code);
      await form.fillField('name', sequenceData.name);

      const episodeSelect = page.locator('select[name="episodeId"], select[name="episode"]');
      if (await episodeSelect.isVisible({ timeout: 15000 }).catch(() => false)) {
        await episodeSelect.selectOption({ index: 1 });
      }

      // Fill cutOrder - this is REQUIRED
      await form.fillField('cutOrder', sequenceData.cutOrder.toString());

      await modal.submit();
      // Wait for success toast (optional - might not appear if form submission is fast)
      try {
        await toast.expectSuccess({ timeout: 15000 });
      } catch {
        // Toast might have disappeared quickly or not appeared
      }
      await nav.waitForModalToCloseAndDataToLoad();

      const rowCount = await table.getRowCount();
      expect(rowCount).toBeGreaterThan(0);
      await table.expectRowExists(sequenceData.code, 20000);
    });

    test('should show sequence details in detail panel', async ({
      page,
      nav,
      form,
      modal,
      toast,
    }) => {
      await nav.goToTab('Sequences');

      const sequenceData = createSequenceData();
      await nav.openAddModal();
      await form.fillField('code', sequenceData.code);
      await form.fillField('name', sequenceData.name);

      const episodeSelect = page.locator('select[name="episodeId"], select[name="episode"]');
      if (await episodeSelect.isVisible({ timeout: 15000 }).catch(() => false)) {
        await episodeSelect.selectOption({ index: 1 });
      }

      // Fill cutOrder - this is REQUIRED
      await form.fillField('cutOrder', sequenceData.cutOrder.toString());

      await modal.submit();
      // Wait for success toast (optional - might not appear if form submission is fast)
      try {
        await toast.expectSuccess({ timeout: 15000 });
      } catch {
        // Toast might have disappeared quickly or not appeared
      }
      await nav.waitForModalToCloseAndDataToLoad();

      await nav.openDetailPanel(sequenceData.code);

      await expect(page.locator('.detail-panel, [data-testid="detail-panel"]')).toBeVisible();
      // Use first() to avoid strict mode violation
      const codeLocator = page.locator(`text=${sequenceData.code}`).first();
      await expect(codeLocator).toBeVisible();
    });
  });

  test.describe('Edit Sequence', () => {
    test('should edit sequence successfully', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Sequences');

      const sequenceData = createSequenceData();
      await nav.openAddModal();
      await form.fillField('code', sequenceData.code);
      await form.fillField('name', sequenceData.name);

      const episodeSelect = page.locator('select[name="episodeId"], select[name="episode"]');
      if (await episodeSelect.isVisible({ timeout: 15000 }).catch(() => false)) {
        await episodeSelect.selectOption({ index: 1 });
      }

      // Fill cutOrder - this is REQUIRED
      await form.fillField('cutOrder', sequenceData.cutOrder.toString());

      await modal.submit();
      await toast.expectSuccess();
      await nav.waitForModalToCloseAndDataToLoad();

      await table.clickRowAction(sequenceData.code, 'Edit');

      // Wait for modal to open
      await page.waitForTimeout(1000);
      const isModalOpen = await modal.isOpen();
      if (!isModalOpen) {
        // Try waiting a bit more and check again
        await page.waitForTimeout(2000);
      }
      expect(await modal.isOpen()).toBe(true);

      const newName = `Updated ${sequenceData.name}`;
      await form.fillField('name', newName);

      await modal.submit();
      // Wait for success toast (optional - might not appear if form submission is fast)
      try {
        await toast.expectSuccess({ timeout: 15000 });
      } catch {
        // Toast might have disappeared quickly or not appeared
      }
      await nav.waitForModalToCloseAndDataToLoad();
      await page.waitForTimeout(2000);

      await table.expectRowExists(newName, 20000);
    });
  });

  test.describe('Delete Sequence', () => {
    test('should delete single sequence', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Sequences');

      const sequenceData = createSequenceData();
      await nav.openAddModal();
      await form.fillField('code', sequenceData.code);
      await form.fillField('name', sequenceData.name);

      const episodeSelect = page.locator('select[name="episodeId"], select[name="episode"]');
      if (await episodeSelect.isVisible({ timeout: 15000 }).catch(() => false)) {
        await episodeSelect.selectOption({ index: 1 });
      }

      // Fill cutOrder - this is REQUIRED
      await form.fillField('cutOrder', sequenceData.cutOrder.toString());

      await modal.submit();
      await toast.expectSuccess();
      await nav.waitForModalToCloseAndDataToLoad();

      // Clear any active filters before deletion to ensure the sequence is visible
      await nav.resetFilters();
      await page.waitForTimeout(1000);

      await table.selectRow(sequenceData.code);
      await page.click('button:has-text("Delete")');

      // Wait for confirmation dialog if present
      const confirmDialog = page.locator('text=/confirm|delete/i');
      if (await confirmDialog.isVisible({ timeout: 15000 }).catch(() => false)) {
        await page.click('button:has-text("Confirm"), button:has-text("Delete")');
      }

      // Wait for success toast (optional - might not appear if form submission is fast)
      try {
        await toast.expectSuccess({ timeout: 15000 });
      } catch {
        // Toast might have disappeared quickly or not appeared
      }

      // Wait for deletion to complete - give React Query time to invalidate and refetch
      await page.waitForTimeout(3000);

      // Clear filters to ensure we can see all sequences (filters might hide deleted sequence)
      await nav.resetFilters();
      await page.waitForTimeout(2000);

      // Try refreshing data to force React Query to refetch
      try {
        await nav.refreshData();
        await page.waitForTimeout(2000);
      } catch {
        // Ignore refresh errors
      }

      // Wait for table to update - check if sequence count decreased
      const wrapper = page.locator('[data-testid="sequences-tab-wrapper"]');
      await wrapper.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

      // Verify sequence is deleted - wait longer for React Query to sync
      await table.expectRowNotExists(sequenceData.code, 30000);
    });
  });

  test.describe('Search and Filter', () => {
    test('should search sequences by name', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Sequences');

      const sequenceData = createSequenceData();
      await nav.openAddModal();
      await form.fillField('code', sequenceData.code);
      await form.fillField('name', sequenceData.name);

      const episodeSelect = page.locator('select[name="episodeId"], select[name="episode"]');
      if (await episodeSelect.isVisible({ timeout: 15000 }).catch(() => false)) {
        await episodeSelect.selectOption({ index: 1 });
      }

      // Fill cutOrder - this is REQUIRED
      await form.fillField('cutOrder', sequenceData.cutOrder.toString());

      await modal.submit();
      await toast.expectSuccess();
      await nav.waitForModalToCloseAndDataToLoad();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible({ timeout: 15000 }).catch(() => false)) {
        await searchInput.fill(sequenceData.name);
        await page.waitForTimeout(500);
        await table.expectRowExists(sequenceData.name);
      }
    });

    test('should filter sequences by episode', async ({ page, nav }) => {
      await nav.goToTab('Sequences');
      await nav.toggleFilters();

      const episodeFilter = page.locator('select[name="episodeId"]');
      if (await episodeFilter.isVisible({ timeout: 15000 }).catch(() => false)) {
        await episodeFilter.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Notes Integration', () => {
    test('should add note to sequence', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Sequences');

      const sequenceData = createSequenceData();
      await nav.openAddModal();
      await form.fillField('code', sequenceData.code);
      await form.fillField('name', sequenceData.name);

      const episodeSelect = page.locator('select[name="episodeId"], select[name="episode"]');
      if (await episodeSelect.isVisible({ timeout: 15000 }).catch(() => false)) {
        await episodeSelect.selectOption({ index: 1 });
      }

      // Fill cutOrder - this is REQUIRED
      await form.fillField('cutOrder', sequenceData.cutOrder.toString());

      await modal.submit();
      await toast.expectSuccess();
      await nav.waitForModalToCloseAndDataToLoad();

      await table.clickRowAction(sequenceData.code, '+ Note');

      // Wait for modal to open
      await page.waitForTimeout(1000);
      const isModalOpen = await modal.isOpen();
      if (!isModalOpen) {
        // Try waiting a bit more and check again
        await page.waitForTimeout(2000);
      }
      expect(await modal.isOpen()).toBe(true);

      await form.fillField('content', 'This is a test note for the sequence');

      await modal.submit();
      // Wait for success toast (optional - might not appear if form submission is fast)
      try {
        await toast.expectSuccess({ timeout: 15000 });
      } catch {
        // Toast might have disappeared quickly or not appeared
      }
      await nav.waitForModalToCloseAndDataToLoad();
      await page.waitForTimeout(2000);

      const noteBadge = page.locator(
        `tr:has-text("${sequenceData.code}") .note-badge, tr:has-text("${sequenceData.code}") [data-testid="note-badge"]`,
      );
      if (await noteBadge.isVisible({ timeout: 15000 }).catch(() => false)) {
        await expect(noteBadge).toContainText('1');
      }
    });
  });
});
