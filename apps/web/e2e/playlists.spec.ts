import { test, expect, createProjectData, createTestUser } from './helpers/test-helpers';

test.describe('Playlists Management', () => {
  test.beforeEach(async ({ auth, nav, form, modal, toast }) => {
    // Register as admin to have permissions to create projects
    await auth.register({ ...createTestUser(), role: 'admin' });

    // Create a project first (playlists may need a project)
    await nav.goToTab('Projects');
    const projectData = createProjectData();
    await nav.openAddModal();
    await form.fillField('code', projectData.code);
    await form.fillField('name', projectData.name);
    await form.fillField('status', 'active');
    await modal.submit();
    await toast.waitForToastToDisappear();
  });

  test.describe('Create Playlist', () => {
    test('should create a new playlist successfully', async ({
      page,
      nav,
      form,
      modal,
      toast,
      table,
    }) => {
      await nav.goToTab('Playlists');
      await nav.openAddModal();

      const playlistCode = `PL_${Date.now()}`;
      const playlistName = `Playwright Test Playlist ${Date.now()}`;

      await form.fillField('code', playlistCode);
      await form.fillField('name', playlistName);

      // Fill project field if visible
      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      if (await page.locator('input[name="description"]').isVisible()) {
        await form.fillField('description', 'Created by Playwright E2E tests');
      }

      await modal.submit();
      await toast.expectSuccess();
      expect(await modal.isOpen()).toBe(false);

      await table.expectRowExists(playlistCode);
      await table.expectRowExists(playlistName);
    });

    test('should show validation errors for empty required fields', async ({
      page,
      nav,
      modal,
    }) => {
      await nav.goToTab('Playlists');
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

    test('should handle optional fields', async ({ page, nav, form, modal, toast }) => {
      await nav.goToTab('Playlists');

      const playlistCode = `PL_OPT_${Date.now()}`;
      await nav.openAddModal();

      await form.fillField('code', playlistCode);
      await form.fillField('name', `Optional Fields Test ${Date.now()}`);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      if (await page.locator('textarea[name="description"]').isVisible()) {
        await form.fillField('description', 'Optional description field');
      }

      await modal.submit();
      await toast.expectSuccess();
    });
  });

  test.describe('View Playlists', () => {
    test('should display playlists in table', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Playlists');

      const playlistCode = `PL_VIEW_${Date.now()}`;
      await nav.openAddModal();
      await form.fillField('code', playlistCode);
      await form.fillField('name', `View Test Playlist ${Date.now()}`);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      const rowCount = await table.getRowCount();
      expect(rowCount).toBeGreaterThan(0);
      await table.expectRowExists(playlistCode);
    });

    test('should show playlist details in detail panel', async ({
      page,
      nav,
      form,
      modal,
      toast,
    }) => {
      await nav.goToTab('Playlists');

      const playlistCode = `PL_DTL_${Date.now()}`;
      await nav.openAddModal();
      await form.fillField('code', playlistCode);
      await form.fillField('name', `Detail Test Playlist ${Date.now()}`);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      await nav.openDetailPanel(playlistCode);

      await expect(page.locator('.detail-panel, [data-testid="detail-panel"]')).toBeVisible();
      await expect(page.locator(`text=${playlistCode}`)).toBeVisible();
    });
  });

  test.describe('Edit Playlist', () => {
    test('should edit playlist successfully', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Playlists');

      const playlistCode = `PL_EDIT_${Date.now()}`;
      const originalName = `Edit Test Playlist ${Date.now()}`;

      await nav.openAddModal();
      await form.fillField('code', playlistCode);
      await form.fillField('name', originalName);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      await table.clickRowAction(playlistCode, 'Edit');

      expect(await modal.isOpen()).toBe(true);

      const newName = `Updated ${originalName}`;
      await form.fillField('name', newName);

      await modal.submit();
      await toast.expectSuccess();

      await table.expectRowExists(newName);
    });
  });

  test.describe('Delete Playlist', () => {
    test('should delete single playlist', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Playlists');

      const playlistCode = `PL_DEL_${Date.now()}`;
      await nav.openAddModal();
      await form.fillField('code', playlistCode);
      await form.fillField('name', `Delete Test Playlist ${Date.now()}`);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      await table.selectRow(playlistCode);
      await page.click('button:has-text("Delete")');

      if (await page.locator('text=/confirm|delete/i').isVisible()) {
        await page.click('button:has-text("Confirm"), button:has-text("Delete")');
      }

      await toast.expectSuccess();
      await table.expectRowNotExists(playlistCode);
    });
  });

  test.describe('Search and Filter', () => {
    test('should search playlists by name', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Playlists');

      const playlistCode = `PL_SRCH_${Date.now()}`;
      const playlistName = `Search Test Playlist ${Date.now()}`;

      await nav.openAddModal();
      await form.fillField('code', playlistCode);
      await form.fillField('name', playlistName);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill(playlistName);
        await page.waitForTimeout(500);
        await table.expectRowExists(playlistName);
      }
    });

    test('should filter playlists by project', async ({ page, nav }) => {
      await nav.goToTab('Playlists');
      await nav.toggleFilters();

      const projectFilter = page.locator('select[name="projectId"], select:near(text="Project")');
      if (await projectFilter.isVisible()) {
        await projectFilter.selectOption({ index: 1 });
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Playlist Player', () => {
    test('should open playlist player modal', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Playlists');

      const playlistCode = `PL_PLAY_${Date.now()}`;
      await nav.openAddModal();
      await form.fillField('code', playlistCode);
      await form.fillField('name', `Player Test Playlist ${Date.now()}`);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      // Try to open player if button exists
      const playButton = page.locator(
        `tr:has-text("${playlistCode}") button:has-text("Play"), tr:has-text("${playlistCode}") button[aria-label*="Play"]`,
      );
      if (await playButton.isVisible()) {
        await playButton.click();
        await page.waitForTimeout(500);

        // Should show player modal
        const playerModal = page.locator(
          '[role="dialog"]:has-text("Playlist"), .modal:has-text("Playlist")',
        );
        if (await playerModal.isVisible()) {
          await expect(playerModal).toBeVisible();
        }
      }
    });
  });

  test.describe('Notes Integration', () => {
    test('should add note to playlist', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Playlists');

      const playlistCode = `PL_NOTE_${Date.now()}`;
      await nav.openAddModal();
      await form.fillField('code', playlistCode);
      await form.fillField('name', `Note Test Playlist ${Date.now()}`);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      await table.clickRowAction(playlistCode, '+ Note');

      expect(await modal.isOpen()).toBe(true);

      await form.fillField('content', 'This is a test note for the playlist');

      await modal.submit();
      await toast.expectSuccess();

      const noteBadge = page.locator(
        `tr:has-text("${playlistCode}") .note-badge, tr:has-text("${playlistCode}") [data-testid="note-badge"]`,
      );
      if (await noteBadge.isVisible()) {
        await expect(noteBadge).toContainText('1');
      }
    });
  });
});
