/**
 * Donor matching engine: location proximity first, then blood compatibility.
 * Two priorities: (1) nearest district, (2) blood compatibility.
 * Does not expose donor personal info in match result or user message.
 */

import Donor from '../models/Donor.js';
import { getDistrictExpansionOrder } from '../utils/districtNeighbors.js';
import { getPriorityTiers } from '../utils/bloodPriority.js';
import { LOCATIONS } from '../utils/locations.js';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeBloodType(input) {
  if (input == null || typeof input !== 'string') return null;
  let s = String(input).trim().toUpperCase().replace(/\s+/g, '');
  if (/^(AB|[ABO])[+-]$/.test(s)) {
    const canonical = s.length === 3 ? s : s[0] + (s.endsWith('+') ? '+' : '-');
    return BLOOD_GROUPS.includes(canonical) ? canonical : null;
  }
  return BLOOD_GROUPS.includes(s) ? s : null;
}

function normalizeDistrict(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const match = LOCATIONS.find((d) => d.toLowerCase() === lower);
  return match || null;
}

/**
 * Strict availability filter per Donor schema.
 * Donor is available only if: availabilityStatus='available', isActive=true, nextAvailableDate<=today (or not set).
 */
function availableDonorFilter(bloodGroupCanonical, districtCanonical) {
  const now = new Date();
  return {
    bloodGroup: bloodGroupCanonical,
    district: { $regex: new RegExp('^' + escapeRegex(districtCanonical) + '$', 'i') },
    availabilityStatus: 'available',
    isActive: true,
    $or: [
      { nextAvailableDate: { $exists: false } },
      { nextAvailableDate: null },
      { nextAvailableDate: { $lte: now } },
    ],
  };
}

/**
 * Match donors by requested blood and district.
 * Step 1: Exact blood + same district
 * Step 2: Exact blood + nearest districts (from neighbor map)
 * Step 3: Blood compatibility fallback (exact then compatible types), with location priority within each
 *
 * @param {string} requestedBlood - e.g. "A+", "O-"
 * @param {string} requestedDistrict - e.g. "Hodan"
 * @param {object} opts - optional: urgencyLevel ('normal'|'critical')
 * @returns {Promise<{ match: boolean, bloodGroupUsed: string|null, districtUsed: string|null, reason: string, userMessage: string, donorCount?: number }>}
 */
export async function matchDonors(requestedBlood, requestedDistrict, opts = {}) {
  const urgency = String(opts.urgencyLevel || 'normal').toLowerCase();
  const bt = normalizeBloodType(requestedBlood);
  const reqDistrict = normalizeDistrict(requestedDistrict);

  const notAvailableResult = {
    match: false,
    bloodGroupUsed: null,
    districtUsed: null,
    reason: 'not_available',
    userMessage: 'No compatible blood available.',
  };

  if (!bt || !BLOOD_GROUPS.includes(bt)) {
    return {
      ...notAvailableResult,
      userMessage: `Invalid blood type: ${requestedBlood || 'unknown'}.`,
    };
  }

  let expansionOrder = reqDistrict
    ? getDistrictExpansionOrder(reqDistrict, urgency)
    : [];
  if (!expansionOrder.length && reqDistrict) {
    expansionOrder = [reqDistrict];
  }
  const canonicalDistrict = reqDistrict || (expansionOrder[0] || null);

  if (!canonicalDistrict) {
    return {
      ...notAvailableResult,
      userMessage: 'District is required for matching.',
    };
  }

  // --- Step 1: Exact blood + same district ---
  const filterSame = availableDonorFilter(bt, canonicalDistrict);
  let count = await Donor.countDocuments(filterSame);
  if (count > 0) {
    return {
      match: true,
      bloodGroupUsed: bt,
      districtUsed: canonicalDistrict,
      reason: 'exact_same_district',
      userMessage: null,
      donorCount: count,
    };
  }

  // --- Step 2: Exact blood + nearest districts ---
  for (const district of expansionOrder) {
    if (district === canonicalDistrict) continue;
    const filterNearest = availableDonorFilter(bt, district);
    count = await Donor.countDocuments(filterNearest);
    if (count > 0) {
      return {
        match: true,
        bloodGroupUsed: bt,
        districtUsed: district,
        reason: 'exact_nearest_district',
        userMessage: `Not available in ${canonicalDistrict}, found in ${district}.`,
        donorCount: count,
      };
    }
  }

  // --- Step 3: Blood compatibility fallback (skip tier 0 = exact, already tried) ---
  const tiers = getPriorityTiers(bt);
  if (!tiers || tiers.length === 0) {
    return notAvailableResult;
  }

  const compatibleTiers = tiers.slice(1);
  for (const tier of compatibleTiers) {
    const bloodTypes = Array.isArray(tier) ? tier : [tier];
    for (const blood of bloodTypes) {
      if (!BLOOD_GROUPS.includes(blood)) continue;
      for (const district of expansionOrder) {
        const filterCompat = availableDonorFilter(blood, district);
        count = await Donor.countDocuments(filterCompat);
        if (count > 0) {
          return {
            match: true,
            bloodGroupUsed: blood,
            districtUsed: district,
            reason: 'compatible',
            userMessage: `Requested ${bt} not available. Found compatible blood ${blood} in ${district}.`,
            donorCount: count,
          };
        }
      }
    }
  }

  return notAvailableResult;
}

/**
 * Same as matchDonors but returns up to N donor docs (no contact info) for internal use.
 * Still does not expose personal info in userMessage.
 */
export async function matchDonorsWithList(requestedBlood, requestedDistrict, opts = {}) {
  const result = await matchDonors(requestedBlood, requestedDistrict, opts);
  if (!result.match || !result.bloodGroupUsed || !result.districtUsed) {
    return { ...result, donors: [] };
  }
  const filter = availableDonorFilter(result.bloodGroupUsed, result.districtUsed);
  const donors = await Donor.find(filter)
    .select('_id bloodGroup district')
    .limit(opts.limit ?? 10)
    .lean();
  return {
    ...result,
    donors: donors.map((d) => ({
      _id: String(d._id),
      bloodGroup: d.bloodGroup,
      district: d.district,
    })),
  };
}
