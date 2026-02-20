/**
 * Donor search for chatbot availability: real MongoDB data only.
 * Schema fields (Donor): bloodGroup, district, availabilityStatus ('available'), isActive, nextAvailableDate, eligibilityStatus.
 * No donor names or phone numbers exposed. Case-insensitive district; normalized blood type; cooldown-safe.
 */

import Donor from '../models/Donor.js';
import { getDistrictExpansionOrder } from '../utils/districtNeighbors.js';
import { LOCATIONS } from '../utils/locations.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BLOOD_ALIASES = {
  'positive': '+', 'pos': '+', 'positif': '+',
  'negative': '-', 'neg': '-', 'négatif': '-',
};

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize blood type input to canonical DB format (e.g. "O+", "A-").
 * Accepts: "o+", "O +", "O positive", "O positive", "A+", "a+", etc.
 */
function normalizeBloodType(input) {
  if (input == null || typeof input !== 'string') return null;
  let s = String(input).trim().toUpperCase();
  if (!s) return null;
  s = s.replace(/\s+/g, ' ');
  const lower = s.toLowerCase();
  for (const [word, sym] of Object.entries(BLOOD_ALIASES)) {
    if (lower.includes(word)) {
      s = s.replace(new RegExp(word, 'gi'), sym);
      break;
    }
  }
  s = s.replace(/\s/g, '');
  const twoOrThree = (s.length === 2 || s.length === 3) && /^(AB|[ABO])[+-]$/.test(s);
  if (twoOrThree) {
    const ab = s.startsWith('AB') ? 'AB' : s[0];
    const rh = s.endsWith('+') ? '+' : '-';
    const canonical = ab + rh;
    return BLOOD_GROUPS.includes(canonical) ? canonical : null;
  }
  return BLOOD_GROUPS.includes(s) ? s : null;
}

/**
 * Normalize district: trim, case-insensitive match against LOCATIONS, return canonical name.
 */
function normalizeDistrict(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const match = LOCATIONS.find((d) => d.toLowerCase() === lower);
  return match || null;
}

/**
 * Build filter for "available" donors: schema uses availabilityStatus (string 'available'),
 * and cooldown is reflected in isActive / nextAvailableDate. Include donors where cooldown expired.
 */
function availableDonorFilter(bloodGroupCanonical, districtCanonical) {
  const now = new Date();
  return {
    bloodGroup: bloodGroupCanonical,
    district: { $regex: new RegExp('^' + escapeRegex(districtCanonical) + '$', 'i') },
    availabilityStatus: 'available',
    $or: [
      { isActive: true },
      { nextAvailableDate: { $exists: false } },
      { nextAvailableDate: null },
      { nextAvailableDate: { $lte: now } },
    ],
    eligibilityStatus: { $in: ['ELIGIBLE', 'eligible'] },
  };
}

/**
 * Check availability only — no donor list. For GET /api/chatbot/availability and chatbot replies.
 * Returns: { bloodType, requestedDistrict, matchedDistrict?, available, searchedDistricts }.
 */
export async function checkAvailability(bloodType, district, urgency = 'normal') {
  const bt = normalizeBloodType(bloodType);
  const requestedDistrict = normalizeDistrict(district);
  const expansion = getDistrictExpansionOrder(requestedDistrict || String(district || '').trim(), urgency);
  const searchedDistricts = [];

  if (!bt || !BLOOD_GROUPS.includes(bt)) {
    return {
      bloodType: (bt || String(bloodType || '').trim().toUpperCase()) || '',
      requestedDistrict: requestedDistrict || district || null,
      matchedDistrict: null,
      available: false,
      searchedDistricts: [],
    };
  }

  const canonicalDistrict = requestedDistrict || expansion[0] || null;
  if (!canonicalDistrict) {
    return {
      bloodType: bt,
      requestedDistrict: district || null,
      matchedDistrict: null,
      available: false,
      searchedDistricts: [],
    };
  }

  for (const d of expansion) {
    searchedDistricts.push(d);
    const filter = availableDonorFilter(bt, d);
    const count = await Donor.countDocuments(filter);
    if (process.env.NODE_ENV !== 'production' && process.env.LOG_CHATBOT_AVAILABILITY === '1') {
      console.log('[Chatbot availability]', { normalizedBloodType: bt, normalizedDistrict: d, filter, count });
    }
    if (count > 0) {
      return {
        bloodType: bt,
        requestedDistrict: requestedDistrict || district || null,
        matchedDistrict: d,
        available: true,
        searchedDistricts,
      };
    }
  }

  return {
    bloodType: bt,
    requestedDistrict: requestedDistrict || district || null,
    matchedDistrict: null,
    available: false,
    searchedDistricts,
  };
}

/**
 * Find available donors (with list). Used by tool and legacy endpoint; chatbot flow should use checkAvailability.
 * Same normalization and query as checkAvailability; returns count + donors (no phone/contact).
 */
export async function findAvailableDonors(bloodType, district, urgency = 'normal') {
  const result = await checkAvailability(bloodType, district, urgency);
  const out = {
    bloodType: result.bloodType,
    requestedDistrict: result.requestedDistrict,
    searchedDistricts: result.searchedDistricts,
    count: 0,
    donors: [],
  };

  if (!result.available || !result.matchedDistrict) {
    return { ...out, count: 0, donors: [] };
  }

  const filter = availableDonorFilter(result.bloodType, result.matchedDistrict);
  const list = await Donor.find(filter)
    .select('_id fullName district bloodGroup')
    .lean();

  out.count = list.length;
  out.donors = list.map((doc) => ({
    _id: String(doc._id),
    name: doc.fullName || '',
    district: doc.district || '',
    bloodGroup: doc.bloodGroup || result.bloodType,
  }));

  return out;
}
