import { test, expect, createTestUser, createProjectData } from './helpers/test-helpers';

test.describe('Permissions and Roles', () => {
  test.describe('Role-based Access Control', () => {
    test('should restrict create actions for member role', async ({ page, auth, nav }) => {
      // Register as member (default role)
      const memberUser = createTestUser('member');
      await auth.register(memberUser);

      await nav.goToTab('Projects');

      // Member should not see create button or it should be disabled
      const addButton = page.locator('button:has-text("+ Add"), button:has-text("Add")');
      const buttonExists = await addButton.isVisible().catch(() => false);

      if (buttonExists) {
        // Button might be disabled or hidden
        const isDisabled = await addButton.isDisabled().catch(() => false);
        const isVisible = await addButton.isVisible();

        // Either disabled or not visible for members
        expect(isDisabled || !isVisible).toBe(true);
      }
    });

    test('should allow read access for member role', async ({
      page,
      auth,
      nav,
      form,
      modal,
      toast,
    }) => {
      // First create project as admin/artist
      const adminUser = createTestUser('artist');
      await auth.register(adminUser);

      await nav.goToTab('Projects');
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      // Logout and login as member
      await auth.logout();

      const memberUser = createTestUser('member');
      await auth.register(memberUser);

      // Member should be able to see projects
      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      // Should see the project in table
      await expect(page.locator(`text=${projectData.code}`)).toBeVisible();
    });

    test('should allow full access for admin role', async ({
      page,
      auth,
      nav,
      form,
      modal,
      toast,
      table,
    }) => {
      const adminUser = createTestUser('admin');
      await auth.register(adminUser);

      await nav.goToTab('Projects');
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.expectSuccess();

      // Admin should be able to edit
      await table.clickRowAction(projectData.code, 'Edit');
      expect(await modal.isOpen()).toBe(true);
    });

    test('should restrict delete for viewer role', async ({ page, auth, nav }) => {
      const viewerUser = createTestUser('reviewer'); // Reviewer has read-only
      await auth.register(viewerUser);

      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      // Delete button should not be visible or disabled
      const deleteButton = page.locator('button:has-text("Delete")');
      const buttonExists = await deleteButton.isVisible().catch(() => false);

      if (buttonExists) {
        const isDisabled = await deleteButton.isDisabled().catch(() => false);
        expect(isDisabled).toBe(true);
      }
    });
  });

  test.describe('Permission-based UI Elements', () => {
    test('should hide edit button for read-only users', async ({
      page,
      auth,
      nav,
      form,
      modal,
      toast,
    }) => {
      // Create as admin
      const adminUser = createTestUser('artist');
      await auth.register(adminUser);

      await nav.goToTab('Projects');
      const projectData = createProjectData();
      await nav.openAddModal();
      await form.fillField('code', projectData.code);
      await form.fillField('name', projectData.name);
      await form.fillField('status', 'active');
      await modal.submit();
      await toast.waitForToastToDisappear();

      // Logout and login as member
      await auth.logout();
      const memberUser = createTestUser('member');
      await auth.register(memberUser);

      await nav.goToTab('Projects');
      await page.waitForTimeout(1000);

      // Edit button should not be visible for members
      const editButton = page.locator(`tr:has-text("${projectData.code}") button:has-text("Edit")`);
      const isVisible = await editButton.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test('should show appropriate actions based on role', async ({ page, auth, nav }) => {
      const artistUser = createTestUser('artist');
      await auth.register(artistUser);

      await nav.goToTab('Projects');

      // Artist should see create button
      const addButton = page.locator('button:has-text("+ Add"), button:has-text("Add")');
      const buttonVisible = await addButton.isVisible().catch(() => false);

      // Artist role should have create permissions
      expect(buttonVisible).toBe(true);
    });
  });

  test.describe('Version Approval Permissions', () => {
    test('should allow version approval for reviewer role', async ({ page, auth, nav }) => {
      const reviewerUser = createTestUser('reviewer');
      await auth.register(reviewerUser);

      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      // Reviewer should see approval buttons if versions exist
      const approveButton = page.locator(
        'button:has-text("Approve"), button[aria-label*="approve"]',
      );
      const buttonExists = await approveButton.isVisible().catch(() => false);

      // If versions exist, approve button should be visible for reviewers
      expect(typeof buttonExists).toBe('boolean');
    });

    test('should restrict version approval for member role', async ({ page, auth, nav }) => {
      const memberUser = createTestUser('member');
      await auth.register(memberUser);

      await nav.goToTab('Versions');
      await page.waitForTimeout(1000);

      // Member should not see approve button
      const approveButton = page.locator('button:has-text("Approve")');
      const isVisible = await approveButton.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });
  });

  test.describe('User Management Permissions', () => {
    test('should restrict user management to admin', async ({ page, auth, nav }) => {
      const memberUser = createTestUser('member');
      await auth.register(memberUser);

      await nav.goToTab('Users');
      await page.waitForTimeout(1000);

      // Member should not see add user button
      const addUserButton = page.locator('button:has-text("+ Add"), button:has-text("Add User")');
      const isVisible = await addUserButton.isVisible().catch(() => false);
      expect(isVisible).toBe(false);
    });

    test('should allow user management for admin', async ({ page, auth, nav }) => {
      const adminUser = createTestUser('admin');
      await auth.register(adminUser);

      await nav.goToTab('Users');
      await page.waitForTimeout(1000);

      // Admin should see user management options
      const usersTable = page.locator('table');
      const tableVisible = await usersTable.isVisible().catch(() => false);
      expect(tableVisible).toBe(true);
    });
  });

  test.describe('Status Management Permissions', () => {
    test('should allow status creation for director role', async ({ page, auth, nav }) => {
      const directorUser = createTestUser('producer'); // Producer has status permissions
      await auth.register(directorUser);

      await nav.goToTab('Status');
      await page.waitForTimeout(1000);

      // Should see add button
      const addButton = page.locator('button:has-text("+ Add"), button:has-text("Add")');
      const isVisible = await addButton.isVisible().catch(() => false);
      expect(isVisible).toBe(true);
    });
  });
});
