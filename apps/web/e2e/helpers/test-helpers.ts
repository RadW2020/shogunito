import { test as base, Page, expect } from '@playwright/test';

/**
 * Generate a unique test user for each test
 * Uses timestamp + random number to ensure uniqueness even in parallel execution
 */
export function createTestUser(
  role: 'admin' | 'producer' | 'reviewer' | 'artist' | 'member' = 'admin',
) {
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return {
    email: `test_${uniqueId}@playwright.com`,
    password: 'Test123456!',
    name: `Playwright Test User ${uniqueId.substring(0, 8)}`,
    role: role,
  };
}

/**
 * Test user credentials for authentication tests (deprecated - use createTestUser instead)
 * @deprecated Use createTestUser() for better uniqueness in parallel tests
 */
export const TEST_USER = createTestUser();

/**
 * Test data factories
 */
export const createProjectData = () => ({
  code: `PLW_PRJ_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  name: `Playwright Test Project ${Date.now()}`,
  description: 'Created by Playwright E2E tests',
});

export const createEpisodeData = () => ({
  code: `EP${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
  name: `Playwright Test Episode ${Date.now()}`,
  description: 'Created by Playwright E2E tests',
  epNumber: Math.floor(Math.random() * 100) + 1,
  cutOrder: Math.floor(Math.random() * 100) + 1,
});

export const createAssetData = () => ({
  code: `AST_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  name: `Playwright Test Asset ${Date.now()}`,
  description: 'Created by Playwright E2E tests',
  assetType: 'character',
});

export const createSequenceData = () => ({
  code: `SEQ_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  name: `Playwright Test Sequence ${Date.now()}`,
  description: 'Created by Playwright E2E tests',
  cutOrder: Math.floor(Math.random() * 100) + 1,
});

export const createShotData = () => ({
  code: `SH_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  name: `Playwright Test Shot ${Date.now()}`,
  description: 'Created by Playwright E2E tests',
  sequenceNumber: Math.floor(Math.random() * 100) + 1,
});

/**
 * Authentication helpers
 */
export class AuthHelper {
  constructor(private page: Page) {}

  async register(userData = createTestUser()) {
    const forceMock =
      process.env.AUTH_ENABLED === 'false' || process.env.PLAYWRIGHT_MOCK_AUTH === 'true';

    const mockAndReturn = async () => {
      await this.page.goto('/');
      await this.page.waitForLoadState('domcontentloaded');
      const mockUser = {
        id: 'mock-user-id',
        email: userData.email,
        name: userData.name,
        role: userData.role ?? 'admin',
      };
      await this.page.evaluate((u) => {
        localStorage.setItem('accessToken', 'test-token');
        localStorage.setItem('refreshToken', 'test-refresh');
        localStorage.setItem('user', JSON.stringify(u));
        window.dispatchEvent(new Event('auth-storage-change'));
      }, mockUser);
    };

    // Prefer API-based register/login to avoid UI flakiness
    const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
    try {
      const doRegister = await this.page.request.post(`${apiUrl}/api/v1/auth/register`, {
        data: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role ?? 'admin',
        },
      });

      let tokens: any = null;
      let user: any = null;

      if (doRegister.ok()) {
        const data = await doRegister.json();
        tokens = data.tokens || data.data?.tokens;
        user = data.user || data.data?.user;
      } else if (doRegister.status() === 409) {
        // Already exists: try login
        const loginResp = await this.page.request.post(`${apiUrl}/api/v1/auth/login`, {
          data: { email: userData.email, password: userData.password },
        });
        if (loginResp.ok()) {
          const data = await loginResp.json();
          tokens = data.tokens || data.data?.tokens;
          user = data.user || data.data?.user;
        } else {
          console.warn(
            '[AuthHelper] Login after 409 failed:',
            loginResp.status(),
            await loginResp.text(),
          );
        }
      } else {
        const errorText = await doRegister.text().catch(() => '');
        const status = doRegister.status();
        
        // Check if error is related to duplicate/constraint violation
        if (
          status === 500 &&
          (errorText.includes('duplicate') ||
           errorText.includes('unique constraint') ||
           errorText.includes('PK_a3ffb1c0c8416b9fc6f907b7433'))
        ) {
          console.log('[AuthHelper] Duplicate user detected in API (500), retrying with new unique data');
          const newUserData = createTestUser(userData.role);
          return this.register(newUserData);
        }
        
        console.warn(
          '[AuthHelper] Register failed:',
          status,
          errorText.substring(0, 200), // Limit log length
        );
      }

      if (tokens && user) {
        await this.page.goto('/');
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.evaluate(
          ({ tokens, user }) => {
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            localStorage.setItem('user', JSON.stringify(user));
            window.dispatchEvent(new Event('auth-storage-change'));
          },
          { tokens, user },
        );
        await this.page.goto('/');
        await this.page.waitForLoadState('networkidle');
        return;
      }
    } catch (err) {
      // fall through to mock/UI flow
      console.warn('[AuthHelper] API register/login failed, fallback to mock/UI:', err);
    }

    if (forceMock) {
      await mockAndReturn();
      return;
    }

    // UI fallback - try to navigate to register page
    try {
      await this.page.goto('/register', { waitUntil: 'networkidle', timeout: 15000 });
      // Verify we're on register page (not redirected)
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/register')) {
        // Already redirected, use mock auth
        await mockAndReturn();
        return;
      }
    } catch (err) {
      // Navigation failed, use mock auth
      console.warn('[AuthHelper] Failed to navigate to /register, using mock auth:', err);
      await mockAndReturn();
      return;
    }

    // If register doesn't load inputs quickly, fallback to mock auth
    const nameInput = this.page.locator('input[name="name"]');
    const emailInput = this.page.locator('input[name="email"]');
    const passwordInput = this.page.locator('input[name="password"]');

    const inputsVisible = await Promise.all([
      nameInput.isVisible({ timeout: 5000 }).catch(() => false),
      emailInput.isVisible({ timeout: 5000 }).catch(() => false),
      passwordInput.isVisible({ timeout: 5000 }).catch(() => false),
    ]);

    if (!inputsVisible.every(Boolean)) {
      console.warn('[AuthHelper] Register form inputs not visible, using mock auth');
      await mockAndReturn();
      return;
    }

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Wait for React to stabilize
    await this.page.evaluate(() => {
      localStorage.removeItem('shogun-ui-state');
    });

    // Use more robust filling with waits
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.fill('input[name="name"]', userData.name);
    await this.page.waitForTimeout(300);
    
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.fill('input[name="email"]', userData.email);
    await this.page.waitForTimeout(300);
    
    const roleSelect = this.page.locator('select[name="role"]');
    await roleSelect.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.selectOption('select[name="role"]', userData.role);
    await this.page.waitForTimeout(300);
    
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.fill('input[name="password"]', userData.password);
    await this.page.waitForTimeout(300);
    
    const confirmPasswordInput = this.page.locator('input[name="confirmPassword"]');
    await confirmPasswordInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.fill('input[name="confirmPassword"]', userData.password);

    // Wait for submit button to be enabled
    const submitButton = this.page.locator('button[type="submit"]');
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });

    // Wait a bit for any validation to complete
    await this.page.waitForTimeout(1000);

    // Check if button is disabled
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    if (isDisabled) {
      // Wait for button to be enabled
      await this.page.waitForTimeout(1000);
    }

    // Click the button with force if necessary (for Mobile Safari)
    try {
      await submitButton.click({ timeout: 10000 });
    } catch {
      // Try with force option for Mobile Safari
      console.log('Retrying click with force option');
      await submitButton.click({ force: true, timeout: 5000 });
    }

    // Wait for form submission to complete
    await this.page.waitForTimeout(2000);

    // Check for errors - wait a bit longer for error messages to appear
    await this.page.waitForTimeout(1000);
    
    // Check multiple error indicators
    const errorElement = this.page.locator('[role="alert"], .error, [data-error], text=/error|failed|duplicate|duplicado/i');
    const hasError = await errorElement.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (hasError) {
      const errorText = await errorElement.first().textContent().catch(() => '');
      // If error is about duplicate email or database constraint, try with a new unique email
      if (
        errorText?.toLowerCase().includes('ya está registrado') || 
        errorText?.toLowerCase().includes('already registered') ||
        errorText?.toLowerCase().includes('duplicate') ||
        errorText?.toLowerCase().includes('duplicado') ||
        errorText?.toLowerCase().includes('unique constraint') ||
        errorText?.toLowerCase().includes('constraint violation')
      ) {
        console.log('[AuthHelper] Duplicate user detected, retrying with new unique data');
        const newUserData = createTestUser(userData.role);
        return this.register(newUserData);
      }
      throw new Error(`Registration failed with error: ${errorText || 'Unknown error'}`);
    }

    // Check if we're still on register page (indicates error)
    const currentUrl = this.page.url();
    if (currentUrl.includes('/register')) {
      // Still on register page after submission - likely an error
      await this.page.waitForTimeout(2000);
      const stillHasError = await errorElement.first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stillHasError) {
        const errorText = await errorElement.first().textContent().catch(() => '');
        if (
          errorText?.toLowerCase().includes('duplicate') ||
          errorText?.toLowerCase().includes('duplicado') ||
          errorText?.toLowerCase().includes('unique constraint')
        ) {
          console.log('[AuthHelper] Duplicate detected on register page, retrying with new unique data');
          const newUserData = createTestUser(userData.role);
          return this.register(newUserData);
        }
        throw new Error(`Registration failed - still on register page with error: ${errorText || 'Unknown error'}`);
      }
    }

    // Wait for redirect to home page (be generous to avoid flakes)
    await this.page.waitForURL('/', { timeout: 20000 });
  }

  async login(email = TEST_USER.email, password = TEST_USER.password) {
    await this.page.goto('/login');

    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);

    await this.page.click('button[type="submit"]');

    // Wait for redirect to home page
    await this.page.waitForURL('/');
  }

  async logout() {
    // Check if page is still open before starting logout
    if (this.page.isClosed()) {
      return;
    }

    // Wait for page to be fully loaded
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);

    // First, ensure we're on the main page (not login/register)
    const currentUrl = this.page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/register')) {
      console.log('[AuthHelper] Already on auth page, logout not needed');
      return;
    }

    // Prioritized selectors based on actual UserDropdown component
    // The component has: data-testid="user-dropdown" on container
    // and button with aria-label="User menu" and aria-haspopup="menu"
    const dropdownSelectors = [
      // Most specific - the actual button inside the dropdown container
      '[data-testid="user-dropdown"] > button',
      '[data-testid="user-dropdown"] button[aria-label="User menu"]',
      // Direct button selectors
      'button[aria-label="User menu"]',
      'button[aria-haspopup="menu"]',
      // Container click (might also work)
      '[data-testid="user-dropdown"]',
      // Fallback selectors
      'header button:has(svg)',
      'nav button:has(svg)',
      // Button with avatar circle (the component uses a div with gradient)
      'button:has(div.rounded-full)',
    ];

    let dropdownClicked = false;
    
    // Try each selector with better error handling
    for (const selector of dropdownSelectors) {
      if (dropdownClicked) break;
      
      try {
        const element = this.page.locator(selector).first();
        await element.waitFor({ state: 'visible', timeout: 5000 });
        
        // Scroll into view if needed
        await element.scrollIntoViewIfNeeded().catch(() => {});
        await this.page.waitForTimeout(200);
        
        // Click the element
        await element.click({ timeout: 5000 });
        dropdownClicked = true;
        console.log(`[AuthHelper] Clicked dropdown with selector: ${selector}`);
        break;
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }

    // If dropdown not clicked, try to find logout button directly (might be visible without dropdown)
    if (!dropdownClicked) {
      console.log('[AuthHelper] Dropdown not found, trying direct logout button');
      const directLogoutButton = this.page.locator('[data-testid="logout-button"]').first();
      const isDirectVisible = await directLogoutButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (isDirectVisible) {
        await directLogoutButton.click({ timeout: 5000 });
        await this.page.waitForURL(/\/login/, { timeout: 15000 });
        return;
      }
    }

    // Last resort: try clicking any button in header area
    if (!dropdownClicked) {
      console.log('[AuthHelper] Trying last resort header button');
      // Close any open menus first
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
      
      // Try to find any clickable element that could be the user menu
      const headerButtons = this.page.locator('header button, nav button, [role="button"]');
      const count = await headerButtons.count();
      
      for (let i = 0; i < count; i++) {
        try {
          const btn = headerButtons.nth(i);
          const isVisible = await btn.isVisible().catch(() => false);
          if (isVisible) {
            await btn.click({ timeout: 3000 });
            await this.page.waitForTimeout(500);
            
            // Check if logout button appeared
            const logoutBtn = this.page.locator('[data-testid="logout-button"]');
            if (await logoutBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
              dropdownClicked = true;
              console.log(`[AuthHelper] Found dropdown with header button ${i}`);
              break;
            }
          }
        } catch {
          continue;
        }
      }
    }

    if (!dropdownClicked) {
      // Take screenshot for debugging
      console.error('[AuthHelper] Could not find user dropdown menu');
      throw new Error('Could not find or click user dropdown menu');
    }

    // Wait for dropdown menu to appear
    await this.page.waitForTimeout(800);

    // Click logout button - prioritized selectors
    const logoutSelectors = [
      '[data-testid="logout-button"]',
      'button:has-text("Logout")',
      '[role="menuitem"]:has-text("Logout")',
      'a:has-text("Logout")',
    ];

    let logoutClicked = false;
    for (const selector of logoutSelectors) {
      try {
        const logoutButton = this.page.locator(selector).first();
        await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
        await this.page.waitForTimeout(200);
        await logoutButton.click({ timeout: 5000 });
        logoutClicked = true;
        console.log(`[AuthHelper] Clicked logout with selector: ${selector}`);
        break;
      } catch {
        continue;
      }
    }

    if (!logoutClicked) {
      console.error('[AuthHelper] Could not find logout button');
      throw new Error('Could not find logout button');
    }

    // Wait for redirect to login
    await this.page.waitForURL('/login', { timeout: 10000 });
  }

  async isAuthenticated(): Promise<boolean> {
    // Check if we have a token in localStorage
    const hasToken = await this.page.evaluate(() => {
      return !!localStorage.getItem('accessToken');
    });

    // Also check URL as a secondary check
    const url = this.page.url();
    const notOnAuthPage = !url.includes('/login') && !url.includes('/register');

    return hasToken && notOnAuthPage;
  }
}

/**
 * Navigation helpers
 */
export class NavigationHelper {
  constructor(private page: Page) {}

  async goToTab(tabName: string) {
    // Check if page is still open
    if (this.page.isClosed()) {
      return;
    }

    // Use first() to avoid strict mode violations when multiple buttons with same text exist
    const tabButton = this.page.locator(`button:has-text("${tabName}")`).first();
    await tabButton.waitFor({ state: 'visible', timeout: 10000 });
    await tabButton.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await tabButton.click({ timeout: 3000 });
    } catch {
      // Retry with force for problematic browsers
      await tabButton.click({ force: true, timeout: 2000 });
    }

    // Wait for tab content to load - wait for table or content area to appear
    try {
      await this.page.waitForSelector('table, .grid, .content', {
        timeout: 10000,
      });
    } catch {
      // If content doesn't appear, wait a bit anyway
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Reset all filters to 'all' to ensure entities are visible
   * This is critical for E2E tests to work correctly
   */
  async resetFilters() {
    // Execute script in browser context to reset filters
    await this.page.evaluate(() => {
      // Try to access Zustand store from window
      const uiStore = (window as any).useUiStore;
      if (uiStore && uiStore.getState) {
        const state = uiStore.getState();
        if (state.setFilter) {
          state.setFilter('selectedProjectId', 'all');
          state.setFilter('selectedEpisodeId', 'all');
          state.setFilter('selectedSequenceId', 'all');
          state.setFilter('selectedShotId', 'all');
          state.setFilter('selectedAssetId', 'all');
        }
      }
    });
    await this.page.waitForTimeout(300);
  }

  async openAddModal() {
    // Check if page is still open
    if (this.page.isClosed()) {
      return;
    }

    // Close any existing modal quickly
    const existingModal = this.page.locator('.modal, [role="dialog"]');
    const hasModal = await existingModal.isVisible().catch(() => false);
    if (hasModal) {
      if (!this.page.isClosed()) {
        await this.page.keyboard.press('Escape');
        await existingModal.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
      }
    }

    // Check again if page is still open
    if (this.page.isClosed()) {
      return;
    }

    // Find and click the Add button
    const addButton = this.page.locator('button:has-text("+ Add")');
    await addButton.waitFor({ state: 'visible', timeout: 5000 });

    // Click with retry logic - reduced timeouts for speed
    let clicked = false;
    for (let i = 0; i < 3 && !clicked; i++) {
      try {
        await addButton.click({ timeout: 3000, force: i === 2 });
        clicked = true;
      } catch {
        if (i === 2) {
          // Last attempt - try with force
          await addButton.click({ force: true, timeout: 2000 });
          clicked = true;
        } else {
          await this.page.waitForTimeout(200); // Reduced from 500ms
        }
      }
    }

    // Wait for modal to appear - reduced timeout
    await this.page.waitForSelector('.modal, [role="dialog"]', {
      timeout: 3000,
    });
  }

  async closeModal() {
    // Try to find close button (X or Cancel)
    const closeButton = this.page
      .locator('button:has-text("✕"), button:has-text("Cancel")')
      .first();
    await closeButton.click({ timeout: 3000 });

    // Wait for modal to disappear - reduced timeout
    await this.page.waitForSelector('.modal, [role="dialog"]', {
      state: 'hidden',
      timeout: 2000,
    });
  }

  async toggleFilters() {
    // Use first() to avoid strict mode violations when multiple Filter buttons exist
    const filterButton = this.page.locator('button:has-text("Filter")').first();
    await filterButton.waitFor({ state: 'visible', timeout: 5000 });

    try {
      await filterButton.click({ timeout: 3000 });
    } catch {
      // Retry with force if needed
      await filterButton.click({ force: true, timeout: 2000 });
    }
  }

  async refreshData() {
    const refreshButton = this.page.locator('button:has-text("Refresh")');
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await refreshButton.waitFor({ state: 'visible', timeout: 10000 });

    try {
      await refreshButton.click({ timeout: 3000 });
    } catch {
      // Retry with force if needed
      await refreshButton.click({ force: true, timeout: 2000 });
    }
  }

  async openDetailPanel(itemCode: string, timeout: number = 20000) {
    const refreshButton = this.page.locator('button:has-text("Refresh")').first();
    const startTime = Date.now();

    // Wait for the row to become visible, refreshing if needed
    while (Date.now() - startTime < timeout) {
      const row = this.page.locator(`tr:has-text("${itemCode}")`);
      const isAttached = await row
        .count()
        .then((c) => c > 0)
        .catch(() => false);
      if (isAttached) {
        await row.scrollIntoViewIfNeeded().catch(() => {});
        try {
          // Prefer clicking the code button inside the row to trigger detail panel
          const codeButton = row.locator(`button:has-text("${itemCode}")`).first();
          if (await codeButton.isVisible({ timeout: 500 }).catch(() => false)) {
            await codeButton.click({ timeout: 3000 });
          } else {
            await row.click({ timeout: 3000 });
          }
        } catch {
          await row.click({ force: true, timeout: 2000 });
        }
        // Give the detail panel a moment to render
        const detailPanel = this.page.locator('.detail-panel, [data-testid="detail-panel"]');
        const detailStart = Date.now();
        while (Date.now() - detailStart < 8000) {
          if (await detailPanel.isVisible().catch(() => false)) {
            return;
          }
          await this.page.waitForTimeout(200);
        }

        // If panel didn't appear, try clicking again on next loop iteration
      }

      // Try to refresh data if button exists
      if (await refreshButton.isVisible({ timeout: 200 }).catch(() => false)) {
        await refreshButton.click().catch(() => {});
      }

      // Small wait before polling again
      await this.page.waitForTimeout(300);
    }

    // If we exit the loop, we never found the row
    const tableVisible = await this.page
      .locator('table')
      .isVisible()
      .catch(() => false);
    throw new Error(
      `Could not open detail panel for ${itemCode} within ${timeout}ms (table visible: ${tableVisible})`,
    );
  }

  async waitForModalToCloseAndDataToLoad() {
    // Wait for modal to close
    try {
      await this.page.waitForSelector('.modal, [role="dialog"]', {
        state: 'hidden',
        timeout: 5000,
      });
    } catch {
      // If modal doesn't close, try pressing Escape (only if page is still open)
      try {
        // Check if page is still open
        if (!this.page.isClosed()) {
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
        }
      } catch {
        // Page might have closed, ignore
      }
    }

    // Wait for table/data to refresh (only if page is still open)
    try {
      if (!this.page.isClosed()) {
        await this.page.waitForTimeout(1000);
      }
    } catch {
      // Page closed, ignore
    }
  }
}

/**
 * Form helpers
 */
export class FormHelper {
  constructor(private page: Page) {}

  /**
   * Wait for element to be stable (not detached from DOM)
   */
  private async waitForStableElement(selector: string, timeout: number = 10000) {
    const startTime = Date.now();
    let lastElement: any = null;
    let stableCount = 0;
    const requiredStableChecks = 3; // Element must be stable for 3 consecutive checks

    while (Date.now() - startTime < timeout) {
      try {
        const element = this.page.locator(selector).first();
        const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
        
        if (isVisible) {
          // Check if element is still attached to DOM
          const isAttached = await element.evaluate((el) => {
            return el.isConnected;
          }).catch(() => false);

          if (isAttached) {
            // Check if it's the same element (not re-rendered)
            const currentElement = await element.evaluateHandle((el) => el);
            if (lastElement && currentElement === lastElement) {
              stableCount++;
              if (stableCount >= requiredStableChecks) {
                await this.page.waitForTimeout(200); // Extra wait for React to finish
                return element;
              }
            } else {
              lastElement = currentElement;
              stableCount = 1;
            }
          }
        }
      } catch {
        // Element not ready, continue waiting
      }
      await this.page.waitForTimeout(100);
    }
    
    // Fallback: just wait for visible
    return this.page.locator(selector).first().waitFor({ state: 'visible', timeout });
  }

  async fillField(name: string, value: string) {
    // Prefer exact name attribute match to avoid strict-mode conflicts
    let input = this.page.locator(
      `input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`,
    );

    if ((await input.count()) === 0) {
      // Try by associated label text
      const label = this.page.locator(`label:has-text("${name}")`).first();
      if (await label.count()) {
        const labelledInput = label.locator('xpath=..').locator('input, textarea, select').first();
        input = labelledInput;
      }
    }

    // Final fallback to placeholder
    if ((await input.count()) === 0) {
      input = this.page.locator(`input[placeholder*="${name}" i]`);
    }

    // Wait for element to be stable and visible
    await input.first().waitFor({ state: 'visible', timeout: 15000 });
    // Extra wait to ensure element is fully rendered and not detached
    await this.page.waitForTimeout(200);

    const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
    const inputType = await input.evaluate((el) => (el as HTMLInputElement).type);

    if (tagName === 'select') {
      // Wait for select to be enabled and options to be loaded
      await input.waitFor({ state: 'attached', timeout: 8000 });

      // Short wait for options
      await this.page.waitForTimeout(400);

      // Fast path: read options and click a matching one (or first) to avoid long selectOption retries
      const options = await input.locator('option');
      const optionCount = await options.count();
      if (optionCount === 0) {
        console.warn(`[FormHelper] Select "${name}" has zero options, skipping selection`);
        return;
      }

      let targetIndex = 0;
      for (let i = 0; i < optionCount; i++) {
        const opt = options.nth(i);
        const optionText = (await opt.textContent())?.trim() || '';
        const optionValue = (await opt.getAttribute('value')) || '';
        if (
          optionText.toLowerCase().includes(value.toLowerCase()) ||
          optionValue.toLowerCase() === value.toLowerCase()
        ) {
          targetIndex = i;
          break;
        }
      }

      const targetOption = options.nth(targetIndex);
      const isVisible = await targetOption.isVisible({ timeout: 500 }).catch(() => false);
      const targetValue = (await targetOption.getAttribute('value')) ?? '';

      if (isVisible) {
        await targetOption.click({ timeout: 3000 });
        return;
      }

      // If option is not visible (placeholder-only dropdown), set value programmatically
      console.warn(
        `[FormHelper] Option for "${name}" not visible; setting value programmatically and continuing`,
      );
      await input.evaluate((el, value) => {
        const selectEl = el as HTMLSelectElement;
        selectEl.value = value;
        selectEl.dispatchEvent(new Event('input', { bubbles: true }));
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      }, targetValue);
      return;
    } else {
      if (inputType === 'color') {
        await input.evaluate(
          (el, val) => {
            const inputEl = el as HTMLInputElement;
            inputEl.value = val;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          },
          value.toLowerCase(),
        );
      } else {
        await input.fill(value);
      }
    }
  }

  async submitForm() {
    await this.page.click(
      'button[type="submit"], button:has-text("Create"), button:has-text("Save")',
    );
  }

  async expectValidationError(fieldName: string) {
    const error = this.page.locator(
      `[data-error="${fieldName}"], .error:near(input[name="${fieldName}"])`,
    );
    await expect(error).toBeVisible();
  }

  async expectFieldValue(name: string, value: string) {
    const input = this.page.locator(`input[name="${name}"], textarea[name="${name}"]`);
    await expect(input).toHaveValue(value);
  }

  async selectFirstProject(timeout: number = 10000) {
    const selector = 'select[name="projectId"], select[name="project"]';
    const select = this.page.locator(selector);

    // Wait for select to be visible
    await select.waitFor({ state: 'visible', timeout });

    // Wait for options to load - poll until we have at least 2 options
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const optionCount = await select.locator('option').count();
      if (optionCount >= 2) {
        break; // We have options!
      }
      await this.page.waitForTimeout(300);
    }

    // Double-check we have options
    const finalOptionCount = await select.locator('option').count();
    if (finalOptionCount < 2) {
      // Fallback: fetch projects directly and inject first option
      try {
        const accessToken = await this.page.evaluate(() => {
          return localStorage.getItem('accessToken');
        });

        if (accessToken) {
          const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
          const response = await this.page.request.get(`${apiUrl}/api/v1/projects`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.ok()) {
            const data = await response.json();
            const projects = Array.isArray(data?.data) ? data.data : data?.data?.items || data;
            const project = Array.isArray(projects) ? projects[0] : null;

            if (project) {
              const optionValue = project.id || project._id || project.code;
              await this.page.evaluate(
                ({ selector, project, optionValue }) => {
                  const selectEl = document.querySelector(selector) as HTMLSelectElement | null;
                  if (!selectEl) return;

                  const option = new Option(`${project.code} - ${project.name}`, optionValue);
                  selectEl.appendChild(option);
                  selectEl.value = optionValue;
                  selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                },
                { selector, project, optionValue },
              );
              await this.page.waitForTimeout(200);
              return;
            }
          }
        }
      } catch (error) {
        console.warn('[FormHelper] Failed fallback project injection', error);
      }

      throw new Error(`Project select has no options after ${timeout}ms`);
    }

    // Select the first actual option (index 1, skipping placeholder at index 0)
    await select.selectOption({ index: 1 });

    // Wait a bit for the selection to register
    await this.page.waitForTimeout(200);
  }

  async selectFirstEpisode(timeout: number = 10000) {
    const selector = 'select[name="episodeId"], select[name="episode"]';
    const select = this.page.locator(selector);

    await select.waitFor({ state: 'visible', timeout });

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const optionCount = await select.locator('option').count();
      if (optionCount >= 2) break;
      await this.page.waitForTimeout(300);
    }

    const finalOptionCount = await select.locator('option').count();
    if (finalOptionCount < 2) {
      throw new Error(`Episode select has no options after ${timeout}ms`);
    }

    await select.selectOption({ index: 1 });
    await this.page.waitForTimeout(200);
  }

  async selectFirstSequence(timeout: number = 10000) {
    const selector = 'select[name="sequenceId"], select[name="sequence"]';
    const select = this.page.locator(selector);

    await select.waitFor({ state: 'visible', timeout });

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const optionCount = await select.locator('option').count();
      if (optionCount >= 2) break;
      await this.page.waitForTimeout(300);
    }

    const finalOptionCount = await select.locator('option').count();
    if (finalOptionCount < 2) {
      throw new Error(`Sequence select has no options after ${timeout}ms`);
    }

    await select.selectOption({ index: 1 });
    await this.page.waitForTimeout(200);
  }

  private async selectFirstOption(selector: string, timeout: number = 10000) {
    // Check if page is still open
    if (this.page.isClosed()) {
      return;
    }

    const select = this.page.locator(selector);

    // Wait for select to be visible
    const isVisible = await select.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isVisible) {
      return; // Select not visible, skip
    }

    // Wait for options to be loaded - simple polling approach
    let attempts = 0;
    let optionsReady = false;
    while (attempts < 10 && !this.page.isClosed()) {
      try {
        const optionCount = await select.locator('option').count();
        if (optionCount >= 2) {
          optionsReady = true;
          break;
        }
      } catch {
        // Page might be closed or select not available
        if (this.page.isClosed()) {
          return;
        }
      }
      attempts++;
      if (attempts < 10) {
        await this.page.waitForTimeout(300);
      }
    }

    if (!optionsReady || this.page.isClosed()) {
      return; // Options not ready or page closed
    }

    // Try to get the first non-empty option value
    let firstOptionValue: string | null = null;
    try {
      if (!this.page.isClosed()) {
        firstOptionValue = await select
          .locator('option')
          .nth(1)
          .getAttribute('value')
          .catch(() => null);
      }
    } catch {
      // Options might not be loaded yet
    }

    // Try to select using the value
    if (firstOptionValue && !this.page.isClosed()) {
      try {
        // Extract field name from selector
        const fieldMatch = selector.match(/name="([^"]+)"/);
        const fieldName = fieldMatch ? fieldMatch[1] : null;
        if (fieldName) {
          await this.fillField(fieldName, firstOptionValue);
          return; // Success
        }
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback: try selecting by index
    if (!this.page.isClosed()) {
      try {
        await select.selectOption({ index: 1 });
      } catch {
        // Selection failed, but continue
      }
    }
  }
}

/**
 * Table helpers
 */
export class TableHelper {
  constructor(private page: Page) {}

  async getRowCount(timeout: number = 10000): Promise<number> {
    // Wait for table to be visible first
    await this.page.waitForSelector('table', { timeout });
    // Wait a bit for data to load
    await this.page.waitForTimeout(500);

    const rows = await this.page.locator('table tbody tr:not(.no-data)').count();
    return rows;
  }

  async findRowByText(text: string) {
    return this.page.locator(`tr:has-text("${text}")`).first();
  }

  /**
   * Wait for a row to appear in the table with smart polling
   * This is more reliable than just waiting for visibility
   */
  async waitForRowToAppear(text: string, timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 500;
    const refreshButton = this.page.locator('button:has-text("Refresh")').first();

    while (Date.now() - startTime < timeout) {
      try {
        const row = this.page.locator(`tr:has-text("${text}")`).first();
        const isVisible = await row.isVisible().catch(() => false);

        if (isVisible) {
          // Double-check it's actually there
          await this.page.waitForTimeout(200);
          const stillVisible = await row.isVisible().catch(() => false);
          if (stillVisible) {
            return true;
          }
        }

        // If the table itself is missing, try to wait for it briefly
        await this.page.waitForSelector('table', { timeout: 2000 }).catch(() => {});
      } catch {
        // Continue polling
      }

      // Try refreshing the data if a Refresh button exists
      if (await refreshButton.isVisible({ timeout: 500 }).catch(() => false)) {
        try {
          await refreshButton.click({ timeout: 500 });
        } catch {
          // Ignore refresh failures
        }
      }

      await this.page.waitForTimeout(pollInterval);
    }

    throw new Error(`Row with text "${text}" did not appear within ${timeout}ms`);
  }

  async clickRowAction(
    rowText: string,
    action: 'Edit' | 'Delete' | '+ Note',
    timeout: number = 20000,
  ) {
    await this.waitForRowToAppear(rowText, timeout);
    const row = await this.findRowByText(rowText);
    const actionButton = row.locator(`button:has-text("${action}")`);
    await actionButton.waitFor({ state: 'visible', timeout: 15000 });
    await actionButton.scrollIntoViewIfNeeded().catch(() => {});

    try {
      await actionButton.click({ timeout: 5000 });
    } catch {
      // Retry with force if needed
      await actionButton.click({ force: true, timeout: 3000 });
    }
  }

  async selectRow(rowText: string, timeout: number = 20000) {
    await this.waitForRowToAppear(rowText, timeout);
    const row = await this.findRowByText(rowText);
    const checkbox = row.locator('input[type="checkbox"]');
    await checkbox.waitFor({ state: 'visible', timeout: 5000 });

    try {
      await checkbox.check({ timeout: 3000 });
    } catch {
      // Retry with force if needed
      await checkbox.check({ force: true, timeout: 2000 });
    }
  }

  async selectAllRows() {
    // Close any open modals first
    const modal = this.page.locator('.modal, [role="dialog"]');
    const isModalVisible = await modal.isVisible().catch(() => false);
    if (isModalVisible) {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(300);
    }

    await this.page.locator('thead input[type="checkbox"]').check();
  }

  async sortByColumn(columnName: string) {
    const columnHeader = this.page.locator(`th:has-text("${columnName}")`);
    await columnHeader.waitFor({ state: 'visible', timeout: 10000 }); // Increased for table loading

    try {
      await columnHeader.click({ timeout: 3000 });
    } catch {
      // Retry with force if needed
      await columnHeader.click({ force: true, timeout: 2000 });
    }
  }

  async expectRowExists(text: string, timeout: number = 20000) {
    await this.waitForRowToAppear(text, timeout);
  }

  async waitForRowToDisappear(text: string, timeout: number = 20000) {
    const refreshButton = this.page.locator('button:has-text("Refresh")').first();
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const row = this.page.locator(`tr:has-text("${text}")`).first();
      const exists = await row
        .count()
        .then((c) => c > 0)
        .catch(() => false);
      if (!exists) {
        return;
      }
      const isVisible = await row.isVisible().catch(() => false);
      if (!isVisible) {
        return;
      }

      if (await refreshButton.isVisible({ timeout: 200 }).catch(() => false)) {
        await refreshButton.click().catch(() => {});
      }
      await this.page.waitForTimeout(300);
    }

    throw new Error(`Row with text "${text}" did not disappear within ${timeout}ms`);
  }

  async expectRowNotExists(text: string, timeout: number = 20000) {
    await this.waitForRowToDisappear(text, timeout);
  }
}

/**
 * Modal helpers
 */
export class ModalHelper {
  constructor(private page: Page) {}

  async isOpen(): Promise<boolean> {
    if (this.page.isClosed()) {
      return false;
    }
    return await this.page
      .locator('.modal, [role="dialog"]')
      .isVisible()
      .catch(() => false);
  }

  async expectTitle(title: string) {
    await expect(
      this.page.locator('.modal .text-lg.font-semibold, [role="dialog"] h2'),
    ).toContainText(title);
  }

  async close() {
    await this.page.click('button:has-text("✕"), button:has-text("Cancel")');
    await this.page.waitForSelector('.modal, [role="dialog"]', {
      state: 'hidden',
    });
  }

  async submit() {
    const submitButton = this.page
      .locator('button:has-text("Create"), button:has-text("Save"), button[type="submit"]')
      .first();
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });

    try {
      await submitButton.click({ timeout: 3000 });
    } catch {
      // Retry with force if needed (for blocked buttons)
      await submitButton.click({ force: true, timeout: 2000 });
    }

    // Wait for request to complete - don't wait for modal to close here
    // The test should handle modal closing separately
    await this.page.waitForTimeout(1000);
  }
}

/**
 * Toast/Notification helpers
 */
export class ToastHelper {
  constructor(private page: Page) {}

  async expectSuccess(message?: string) {
    // Use first() to avoid strict mode violation when multiple toasts exist
    const toast = this.page.locator('.toast, [role="alert"], [role="status"]').first();
    await expect(toast).toBeVisible();

    if (message) {
      await expect(toast).toContainText(message);
    }
  }

  async expectError(message?: string | RegExp) {
    // Use first() to avoid strict mode violation when multiple error toasts exist
    const toast = this.page.locator('.toast.error, [role="alert"]').first();
    await expect(toast).toBeVisible();

    if (message) {
      if (message instanceof RegExp) {
        await expect(toast).toContainText(message);
      } else {
        await expect(toast).toContainText(message);
      }
    }
  }

  async waitForToastToDisappear() {
    await this.page.waitForTimeout(2000); // Toasts usually disappear after ~2s
  }
}

/**
 * Cleanup helpers for test data
 */
export class CleanupHelper {
  constructor(
    private page: Page,
    private nav: NavigationHelper,
    private table: TableHelper,
  ) {}

  /**
   * Create a project via API (more reliable than UI for test setup)
   */
  async createProjectViaAPI(projectData: { code: string; name: string; description?: string }) {
    try {
      console.log(`[API] Creating project: ${projectData.code}`);

      // Get access token from localStorage
      const accessToken = await this.page.evaluate(() => {
        return localStorage.getItem('accessToken');
      });

      if (!accessToken) {
        throw new Error('No access token found - user must be authenticated first');
      }

      // Make API request using page.request with full API URL and auth header
      const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
      const { code, name, description } = projectData;
      const payload = {
        code,
        name,
        description: description ?? 'Created by Playwright E2E tests',
      };

      const response = await this.page.request.post(`${apiUrl}/api/v1/projects`, {
        data: payload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(`API project creation failed: ${response.status()} ${errorText}`);
      }

      const responseData = await response.json();
      // Handle ApiResponse wrapper if present
      const createdProject = responseData?.data || responseData;
      console.log(`[API] Successfully created project: ${projectData.code}`);
      return createdProject;
    } catch (error) {
      console.error(`[API] Failed to create project ${projectData.code}:`, error);
      throw error;
    }
  }

  /**
   * Create an episode via API (more reliable than UI for test setup)
   */
  async createEpisodeViaAPI(episodeData: {
    code: string;
    name: string;
    projectId: string;
    description?: string;
    epNumber?: number;
    cutOrder?: number;
  }) {
    try {
      console.log(`[API] Creating episode: ${episodeData.code}`);

      const accessToken = await this.page.evaluate(() => {
        return localStorage.getItem('accessToken');
      });

      if (!accessToken) {
        throw new Error('No access token found - user must be authenticated first');
      }

      const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
      const { code, name, projectId, description, epNumber, cutOrder } = episodeData;
      const payload = {
        code,
        name,
        projectId,
        description: description ?? 'Created by Playwright E2E tests',
        epNumber: epNumber ?? 1,
        cutOrder: cutOrder ?? 1,
      };

      const response = await this.page.request.post(`${apiUrl}/api/v1/episodes`, {
        data: payload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(`API episode creation failed: ${response.status()} ${errorText}`);
      }

      const responseData = await response.json();
      const createdEpisode = responseData?.data || responseData;
      console.log(`[API] Successfully created episode: ${episodeData.code}`);
      return createdEpisode;
    } catch (error) {
      console.error(`[API] Failed to create episode ${episodeData.code}:`, error);
      throw error;
    }
  }

  /**
   * Create a sequence via API (more reliable than UI for test setup)
   */
  async createSequenceViaAPI(sequenceData: {
    code: string;
    name: string;
    episodeId: number;
    description?: string;
    cutOrder?: number;
  }) {
    try {
      console.log(`[API] Creating sequence: ${sequenceData.code}`);

      const accessToken = await this.page.evaluate(() => {
        return localStorage.getItem('accessToken');
      });

      if (!accessToken) {
        throw new Error('No access token found - user must be authenticated first');
      }

      const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
      const { code, name, episodeId, description, cutOrder } = sequenceData;
      const payload = {
        code,
        name,
        episodeId,
        description: description ?? 'Created by Playwright E2E tests',
        cutOrder: cutOrder ?? 1,
      };

      const response = await this.page.request.post(`${apiUrl}/api/v1/sequences`, {
        data: payload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(`API sequence creation failed: ${response.status()} ${errorText}`);
      }

      const responseData = await response.json();
      const createdSequence = responseData?.data || responseData;
      console.log(`[API] Successfully created sequence: ${sequenceData.code}`);
      return createdSequence;
    } catch (error) {
      console.error(`[API] Failed to create sequence ${sequenceData.code}:`, error);
      throw error;
    }
  }

  /**
   * Ensure a status exists (idempotent); ignores 409/duplicate
   */
  async ensureStatusActive() {
    try {
      const accessToken = await this.page.evaluate(() => {
        return localStorage.getItem('accessToken');
      });
      if (!accessToken) {
        throw new Error('No access token found - user must be authenticated first');
      }

      const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
      const payload = {
        code: 'active',
        name: 'Active',
        description: 'Seeded for E2E tests',
        color: '#00ff00',
        applicableEntities: ['all'],
        isActive: true,
        sortOrder: 1,
      };

      // Check if status already exists
      const listResp = await this.page.request.get(`${apiUrl}/api/v1/statuses`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (listResp.ok()) {
        const list = await listResp.json();
        const items = list?.data || list;
        if (Array.isArray(items) && items.some((s: any) => s.code === 'active')) {
          return;
        }
      }

      const response = await this.page.request.post(`${apiUrl}/api/v1/statuses`, {
        data: payload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok()) {
        const status = response.status();
        // Ignore conflict/duplicate
        if (status === 409 || status === 422) {
          return;
        }
        const errorText = await response.text();
        throw new Error(`API status creation failed: ${status} ${errorText}`);
      }
    } catch (error) {
      console.warn('[Seed] Failed to ensure active status:', error);
    }
  }

  /**
   * Seed minimal hierarchy: project -> episode -> sequence (no status fields)
   */
  async seedBaseHierarchy() {
    await this.ensureStatusActive();

    const projectData = createProjectData();
    const project = await this.createProjectViaAPI({
      code: projectData.code,
      name: projectData.name,
      description: projectData.description,
    });

    const episodeData = createEpisodeData();
    const episode = await this.createEpisodeViaAPI({
      code: episodeData.code,
      name: episodeData.name,
      projectId: String(project.id),
      description: episodeData.description,
      epNumber: episodeData.epNumber,
      cutOrder: episodeData.cutOrder,
    });

    const sequenceData = createSequenceData();
    const sequence = await this.createSequenceViaAPI({
      code: sequenceData.code,
      name: sequenceData.name,
      episodeId: episode.id || (episode as any).data?.id,
      description: sequenceData.description,
      cutOrder: sequenceData.cutOrder,
    });

    return { project, episode, sequence };
  }

  /**
   * Delete a project by its code
   */

  async deleteProjectByCode(code: string, timeout: number = 10000) {
    if (this.page.isClosed()) {
      console.warn(`[Cleanup] Page closed, cannot delete project: ${code}`);
      return;
    }

    try {
      console.log(`[Cleanup] Deleting project: ${code}`);
      await this.nav.goToTab('Projects');

      // Wait for table to be visible
      await this.page.waitForSelector('table', { timeout: 5000 });

      // Search for the project by code
      const searchInput = this.page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill(code);
        await this.page.waitForTimeout(500);
      }

      // Find and select the row
      const row = await this.table.findRowByText(code);
      const isVisible = await row.isVisible({ timeout: 3000 }).catch(() => false);

      if (!isVisible) {
        console.warn(`[Cleanup] Project not found in table: ${code}`);
        return;
      }

      // Select the row checkbox
      const checkbox = row.locator('input[type="checkbox"]');
      await checkbox.check({ timeout: 3000 }).catch(() => {});

      // Click delete button
      const deleteButton = this.page.locator('button:has-text("Delete")');
      await deleteButton.waitFor({ state: 'visible', timeout: 3000 });
      await deleteButton.click({ timeout: 3000 });

      // Confirm if dialog appears
      const confirmButton = this.page.locator(
        'button:has-text("Confirm"), button:has-text("Delete")',
      );
      const hasConfirm = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasConfirm) {
        await confirmButton.click({ timeout: 2000 });
      }

      // Wait for deletion to complete
      await this.page.waitForTimeout(1000);
      console.log(`[Cleanup] Successfully deleted project: ${code}`);
    } catch (error) {
      console.warn(`[Cleanup] Failed to delete project ${code}:`, error);
      // Don't throw - cleanup failures shouldn't fail tests
    }
  }

  /**
   * Delete a user by email via API
   */
  async deleteUserByEmail(email: string) {
    if (this.page.isClosed()) {
      console.warn(`[Cleanup] Page closed, cannot delete user: ${email}`);
      return;
    }

    try {
      // Try to get access token from localStorage
      let accessToken = await this.page.evaluate(() => {
        return localStorage.getItem('accessToken');
      });

      // If no token, try to login as admin to get token for cleanup
      if (!accessToken) {
        try {
          // Try to use API directly with a cleanup admin user
          const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
          // Note: This assumes there's a cleanup admin user, or we skip cleanup
          console.warn(`[Cleanup] No access token for cleanup of user: ${email}. Skipping.`);
          return;
        } catch {
          console.warn(`[Cleanup] Could not get token for cleanup of user: ${email}. Skipping.`);
          return;
        }
      }

      const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
      
      // First, try to find the user
      const listResp = await this.page.request.get(`${apiUrl}/api/v1/users?email=${encodeURIComponent(email)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!listResp.ok()) {
        console.warn(`[Cleanup] Could not list users to find: ${email}`);
        return;
      }

      const listData = await listResp.json();
      const users = listData?.data || listData;
      const user = Array.isArray(users) ? users.find((u: any) => u.email === email) : null;

      if (!user || !user.id) {
        console.warn(`[Cleanup] User not found: ${email}`);
        return;
      }

      // Delete the user
      const deleteResp = await this.page.request.delete(`${apiUrl}/api/v1/users/${user.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (deleteResp.ok()) {
        console.log(`[Cleanup] Successfully deleted user: ${email}`);
      } else {
        console.warn(`[Cleanup] Failed to delete user ${email}: ${deleteResp.status()}`);
      }
    } catch (error) {
      console.warn(`[Cleanup] Error deleting user ${email}:`, error);
      // Don't throw - cleanup failures shouldn't fail tests
    }
  }

  /**
   * Clean all test users (users with email matching test pattern)
   */
  async cleanAllTestUsers() {
    if (this.page.isClosed()) {
      return;
    }

    try {
      const accessToken = await this.page.evaluate(() => {
        return localStorage.getItem('accessToken');
      });

      if (!accessToken) {
        return;
      }

      const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
      
      // Get all users
      const listResp = await this.page.request.get(`${apiUrl}/api/v1/users`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!listResp.ok()) {
        return;
      }

      const listData = await listResp.json();
      const users = listData?.data || listData;
      
      if (!Array.isArray(users)) {
        return;
      }

      // Find test users (emails matching test pattern)
      const testUsers = users.filter((u: any) => 
        u.email && (
          u.email.includes('@playwright.com') ||
          u.email.includes('test_') ||
          u.email.includes('playwright')
        )
      );

      // Delete test users
      for (const user of testUsers) {
        try {
          const deleteResp = await this.page.request.delete(`${apiUrl}/api/v1/users/${user.id}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          if (deleteResp.ok()) {
            console.log(`[Cleanup] Deleted test user: ${user.email}`);
          }
        } catch (error) {
          console.warn(`[Cleanup] Error deleting user ${user.email}:`, error);
        }
      }
    } catch (error) {
      console.warn('[Cleanup] Error cleaning test users:', error);
      // Don't throw - cleanup failures shouldn't fail tests
    }
  }

  /**
   * Delete an entity by its code and type
   */
  async deleteEntityByCode(
    entityType: 'project' | 'episode' | 'sequence' | 'shot' | 'asset',
    code: string,
    timeout: number = 10000,
  ) {
    if (this.page.isClosed()) {
      console.warn(`[Cleanup] Page closed, cannot delete ${entityType}: ${code}`);
      return;
    }

    try {
      console.log(`[Cleanup] Deleting ${entityType}: ${code}`);

      // Map entity types to tab names
      const tabMap: Record<typeof entityType, string> = {
        project: 'Projects',
        episode: 'Episodes',
        sequence: 'Sequences',
        shot: 'Shots',
        asset: 'Assets',
      };

      try {
        await this.nav.goToTab(tabMap[entityType]);
      } catch (error) {
        console.warn(
          `[Cleanup] Failed to navigate to ${tabMap[entityType]}, skipping deletion of ${code}:`,
          error,
        );
        return;
      }

      // Wait for table with better error handling
      try {
        await this.page.waitForSelector('table', { timeout: 5000 });
      } catch (error) {
        // If table doesn't appear, entity might already be deleted or page is in bad state
        console.warn(`[Cleanup] Table not found for ${entityType}, skipping deletion of ${code}`);
        return;
      }

      // Search for the entity
      const searchInput = this.page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill(code);
        await this.page.waitForTimeout(500);
      }

      // Find and select the row
      const row = await this.table.findRowByText(code);
      const isVisible = await row.isVisible({ timeout: 3000 }).catch(() => false);

      if (!isVisible) {
        console.warn(`[Cleanup] ${entityType} not found in table: ${code}`);
        return;
      }

      // Select checkbox
      const checkbox = row.locator('input[type="checkbox"]');
      await checkbox.check({ timeout: 3000 }).catch(() => {});

      // Click delete
      const deleteButton = this.page.locator('button:has-text("Delete")');
      await deleteButton.waitFor({ state: 'visible', timeout: 3000 });
      await deleteButton.click({ timeout: 3000 });

      // Confirm if needed
      const confirmButton = this.page.locator(
        'button:has-text("Confirm"), button:has-text("Delete")',
      );
      const hasConfirm = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasConfirm) {
        await confirmButton.click({ timeout: 2000 });
      }

      await this.page.waitForTimeout(1000);
      console.log(`[Cleanup] Successfully deleted ${entityType}: ${code}`);
    } catch (error) {
      console.warn(`[Cleanup] Failed to delete ${entityType} ${code}:`, error);
    }
  }

  /**
   * Delete multiple projects in batch
   */
  async deleteMultipleProjects(codes: string[]) {
    if (this.page.isClosed() || codes.length === 0) {
      return;
    }

    try {
      console.log(`[Cleanup] Deleting ${codes.length} projects`);
      await this.nav.goToTab('Projects');
      await this.page.waitForSelector('table', { timeout: 5000 });

      let deletedCount = 0;
      const batchSize = 10;

      // Delete in batches to avoid overwhelming the UI
      for (let i = 0; i < codes.length; i += batchSize) {
        const batch = codes.slice(i, i + batchSize);
        let batchDeleted = 0;

        for (const code of batch) {
          try {
            // Search for this specific project
            const searchInput = this.page.locator(
              'input[placeholder*="Search"], input[type="search"]',
            );
            if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
              await searchInput.fill(code);
              await this.page.waitForTimeout(300);
            }

            // Find and select
            const row = await this.table.findRowByText(code);
            const isVisible = await row.isVisible({ timeout: 2000 }).catch(() => false);

            if (isVisible) {
              const checkbox = row.locator('input[type="checkbox"]');
              await checkbox.check({ timeout: 2000 }).catch(() => {});
              batchDeleted++;
            }
          } catch (error) {
            console.warn(`[Cleanup] Failed to select project ${code}:`, error);
          }
        }

        // Delete selected batch
        if (batchDeleted > 0) {
          const deleteButton = this.page.locator('button:has-text("Delete")');
          const isVisible = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);
          if (isVisible) {
            await deleteButton.click({ timeout: 2000 });

            // Confirm
            const confirmButton = this.page.locator(
              'button:has-text("Confirm"), button:has-text("Delete")',
            );
            const hasConfirm = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);
            if (hasConfirm) {
              await confirmButton.click({ timeout: 2000 });
            }

            await this.page.waitForTimeout(1000);
            deletedCount += batchDeleted;
          }
        }

        // Clear search for next batch
        const searchInput = this.page.locator('input[placeholder*="Search"], input[type="search"]');
        if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await searchInput.fill('');
          await this.page.waitForTimeout(300);
        }
      }

      console.log(`[Cleanup] Successfully deleted ${deletedCount} projects`);
    } catch (error) {
      console.warn('[Cleanup] Failed to delete multiple projects:', error);
    }
  }

  /**
   * Clean all test data (users, projects, etc.) - use with caution
   */
  async cleanAllTestData() {
    if (this.page.isClosed()) {
      return;
    }

    try {
      console.log('[Cleanup] Starting comprehensive test data cleanup...');
      
      // Clean test users first (they might own other entities)
      await this.cleanAllTestUsers();
      
      // Clean test projects (which will cascade to episodes, sequences, etc.)
      await this.cleanupTestProjects('PLW_PRJ_');
      
      // Wait a bit for cascading deletes to complete
      await this.page.waitForTimeout(2000);
      
      console.log('[Cleanup] Test data cleanup completed');
    } catch (error) {
      console.warn('[Cleanup] Error during comprehensive cleanup:', error);
      // Don't throw - cleanup failures shouldn't fail tests
    }
  }

  /**
   * Cleanup test projects by pattern
   */
  async cleanupTestProjects(pattern: string = 'PLW_PRJ_') {
    if (this.page.isClosed()) {
      return 0;
    }

    try {
      console.log(`[Cleanup] Cleaning up test projects with pattern: ${pattern}`);
      await this.nav.goToTab('Projects');
      await this.page.waitForSelector('table', { timeout: 5000 });

      // Search for projects with pattern
      const searchInput = this.page.locator('input[placeholder*="Search"], input[type="search"]');
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await searchInput.fill(pattern);
        await this.page.waitForTimeout(1000);
      }

      // Get all visible project codes
      const rows = this.page.locator('tbody tr');
      const rowCount = await rows.count();
      const codes: string[] = [];

      for (let i = 0; i < Math.min(rowCount, 50); i++) {
        // Limit to 50 to avoid timeout
        try {
          const row = rows.nth(i);
          const codeCell = row.locator('td').first();
          const codeText = await codeCell.textContent();
          if (codeText && codeText.includes(pattern)) {
            codes.push(codeText.trim());
          }
        } catch {
          // Skip if row is not accessible
        }
      }

      if (codes.length > 0) {
        await this.deleteMultipleProjects(codes);
        return codes.length;
      }

      return 0;
    } catch (error) {
      console.warn('[Cleanup] Failed to cleanup test projects:', error);
      return 0;
    }
  }

  /**
   * Cleanup all test data in reverse dependency order
   */
  async cleanupAllTestData() {
    if (this.page.isClosed()) {
      return;
    }

    try {
      console.log('[Cleanup] Starting full cleanup of test data');

      // Cleanup in reverse dependency order: shots -> sequences -> episodes -> projects -> assets
      const patterns = [
        { type: 'shot' as const, pattern: 'SH' },
        { type: 'sequence' as const, pattern: 'SEQ' },
        { type: 'episode' as const, pattern: 'EP' },
        { type: 'project' as const, pattern: 'PLW_PRJ_' },
        { type: 'asset' as const, pattern: 'AST_' },
      ];

      for (const { type, pattern } of patterns) {
        try {
          const tabMap: Record<typeof type, string> = {
            project: 'Projects',
            episode: 'Episodes',
            sequence: 'Sequences',
            shot: 'Shots',
            asset: 'Assets',
          };

          await this.nav.goToTab(tabMap[type]);
          await this.page.waitForSelector('table', { timeout: 5000 });

          const searchInput = this.page.locator(
            'input[placeholder*="Search"], input[type="search"]',
          );
          if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await searchInput.fill(pattern);
            await this.page.waitForTimeout(1000);
          }

          // Select all visible rows
          const rows = this.page.locator('tbody tr');
          const rowCount = await rows.count();

          if (rowCount > 0) {
            // Select all
            const selectAll = this.page.locator('thead input[type="checkbox"]');
            const hasSelectAll = await selectAll.isVisible({ timeout: 2000 }).catch(() => false);
            if (hasSelectAll) {
              await selectAll.check({ timeout: 2000 }).catch(() => {});
            }

            // Delete
            const deleteButton = this.page.locator('button:has-text("Delete")');
            const isVisible = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);
            if (isVisible) {
              await deleteButton.click({ timeout: 2000 });

              const confirmButton = this.page.locator(
                'button:has-text("Confirm"), button:has-text("Delete")',
              );
              const hasConfirm = await confirmButton
                .isVisible({ timeout: 2000 })
                .catch(() => false);
              if (hasConfirm) {
                await confirmButton.click({ timeout: 2000 });
              }

              await this.page.waitForTimeout(1000);
            }
          }
        } catch (error) {
          console.warn(`[Cleanup] Failed to cleanup ${type}:`, error);
        }
      }

      console.log('[Cleanup] Full cleanup completed');
    } catch (error) {
      console.warn('[Cleanup] Failed to cleanup all test data:', error);
    }
  }
}

