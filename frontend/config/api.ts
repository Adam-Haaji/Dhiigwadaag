// Centralized API base URL for the frontend. Prefer environment override but default to local backend.
// If running on a real device, set EXPO_PUBLIC_API_BASE_URL to your computer's LAN IP.

export const API_URL = (typeof process !== 'undefined' && (process as any)?.env?.EXPO_PUBLIC_API_BASE_URL)
  ? (process as any).env.EXPO_PUBLIC_API_BASE_URL
  : 'http://127.0.0.1:5000';

export default API_URL;
