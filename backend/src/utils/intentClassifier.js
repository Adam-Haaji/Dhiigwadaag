/**
 * Intent classification for Blood Assistant chatbot.
 * Run BEFORE OpenAI to route availability vs compatibility vs off-topic.
 */

const BLOOD_TYPE_PATTERN = /(?:blood\s*type|dhiig|dhiiga)?\s*(AB[+-]|[ABO][+-])/i;

/** @typedef {'GREETING'|'AVAILABILITY_CHECK'|'CREATE_REQUEST_GUIDE'|'COMPATIBILITY_INFO'|'EMERGENCY_GUIDE'|'OFF_TOPIC'} Intent */

/**
 * Classify user message intent.
 * @param {string} message - Raw user message
 * @returns {{ intent: Intent }}
 */
export function classify(message) {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();

  const greetingOnly = /^(hi|hello|asc|asalaamu\s*calaykum|sxb|hey|salaan|salaam|waa\s*alaikum\s*salaam|howdy|yo|sup)\s*!*\.*$/i.test(lower)
    || (text.length <= 25 && /^(hi|hello|asc|sxb|hey|salaan|salaam)/i.test(lower));
  if (greetingOnly) {
    return { intent: 'GREETING' };
  }

  const hasBloodDomain = /blood|dhiig|donor|dhiib|request|codsi|emergency|degdeg|hospital|cusbitaal|available|heli|jiraa|compatible/i.test(lower);
  if (!hasBloodDomain) {
    return { intent: 'OFF_TOPIC' };
  }

  const compatibilityKeywords = /receive\s*from|who\s*can\s*donate|who\s*can\s*give|compatible|compatibility|ku\s*dhiidi|ku\s*dhici|can\s*receive/i.test(lower);
  if (compatibilityKeywords) {
    return { intent: 'COMPATIBILITY_INFO' };
  }

  const availabilityKeywords = /available|availability|ma\s*jiraa|heli\s*karaa|donor|dhiibayaal|dhiibayaal|is\s*(there|a)\s*donor|can\s*i\s*get|i\s*want\s*(blood|the\s*blood)|blood\s*type\s*(a\+|o\+|b\+|ab\+)/i.test(lower);
  const hasBloodType = BLOOD_TYPE_PATTERN.test(text);
  if (availabilityKeywords || (hasBloodType && /available|get|need|want|jiraa|heli/i.test(lower))) {
    return { intent: 'AVAILABILITY_CHECK' };
  }

  const emergencyKeywords = /emergency|degdeg|urgent|tallaabada|steps|what\s*to\s*do|xaalad/i.test(lower);
  if (emergencyKeywords) {
    return { intent: 'EMERGENCY_GUIDE' };
  }

  const createKeywords = /create|samee|codsiga|how\s*to\s*request|make\s*a\s*request|sideen.*request|request.*u\s*diraa|sida.*request|send\s*(a\s*)?request/i.test(lower);
  if (createKeywords) {
    return { intent: 'CREATE_REQUEST_GUIDE' };
  }

  if (hasBloodDomain) {
    return { intent: 'AVAILABILITY_CHECK' };
  }

  return { intent: 'OFF_TOPIC' };
}

/**
 * Extract blood type from message (e.g. A+, O-, AB+).
 * @param {string} text
 * @returns {string|null}
 */
export function extractBloodType(text) {
  const m = String(text || '').match(/(AB[+-]|[ABO][+-])/i);
  return m ? m[1].toUpperCase() : null;
}
