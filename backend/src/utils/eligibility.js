// Central donor eligibility logic
// Rules:
// - Age 18-65 inclusive
// - Weight > 50kg
// - HB >= 13.0 (male) / >= 12.0 (female)
// - Cooldown: cannot donate within 90 days of lastDonationDate

import { addDays } from './dateUtils.js';

export function evaluateEligibility({ age, weightKg, gender, hb, lastDonationDate }) {
  const result = { eligible: true, code: null, reason: null, nextEligibleDate: null };
  if (typeof age === 'number') {
    if (age < 18) {
      return { eligible: false, code: 'age_low', reason: "Da'daadu waa ka yar tahay 18 — ma bixin kartid dhiig.", nextEligibleDate: null };
    }
    if (age > 65) {
      return { eligible: false, code: 'age_high', reason: "Da'daadu waa ka weyn tahay xadka dhiig-bixinta (65) — ma bixin kartid.", nextEligibleDate: null };
    }
  }
  if (typeof weightKg === 'number') {
    if (weightKg < 50) {
      return { eligible: false, code: 'weight_low', reason: 'Miisaankaaga waa <50kg — ma bixin kartid.', nextEligibleDate: null };
    }
  }
  if (typeof hb === 'number' && gender) {
    const g = String(gender).toLowerCase();
    if (g === 'male' && hb < 13.0) {
      return { eligible: false, code: 'hb_low_male', reason: 'HB-gaagu waa hooseeya (rag): ma bixin kartid.', nextEligibleDate: null };
    }
    if (g === 'female' && hb < 12.0) {
      return { eligible: false, code: 'hb_low_female', reason: 'HB-gaagu waa hooseeya (dumar): ma bixin kartid.', nextEligibleDate: null };
    }
  }
  if (lastDonationDate) {
    const last = new Date(lastDonationDate);
    if (!isNaN(last.getTime())) {
      const nextEligible = addDays(last, 90);
      if (nextEligible.getTime() > Date.now()) {
        return { eligible: false, code: 'cooldown', reason: `Waad dhawaan dhiig bixi⁠day; fadlan sug ilaa ${nextEligible.toLocaleDateString()}.`, nextEligibleDate: nextEligible };
      }
    }
  }
  return result;
}
