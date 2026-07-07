import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { colors, ColorScheme, ThemeColors } from '@/theme/colors';

type ThemeContextType = {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [override, setOverride] = useState<ColorScheme | null>(null);
  const colorScheme: ColorScheme = override ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const value = useMemo(
    () => ({
      colorScheme,
      colors: colors[colorScheme],
      isDark: colorScheme === 'dark',
      toggleTheme: () => setOverride(colorScheme === 'dark' ? 'light' : 'dark'),
      setColorScheme: setOverride,
    }),
    [colorScheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
