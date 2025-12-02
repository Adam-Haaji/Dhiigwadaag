import { useEffect } from "react";
import { router } from "expo-router";
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Notifs = {
  addNotificationResponseReceivedListener?: (cb: (response: unknown) => void) => { remove: () => void };
};

let Notifications: Notifs | null = null;
async function ensureNotifications(): Promise<Notifs> {
  if (Notifications) return Notifications;
  try {
     
    const mod = require("expo-notifications") as any as Notifs;
    Notifications = mod || {};
  } catch {
    Notifications = {};
  }
  return Notifications!;
}

export function useNotificationSetup() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      // Skip push notification registration in Expo Go where remote push is unsupported (SDK 53+)
      const isExpoGo = Constants?.appOwnership === 'expo';
      if (isExpoGo && Platform.OS === 'android') {
        return; // avoid importing expo-notifications auto registration code
      }
      const N = await ensureNotifications();
      const sub = N.addNotificationResponseReceivedListener?.((response: any) => {
        try {
          const data = response?.notification?.request?.content?.data || {};
          const kind = String(data?.kind || data?.type || '').toLowerCase();
          const reqId = String(data?.requestId || data?.request_id || '').trim();
          if (reqId) {
            // Navigate to matched request detail screen
            router.push({ pathname: '/matchedRequestDetail', params: { id: reqId } });
            return;
          }
          // Fallback: open donor matches list if relevant
          if (kind === 'emergency' || kind === 'request' || kind === 'match') {
            router.push('/donorMatches');
          }
        } catch (_) {
          // ignore
        }
      });
      cleanup = () => sub?.remove();
    })();
    return () => cleanup?.();
  }, []);
}
