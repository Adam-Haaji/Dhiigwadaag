// Simple API client with token storage and helpers
import { Platform } from 'react-native';
import Constants from 'expo-constants';

type Json = Record<string, any> | undefined;

// AsyncStorage fallback for web/test
let AsyncStorage: { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void>; removeItem: (k: string) => Promise<void>; };
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
// Choose sensible defaults:
// - Android emulator: always prefer 10.0.2.2 (maps to host machine)
// - iOS simulator: prefer detected LAN IP, else localhost
const DEFAULT_BASE = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000'
  : (HOST_IP ? `http://${HOST_IP}:5000` : 'http://localhost:5000');
// Read runtime config:
// 1) Prefer EXPO_PUBLIC_* from process.env when present
// 2) Fallback to expo config extras (app.json -> expo.extra)
const extras: any = (Constants as any)?.expoConfig?.extra || {};
const envBase = (typeof process !== 'undefined' && (process as any)?.env?.EXPO_PUBLIC_API_BASE_URL)
  ? (process as any).env.EXPO_PUBLIC_API_BASE_URL
  : extras.EXPO_PUBLIC_API_BASE_URL;
const envTimeout = (typeof process !== 'undefined' && (process as any)?.env?.EXPO_PUBLIC_API_TIMEOUT_MS)
  ? (process as any).env.EXPO_PUBLIC_API_TIMEOUT_MS
  : extras.EXPO_PUBLIC_API_TIMEOUT_MS;

const BASE_URL = envBase || DEFAULT_BASE;
const RAW_TIMEOUT = envTimeout;
// Increase default timeout to better handle slow mobile networks
const REQUEST_TIMEOUT_MS = RAW_TIMEOUT !== undefined ? Number(RAW_TIMEOUT) : 20000;
const USE_TIMEOUT = Number.isFinite(REQUEST_TIMEOUT_MS) && REQUEST_TIMEOUT_MS > 0;
const TOKEN_KEY = '@token';

async function getToken() { return AsyncStorage.getItem(TOKEN_KEY); }
async function setToken(t: string) { return AsyncStorage.setItem(TOKEN_KEY, t); }
async function clearToken() { return AsyncStorage.removeItem(TOKEN_KEY); }

let RESOLVED_BASE: string | null = null;
let resolvingBasePromise: Promise<string> | null = null;

async function pingBase(base: string, timeoutMs = 1500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/health`, { method: 'GET', signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr.filter(Boolean) as any)); }

async function resolveBaseUrl(): Promise<string> {
  if (RESOLVED_BASE) return RESOLVED_BASE;
  if (resolvingBasePromise) return resolvingBasePromise;
  const extras: any = (Constants as any)?.expoConfig?.extra || {};
  const extraBase = extras.EXPO_PUBLIC_API_BASE_URL as string | undefined;
  const candidatesRaw: (string | undefined)[] = [];
  // Prioritize explicit env/expo config first
  if (envBase) candidatesRaw.push(envBase);
  if (extraBase && extraBase !== envBase) candidatesRaw.push(extraBase);
  if (Platform.OS === 'android') {
    candidatesRaw.push('http://10.0.2.2:5000');
    candidatesRaw.push('http://localhost:5000'); // works with `adb reverse`
    if (HOST_IP) candidatesRaw.push(`http://${HOST_IP}:5000`);
  } else {
    if (HOST_IP) candidatesRaw.push(`http://${HOST_IP}:5000`);
    candidatesRaw.push('http://localhost:5000');
  }
  // Always fall back to computed default as last resort
  candidatesRaw.push(DEFAULT_BASE);
  const candidates = unique(candidatesRaw);

  resolvingBasePromise = (async () => {
    for (const base of candidates) {
      try {
        const ok = await pingBase(base!);
        if (ok) {
          RESOLVED_BASE = base!;
          if (__DEV__) console.log('[API] Using base', RESOLVED_BASE);
          return RESOLVED_BASE;
        }
      } catch {}
    }
    // None responded; use first candidate (env or default)
    RESOLVED_BASE = candidates[0]!;
    if (__DEV__) console.warn('[API] No base reachable, falling back to', RESOLVED_BASE);
    return RESOLVED_BASE;
  })();
  try {
    return await resolvingBasePromise;
  } finally {
    resolvingBasePromise = null;
  }
}

