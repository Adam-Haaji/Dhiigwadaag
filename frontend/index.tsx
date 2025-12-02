// Pre-entry setup to avoid noisy keep-awake errors in Expo Go
import { Platform, LogBox } from 'react-native';
import Constants from 'expo-constants';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const IS_EXPO_GO = (Constants as any)?.appOwnership === 'expo';

if (IS_DEV && IS_EXPO_GO && Platform.OS === 'android') {
	try {
		// Best-effort: silence the specific log and prevent activation attempts from throwing
		LogBox.ignoreLogs(["Unable to activate keep awake"]);
		// Monkey-patch keep-awake activator to a no-op to avoid unhandled promise rejections
		const ka: any = require('expo-keep-awake');
		if (ka && typeof ka.activateKeepAwakeAsync === 'function') {
			ka.activateKeepAwakeAsync = async () => undefined;
		}
		if (ka && typeof ka.deactivateKeepAwake === 'function') {
			try { ka.deactivateKeepAwake(); } catch {}
		}
	} catch {}
	try {
		// Filter the specific error via global handler without impacting other errors
		const ErrorUtilsAny: any = (global as any).ErrorUtils;
		const prev = ErrorUtilsAny?.getGlobalHandler?.();
		ErrorUtilsAny?.setGlobalHandler?.((err: any, isFatal: boolean) => {
			const msg = String(err?.message || err || '').toLowerCase();
			if (msg.includes('unable to activate keep awake')) return;
			return prev ? prev(err, isFatal) : undefined;
		});
	} catch {}
}

// Use Expo Router as the app entry
// @ts-ignore - expo-router/entry is a JS runtime entry and doesn't ship TS declarations
export { default } from 'expo-router/entry';
