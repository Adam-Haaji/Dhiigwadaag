import React, { createContext, useState, useEffect } from "react";
import api from "../service/api";
import { registerForPushNotificationsAsync } from "../service/notificationService";

// Use AsyncStorage if available, fallback to memory so web/dev works
let Storage: { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void>; removeItem: (k: string) => Promise<void>; };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Storage = require('@react-native-async-storage/async-storage').default;
} catch {
  const store = new Map<string, string>();
  Storage = {
    async getItem(key: string) { return store.get(key) ?? null; },
    async setItem(key: string, value: string) { store.set(key, value); },
    async removeItem(key: string) { store.delete(key); },
  };
}

export const AuthContext = createContext<any>(null);

export const AuthProvider: React.FC<any> = ({ children }) => {
  const [user, setUserState] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const json = await Storage.getItem("@user");
      if (json) setUserState(JSON.parse(json));
    })();
  }, []);

  const setUser = async (u: any) => {
    setUserState(u);
    await Storage.setItem("@user", JSON.stringify(u));
    // Try to register push token when a user logs in or updates
    try { if (u) await registerForPushNotificationsAsync(); } catch {}
  };

  const login = async (u: any) => setUser(u);
  const logout = async () => {
    setUserState(null);
    await Storage.removeItem("@user");
    await api.clearToken();
  };

  return <AuthContext.Provider value={{ user, setUser, login, logout }}>{children}</AuthContext.Provider>;
};
