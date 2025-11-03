import { useEffect } from "react";

type Notifs = {
  addNotificationResponseReceivedListener?: (cb: (response: unknown) => void) => { remove: () => void };
};

let Notifications: Notifs | null = null;
async function ensureNotifications(): Promise<Notifs> {
  if (Notifications) return Notifications;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
      const N = await ensureNotifications();
      const sub = N.addNotificationResponseReceivedListener?.((response) => {
        console.log("Notification response", response);
      });
      cleanup = () => sub?.remove();
    })();
    return () => cleanup?.();
  }, []);
}
