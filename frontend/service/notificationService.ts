// Avoid importing expo-notifications at module top-level in Expo Go (Android),
// because it triggers auto push token registration which is unsupported and throws.
// We'll dynamically import it only when safe.
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import api from './api';

const isExpoGo = Constants.appOwnership === 'expo';
const isExpoGoAndroid = isExpoGo && Platform.OS === 'android';
let expoGoWarned = false; // ensure we only warn once per session

async function loadNotifications() {
  // Dynamically import when needed to avoid Expo Go auto-registration errors
  const mod = await import('expo-notifications');
  return mod;
}

export async function setupNotificationHandler() {
  if (isExpoGoAndroid) return; // Skip in Expo Go Android to avoid errors
  const Notifications = await loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function detectProjectId(): string | undefined {
  try {
    const C: any = Constants as any;
    // Prefer expoConfig (available in Expo SDK 49+ / dev)
    const cfg: any = C?.expoConfig ?? {};
    const extra = cfg?.extra ?? {};
    const eas = extra?.eas ?? {};
    if (eas?.projectId) return String(eas.projectId);

    // Fallbacks for older manifests (classic)
    const m2: any = C?.manifest2 ?? {};
    const m2Extra = m2?.extra ?? {};
    const m2Eas = m2Extra?.eas ?? {};
    if (m2Eas?.projectId) return String(m2Eas.projectId);

    const mani: any = C?.manifest ?? {};
    const maniExtra = mani?.extra ?? {};
    const maniEas = maniExtra?.eas ?? {};
    if (maniEas?.projectId) return String(maniEas.projectId);

    return undefined;
  } catch {
    return undefined;
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (isExpoGoAndroid) {
      if (!expoGoWarned) {
        console.warn('Expo Go (Android) does not support remote push with expo-notifications. Use a development build.');
        expoGoWarned = true;
      }
      return null;
    }
    const Notifications = await loadNotifications();
    await setupNotificationHandler();
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device.');
      return null;
    }
    // Android: create a default channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default', importance: Notifications.AndroidImportance.MAX,
      });
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Push permission not granted');
      return null;
    }

    // Get Expo push token
    const projectId = detectProjectId();
    if (!projectId) {
      console.warn('Missing EAS projectId. Set extra.eas.projectId in app.json to retrieve Expo push token.');
      return null;
    }
    let token: string | null = null;
    try {
      const resp = await Notifications.getExpoPushTokenAsync({ projectId });
      token = resp?.data ?? null;
    } catch (e: any) {
      console.log('getExpoPushTokenAsync failed:', e?.message);
      token = null;
    }
    if (!token) return null;

    // Send to backend
    try {
      await api.registerPushToken(token);
    } catch (e) {
      console.log('registerPushToken failed');
    }

    return token;
  } catch (e) {
    console.log('registerForPushNotificationsAsync error');
    return null;
  }
}

export async function sendLocalNotification(title: string, body: string) {
  if (isExpoGoAndroid) {
    // Fallback in Expo Go Android: show an alert instead of local notification
    Alert.alert(title, body);
    return;
  }
  const Notifications = await loadNotifications();
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}

export async function sendEmergencyBroadcast(payload: { message: string }) {
  await sendLocalNotification('Emergency Broadcast', payload.message);
}