async function getBase(): Promise<string> {
  return RESOLVED_BASE || resolveBaseUrl();
}

async function request(method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE', path: string, body?: Json) {
  const base = await getBase();
  const token = await getToken();
  const url = `${base}${path}`.replace(/\/$/, '');
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
      if (__DEV__) {
        // Log detailed info for developers only; do not expose URLs to end users
        console.warn('[API] Timeout', { baseUrl: base, timeoutMs: REQUEST_TIMEOUT_MS });
      }
      throw new Error('Request timed out. Please try again.');
    }
    const msg = (e?.message || '').toLowerCase();
    if (msg.includes('network request failed') || msg.includes('failed to fetch')) {
      if (__DEV__) {
        const platformTip = Platform.OS === 'android'
          ? 'Android emulator: use 10.0.2.2:5000; real device: set EXPO_PUBLIC_API_BASE_URL to your PC LAN IP and allow Windows Firewall'
          : 'iOS simulator: localhost works only on same Mac; real iPhone: set EXPO_PUBLIC_API_BASE_URL to your Mac LAN IP';
        console.warn('[API] Network unreachable', { baseUrl: base, tip: platformTip });
      }
      throw new Error('Cannot reach server. Check API base and network.');
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const api = {
  setToken,
  clearToken,
  get: (path: string) => request('GET', path),
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
  changePassword: (data: { oldPassword: string; newPassword: string }) => request('POST', '/api/users/change-password', data),
  switchRole: async (newRole: 'donor'|'requester'|'both') => request('POST', '/api/users/switch-role', { newRole }),
  health: () => request('GET', '/api/health'),
  // donors
  // Legacy (User-profile-based) register; kept for backward compatibility in case older screens use it.
  registerDonor: (data: { name?: string; phone?: string; bloodType?: string; location?: string; availability?: boolean; }) => request('POST', '/api/donors', data),
  // New lightweight eligibility registration
  registerDonorEligibility: (data: { age: number; weightKg: number; gender: 'male'|'female'; hb: number; bloodType: string; location: string; lastDonationDate?: string; phone?: string; email?: string; }) => request('POST', '/api/donors/register', data),
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
    donations?: { donationDate: string; volumeMl: number; screeningClear: boolean }[];
  }) => request('POST', '/api/donors', data),
  // Blood Requests
  createBloodRequest: (data: {
    patientName: string;
    bloodGroup: 'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-';
    district: 'Abdiaziz'|'Bondhere'|'Daynile'|'Dharkenley'|'Hamar Jajab'|'Hamar Weyne'|'Hodan'|'Howlwadaag'|'Howlwadag'|'Kaaran'|'Karaan'|'Shangani'|'Shibis'|'Wadajir'|'Wadajir (Medina)'|'Waberi'|'Wartanabada'|'Wardhiigley (Warta Nabadda)'|'Yaqshid'|'Garasbaley'|'Kahda';
    units: number;
    contactPerson: string;
    contactPhone: string;
    urgencyLevel: 'critical'|'normal';
    reason: string;
    additionalNote?: string;
    donorId?: string;
  }) => request('POST', '/api/blood-requests', data),
  listMyBloodRequests: () => request('GET', '/api/blood-requests/mine'),
  // Priority-based create (runs matching immediately)
  createPriorityRequest: (data: {
    patientName: string;
    bloodGroup: 'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-';
    district: string;
    units?: number;
    contactPerson: string;
    contactPhone: string;
    urgencyLevel: 'critical'|'normal';
    reason: string;
    additionalNote?: string;
  }) => request('POST', '/api/request/create', data),
  getBloodRequest: (id: string) => request('GET', `/api/blood-requests/${id}`),
  updateBloodRequestStatus: (id: string, status: 'pending'|'matched'|'accepted'|'donated'|'completed'|'cancelled') => request('PUT', `/api/blood-requests/${id}/status`, { status }),
  donorConfirmDonation: (id: string, donorId?: string) => request('PUT', `/api/blood-requests/${id}/donor-confirm`, donorId ? { donorId } : undefined),
  isMatchedDonor: (id: string) => request('GET', `/api/blood-requests/${id}/iam-matched`),
  verifyDonation: (id: string) => request('PUT', `/api/blood-requests/${id}/verify`),
  uploadProof: (id: string, proofImage: string) => request('PUT', `/api/blood-requests/${id}/proof`, { proofImage }),
  // Available donors
  getAvailableDonors: async (q: { bloodGroup?: 'A+'|'A-'|'B+'|'B-'|'AB+'|'AB-'|'O+'|'O-'; district?: 'Abdiaziz'|'Bondhere'|'Daynile'|'Dharkenley'|'Hamar Jajab'|'Hamar Weyne'|'Hodan'|'Howlwadaag'|'Howlwadag'|'Kaaran'|'Karaan'|'Shangani'|'Shibis'|'Wadajir'|'Wadajir (Medina)'|'Waberi'|'Wartanabada'|'Wardhiigley (Warta Nabadda)'|'Yaqshid'|'Garasbaley'|'Kahda'; }): Promise<Donor[]> => {
    const params: string[] = [];
    if (q.bloodGroup) params.push(`bloodGroup=${encodeURIComponent(q.bloodGroup)}`);
    if (q.district) params.push(`district=${encodeURIComponent(q.district)}`);
    const raw = await request('GET', `/api/available-donors${params.length ? '?' + params.join('&') : ''}`);
    if (!Array.isArray(raw)) return [];
    return raw.map((d: any) => ({
      _id: String(d._id || ''),
      name: d.fullName || d.name || '',
      email: d.email || '',
      bloodType: d.bloodGroup || d.bloodType || '',
      location: d.district || d.location || '',
      phone: d.phone || '',
      availability: (d.availabilityStatus ? String(d.availabilityStatus).toLowerCase() === 'available' : !!d.availability),
      avatarUrl: d.avatarUrl,
    }));
  },
  searchDonors: (q: { q?: string; bloodType?: string; city?: string; availability?: boolean }) => {
    const params: string[] = [];
    if (q.q) params.push(`q=${encodeURIComponent(q.q)}`);
    if (q.bloodType) params.push(`bloodType=${encodeURIComponent(q.bloodType)}`);
    if (q.city) params.push(`city=${encodeURIComponent(q.city)}`);
    if (typeof q.availability === 'boolean') params.push(`availability=${encodeURIComponent(String(q.availability))}`);
    return request('GET', `/api/donors/search${params.length ? '?' + params.join('&') : ''}`);
  },
  donorsMeta: () => request('GET', '/api/donors/meta'),
  getDonorProfile: (id: string) => request('GET', `/api/donors/${encodeURIComponent(id)}`),
  // requests
  createRequest: (data: { patientName: string; bloodType: string; location: string; units: number; urgency: 'Normal'|'Critical'; hospitalName?: string; contactPhone?: string; notes?: string; }) => request('POST', '/api/requests', data),
  listRequests: () => request('GET', '/api/requests'),
  listMyMatches: () => request('GET', '/api/requests/matches/me'),
  getRequest: (id: string) => request('GET', `/api/requests/${id}`),
  acceptDonation: (id: string) => request('PATCH', `/api/requests/${id}/accept`),
  declineDonation: (id: string) => request('PATCH', `/api/requests/${id}/decline`),
  confirmDonationComplete: (id: string) => request('PATCH', `/api/requests/${id}/complete`),
  // Alias used by some screens
  completeDonation: (id: string) => request('PATCH', `/api/requests/${id}/complete`),
  respondToRequest: (id: string, data: { donorId: string; method: 'call'|'whatsapp'|'donate' }) => request('PUT', `/api/requests/${id}/respond`, data),
  markRequestFulfilled: (id: string) => request('PUT', `/api/requests/${id}/mark-fulfilled`),
  fulfillRequest: (id: string) => request('PUT', `/api/requests/${id}/fulfill`),
  cancelRequest: (id: string) => request('PUT', `/api/requests/${id}/cancel`),
  deleteRequest: (id: string) => request('DELETE', `/api/requests/${id}`),
  emergency: (data: { bloodType?: string; location?: string; message?: string }) => request('POST', '/api/requests/emergency', data),
  emergencyCreate: (data: { bloodType: string; location: string; hospitalName?: string; phone: string; units?: number; reason?: string }) => request('POST', '/api/requests/emergency/create', data),
  // notifications
  myNotifications: () => request('GET', '/api/notifications'),
  markAllRead: () => request('POST', '/api/notifications/mark-all-read'),
  markOneRead: (id: string) => request('POST', `/api/notifications/${id}/read`),
  registerPushToken: (token: string) => request('POST', '/api/notifications/register-token', { token }),
  // stats
  statsSummary: () => request('GET', '/api/stats/summary'),
  // matches views
  getRequesterMatchView: (id: string) => request('GET', `/api/matches/${id}/requester-view`),
  getDonorMatchView: (id: string) => request('GET', `/api/matches/${id}/donor-view`),
  acceptMatch: (id: string) => request('PATCH', `/api/matches/${id}/accept`),
  declineMatch: (id: string) => request('PATCH', `/api/matches/${id}/decline`),
  // Priority flow endpoints
  acceptRequest: (id: string) => request('PATCH', `/api/requests/${id}/accept`),
  markDonated: (id: string) => request('POST', `/api/donor/donated/${id}`),
  emergencyDonors: () => request('GET', `/api/requests/emergency-donors`),
  // Smart matching route
  matchRequest: (data: { requestId?: string; bloodType?: string; bloodGroup?: string; district?: string; location?: string; urgency?: 'Normal'|'Urgent'|'Critical'|string; urgentLevel?: string; lat?: number; lng?: number; }) => request('POST', '/api/match/request', data),
  // New strict compatibility endpoints
  matchByBlood: async (params: { type: string; district?: string; lat?: number; lng?: number; }) => {
    const qs = [
      `type=${encodeURIComponent(params.type)}`,
      params.district ? `district=${encodeURIComponent(params.district)}` : null,
      Number.isFinite(params.lat) ? `lat=${params.lat}` : null,
      Number.isFinite(params.lng) ? `lng=${params.lng}` : null,
    ].filter(Boolean).join('&');
    return request('GET', `/api/match/blood?${qs}`);
  },
  matchRecipients: async (params: { type: string; district?: string; lat?: number; lng?: number; }) => {
    const qs = [
      `type=${encodeURIComponent(params.type)}`,
      params.district ? `district=${encodeURIComponent(params.district)}` : null,
      Number.isFinite(params.lat) ? `lat=${params.lat}` : null,
      Number.isFinite(params.lng) ? `lng=${params.lng}` : null,
    ].filter(Boolean).join('&');
    return request('GET', `/api/match/recipients?${qs}`);
  },
  // donations (history)
  getMyDonations: () => request('GET', '/api/donations/mine'),
};

export type Donor = { _id: string; name: string; email: string; bloodType: string; location: string; phone: string; availability: boolean; avatarUrl?: string };

export default api;
export const getBaseUrl = () => (RESOLVED_BASE || BASE_URL);
