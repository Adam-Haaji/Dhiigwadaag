// Simple API client with token storage and helpers
import { Platform } from 'react-native';
import Constants from 'expo-constants';

type Json = Record<string, any> | undefined;

// AsyncStorage fallback for web/test
let AsyncStorage: { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void>; removeItem: (k: string) => Promise<void>; };
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {
  const mem = new Map<string, string>();
  AsyncStorage = {
    async getItem(k: string) { return mem.get(k) ?? null; },
    async setItem(k: string, v: string) { mem.set(k, v); },
    async removeItem(k: string) { mem.delete(k); },
  };
}

function detectHostIp(): string | null {
  try {
    const C: any = Constants as any;
    const cfg: any = C?.expoConfig ?? {};
    const mani: any = C?.manifest ?? {};
    const m2: any = C?.manifest2 ?? {};
    // Collect many potential strings that may contain the dev server host or IP
    const candidates: (string | undefined)[] = [
      cfg.hostUri,
      cfg.debuggerHost,
      cfg?.extra?.expoGo?.hostUri,
      cfg?.extra?.expoGo?.debuggerHost,
      mani.hostUri,
      mani.debuggerHost,
      m2?.extra?.expoGo?.hostUri,
      m2?.extra?.expoGo?.debuggerHost,
    ];
    const ipRegex = /(\d{1,3}\.){3}\d{1,3}/;
    for (const val of candidates) {
      if (typeof val !== 'string' || val.length === 0) continue;
      const m = val.match(ipRegex);
      if (m) return m[0];
      // also handle raw "192.168.x.x:19000" or "exp://192.168.x.x:19000"
      const parts = val.split('/')[0];
      const host = parts.split(':')[0];
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
    }
  } catch {}
  return null;
}

