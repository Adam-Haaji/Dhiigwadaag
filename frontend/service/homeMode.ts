type HomeMode = 'donor' | 'requester';

const KEY = 'home:mode';
/** Persisted tab set: donor-only, requester-only, or both. Used so returning users keep correct tabs (e.g. no Requests tab for donor path). */
const NAVIGATOR_ROLE_KEY = 'app:navigatorRole';
export type NavigatorRole = 'donor' | 'requester' | 'both';

// AsyncStorage fallback for web/test environments
let AsyncStorage: {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
  removeItem: (k: string) => Promise<void>;
};

try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  const mem = new Map<string, string>();
  AsyncStorage = {
    async getItem(k: string) { return mem.get(k) ?? null; },
    async setItem(k: string, v: string) { mem.set(k, v); },
    async removeItem(k: string) { mem.delete(k); },
  };
}

export async function getHomeModePreference(): Promise<HomeMode | null> {
  try {
    const val = await AsyncStorage.getItem(KEY);
    if (val === 'donor' || val === 'requester') return val;
  } catch {}
  return null;
}

export async function setHomeModePreference(mode: HomeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, mode);
  } catch {}
}

export async function clearHomeModePreference(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}

export async function getNavigatorRole(): Promise<NavigatorRole | null> {
  try {
    const val = await AsyncStorage.getItem(NAVIGATOR_ROLE_KEY);
    if (val === 'donor' || val === 'requester' || val === 'both') return val;
  } catch {}
  return null;
}

export async function setNavigatorRole(role: NavigatorRole): Promise<void> {
  try {
    await AsyncStorage.setItem(NAVIGATOR_ROLE_KEY, role);
  } catch {}
}

export async function clearNavigatorRole(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NAVIGATOR_ROLE_KEY);
  } catch {}
}
