import Donor from '../models/Donor.js';
import { getDistrictExpansionOrder } from '../utils/districtNeighbors.js';

export const TIER_TABLE = {
  'O-': [['O-']],
  'O+': [['O+'], ['O-']],
  'A-': [['A-'], ['O-']],
  'A+': [['A+'], ['A-','O+','O-']],
  'B-': [['B-'], ['O-']],
  'B+': [['B+'], ['B-','O+','O-']],
  'AB-': [['AB-'], ['A-','B-','O-']],
  'AB+': [['AB+'], ['A+','A-','B+','B-','O+','O-','AB-']],
};

export function tierLabel(index) {
  return `Tier ${index + 1}`;
}

export async function findPriorityMatches(patientBloodType, opts = null) {
  const tiers = TIER_TABLE[patientBloodType] || [];
  const district = opts?.district || null;
  const urgencyLevel = (opts?.urgencyLevel || '').toLowerCase();
  const expandOrder = district ? getDistrictExpansionOrder(district) : [];
  for (let i = 0; i < tiers.length; i++) {
    const allowedTypes = tiers[i];
    // Search same district first, then expand per order
    if (district) {
      for (const d of expandOrder.length ? expandOrder : [district]) {
        const query = { bloodGroup: { $in: allowedTypes }, availabilityStatus: 'available', isActive: true, district: d };
        const donors = await Donor.find(query).lean();
        if (donors.length > 0) {
          return {
            matchedTier: tierLabel(i),
            donors,
            patientBloodType,
            tierUsed: allowedTypes,
          };
        }
        // If critical, continue expanding immediately; for normal, still expand stepwise (same behavior server-side)
      }
    } else {
      // No district provided: fallback to any available donors with allowed types
      const query = { bloodGroup: { $in: allowedTypes }, availabilityStatus: 'available', isActive: true };
      const donors = await Donor.find(query).lean();
      if (donors.length > 0) {
        return {
          matchedTier: tierLabel(i),
          donors,
          patientBloodType,
          tierUsed: allowedTypes,
        };
      }
    }
  }
  return {
    matchedTier: null,
    donors: [],
    patientBloodType,
    tierUsed: [],
    message: 'No donor found',
  };
}

