import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { applyTheme } from '@/constants/colors';

type ThemeValue = {
  isDark: boolean;
  toggleDark: () => void;
};

const ThemeCtx = createContext<ThemeValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const value = useMemo(() => ({
    isDark,
    toggleDark: () => setIsDark(d => !d),
  }), [isDark]);
  // Sync global semantic color tokens whenever theme changes
  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