const HOST_IP = detectHostIp();
// Prefer LAN IP if detected; otherwise use emulator/simulator defaults.
const DEFAULT_BASE = HOST_IP
  ? `http://${HOST_IP}:5000`
  : (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BASE;
const RAW_TIMEOUT = process.env.EXPO_PUBLIC_API_TIMEOUT_MS;
const REQUEST_TIMEOUT_MS = RAW_TIMEOUT !== undefined ? Number(RAW_TIMEOUT) : 10000;
const USE_TIMEOUT = Number.isFinite(REQUEST_TIMEOUT_MS) && REQUEST_TIMEOUT_MS > 0;
const TOKEN_KEY = '@token';

async function getToken() { return AsyncStorage.getItem(TOKEN_KEY); }
async function setToken(t: string) { return AsyncStorage.setItem(TOKEN_KEY, t); }
async function clearToken() { return AsyncStorage.removeItem(TOKEN_KEY); }

async function request(method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE', path: string, body?: Json) {
  const token = await getToken();
  const url = `${BASE_URL}${path}`.replace(/\/$/, '');
  const controller = USE_TIMEOUT ? new AbortController() : undefined;
  const timer = USE_TIMEOUT ? setTimeout(() => controller!.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(errText || `HTTP ${res.status}`);
    }
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms. Check API at ${BASE_URL}. You can disable the timeout by setting EXPO_PUBLIC_API_TIMEOUT_MS=0 when starting Expo.`);
    }
    const msg = (e?.message || '').toLowerCase();
    if (msg.includes('network request failed') || msg.includes('failed to fetch')) {
      const platformTip = Platform.OS === 'android'
        ? `On Android emulator use http://10.0.2.2:5000. On a real device, set EXPO_PUBLIC_API_BASE_URL to your PC LAN IP, e.g., http://192.168.x.x:5000`
        : `On iOS simulator, http://localhost:5000 works only if the backend runs on the same Mac. On a real iPhone, set EXPO_PUBLIC_API_BASE_URL to your PC LAN IP, e.g., http://192.168.x.x:5000`;
      throw new Error(`Network request failed. Backend not reachable at ${BASE_URL}. ${platformTip}`);
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const api = {
  setToken,
  clearToken,
  // auth
  signup: (data: { name: string; email: string; password: string; bloodType: string; role: 'Donor'|'Requester'; location: string; phone: string; }) => request('POST', '/api/auth/signup', data),
  login: async (data: { email: string; password: string; }) => {
    const result = await request('POST', '/api/auth/login', data);
    if (result?.token) await setToken(result.token);
    return result;
  },
  // users
  me: () => request('GET', '/api/users/me'),
  updateMe: (data: Json) => request('PUT', '/api/users/me', data),
  health: () => request('GET', '/api/health'),
  // donors
  // Legacy (User-profile-based) register; kept for backward compatibility in case older screens use it.
  registerDonor: (data: { name?: string; phone?: string; bloodType?: string; location?: string; availability?: boolean; }) => request('POST', '/api/donors', data),
  // New Donor profile creation (separate Donor schema)
  createDonor: (data: {
    fullName: string;
    dateOfBirth: string; // ISO string
    gender: 'male' | 'female';
    phone: string;
    email: string;
    district: 'Abdiaziz' | 'Bondhere' | 'Daynile' | 'Dharkenley' | 'Hamar Jajab' | 'Hamar Weyne' | 'Hodan' | 'Howlwadaag' | 'Howlwadag' | 'Kaaran' | 'Karaan' | 'Shangani' | 'Shibis' | 'Wadajir' | 'Wadajir (Medina)' | 'Waberi' | 'Wartanabada' | 'Wardhiigley (Warta Nabadda)' | 'Yaqshid' | 'Garasbaley' | 'Kahda';
    bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
    weightKg: number;
    consentGiven: boolean;
    emergencyContact: { name: string; relationship: string; phone: string };
    lastDonationDate: string; // ISO string
    availabilityStatus: 'available' | 'unavailable';
    donations?: Array<{ donationDate: string; volumeMl: number; screeningClear: boolean }>;
  }) => request('POST', '/api/donors', data),
  // Blood Requests
  createBloodRequest: (data: {
    patientName: string;
    bloodGroup: 'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-';
    district: 'Abdiaziz'|'Bondhere'|'Daynile'|'Dharkenley'|'Hamar Jajab'|'Hamar Weyne'|'Hodan'|'Howlwadaag'|'Howlwadag'|'Kaaran'|'Karaan'|'Shangani'|'Shibis'|'Wadajir'|'Wadajir (Medina)'|'Waberi'|'Wartanabada'|'Wardhiigley (Warta Nabadda)'|'Yaqshid'|'Garasbaley'|'Kahda';
    contactPerson: string;
    contactPhone: string;
    urgentLevel: 'low'|'medium'|'high'|'critical';
    reason: string;
    additionalNote?: string;
    donorId?: string;
  }) => request('POST', '/api/blood-requests', data),
  getBloodRequest: (id: string) => request('GET', `/api/blood-requests/${id}`),
  updateBloodRequestStatus: (id: string, status: 'pending'|'matched'|'accepted'|'donated'|'completed'|'cancelled') => request('PUT', `/api/blood-requests/${id}/status`, { status }),
  donorConfirmDonation: (id: string, donorId?: string) => request('PUT', `/api/blood-requests/${id}/donor-confirm`, donorId ? { donorId } : undefined),
  isMatchedDonor: (id: string) => request('GET', `/api/blood-requests/${id}/iam-matched`),
  verifyDonation: (id: string) => request('PUT', `/api/blood-requests/${id}/verify`),
  uploadProof: (id: string, proofImage: string) => request('PUT', `/api/blood-requests/${id}/proof`, { proofImage }),
  // Available donors
  getAvailableDonors: (q: { bloodGroup?: 'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-'; district?: 'Abdiaziz'|'Bondhere'|'Daynile'|'Dharkenley'|'Hamar Jajab'|'Hamar Weyne'|'Hodan'|'Howlwadaag'|'Howlwadag'|'Kaaran'|'Karaan'|'Shangani'|'Shibis'|'Wadajir'|'Wadajir (Medina)'|'Waberi'|'Wartanabada'|'Wardhiigley (Warta Nabadda)'|'Yaqshid'|'Garasbaley'|'Kahda'; }) => {
    const qs = new URLSearchParams();
    if (q.bloodGroup) qs.set('bloodGroup', q.bloodGroup);
    if (q.district) qs.set('district', q.district);
    return request('GET', `/api/available-donors?${qs.toString()}`);
  },
  searchDonors: (q: { q?: string; bloodType?: string; city?: string; availability?: boolean }) => {
    const qs = new URLSearchParams();
    if (q.q) qs.set('q', q.q);
    if (q.bloodType) qs.set('bloodType', q.bloodType);
    if (q.city) qs.set('city', q.city);
    if (typeof q.availability === 'boolean') qs.set('availability', String(q.availability));
    return request('GET', `/api/donors/search?${qs.toString()}`);
  },
  donorsMeta: () => request('GET', '/api/donors/meta'),
  getDonorProfile: (id: string) => request('GET', `/api/donors/${encodeURIComponent(id)}`),
  // requests
  createRequest: (data: { patientName: string; bloodType: string; location: string; urgency: 'Normal'|'Urgent'|'Critical'; }) => request('POST', '/api/requests', data),
  listRequests: () => request('GET', '/api/requests'),
  getRequest: (id: string) => request('GET', `/api/requests/${id}`),
  respondToRequest: (id: string, data: { donorId: string; method: 'call'|'whatsapp'|'donate' }) => request('PUT', `/api/requests/${id}/respond`, data),
  markRequestFulfilled: (id: string) => request('PUT', `/api/requests/${id}/mark-fulfilled`),
  fulfillRequest: (id: string) => request('PUT', `/api/requests/${id}/fulfill`),
  cancelRequest: (id: string) => request('PUT', `/api/requests/${id}/cancel`),
  deleteRequest: (id: string) => request('DELETE', `/api/requests/${id}`),
  emergency: (data: { bloodType?: string; location?: string; message?: string }) => request('POST', '/api/requests/emergency', data),
  // notifications
  myNotifications: () => request('GET', '/api/notifications'),
  markAllRead: () => request('POST', '/api/notifications/mark-all-read'),
  markOneRead: (id: string) => request('POST', `/api/notifications/${id}/read`),
  registerPushToken: (token: string) => request('POST', '/api/notifications/register-token', { token }),
  // Smart matching route
  matchRequest: (data: { requestId?: string; bloodType?: string; bloodGroup?: string; district?: string; location?: string; urgency?: 'Normal'|'Urgent'|'Critical'|string; urgentLevel?: string; lat?: number; lng?: number; }) => request('POST', '/api/match/request', data),
};

export type Donor = { _id: string; name: string; email: string; bloodType: string; location: string; phone: string; availability: boolean; avatarUrl?: string };

export default api;
export const getBaseUrl = () => BASE_URL;
