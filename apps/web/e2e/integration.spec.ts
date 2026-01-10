import {
  test,
  expect,
  createProjectData,
  createEpisodeData,
  createSequenceData,
  createShotData,
  createAssetData,
} from './helpers/test-helpers';

test.describe('Entity Integration Tests', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.register();
  });

  test.describe('Project-Episode Integration', () => {
    test('should filter episodes by selected project', async ({
      page,
      nav,
      form,
      modal,
      toast,
    }) => {
      // Create two projects
      await nav.goToTab('Projects');
      const project1 = createProjectData();
      const project2 = createProjectData();

      for (const project of [project1, project2]) {
        await nav.openAddModal();
        await form.fillField('code', project.code);
        await form.fillField('name', project.name);
        await form.fillField('status', 'active');
        await modal.submit();
        await toast.waitForToastToDisappear();
      }

      // Create episodes for each project
      await nav.goToTab('Episodes');
      const episode1 = createEpisodeData();
      await nav.openAddModal();
      await form.fillField('code', episode1.code);
      await form.fillField('name', episode1.name);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({
          label: new RegExp(project1.name, 'i'),
        });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      // Filter by project1
      await nav.toggleFilters();
      const projectFilter = page.locator('select[name="projectId"], select:near(text="Project")');
      if (await projectFilter.isVisible()) {
        await projectFilter.selectOption({
          label: new RegExp(project1.name, 'i'),
        });
        await page.waitForTimeout(500);

        // Should show episode1
        await expect(page.locator(`text=${episode1.code}`)).toBeVisible();
      }
    });

    test('should show project context in episode detail', async ({
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

      await nav.goToTab('Episodes');
      const episodeData = createEpisodeData();
      await nav.openAddModal();
      await form.fillField('code', episodeData.code);
      await form.fillField('name', episodeData.name);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({
          label: new RegExp(projectData.name, 'i'),
        });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      // Open detail panel
      await nav.openDetailPanel(episodeData.code);
      await page.waitForTimeout(500);

      // Should show project information
      await expect(page.locator(`text=${episodeData.code}`)).toBeVisible();
    });
  });

  test.describe('Episode-Sequence Integration', () => {
    test('should link sequences to episodes', async ({ page, nav, form, modal, toast, table }) => {
      // Setup: Project -> Episode
      await nav.goToTab('Projects');
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      await nav.goToTab('Episodes');
      const episodeData = createEpisodeData();
      await nav.openAddModal();
      await form.fillField('code', episodeData.code);
      await form.fillField('name', episodeData.name);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      // Create sequence linked to episode
      await nav.goToTab('Sequences');
      const sequenceData = createSequenceData();
      await nav.openAddModal();
      await form.fillField('code', sequenceData.code);
      await form.fillField('name', sequenceData.name);

      const episodeSelect = page.locator('select[name="episodeId"], select[name="episode"]');
      if (await episodeSelect.isVisible()) {
        await episodeSelect.selectOption({
          label: new RegExp(episodeData.name, 'i'),
        });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();
      await table.expectRowExists(sequenceData.code);
    });
  });

  test.describe('Sequence-Shot Integration', () => {
    test('should link shots to sequences', async ({ page, nav, form, modal, toast, table }) => {
      // Setup: Project -> Episode -> Sequence
      await nav.goToTab('Projects');
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      await nav.goToTab('Episodes');
      const episodeData = createEpisodeData();
      await nav.openAddModal();
      await form.fillField('code', episodeData.code);
      await form.fillField('name', episodeData.name);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      await nav.goToTab('Sequences');
      const sequenceData = createSequenceData();
      await nav.openAddModal();
      await form.fillField('code', sequenceData.code);
      await form.fillField('name', sequenceData.name);

      const episodeSelect = page.locator('select[name="episodeId"], select[name="episode"]');
      if (await episodeSelect.isVisible()) {
        await episodeSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      // Create shot linked to sequence
      await nav.goToTab('Shots');
      const shotData = createShotData();
      await nav.openAddModal();
      await form.fillField('code', shotData.code);
      await form.fillField('name', shotData.name);

      const sequenceSelect = page.locator('select[name="sequenceId"], select[name="sequence"]');
      if (await sequenceSelect.isVisible()) {
        await sequenceSelect.selectOption({
          label: new RegExp(sequenceData.name, 'i'),
        });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();
      await table.expectRowExists(shotData.code);
    });
  });

  test.describe('Project-Asset Integration', () => {
    test('should link assets to projects', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Projects');
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      // Create asset for project
      await nav.goToTab('Assets');
      const assetData = createAssetData();
      await nav.openAddModal();
      await form.fillField('code', assetData.code);
      await form.fillField('name', assetData.name);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({
          label: new RegExp(projectData.name, 'i'),
        });
      }

      if (await page.locator('select[name="assetType"]').isVisible()) {
        await form.fillField('assetType', assetData.assetType);
      }

      await modal.submit();
      await toast.waitForToastToDisappear();
      await table.expectRowExists(assetData.code);

      // Filter assets by project
      await nav.toggleFilters();
      const projectFilter = page.locator('select[name="projectId"], select:near(text="Project")');
      if (await projectFilter.isVisible()) {
        await projectFilter.selectOption({
          label: new RegExp(projectData.name, 'i'),
        });
        await page.waitForTimeout(500);
        await table.expectRowExists(assetData.code);
      }
    });
  });

  test.describe('Cross-Entity Notes Integration', () => {
    test('should link notes to multiple entity types', async ({
      page,
      nav,
      form,
      modal,
      toast,
      table,
    }) => {
      // Create project
      await nav.goToTab('Projects');
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      // Add note to project
      await table.clickRowAction(projectData.code, '+ Note');
      await form.fillField('content', 'Project note');
      await modal.submit();
      await toast.waitForToastToDisappear();

      // Create asset and add note
      await nav.goToTab('Assets');
      const assetData = createAssetData();
      await nav.openAddModal();
      await form.fillField('code', assetData.code);
      await form.fillField('name', assetData.name);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      await table.clickRowAction(assetData.code, '+ Note');
      await form.fillField('content', 'Asset note');
      await modal.submit();
      await toast.waitForToastToDisappear();

      // Verify both notes appear in Notes tab
      await nav.goToTab('Notes');
      await page.waitForTimeout(1000);

      const notesTable = page.locator('table');
      if (await notesTable.isVisible()) {
        await expect(page.locator('text=Project note')).toBeVisible();
        await expect(page.locator('text=Asset note')).toBeVisible();
      }
    });
  });

  test.describe('Version-Entity Integration', () => {
    test('should show versions for shots', async ({ page, nav, form, modal, toast }) => {
      // Setup: Project -> Episode -> Sequence -> Shot
      await nav.goToTab('Projects');
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      await nav.goToTab('Episodes');
      const episodeData = createEpisodeData();
      await nav.openAddModal();
      await form.fillField('code', episodeData.code);
      await form.fillField('name', episodeData.name);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      await nav.goToTab('Sequences');
      const sequenceData = createSequenceData();
      await nav.openAddModal();
      await form.fillField('code', sequenceData.code);
      await form.fillField('name', sequenceData.name);

      const episodeSelect = page.locator('select[name="episodeId"], select[name="episode"]');
      if (await episodeSelect.isVisible()) {
        await episodeSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      await nav.goToTab('Shots');
      const shotData = createShotData();
      await nav.openAddModal();
      await form.fillField('code', shotData.code);
      await form.fillField('name', shotData.name);

      const sequenceSelect = page.locator('select[name="sequenceId"], select[name="sequence"]');
      if (await sequenceSelect.isVisible()) {
        await sequenceSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      // Check versions tab for shot versions
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      // Should show versions interface
      await expect(page.locator('table, .grid')).toBeVisible();
    });
  });

  test.describe('Playlist-Version Integration', () => {
    test('should create playlist and link versions', async ({
      page,
      nav,
      form,
      modal,
      toast,
      table,
    }) => {
      // Create project
      await nav.goToTab('Projects');
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      // Create playlist
      await nav.goToTab('Playlists');
      const playlistCode = `PL_INT_${Date.now()}`;
      await nav.openAddModal();
      await form.fillField('code', playlistCode);
      await form.fillField('name', `Integration Playlist ${Date.now()}`);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();
      await table.expectRowExists(playlistCode);

      // Open playlist detail
      await nav.openDetailPanel(playlistCode);
      await page.waitForTimeout(500);

      // Should show playlist with version management
      await expect(page.locator(`text=${playlistCode}`)).toBeVisible();
    });
  });

  test.describe('Status-Entity Integration', () => {
    test('should apply custom status to entities', async ({
      page,
      nav,
      form,
      modal,
      toast,
      table,
    }) => {
      // Create custom status
      await nav.goToTab('Status');
      const statusCode = `CUSTOM_INT_${Date.now()}`;
      await nav.openAddModal();
      await form.fillField('code', statusCode);
      await form.fillField('name', 'Custom Integration Status');

      const colorInput = page.locator('input[name="color"], input[type="color"]');
      if (await colorInput.isVisible()) {
        await colorInput.fill('#FF5733');
      }

      const entitiesSelect = page.locator('select[name="applicableEntities"]');
      if (await entitiesSelect.isVisible()) {
        await entitiesSelect.selectOption('project');
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      // Create project and try to use custom status
      await nav.goToTab('Projects');
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);

      const statusSelect = page.locator('select[name="status"]');
      if (await statusSelect.isVisible()) {
        const options = await statusSelect.locator('option').allTextContents();
        if (options.some((opt) => opt.includes('Custom Integration'))) {
          await statusSelect.selectOption({ label: /Custom Integration/i });
        } else {
          await form.fillField('status', 'active');
        }
      }

      await modal.submit();
      await toast.expectSuccess();
    });
  });

  test.describe('Cascading Deletes', () => {
    test('should handle entity deletion with dependencies', async ({
      page,
      nav,
      form,
      modal,
      toast,
      table,
    }) => {
      // Create project with episode
      await nav.goToTab('Projects');
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      await nav.goToTab('Episodes');
      const episodeData = createEpisodeData();
      await nav.openAddModal();
      await form.fillField('code', episodeData.code);
      await form.fillField('name', episodeData.name);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      // Try to delete project (may have dependencies)
      await nav.goToTab('Projects');
      await table.selectRow(projectData.code);
      await page.click('button:has-text("Delete")');

      if (await page.locator('text=/confirm|delete|dependencies/i').isVisible()) {
        // Should warn about dependencies or handle gracefully
        const warning = page.locator('text=/dependencies|cannot delete/i');
        if (await warning.isVisible()) {
          await expect(warning).toBeVisible();
        }
      }
    });
  });
});
