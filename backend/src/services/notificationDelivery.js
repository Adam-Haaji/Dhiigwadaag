// Optional outbound notification delivery helpers (Expo Push + SMS via Twilio).
// This module is safe to import even if Twilio isn't installed or env vars are missing.
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let twilioLib = null;
let ExpoSdk = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  twilioLib = require('twilio');
} catch (_) {
  // Twilio not installed; we'll operate in no-op mode.
}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoSdk = require('expo-server-sdk');
} catch (_) {
  // Expo push SDK not installed; push will be skipped.
}

function getTwilioClient() {
  if (!twilioLib) return null;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  try {
    return twilioLib(sid, token);
  } catch (e) {
    console.warn('Twilio client init failed:', e?.message);
    return null;
  }
}

function normalizePhone(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  // If already E.164-ish, return as-is
  if (trimmed.startsWith('+')) return trimmed;
  // Otherwise, try to keep digits only and optionally prepend default country code
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return null;
  const cc = process.env.TWILIO_DEFAULT_COUNTRY_CODE || '';
  return cc ? `${cc}${digits}` : digits;
}

function getExpoClient() {
  if (!ExpoSdk) return null;
  try {
    const { Expo } = ExpoSdk;
    const accessToken = process.env.EXPO_ACCESS_TOKEN || undefined;
    return new Expo({ accessToken });
  } catch (e) {
    console.warn('Expo client init failed:', e?.message);
    return null;
  }
}

export async function sendExpoPush(tokens, { title, body, data } = {}) {
  const client = getExpoClient();
  if (!client) {
    console.log('[notify] Push skipped (Expo SDK not configured)');
    return { ok: false, skipped: true };
  }
  const { Expo } = ExpoSdk;
  const valid = (Array.isArray(tokens) ? tokens : [tokens]).filter(t => typeof t === 'string' && Expo.isExpoPushToken(t));
  if (valid.length === 0) return { ok: false, skipped: true, reason: 'no_valid_tokens' };
  const messages = valid.map(to => ({ to, sound: 'default', title, body, data }));
  const chunks = client.chunkPushNotifications(messages);
  const receipts = [];
  for (const chunk of chunks) {
    try {
      const resp = await client.sendPushNotificationsAsync(chunk);
      receipts.push(...resp);
    } catch (e) {
      console.warn('[notify] Push chunk failed:', e?.message);
    }
  }
  return { ok: true, receipts };
}

export async function sendEmergencySms(toPhone, title, message) {
  const client = getTwilioClient();
  const from = process.env.TWILIO_FROM;
  if (!client || !from) {
    // No-op if Twilio not configured
    console.log('[notify] SMS skipped (Twilio not configured)', { toPhone });
    return { ok: false, skipped: true };
  }
  const to = normalizePhone(toPhone);
  if (!to) return { ok: false, error: 'invalid_phone' };
  const body = title ? `${title}: ${message}` : message;
  try {
    const resp = await client.messages.create({ to, from, body });
    return { ok: true, sid: resp?.sid };
  } catch (e) {
    console.warn('[notify] SMS send failed:', e?.message);
    return { ok: false, error: e?.message };
  }
}

export async function notifyDonorEmergency(donor, { title, message, meta } = {}) {
  try {
    const user = donor?.user || {};
    const tokens = Array.isArray(user?.expoPushTokens) ? user.expoPushTokens : (user?.expoPushToken ? [user.expoPushToken] : []);
    const pushRes = await sendExpoPush(tokens, {
      title: title || 'Emergency Blood Request',
      body: message || `Urgent need for ${donor?.bloodGroup || ''}${donor?.district ? ' in ' + donor.district : ''}`,
      data: { kind: 'emergency', donorId: String(donor?._id || ''), ...(meta || {}) },
    }).catch(() => ({ ok: false }));

    // Also try SMS as a secondary channel
    const phone = donor?.phone || user?.phone || user?.contactPhone;
    let smsRes = { ok: false, skipped: true };
    if (phone) {
      smsRes = await sendEmergencySms(phone, title || 'Emergency Blood Request', message || 'Please respond if you can help.');
    }
    return { ok: pushRes?.ok || smsRes?.ok, push: pushRes, sms: smsRes };
  } catch (e) {
    console.warn('[notify] notifyDonorEmergency error:', e?.message);
    return { ok: false, error: e?.message };
  }
}

export default { notifyDonorEmergency };
