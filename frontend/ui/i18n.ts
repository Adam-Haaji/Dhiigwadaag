// Simple app-level i18n (EN/SO) for UI feedback text.
// UI-only: does not alter any business rules.

import { NativeModules, Platform } from 'react-native';

type StorageLike = {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
};

let AsyncStorage: StorageLike;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  const mem = new Map<string, string>();
  AsyncStorage = {
    getItem: async (k) => mem.get(k) ?? null,
    setItem: async (k, v) => {
      mem.set(k, v);
    },
  };
}

export type Lang = 'en' | 'so';
export type LocalizedString = { en: string; so: string };

const LANG_KEY = 'app:lang';
let currentLang: Lang = 'en';

export function getLanguage(): Lang {
  return currentLang;
}

export async function initLanguage(): Promise<Lang> {
  try {
    const saved = (await AsyncStorage.getItem(LANG_KEY)) as Lang | null;
    if (saved === 'en' || saved === 'so') currentLang = saved;
    else {
      // If nothing saved yet, infer from device locale.
      // We keep this best-effort and safe across web/offline environments.
      let locale: string | undefined;
      if (Platform.OS === 'ios') {
        const settings = NativeModules?.SettingsManager?.settings;
        locale = settings?.AppleLocale || settings?.AppleLanguages?.[0];
      } else if (Platform.OS === 'android') {
        locale = NativeModules?.I18nManager?.localeIdentifier;
      }
      const normalized = String(locale || '').toLowerCase();
      if (normalized.startsWith('so')) currentLang = 'so';
    }
  } catch {}
  return currentLang;
}

export async function setLanguage(lang: Lang): Promise<void> {
  currentLang = lang;
  try {
    await AsyncStorage.setItem(LANG_KEY, lang);
  } catch {}
}

export function pickText(text: string | LocalizedString, lang: Lang = currentLang): string {
  if (typeof text === 'string') return text;
  return lang === 'so' ? text.so : text.en;
}
