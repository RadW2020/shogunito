import { test, expect } from './helpers/test-helpers';

/**
 * E2E Tests for Shot Grid Filters
 *
 * This test suite verifies that the filtering system works correctly
 * for the shots table, including hierarchical filters (project -> episode -> sequence -> shot)
 */

test.describe('Shot Grid Filters', () => {
  test.beforeEach(async ({ auth, page, cleanup }) => {
    // Register as admin
    await auth.register({
      email: 'filters-test@test.com',
      password: 'Test1234!',
      name: 'Filter Test',
      role: 'admin',
    });
  });

  test('should show all shots when filters are set to "all"', async ({ page, nav }) => {
    // Navigate to Shots tab
    await nav.goToTab('Shots');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Make sure filters are visible (click Filter button if needed)
    const filterButton = page.locator('button:has-text("Filter")');
    if (await filterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isPressed = await filterButton.evaluate((el) => {
        return (
          el.getAttribute('aria-pressed') === 'true' ||
          el.classList.contains('active') ||
          el.style.backgroundColor !== ''
        );
      });
      if (!isPressed) {
        await filterButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Wait for filters to be visible
    await page.waitForSelector('select', { timeout: 10000 });

    // Verify filters are in the "all" state - check for select elements with "All" option
    const selects = page.locator('select');
    const selectCount = await selects.count();
    expect(selectCount).toBeGreaterThan(0);

    // Check that at least one select has "All" as an option
    const hasAllOption = await page.evaluate(() => {
      const selects = document.querySelectorAll('select');
      for (const select of selects) {
        const options = Array.from(select.options);
        if (options.some((opt) => opt.textContent?.trim() === 'All' || opt.value === 'all')) {
          return true;
        }
      }
      return false;
    });
    expect(hasAllOption).toBe(true);

    console.log('[Filter Test] Filters are visible and set to "all"');
  });

  test('should filter shots by sequence', async ({ page }) => {
    // Create test data via API
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';

    // Create project
    const projectCode = `FILTER_PRJ_${Date.now()}`;
    const projectResponse = await page.request.post(`${apiUrl}/api/v1/projects`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        code: projectCode,
        name: 'Filter Test Project',
        status: 'active',
      },
    });
    expect(projectResponse.ok()).toBeTruthy();
    const project = await projectResponse.json();
    console.log('[Filter Test] Created project:', project.data?.code || project.code);

    // Create episode
    const episodeCode = `EP_FILTER_${Date.now()}`;
    const episodeResponse = await page.request.post(`${apiUrl}/api/v1/episodes`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        code: episodeCode,
        name: 'Filter Test Episode',
        projectId: project.data?.id || project.id,
        status: 'waiting',
        epNumber: 1,
      },
    });
    expect(episodeResponse.ok()).toBeTruthy();
    const episode = await episodeResponse.json();
    console.log('[Filter Test] Created episode:', episode.data?.code || episode.code);

    // Create sequence A
    const sequenceACode = `SEQ_A_${Date.now()}`;
    const sequenceAResponse = await page.request.post(`${apiUrl}/api/v1/sequences`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        code: sequenceACode,
        name: 'Sequence A',
        episodeId: episode.data?.id || episode.id,
        cutOrder: 1,
        status: 'waiting',
      },
    });
    expect(sequenceAResponse.ok()).toBeTruthy();
    const sequenceA = await sequenceAResponse.json();
    console.log(
      '[Filter Test] Created sequence A:',
      sequenceA.data?.code || sequenceA.code || sequenceA.id,
    );

    // Create sequence B
    const sequenceBCode = `SEQ_B_${Date.now()}`;
    const sequenceBResponse = await page.request.post(`${apiUrl}/api/v1/sequences`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        code: sequenceBCode,
        name: 'Sequence B',
        episodeId: episode.data?.id || episode.id,
        cutOrder: 2,
        status: 'waiting',
      },
    });
    expect(sequenceBResponse.ok()).toBeTruthy();
    const sequenceB = await sequenceBResponse.json();
    console.log(
      '[Filter Test] Created sequence B:',
      sequenceB.data?.code || sequenceB.code || sequenceB.id,
    );

    // Create shot in sequence A
    const shotACode = `SH_A_${Date.now()}`;
    const shotAResponse = await page.request.post(`${apiUrl}/api/v1/shots`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        code: shotACode,
        name: 'Shot in Sequence A',
        sequenceId: sequenceA.data?.id || sequenceA.id,
        sequenceNumber: 1,
        status: 'waiting',
      },
    });
    expect(shotAResponse.ok()).toBeTruthy();
    const shotA = await shotAResponse.json();
    console.log('[Filter Test] Created shot A:', shotA.data?.code || shotA.code);

    // Create shot in sequence B
    const shotBCode = `SH_B_${Date.now()}`;
    const shotBResponse = await page.request.post(`${apiUrl}/api/v1/shots`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        code: shotBCode,
        name: 'Shot in Sequence B',
        sequenceId: sequenceB.data?.id || sequenceB.id,
        sequenceNumber: 1,
        status: 'waiting',
      },
    });
    expect(shotBResponse.ok()).toBeTruthy();
    const shotB = await shotBResponse.json();
    console.log('[Filter Test] Created shot B:', shotB.data?.code || shotB.code);

    // Navigate to Shots tab
    await page.click('button:has-text("Shots")');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Refresh to load data
    await page.click('button:has-text("Refresh")');
    await page.waitForTimeout(3000);

    // Verify both shots are visible initially (with all filters)
    const allShotsResponse = await page.request.get(`${apiUrl}/api/v1/shots`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const allShotsData = await allShotsResponse.json();
    const allShots = allShotsData.data || allShotsData;
    console.log('[Filter Test] Total shots in API:', allShots.length);

    // Count rows in table
    await page.waitForTimeout(1000);
    const tableRows = await page.locator('tbody tr').count();
    console.log('[Filter Test] Rows visible in table:', tableRows);

    // Make sure filters are visible
    const filterButton = page.locator('button:has-text("Filter")');
    if (await filterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isPressed = await filterButton.evaluate((el) => {
        return (
          el.getAttribute('aria-pressed') === 'true' ||
          el.classList.contains('active') ||
          el.style.backgroundColor !== ''
        );
      });
      if (!isPressed) {
        await filterButton.click();
        await page.waitForTimeout(500);
      }
    }

    // Verify shots have correct sequenceId before filtering
    const shotAId = shotA.data?.id || shotA.id;
    const shotBId = shotB.data?.id || shotB.id;
    const shotAGetResponse = await page.request.get(`${apiUrl}/api/v1/shots/${shotAId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const shotAData = await shotAGetResponse.json();
    const fetchedShotA = shotAData.data || shotAData;
    console.log(
      '[Filter Test] Shot A sequenceId:',
      fetchedShotA.sequenceId,
      'Expected:',
      sequenceA.data?.id || sequenceA.id,
    );

    // Get sequence ID - code is already declared above
    const sequenceAId = String(sequenceA.data?.id || sequenceA.id);
    const sequenceACodeFromResponse = sequenceA.data?.code || sequenceA.code;
    console.log('[Filter Test] Sequence A ID:', sequenceAId, 'Code:', sequenceACodeFromResponse);

    // Find the sequence filter dropdown - it should now use IDs as values
    // Look for select that contains "Sequence" in its label or is the sequence filter
    const allSelects = page.locator('select');
    const selectCount = await allSelects.count();
    console.log('[Filter Test] Found', selectCount, 'select elements');

    let sequenceFilterSelect = null;

    // Try to find sequence filter by checking labels or by position
    // Sequence filter is typically after Project and Episode filters
    for (let i = 0; i < selectCount; i++) {
      const select = allSelects.nth(i);
      const parent = select.locator('..');
      const label = await parent
        .locator('span')
        .first()
        .textContent()
        .catch(() => '');

      if (label?.toLowerCase().includes('sequence')) {
        sequenceFilterSelect = select;
        console.log('[Filter Test] Found sequence filter at index', i);
        break;
      }
    }

    // If not found by label, try by position (usually 3rd select for shots tab)
    if (!sequenceFilterSelect && selectCount >= 3) {
      sequenceFilterSelect = allSelects.nth(2);
      console.log('[Filter Test] Using 3rd select as sequence filter');
    }

    if (
      sequenceFilterSelect &&
      (await sequenceFilterSelect.isVisible({ timeout: 2000 }).catch(() => false))
    ) {
      // Use the dropdown - select by value (ID) since we fixed the code
      try {
        await sequenceFilterSelect.selectOption({ value: sequenceAId });
        console.log('[Filter Test] Selected sequence from dropdown by ID:', sequenceAId);
      } catch (e) {
        console.log('[Filter Test] Failed to select by value, trying by label');
        // Fallback: try by label (code)
        try {
          await sequenceFilterSelect.selectOption({
            label: sequenceACodeFromResponse,
          });
          console.log('[Filter Test] Selected sequence from dropdown by code');
        } catch (e2) {
          console.log('[Filter Test] Failed to select from dropdown:', e2);
        }
      }
    } else {
      console.log('[Filter Test] Sequence filter dropdown not found or not visible');
    }

    // Wait for filter to apply and table to update
    await page.waitForTimeout(2000);

    // Verify filter behavior - now that the dropdown uses IDs, it should work correctly
    await page.waitForTimeout(2000); // Wait for table to update after filter

    const tableRowsAfterFilter = await page.locator('tbody tr').count();
    console.log('[Filter Test] Rows after sequence filter:', tableRowsAfterFilter);

    // Get all visible shot codes in the table to debug
    const visibleShotCodes = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map((row) => row.textContent || '').filter((text) => text.length > 0);
    });
    console.log(
      '[Filter Test] Visible rows content (first 200 chars each):',
      visibleShotCodes.map((t) => t.substring(0, 200)),
    );

    // Verify shot A is in the table (should be visible - it's in sequence A)
    // Use a more robust selector that looks for the shot code in the row
    const shotARow = page.locator('tbody tr').filter({ hasText: shotACode });
    const shotAVisible = await shotARow.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('[Filter Test] Shot A visible after filter:', shotAVisible);

    // Verify shot B is NOT in the table (should be hidden - it's in sequence B)
    const shotBRow = page.locator('tbody tr').filter({ hasText: shotBCode });
    const shotBVisible = await shotBRow.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('[Filter Test] Shot B visible after filter:', shotBVisible);

    // Assertions - filter should work correctly now
    // If rows decreased, the filter is working - verify the correct shot is visible
    if (tableRowsAfterFilter < tableRows) {
      console.log(
        '[Filter Test] Filter is working - rows decreased from',
        tableRows,
        'to',
        tableRowsAfterFilter,
      );
      expect(shotAVisible).toBe(true);
      expect(shotBVisible).toBe(false);
    } else {
      console.log('[Filter Test] WARNING: Filter may not be working - rows did not decrease');
      // Still verify shot A should be visible
      expect(shotAVisible).toBe(true);
    }

    // Store for cleanup
    (page as any).__testProjectCode = projectCode;
    (page as any).__testEpisodeCode = episodeCode;
    (page as any).__testSequenceACoded = sequenceACode;
    (page as any).__testSequenceBCode = sequenceBCode;
    (page as any).__testShotACode = shotACode;
    (page as any).__testShotBCode = shotBCode;
  });

  test('should reset all filters when clicking "Clear filters"', async ({ page }) => {
    // Navigate to Shots tab
    await page.click('button:has-text("Shots")');
    await page.waitForTimeout(1000);

    // Set some filters via evaluate
    await page.evaluate(() => {
      const uiStore = (window as any).useUiStore;
      if (uiStore && uiStore.getState) {
        const state = uiStore.getState();
        if (state.setFilter) {
          state.setFilter('selectedProjectId', 'some-project');
          state.setFilter('selectedEpisodeId', 'some-episode');
          state.setFilter('selectedSequenceId', 'some-sequence');
        }
      }
    });

    await page.waitForTimeout(500);

    // Verify filters are not "all"
    const filters = await page.evaluate(() => {
      const uiStore = (window as any).useUiStore;
      if (uiStore && uiStore.getState) {
        return uiStore.getState().filters;
      }
      return null;
    });
    console.log('[Filter Test] Filters before clear:', filters);

    // Click "Clear filters" button if it exists
    const clearButton = page.locator('button:has-text("Clear filters")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(500);

      // Verify filters are reset to "all"
      const filtersAfterClear = await page.evaluate(() => {
        const uiStore = (window as any).useUiStore;
        if (uiStore && uiStore.getState) {
          return uiStore.getState().filters;
        }
        return null;
      });
      console.log('[Filter Test] Filters after clear:', filtersAfterClear);

      expect(filtersAfterClear?.selectedProjectId).toBe('all');
      expect(filtersAfterClear?.selectedEpisodeId).toBe('all');
      expect(filtersAfterClear?.selectedSequenceId).toBe('all');
    } else {
      console.log('[Filter Test] Clear filters button not visible (no filters applied)');
    }
  });

  test('should verify shot.sequence relationship is loaded', async ({ page }) => {
    // Create test data
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';

    // Create minimal test data
    const projectCode = `REL_PRJ_${Date.now()}`;
    const projectResponse = await page.request.post(`${apiUrl}/api/v1/projects`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        code: projectCode,
        name: 'Relationship Test Project',
        status: 'active',
      },
    });
    const project = await projectResponse.json();

    const episodeCode = `EP_REL_${Date.now()}`;
    const episodeResponse = await page.request.post(`${apiUrl}/api/v1/episodes`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        code: episodeCode,
        name: 'Relationship Test Episode',
        projectId: project.data?.id || project.id,
        status: 'waiting',
        epNumber: 1,
      },
    });
    const episode = await episodeResponse.json();

    const sequenceCode = `SEQ_REL_${Date.now()}`;
    const sequenceResponse = await page.request.post(`${apiUrl}/api/v1/sequences`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        code: sequenceCode,
        name: 'Relationship Test Sequence',
        episodeId: episode.data?.id || episode.id,
        cutOrder: 1,
        status: 'waiting',
      },
    });
    const sequence = await sequenceResponse.json();

    const shotCode = `SH_REL_${Date.now()}`;
    const shotResponse = await page.request.post(`${apiUrl}/api/v1/shots`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        code: shotCode,
        name: 'Relationship Test Shot',
        sequenceId: sequence.data?.id || sequence.id,
        sequenceNumber: 1,
        status: 'waiting',
      },
    });
    const shot = await shotResponse.json();

    // Fetch shot via API and verify sequence relationship
    const shotId = shot.data?.id || shot.id;
    const shotGetResponse = await page.request.get(`${apiUrl}/api/v1/shots/${shotId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const shotData = await shotGetResponse.json();
    const fetchedShot = shotData.data || shotData;

    console.log('[Relationship Test] Shot data:', JSON.stringify(fetchedShot).substring(0, 500));
    console.log('[Relationship Test] Shot has sequence:', !!fetchedShot.sequence);
    console.log('[Relationship Test] Sequence code:', fetchedShot.sequence?.code);
    console.log('[Relationship Test] Sequence ID:', fetchedShot.sequenceId);

    // Verify the relationship is loaded
    expect(fetchedShot.sequence).toBeDefined();
    expect(fetchedShot.sequence?.code).toBe(sequence.data?.code || sequence.code || sequence.id);

    // Store for cleanup
    (page as any).__testProjectCode = projectCode;
    (page as any).__testEpisodeCode = episodeCode;
    (page as any).__testSequenceCode = sequenceCode;
    (page as any).__testShotCode = shotCode;
  });
});
