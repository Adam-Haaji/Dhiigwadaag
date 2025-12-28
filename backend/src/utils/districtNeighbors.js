// Simple district adjacency + expansion order helper
// Note: This map is a best-effort approximation for Mogadishu districts present in the schema.
// It ensures deterministic expansion: same district → nearest neighbors → remaining.

import { LOCATIONS as DISTRICTS } from './locations.js';

const neighbors = {
  // Priority 1 – Same District is implicit; below are Priority 2 nearby districts
  'Hodan': ['Howlwadaag', 'Wadajir', 'Waaberi'],
  'Wadajir': ['Hodan', 'Dharkenley'],
  'Dayniile': ['Hilwaa', 'Kahda'],
  'Xamar Jajab': ['Shangani', 'Warta Nabadda'],
  'Kahda': ['Dayniile', 'Hilwaa'],
  // Add reasonable links for remaining districts to avoid dead-ends
  'Abdiaziiz': ['Xamar Jajab', 'Xamar Weyne'],
  'Bondheere': ['Xamar Weyne', 'Waaberi'],
  'Xamar Weyne': ['Abdiaziiz', 'Shangani'],
  'Shangani': ['Xamar Weyne', 'Xamar Jajab'],
  'Shibis': ['Yaaqshid', 'Kaaran'],
  'Yaaqshid': ['Shibis', 'Warta Nabadda'],
  'Warta Nabadda': ['Howlwadaag', 'Yaaqshid'],
  'Howlwadaag': ['Hodan', 'Warta Nabadda'],
  'Kaaran': ['Shibis', 'Yaaqshid'],
  'Waaberi': ['Hodan', 'Bondheere'],
  'Dharkenley': ['Wadajir', 'Dayniile'],
  'Hilwaa': ['Dayniile', 'Kahda'],
};

export function getDistrictExpansionOrder(start) {
  const startNorm = String(start || '').trim();
  const unique = new Set();
  const order = [];
  const push = (d) => { if (DISTRICTS.includes(d) && !unique.has(d)) { unique.add(d); order.push(d); } };
  if (startNorm) push(startNorm);
  // First wave: direct neighbors
  (neighbors[startNorm] || []).forEach(push);
  // Second wave: neighbors-of-neighbors
  (neighbors[startNorm] || []).forEach(n => (neighbors[n] || []).forEach(push));
  // Finally: remaining districts
  DISTRICTS.forEach(push);
  return order;
}
