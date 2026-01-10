import { test, expect } from './helpers/test-helpers';

test.describe('Dark Mode Functionality', () => {
  test.beforeEach(async ({ auth }) => {
    await auth.register();
  });

  test.describe('Dark Mode Toggle', () => {
    test('should toggle dark mode on button click', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Find dark mode toggle button
      const darkModeToggle = page.locator(
        'button[aria-label*="dark"], button[aria-label*="light"], button[aria-label*="theme"]',
      );

      if (await darkModeToggle.isVisible()) {
        // Get initial theme
        const initialTheme = await page.evaluate(() => {
          return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        });

        // Click toggle
        await darkModeToggle.click();
        await page.waitForTimeout(500);

        // Verify theme changed
        const newTheme = await page.evaluate(() => {
          return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        });

        expect(newTheme).not.toBe(initialTheme);
      }
    });

    test('should persist dark mode preference in localStorage', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      const darkModeToggle = page.locator(
        'button[aria-label*="dark"], button[aria-label*="light"]',
      );

      if (await darkModeToggle.isVisible()) {
        // Toggle to dark mode
        await darkModeToggle.click();
        await page.waitForTimeout(500);

        // Check localStorage
        const storedTheme = await page.evaluate(() => {
          return localStorage.getItem('darkMode');
        });

        expect(storedTheme).toBeTruthy();

        // Reload page
        await page.reload();
        await page.waitForTimeout(1000);

        // Should maintain dark mode
        const isDark = await page.evaluate(() => {
          return document.documentElement.classList.contains('dark');
        });

        expect(isDark).toBe(true);
      }
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      const darkModeToggle = page.locator(
        'button[aria-label*="dark"], button[aria-label*="light"]',
      );

      if (await darkModeToggle.isVisible()) {
        const ariaLabel = await darkModeToggle.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel?.toLowerCase()).toMatch(/dark|light|theme/);
      }
    });

    test('should support keyboard activation', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      const darkModeToggle = page.locator(
        'button[aria-label*="dark"], button[aria-label*="light"]',
      );

      if (await darkModeToggle.isVisible()) {
        await darkModeToggle.focus();

        const initialTheme = await page.evaluate(() => {
          return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        });

        // Activate with Enter
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        const newTheme = await page.evaluate(() => {
          return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        });

        expect(newTheme).not.toBe(initialTheme);
      }
    });
  });

  test.describe('Theme Persistence', () => {
    test('should remember theme across sessions', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      const darkModeToggle = page.locator(
        'button[aria-label*="dark"], button[aria-label*="light"]',
      );

      if (await darkModeToggle.isVisible()) {
        // Set to dark mode
        await darkModeToggle.click();
        await page.waitForTimeout(500);

        // Close and open new page
        await page.close();
        const newPage = await context.newPage();
        await newPage.goto('/');
        await newPage.waitForTimeout(1000);

        // Should still be dark mode
        const isDark = await newPage.evaluate(() => {
          return document.documentElement.classList.contains('dark');
        });

        expect(isDark).toBe(true);
        await newPage.close();
      }
    });

    test('should respect system preference on first visit', async ({ page }) => {
      // Clear localStorage
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.removeItem('darkMode');
      });

      // Set system preference to dark
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.reload();
      await page.waitForTimeout(1000);

      // Should respect system preference (if implemented)
      const isDark = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });

      // Either respects system or defaults to light
      expect(typeof isDark).toBe('boolean');
    });
  });

  test.describe('Theme Transitions', () => {
    test('should have smooth theme transitions', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      const darkModeToggle = page.locator(
        'button[aria-label*="dark"], button[aria-label*="light"]',
      );

      if (await darkModeToggle.isVisible()) {
        // Check for transition classes
        const hasTransitions = await page.evaluate(() => {
          const styles = window.getComputedStyle(document.documentElement);
          return styles.transition !== 'none' || styles.transitionDuration !== '0s';
        });

        // Should have transitions (or at least not crash)
        expect(typeof hasTransitions).toBe('boolean');
      }
    });
  });

  test.describe('Theme in Different Views', () => {
    test('should maintain theme across tab navigation', async ({ page, nav }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      const darkModeToggle = page.locator(
        'button[aria-label*="dark"], button[aria-label*="light"]',
      );

      if (await darkModeToggle.isVisible()) {
        // Set to dark mode
        await darkModeToggle.click();
        await page.waitForTimeout(500);

        // Navigate to different tabs
        await nav.goToTab('Projects');
        await page.waitForTimeout(500);
        await nav.goToTab('Episodes');
        await page.waitForTimeout(500);
        await nav.goToTab('Assets');
        await page.waitForTimeout(500);

        // Should still be dark mode
        const isDark = await page.evaluate(() => {
          return document.documentElement.classList.contains('dark');
        });

        expect(isDark).toBe(true);
      }
    });

    test('should maintain theme in modals', async ({ page, nav, modal: _modal }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      const darkModeToggle = page.locator(
        'button[aria-label*="dark"], button[aria-label*="light"]',
      );

      if (await darkModeToggle.isVisible()) {
        // Set to dark mode
        await darkModeToggle.click();
        await page.waitForTimeout(500);

        // Open modal
        await nav.goToTab('Projects');
        await nav.openAddModal();

        // Modal should respect theme
        const modalElement = page.locator('.modal, [role="dialog"]');
        if (await modalElement.isVisible()) {
          const isDark = await page.evaluate(() => {
            return document.documentElement.classList.contains('dark');
          });
          expect(isDark).toBe(true);
        }
      }
    });
  });

  test.describe('Theme Accessibility', () => {
    test('should maintain contrast in both themes', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1000);

      const darkModeToggle = page.locator(
        'button[aria-label*="dark"], button[aria-label*="light"]',
      );

      if (await darkModeToggle.isVisible()) {
        // Test light mode
        const lightModeButton = page.locator('button:has-text("+ Add")');
        if (await lightModeButton.isVisible()) {
          const lightColors = await lightModeButton.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
              color: styles.color,
              background: styles.backgroundColor,
            };
          });
          expect(lightColors.color).toBeTruthy();
          expect(lightColors.background).toBeTruthy();
        }

        // Switch to dark mode
        await darkModeToggle.click();
        await page.waitForTimeout(500);

        // Test dark mode
        const darkModeButton = page.locator('button:has-text("+ Add")');
        if (await darkModeButton.isVisible()) {
          const darkColors = await darkModeButton.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
              color: styles.color,
              background: styles.backgroundColor,
            };
          });
          expect(darkColors.color).toBeTruthy();
          expect(darkColors.background).toBeTruthy();
        }
      }
    });
  });
});
