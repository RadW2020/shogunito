import { useState, useEffect } from 'react';

/**
 * Custom Hook for Dark Mode
 *
 * Manages dark mode state with localStorage persistence and system preference detection.
 *
 * Features:
 * - Persists preference to localStorage
 * - Respects system dark mode preference
 * - Applies 'dark' class to document element for Tailwind
 * - Smooth transitions between modes
 *
 * @returns {Object} { isDark, toggle, setDark }
 */
export function useDarkMode() {
  // Check localStorage and system preference
  const [isDark, setIsDark] = useState(() => {
    // First check localStorage
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) {
      return stored === 'true';
    }

    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = window.document.documentElement;

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('darkMode', String(isDark));
  }, [isDark]);

  const toggle = () => setIsDark((prev) => !prev);
  const setDark = (value: boolean) => setIsDark(value);

  return { isDark, toggle, setDark };
}
