import {
  test,
  expect,
  createTestUser,
  createProjectData,
  createEpisodeData,
} from './helpers/test-helpers';

test.describe('React Query Diagnostic', () => {
  test('trace why table doesnt update after creation', async ({
    page,
    auth,
    nav,
    form,
    modal,
    cleanup,
    toast,
  }) => {
    test.setTimeout(60000);

    // Setup
    await auth.register({ ...createTestUser(), role: 'admin' });
    const projectData = createProjectData();
    await cleanup.createProjectViaAPI(projectData);

    // Navigate to Episodes tab
    await nav.goToTab('Episodes');
    await page.waitForTimeout(2000);

    console.log('=== STEP 1: Check initial table state ===');
    const initialRowCount = await page.locator('table tbody tr:not(.no-data)').count();
    console.log('Initial rows in table:', initialRowCount);

    // Create episode via UI
    await nav.openAddModal();
    const episodeData = createEpisodeData();

    await form.fillField('code', episodeData.code);
    await form.fillField('name', episodeData.name);

    const projectSelect = page.locator('select[name="projectId"], select[name="project"]');
    if (await projectSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await form.selectFirstProject(15000);
    }

    // Check form values are correct
    const formValues = await page.evaluate(() => {
      const codeInput = document.querySelector('input[name="code"]') as HTMLInputElement;
      const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
      const projectSelect = document.querySelector('select[name="projectId"]') as HTMLSelectElement;

      return {
        code: codeInput?.value,
        name: nameInput?.value,
        projectId: projectSelect?.value,
      };
    });
    console.log('=== Form values before submit ===');
    console.log(formValues);

    console.log('=== STEP 2: Submitting form ===');
    await modal.submit();

    // Wait for toast
    try {
      await toast.expectSuccess();
      console.log('✅ Toast appeared - mutation succeeded');
    } catch {
      console.log('❌ No toast - mutation may have failed');
    }

    // Wait for modal to close
    await page.waitForTimeout(2000);
    const modalStillOpen = await page
      .locator('.modal, [role="dialog"]')
      .isVisible()
      .catch(() => false);
    console.log('Modal still open:', modalStillOpen);

    console.log('=== STEP 3: Checking if episode was created in DB ===');

    // Use API to check if episode exists
    const apiBase = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
    const apiCheck = await page.request.get(`${apiBase}/api/v1/episodes`, {
      headers: {
        Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('accessToken'))}`,
      },
    });

    const apiText = await apiCheck.text();
    let apiData: any;
    try {
      apiData = JSON.parse(apiText);
    } catch {
      console.log('API raw response (non-JSON):', apiText);
      throw new Error(`Episodes API did not return JSON. Status: ${apiCheck.status()}`);
    }

    console.log('API response status:', apiCheck.status());
    console.log('Episodes in DB:', apiData.data?.length || 0);

    const ourEpisode = apiData.data?.find((ep: any) => ep.code === episodeData.code);
    console.log('Our episode in DB:', ourEpisode ? '✅ FOUND' : '❌ NOT FOUND');

    if (ourEpisode) {
      console.log('Episode data:', JSON.stringify(ourEpisode, null, 2));
    }

    console.log('=== STEP 4: Checking table state ===');

    // Wait a bit for potential re-render
    await page.waitForTimeout(3000);

    const finalRowCount = await page.locator('table tbody tr:not(.no-data)').count();
    console.log('Final rows in table:', finalRowCount);
    console.log('Row count changed:', initialRowCount !== finalRowCount);

    // Check if our episode is in DOM
    const episodeInDOM = await page.locator(`tr:has-text("${episodeData.code}")`).count();
    console.log('Our episode in DOM:', episodeInDOM > 0 ? '✅ FOUND' : '❌ NOT FOUND');

    // Get all table content to see what's actually there
    const allTableText = await page.locator('table tbody').textContent();
    console.log(
      'Table contains our code:',
      allTableText?.includes(episodeData.code) ? 'YES' : 'NO',
    );

    console.log('=== STEP 5: Force refetch and check again ===');

    // Click refresh button if available
    const refreshButton = page.locator('button:has-text("Refresh")');
    if (await refreshButton.isVisible().catch(() => false)) {
      console.log('Clicking refresh button...');
      await refreshButton.click();
      await page.waitForTimeout(2000);

      const afterRefreshCount = await page.locator('table tbody tr:not(.no-data)').count();
      console.log('Rows after refresh:', afterRefreshCount);

      const episodeAfterRefresh = await page.locator(`tr:has-text("${episodeData.code}")`).count();
      console.log('Episode after refresh:', episodeAfterRefresh > 0 ? '✅ FOUND' : '❌ NOT FOUND');
    }

    console.log('=== STEP 6: Navigate away and back ===');

    // Navigate to different tab and back
    await nav.goToTab('Projects');
    await page.waitForTimeout(1000);
    await nav.goToTab('Episodes');
    await page.waitForTimeout(2000);

    const afterNavCount = await page.locator('table tbody tr:not(.no-data)').count();
    console.log('Rows after navigation:', afterNavCount);

    const episodeAfterNav = await page.locator(`tr:has-text("${episodeData.code}")`).count();
    console.log('Episode after navigation:', episodeAfterNav > 0 ? '✅ FOUND' : '❌ NOT FOUND');

    // Final check
    expect(ourEpisode).toBeTruthy(); // Episode should exist in DB
    expect(episodeAfterNav).toBeGreaterThan(0); // Should appear after navigation
  });
});
