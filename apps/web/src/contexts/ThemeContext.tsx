import { createContext, type ReactNode } from 'react';
import { useDarkMode } from '../shared/hooks/useDarkMode';

interface ThemeContextType {
  isDark: boolean;
  toggle: () => void;
  setDark: (value: boolean) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const darkMode = useDarkMode();

  return <ThemeContext.Provider value={darkMode}>{children}</ThemeContext.Provider>;
}
