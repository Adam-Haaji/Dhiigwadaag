// Canonical district list used across the backend for validation
export const LOCATIONS = [
  'Abdiaziiz',
  'Bondheere',
  'Dayniile',
  'Dharkenley',
  'Xamar Jajab',
  'Xamar Weyne',
  'Hodan',
  'Howlwadaag',
  'Kaaran',
  'Shangani',
  'Shibis',
  'Wadajir',
  'Waaberi',
  'Warta Nabadda',
  'Yaaqshid',
  'Hilwaa',
  'Kahda',
];

export function isValidLocation(loc) {
  return LOCATIONS.includes(String(loc || '').trim());
}