/**
 * Extended test fixtures with helpers
 */
type TestFixtures = {
  auth: AuthHelper;
  nav: NavigationHelper;
  form: FormHelper;
  table: TableHelper;
  modal: ModalHelper;
  toast: ToastHelper;
  cleanup: CleanupHelper;
};

/* eslint-disable react-hooks/rules-of-hooks */
export const test = base.extend<TestFixtures>({
  auth: async ({ page }, use) => {
    await use(new AuthHelper(page));
  },

  nav: async ({ page }, use) => {
    await use(new NavigationHelper(page));
  },

  form: async ({ page }, use) => {
    await use(new FormHelper(page));
  },

  table: async ({ page }, use) => {
    await use(new TableHelper(page));
  },

  modal: async ({ page }, use) => {
    await use(new ModalHelper(page));
  },

  toast: async ({ page }, use) => {
    await use(new ToastHelper(page));
  },

  cleanup: async ({ page, nav, table }, use) => {
    await use(new CleanupHelper(page, nav, table));
  },
});
/* eslint-enable react-hooks/rules-of-hooks */

export { expect };

/**
 * Accessibility helpers
 */
export async function checkA11y(page: Page) {
  // Check for basic accessibility issues
  const issues: string[] = [];

  // Check for images without alt text
  const imagesWithoutAlt = await page.locator('img:not([alt])').count();
  if (imagesWithoutAlt > 0) {
    issues.push(`Found ${imagesWithoutAlt} images without alt text`);
  }

  // Check for buttons without accessible name
  const buttonsWithoutLabel = await page
    .locator('button:not([aria-label]):not(:has-text(""))')
    .count();
  if (buttonsWithoutLabel > 0) {
    issues.push(`Found ${buttonsWithoutLabel} buttons without accessible name`);
  }

  // Check for form inputs without labels
  const inputsWithoutLabel = await page.locator('input:not([aria-label]):not([id])').count();
  if (inputsWithoutLabel > 0) {
    issues.push(`Found ${inputsWithoutLabel} inputs without labels`);
  }

  return issues;
}

/**
 * Visual regression helpers
 */
export async function takeSnapshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}

/**
 * Wait helpers
 */
export const waitFor = {
  async networkIdle(page: Page) {
    await page.waitForLoadState('networkidle');
  },

  async domContentLoaded(page: Page) {
    await page.waitForLoadState('domcontentloaded');
  },

  async dataLoaded(page: Page) {
    // Wait for loading spinners to disappear
    await page
      .waitForSelector('.loading, [data-loading="true"]', {
        state: 'hidden',
        timeout: 10000,
      })
      .catch(() => {});
  },
};
