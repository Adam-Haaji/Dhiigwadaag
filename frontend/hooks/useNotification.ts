import { useEffect } from "react";
import { router } from "expo-router";
import Constants from "expo-constants";

type Notifs = {
  addNotificationResponseReceivedListener?: (cb: (response: unknown) => void) => { remove: () => void };
};

let Notifications: Notifs | null = null;
const IS_EXPO_GO = Constants?.appOwnership === 'expo';

async function ensureNotifications(): Promise<Notifs> {
  if (Notifications) return Notifications;
  if (IS_EXPO_GO) {
    // Expo Go does not support remote push; silently provide a no-op stub without logging.
    Notifications = {}; // no-op stub
    return Notifications;
  }
  try {
    const mod = require('expo-notifications') as any as Notifs;
    Notifications = mod || {};
  } catch (e: any) {
    console.warn('[notifications] expo-notifications not available:', e && e.message ? e.message : String(e));
    Notifications = {};
  }
  return Notifications!;
}

export function useNotificationSetup() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      const N = await ensureNotifications();
      if (!N.addNotificationResponseReceivedListener) return; // skipped in Expo Go
      const sub = N.addNotificationResponseReceivedListener((response: any) => {
        try {
          const data = response?.notification?.request?.content?.data || {};
          const kind = String(data?.kind || data?.type || '').toLowerCase();
          const reqId = String(data?.requestId || data?.request_id || '').trim();
          if (reqId) {
            router.push({ pathname: '/matchedRequestDetail', params: { id: reqId } });
            return;
          }
          if (kind === 'emergency' || kind === 'request' || kind === 'match') {
            router.push('/donorMatches');
          }
        } catch {
          // swallow
        }
      });
      cleanup = () => sub?.remove();
    })();
    return () => cleanup?.();
  }, []);
}
