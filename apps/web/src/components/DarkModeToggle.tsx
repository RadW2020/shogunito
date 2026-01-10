import { useTheme } from '../hooks/useTheme';

/**
 * Dark Mode Toggle Button
 *
 * Features:
 * - Smooth transitions
 * - Icon animation
 * - Accessible (keyboard navigable, ARIA labels)
 * - Works with keyboard (Space/Enter)
 */
export function DarkModeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="relative inline-flex items-center justify-center p-2 rounded-lg
                 transition-colors duration-200
                 hover:bg-gray-100 dark:hover:bg-gray-800
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {/* Sun Icon (Light Mode) */}
      <svg
        className={`w-5 h-5 transition-all duration-300 ${
          isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
        } absolute`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      {/* Moon Icon (Dark Mode) */}
      <svg
        className={`w-5 h-5 transition-all duration-300 ${
          isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
        } absolute`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>

      {/* Invisible spacer to maintain button size */}
      <span className="w-5 h-5 opacity-0" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3" />
        </svg>
      </span>
    </button>
  );
}

/**
 * Alternative: Switch-style toggle
 */
export function DarkModeSwitch() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        isDark ? 'bg-blue-600' : 'bg-gray-300'
      }`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      role="switch"
      aria-checked={isDark}
    >
      <span
        className={`inline-block w-4 h-4 transform transition-transform duration-200 bg-white rounded-full ${
          isDark ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
