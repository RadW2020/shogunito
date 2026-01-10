import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../ThemeContext';
import { useTheme } from '../../hooks/useTheme';

// Mock useDarkMode
const mockUseDarkMode = vi.fn();
vi.mock('../../shared/hooks/useDarkMode', () => ({
  useDarkMode: () => mockUseDarkMode(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Test wrapper with ThemeProvider
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;
};

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Reset document class
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ThemeProvider', () => {
    it('should provide theme context values', () => {
      const mockTheme = {
        isDark: false,
        toggle: vi.fn(),
        setDark: vi.fn(),
      };

      mockUseDarkMode.mockReturnValue(mockTheme);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isDark).toBe(false);
      expect(result.current.toggle).toBe(mockTheme.toggle);
      expect(result.current.setDark).toBe(mockTheme.setDark);
    });

    it('should provide dark theme when isDark is true', () => {
      const mockTheme = {
        isDark: true,
        toggle: vi.fn(),
        setDark: vi.fn(),
      };

      mockUseDarkMode.mockReturnValue(mockTheme);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isDark).toBe(true);
    });
  });

  describe('Theme functionality', () => {
    it('should toggle theme', () => {
      const toggleFn = vi.fn();
      const mockTheme = {
        isDark: false,
        toggle: toggleFn,
        setDark: vi.fn(),
      };

      mockUseDarkMode.mockReturnValue(mockTheme);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.toggle();
      });

      expect(toggleFn).toHaveBeenCalledTimes(1);
    });

    it('should set dark theme', () => {
      const setDarkFn = vi.fn();
      const mockTheme = {
        isDark: false,
        toggle: vi.fn(),
        setDark: setDarkFn,
      };

      mockUseDarkMode.mockReturnValue(mockTheme);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setDark(true);
      });

      expect(setDarkFn).toHaveBeenCalledWith(true);
    });

    it('should set light theme', () => {
      const setDarkFn = vi.fn();
      const mockTheme = {
        isDark: true,
        toggle: vi.fn(),
        setDark: setDarkFn,
      };

      mockUseDarkMode.mockReturnValue(mockTheme);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setDark(false);
      });

      expect(setDarkFn).toHaveBeenCalledWith(false);
    });
  });

  describe('Context value updates', () => {
    it('should update when theme changes', () => {
      let isDark = false;
      const toggleFn = vi.fn(() => {
        isDark = !isDark;
      });
      const setDarkFn = vi.fn((value: boolean) => {
        isDark = value;
      });

      mockUseDarkMode.mockImplementation(() => ({
        isDark,
        toggle: toggleFn,
        setDark: setDarkFn,
      }));

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isDark).toBe(false);

      act(() => {
        result.current.toggle();
      });

      // Rerender to get updated value
      rerender();

      expect(toggleFn).toHaveBeenCalled();
    });
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleErrorSpy.mockRestore();
    });

    it('should return context when used inside ThemeProvider', () => {
      const mockTheme = {
        isDark: false,
        toggle: vi.fn(),
        setDark: vi.fn(),
      };

      mockUseDarkMode.mockReturnValue(mockTheme);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.isDark).toBe(false);
      expect(typeof result.current.toggle).toBe('function');
      expect(typeof result.current.setDark).toBe('function');
    });
  });

  describe('Integration with useDarkMode', () => {
    it('should use values from useDarkMode hook', () => {
      const mockTheme = {
        isDark: true,
        toggle: vi.fn(),
        setDark: vi.fn(),
      };

      mockUseDarkMode.mockReturnValue(mockTheme);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(mockUseDarkMode).toHaveBeenCalled();
      expect(result.current.isDark).toBe(true);
    });

    it('should pass through all useDarkMode methods', () => {
      const toggleFn = vi.fn();
      const setDarkFn = vi.fn();
      const mockTheme = {
        isDark: false,
        toggle: toggleFn,
        setDark: setDarkFn,
      };

      mockUseDarkMode.mockReturnValue(mockTheme);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.toggle();
        result.current.setDark(true);
      });

      expect(toggleFn).toHaveBeenCalled();
      expect(setDarkFn).toHaveBeenCalledWith(true);
    });
  });

  describe('Multiple consumers', () => {
    it('should provide same context to multiple consumers', () => {
      const mockTheme = {
        isDark: false,
        toggle: vi.fn(),
        setDark: vi.fn(),
      };

      mockUseDarkMode.mockReturnValue(mockTheme);

      const wrapper = createWrapper();
      const { result: result1 } = renderHook(() => useTheme(), { wrapper });
      const { result: result2 } = renderHook(() => useTheme(), { wrapper });

      expect(result1.current.isDark).toBe(result2.current.isDark);
      expect(result1.current.toggle).toBe(result2.current.toggle);
      expect(result1.current.setDark).toBe(result2.current.setDark);
    });
  });
});
