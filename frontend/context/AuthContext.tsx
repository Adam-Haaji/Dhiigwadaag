import React, { createContext, useState, useEffect } from "react";
import apiClient from "../service/api";
import { registerForPushNotificationsAsync } from "../service/notificationService";
import AsyncStorageLib from '@react-native-async-storage/async-storage';

// Simplified storage initialization (library is available in native & web via Expo). Fallback kept for resilience.
let Storage: { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void>; removeItem: (k: string) => Promise<void>; } = AsyncStorageLib ?? {
  async getItem() { return null; },
  async setItem() {},
  async removeItem() {},
};

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
    try {
      const { clearNavigatorRole } = require('../service/homeMode');
      await clearNavigatorRole();
    } catch {}
    await apiClient.clearToken();
  };

  return <AuthContext.Provider value={{ user, setUser, login, logout }}>{children}</AuthContext.Provider>;
};
