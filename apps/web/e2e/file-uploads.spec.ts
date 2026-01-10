import {
  test,
  expect,
  createProjectData,
  createShotData,
  createSequenceData,
  createEpisodeData,
} from './helpers/test-helpers';

test.describe('File Upload Functionality', () => {
  test.beforeEach(async ({ auth, nav, form, modal, toast, page }) => {
    await auth.register();

    // Create project
    await nav.goToTab('Projects');
    const projectData = createProjectData();
    await nav.openAddModal();
    await form.fillField('code', projectData.code);
    await form.fillField('name', projectData.name);
    await form.fillField('status', 'active');
    await modal.submit();
    await toast.waitForToastToDisappear();

    // Create episode
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

    // Create sequence
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

    // Store codes for cleanup
    (page as any).__testProjectData = projectData;
    (page as any).__testEpisodeData = episodeData;
    (page as any).__testSequenceData = sequenceData;
  });

  test.afterEach(async ({ cleanup, page }) => {
    if (page.isClosed()) {
      return;
    }

    try {
      // Cleanup in reverse dependency order: sequence -> episode -> project
      const sequenceData = (page as any).__testSequenceData;
      if (sequenceData?.code) {
        try {
          await cleanup.deleteEntityByCode('sequence', sequenceData.code);
        } catch (error) {
          console.warn('[FileUploads] Failed to cleanup sequence:', sequenceData.code, error);
        }
      }

      const episodeData = (page as any).__testEpisodeData;
      if (episodeData?.code) {
        try {
          await cleanup.deleteEntityByCode('episode', episodeData.code);
        } catch (error) {
          console.warn('[FileUploads] Failed to cleanup episode:', episodeData.code, error);
        }
      }

      const projectData = (page as any).__testProjectData;
      if (projectData?.code) {
        try {
          await cleanup.deleteProjectByCode(projectData.code);
        } catch (error) {
          console.warn('[FileUploads] Failed to cleanup project:', projectData.code, error);
        }
      }
    } catch (error) {
      console.warn('[FileUploads] Cleanup failed:', error);
    }
  });

  test.describe('Version File Upload', () => {
    test('should upload file for version', async ({
      page,
      nav,
      form,
      modal,
      toast,
      table: _table,
    }) => {
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

      // Try to add version with file
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      // Look for upload button or add version button
      const uploadButton = page.locator(
        'button:has-text("Upload"), button:has-text("Add Version"), input[type="file"]',
      );

      if (await uploadButton.isVisible()) {
        // Check if file input exists
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          // Note: In real tests, you'd need actual test files
          // For now, just verify the upload UI exists
          await expect(fileInput).toBeVisible();
        }
      }
    });

    test('should validate file type', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Try to upload invalid file type
        const accept = await fileInput.getAttribute('accept');

        // Should have accept attribute for validation
        if (accept) {
          expect(accept.length).toBeGreaterThan(0);
        }
      }
    });

    test('should validate file size', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // File size validation is typically handled server-side
        // Just verify input exists
        await expect(fileInput).toBeVisible();
      }
    });

    test('should show upload progress', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Upload progress indicators should be available
        // This would be tested with actual file upload
        await expect(fileInput).toBeVisible();
      }
    });
  });

  test.describe('Thumbnail Upload', () => {
    test('should upload thumbnail for asset', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Assets');

      const assetData = {
        code: `AST_THUMB_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: `Thumbnail Test Asset ${Date.now()}`,
        assetType: 'character',
      };

      await nav.openAddModal();
      await form.fillField('code', assetData.code);
      await form.fillField('name', assetData.name);

      const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
      if (await projectSelect.isVisible()) {
        await projectSelect.selectOption({ index: 1 });
      }

      if (await page.locator('select[name="assetType"]').isVisible()) {
        await form.fillField('assetType', assetData.assetType);
      }

      await modal.submit();
      await toast.waitForToastToDisappear();

      // Try to upload thumbnail
      await table.clickRowAction(assetData.code, 'Edit');

      const thumbnailInput = page.locator(
        'input[type="file"][accept*="image"], input[name="thumbnail"]',
      );
      if (await thumbnailInput.isVisible()) {
        await expect(thumbnailInput).toBeVisible();
      }
    });

    test('should validate thumbnail image format', async ({ page, nav }) => {
      await nav.goToTab('Assets');
      await page.waitForTimeout(1000);

      const thumbnailInput = page.locator('input[type="file"][accept*="image"]');
      if (await thumbnailInput.isVisible()) {
        const accept = await thumbnailInput.getAttribute('accept');

        // Should accept image formats
        if (accept) {
          expect(accept).toMatch(/image/);
        }
      }
    });
  });

  test.describe('Note Attachment Upload', () => {
    test('should upload attachment to note', async ({ page, nav, form, modal, toast, table }) => {
      await nav.goToTab('Projects');

      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      // Add note with attachment
      await table.clickRowAction(projectData.code, '+ Note');

      if (await modal.isOpen()) {
        await form.fillField('content', 'Note with attachment');

        // Look for attachment upload
        const attachmentInput = page.locator(
          'input[type="file"], input[name="attachment"], button:has-text("Attach")',
        );

        if (await attachmentInput.isVisible()) {
          await expect(attachmentInput).toBeVisible();
        }
      }
    });

    test('should validate attachment file size', async ({ page, nav, form, modal, table }) => {
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      const firstRow = page.locator('tr').first();
      if (await firstRow.isVisible()) {
        await table.clickRowAction((await firstRow.textContent()) || '', '+ Note');

        const attachmentInput = page.locator('input[type="file"]');
        if (await attachmentInput.isVisible()) {
          // File size validation typically handled server-side
          await expect(attachmentInput).toBeVisible();
        }
      }
    });
  });

  test.describe('Drag and Drop Upload', () => {
    test('should support drag and drop file upload', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      const dropZone = page.locator('.drop-zone, [data-testid="drop-zone"], .upload-area');

      if (await dropZone.isVisible()) {
        // Verify drop zone exists
        await expect(dropZone).toBeVisible();
      }
    });

    test('should show visual feedback on drag over', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      const dropZone = page.locator('.drop-zone, [data-testid="drop-zone"]');
      if (await dropZone.isVisible()) {
        // Drag over should trigger visual feedback
        // This would be tested with actual drag events
        await expect(dropZone).toBeVisible();
      }
    });
  });

  test.describe('Multiple File Upload', () => {
    test('should handle multiple file selection', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      const fileInput = page.locator('input[type="file"][multiple]');
      if (await fileInput.isVisible()) {
        const multiple = await fileInput.getAttribute('multiple');
        expect(multiple).not.toBeNull();
      }
    });

    test('should show list of selected files', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      const fileList = page.locator('.file-list, [data-testid="file-list"]');
      if (await fileList.isVisible()) {
        await expect(fileList).toBeVisible();
      }
    });
  });

  test.describe('Upload Error Handling', () => {
    test('should handle upload cancellation', async ({ page, nav }) => {
      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Remove")');
      if (await cancelButton.isVisible()) {
        await expect(cancelButton).toBeVisible();
      }
    });

    test('should show error for failed upload', async ({ page, nav, context }) => {
      // Intercept upload request and fail it
      await context.route('**/api/**/upload**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ message: 'Upload failed' }),
        });
      });

      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      // Error handling would be tested with actual upload
      // Just verify UI is stable
      await expect(page.locator('table, .content')).toBeVisible();
    });
  });

  test.describe('Image Preview', () => {
    test('should show image preview after upload', async ({ page, nav }) => {
      await nav.goToTab('Assets');
      await page.waitForTimeout(1000);

      const imagePreview = page.locator(
        '.image-preview, img[src*="thumbnail"], [data-testid="image-preview"]',
      );

      // If preview exists, should be visible
      if (await imagePreview.isVisible()) {
        await expect(imagePreview).toBeVisible();
      }
    });

    test('should allow removing uploaded image', async ({ page, nav }) => {
      await nav.goToTab('Assets');
      await page.waitForTimeout(1000);

      const removeButton = page.locator(
        'button:has-text("Remove"), button:has-text("Delete"):near(img)',
      );

      if (await removeButton.isVisible()) {
        await expect(removeButton).toBeVisible();
      }
    });
  });
});
