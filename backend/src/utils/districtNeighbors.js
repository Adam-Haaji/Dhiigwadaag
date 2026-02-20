// District priority map for location-based matching
// This map defines the priority order for searching donors: same district → nearest districts → remaining
// Based on realistic proximity logic inside Mogadishu

import { LOCATIONS as DISTRICTS } from './locations.js';

const DISTRICT_PRIORITY = {
  "Abdiaziiz": ["Shangani", "Shibis", "Xamar Weyne", "Hodan"],
  "Bondheere": ["Shangani", "Xamar Weyne", "Hodan", "Howlwadaag"],
  "Dayniile": ["Hilwaa", "Yaaqshid", "Kahda", "Wadajir"],
  "Dharkenley": ["Hodan", "Howlwadaag", "Wadajir", "Waaberi"],
  "Xamar Jajab": ["Xamar Weyne", "Shangani", "Waaberi", "Hodan"],
  "Xamar Weyne": ["Shangani", "Xamar Jajab", "Bondheere", "Abdiaziiz"],
  "Hodan": ["Howlwadaag", "Waaberi", "Wadajir", "Dharkenley"],
  "Howlwadaag": ["Hodan", "Waaberi", "Wadajir", "Bondheere"],
  "Kaaran": ["Yaaqshid", "Shibis", "Hilwaa", "Abdiaziiz"],
  "Shangani": ["Xamar Weyne", "Bondheere", "Shibis", "Abdiaziiz"],
  "Shibis": ["Kaaran", "Abdiaziiz", "Shangani", "Yaaqshid"],
  "Wadajir": ["Hodan", "Howlwadaag", "Dharkenley", "Kahda"],
  "Waaberi": ["Hodan", "Howlwadaag", "Xamar Jajab", "Dharkenley"],
  "Warta Nabadda": ["Hodan", "Howlwadaag", "Waaberi", "Dharkenley"],
  "Yaaqshid": ["Kaaran", "Hilwaa", "Dayniile", "Shibis"],
  "Hilwaa": ["Yaaqshid", "Dayniile", "Kaaran", "Kahda"],
  "Kahda": ["Wadajir", "Dayniile", "Hilwaa"]
};

export function getDistrictExpansionOrder(start, urgencyLevel = 'normal') {
  const startNorm = String(start || '').trim();
  const unique = new Set();
  const order = [];
  const push = (d) => { if (DISTRICTS.includes(d) && !unique.has(d)) { unique.add(d); order.push(d); } };
  
  // Step 1: Same district first
  if (startNorm) push(startNorm);
  
  // Step 2: Nearest districts (priority order from DISTRICT_PRIORITY map)
  const priorityList = DISTRICT_PRIORITY[startNorm] || [];
  priorityList.forEach(push);
  
  // Step 3: Emergency fallback - if critical and no donor found, expand to all remaining districts
  // For normal requests, we stop after priority list
  if (String(urgencyLevel).toLowerCase() === 'critical') {
    // Add all remaining districts in a stable order
    DISTRICTS.forEach(push);
  }
  
  return order;
}
