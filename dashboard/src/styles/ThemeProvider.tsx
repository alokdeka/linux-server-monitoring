import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import type { Theme, ThemeType } from './theme';
import { lightTheme, darkTheme } from './theme';
import { GlobalStyles } from './GlobalStyles';

interface ThemeContextType {
  theme: Theme;
  themeType: ThemeType;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeType;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'dark',
}) => {
  const [themeType, setThemeType] = useState<ThemeType>(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return defaultTheme;
    }

    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('dashboard-theme') as ThemeType;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }

    // Check system preference
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    ) {
      return 'light';
    }

    return defaultTheme;
  });

  const theme = themeType === 'light' ? lightTheme : darkTheme;

  const toggleTheme = () => {
    setThemeType((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeType(newTheme);
  };

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-theme', themeType);
  }, [themeType]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const handleChange = (e: MediaQueryListEvent) => {
        // Only auto-switch if user hasn't manually set a preference
        const savedTheme = localStorage.getItem('dashboard-theme');
        if (!savedTheme) {
          setThemeType(e.matches ? 'light' : 'dark');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Update CSS custom properties for compatibility with existing styles
  useEffect(() => {
    const root = document.documentElement;

    // Update CSS custom properties
    root.style.setProperty('--color-primary', theme.colors.primary[500]);
    root.style.setProperty('--color-secondary', theme.colors.secondary[500]);
    root.style.setProperty('--color-success', theme.colors.success[500]);
    root.style.setProperty('--color-warning', theme.colors.warning[500]);
    root.style.setProperty('--color-error', theme.colors.error[500]);

    root.style.setProperty('--bg-primary', theme.colors.background.primary);
    root.style.setProperty('--bg-secondary', theme.colors.background.secondary);
    root.style.setProperty('--bg-tertiary', theme.colors.background.tertiary);

    root.style.setProperty('--text-primary', theme.colors.text.primary);
    root.style.setProperty('--text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--text-muted', theme.colors.text.muted);

    root.style.setProperty('--border-primary', theme.colors.border.primary);
    root.style.setProperty('--border-secondary', theme.colors.border.secondary);
    root.style.setProperty('--border-focus', theme.colors.border.focus);

    root.style.setProperty('--status-online', theme.colors.status.online);
    root.style.setProperty('--status-offline', theme.colors.status.offline);
    root.style.setProperty('--status-warning', theme.colors.status.warning);
    root.style.setProperty('--status-critical', theme.colors.status.critical);

    // Update body background
    document.body.style.backgroundColor = theme.colors.background.primary;
    document.body.style.color = theme.colors.text.primary;
  }, [theme]);

  const contextValue: ThemeContextType = {
    theme,
    themeType,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <StyledThemeProvider theme={theme}>
        <GlobalStyles />
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Hook for accessing styled-components theme
export const useStyledTheme = (): Theme => {
  const { theme } = useTheme();
  return theme;
};
