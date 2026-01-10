import React, { createContext, useContext, useMemo, useState, useEffect, useLayoutEffect } from 'react';
import { applyTheme } from '@/constants/colors';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeValue = {
  isDark: boolean;
  toggleDark: () => void;
  setDark: (val: boolean) => void;
};

const ThemeCtx = createContext<ThemeValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    (async () => {
      try {
        let saved: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          saved = window.localStorage?.getItem('theme:mode') ?? null;
        } else {
          saved = await AsyncStorage.getItem('theme:mode');
        }
        if (saved === 'dark') setIsDark(true);
        if (saved === 'light') setIsDark(false);
      } catch {
        // ignore
      }
    })();
  }, []);

  // Apply theme tokens before paint for instant UI response.
  useLayoutEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  // Persist theme choice in the background.
  useEffect(() => {
    (async () => {
      try {
        const val = isDark ? 'dark' : 'light';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.localStorage?.setItem('theme:mode', val);
        } else {
          await AsyncStorage.setItem('theme:mode', val);
        }
      } catch {
        // ignore
      }
    })();
  }, [isDark]);

  const value = useMemo(() => ({
    isDark,
    toggleDark: () => {
      setIsDark(d => {
        const next = !d;
        applyTheme(next);
        return next;
      });
    },
    setDark: (val: boolean) => {
      const next = !!val;
      applyTheme(next);
      setIsDark(next);
    },
  }), [isDark]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
