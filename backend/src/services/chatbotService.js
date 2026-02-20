/**
 * Chatbot Service — Hybrid AI + Tools + Fallback
 * Handles OpenAI calls, tool routing, language detection, and rule-based fallback.
 * API key must be set in backend env only (OPENAI_API_KEY).
 */

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BLOOD_COMPATIBILITY = {
  'O-': { canReceive: ['O-'], canDonateTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] },
  'O+': { canReceive: ['O-', 'O+'], canDonateTo: ['O+', 'A+', 'B+', 'AB+'] },
  'A-': { canReceive: ['O-', 'A-'], canDonateTo: ['A-', 'A+', 'AB-', 'AB+'] },
  'A+': { canReceive: ['O-', 'O+', 'A-', 'A+'], canDonateTo: ['A+', 'AB+'] },
  'B-': { canReceive: ['O-', 'B-'], canDonateTo: ['B-', 'B+', 'AB-', 'AB+'] },
  'B+': { canReceive: ['O-', 'O+', 'B-', 'B+'], canDonateTo: ['B+', 'AB+'] },
  'AB-': { canReceive: ['O-', 'A-', 'B-', 'AB-'], canDonateTo: ['AB-', 'AB+'] },
  'AB+': { canReceive: BLOOD_GROUPS, canDonateTo: ['AB+'] },
};

const SYSTEM_PROMPT = `You are a Blood Donation Assistant inside a mobile app.
You only answer questions related to:
- Blood requests
- Donor availability
- Emergency blood guidance
- Blood compatibility (only if explicitly asked)

You must never invent donors.
For availability questions, wait for tool data.
If no data provided, ask for district.
Respond in the same language as the user.
Be concise and professional.`;

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'checkDonorAvailability',
      description: 'Check how many available donors match the given blood type and location (district).',
      parameters: {
        type: 'object',
        properties: {
          bloodType: { type: 'string', description: 'Blood type e.g. O+, B-, A+' },
          location: { type: 'string', description: 'District or area e.g. Hodan, Wadajir' },
        },
        required: ['bloodType', 'location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createBloodRequest',
      description: 'Create a new blood request. Requires patientName, bloodType, units, hospital/location, urgency, phone. Contact person can default to patient name.',
      parameters: {
        type: 'object',
        properties: {
          patientName: { type: 'string' },
          bloodType: { type: 'string' },
          units: { type: 'number', description: 'Number of units (bags)' },
          hospital: { type: 'string', description: 'Hospital or district/location' },
          location: { type: 'string', description: 'District name' },
          urgency: { type: 'string', enum: ['critical', 'normal'] },
          phone: { type: 'string' },
          contactPerson: { type: 'string' },
        },
        required: ['patientName', 'bloodType', 'units', 'location', 'urgency', 'phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'explainBloodCompatibility',
      description: 'Explain which blood types can donate to a given blood type (e.g. who can donate to B+).',
      parameters: {
        type: 'object',
        properties: {
          bloodType: { type: 'string', description: 'The blood type that needs to receive (e.g. B+)' },
        },
        required: ['bloodType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'emergencyInstructions',
      description: 'Return standard emergency steps for a patient needing blood.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

function normalizeBloodType(s) {
  const t = String(s || '').trim().toUpperCase();
  if (BLOOD_GROUPS.includes(t)) return t;
  if (t === 'O' || t === '0') return 'O+';
  return t || null;
}

export function detectLanguage(text) {
  const lower = String(text || '').toLowerCase();
  const somaliIndicators = /\b(waan|waxaan|ma|maxaa|waa|oo|iyo|ee|ka|ku|soo|gudaha|degdeg|baahan|dhiig|dhiiga)\b|dhiig|gudaha|degdeg/i;
  return somaliIndicators.test(lower) ? 'so' : 'en';
}

export function getFallbackResponse(userMessage, context = {}) {
  const lang = detectLanguage(userMessage);
  const msg = String(userMessage || '').toLowerCase();

  const en = (so, enText) => (lang === 'so' ? so : enText);

  if (/who can donate|receive from|compatible|compatibility|ku dhiidi|ku dhici/i.test(msg)) {
    const blood = msg.match(/([ABO][+-]|AB[+-])/i)?.[1]?.toUpperCase() || 'B+';
    const norm = normalizeBloodType(blood);
    const info = BLOOD_COMPATIBILITY[norm];
    if (info) {
      const list = info.canReceive.join(', ');
      return en(
        `Dhiiga ${norm} waxaa ku dhiidi kara: ${list}.`,
        `Blood type ${norm} can receive from: ${list}.`
      );
    }
  }

  if (/emergency|degdeg|situation|xaalad|steps|tallaabada/i.test(msg)) {
    return en(
      'Tallaabooyinka degdega ah: 1) Wac 911 ama caawinta degdega. 2) Gaar dhakhtar ama saliid degdeg ah. 3) Soo diiwaangeli codsiga dhiiga app-ka. 4) La xiriir dhammaan dhiibayaasha la soo bandhigay.',
      'Emergency steps: 1) Call 911 or emergency services. 2) Reach a doctor or emergency care. 3) Register the blood request in the app. 4) Contact the donors shown in your matches.'
    );
  }

  if (/create|request|samee|codsiga|need blood|waan u baahan dhiig/i.test(msg)) {
    return en(
      'Si aad u sameysato codsiga: tag "Emergency Alert" ama "Search", buuxi nooca dhiiga, goobta, tirada unugga, iyo telefoonka. Haddii aad rabto waxaan kaa caawin karaa adoo sheegaya macluumaadka.',
      'To create a request: go to "Emergency Alert" or "Search", fill blood type, location, units, and phone. If you tell me the details I can guide you step by step.'
    );
  }

  if (/available|donors|dhiibayaal|count|tiro/i.test(msg)) {
    return en(
      'Waxaan kuu sheegi karaa tirada dhiibayaasha ee diyaar ah haddii aad ii sheegto nooca dhiiga iyo goobta (district). Tusaale: "Hodan O+".',
      'I can tell you how many donors are available if you tell me blood type and location (district). Example: "O+ in Hodan".'
    );
  }

  return en(
    'Waad salaamantahay. Waxaan kuu caawin karaa codsiga dhiiga, tirooyinka dhiibayaasha, iyo sida dhiiga loo isku beddelo. Maxaad weydiineysaa?',
    'Hello. I can help with blood requests, donor availability, and blood compatibility. What do you need?'
  );
}

export function explainBloodCompatibilityStatic(bloodType) {
  const norm = normalizeBloodType(bloodType);
  const info = BLOOD_COMPATIBILITY[norm];
  if (!info) return { ok: false, message: `Unknown blood type: ${bloodType}` };
  return {
    ok: true,
    bloodType: norm,
    canReceiveFrom: info.canReceive,
    summary: `Blood type ${norm} can receive from: ${info.canReceive.join(', ')}.`,
  };
}

export function emergencyInstructionsStatic() {
  return {
    steps: [
      'Call emergency services (e.g. 911) or local emergency number.',
      'Get the patient to a hospital or emergency care as soon as possible.',
      'Create a blood request in this app with correct blood type and location.',
      'Contact matched donors from the app to arrange donation.',
    ],
    summary: 'Stay calm, call for help, get to hospital, then use the app to find and contact donors.',
  };
}

export async function getOpenAIChatCompletion(messages, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'OPENAI_API_KEY not set', useFallback: true };
  }

  const model = options.model || 'gpt-4o-mini';
  const useTools = options.tools !== false;
  const body = {
    model,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    max_tokens: 600,
    temperature: 0.3,
  };
  if (useTools) body.tools = TOOL_DEFINITIONS;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      const err = data?.error?.message || data?.error?.code || res.statusText;
      if (res.status === 429 || /rate limit/i.test(String(err))) {
        return { success: false, error: err, useFallback: true };
      }
      return { success: false, error: err, useFallback: true };
    }

    const choice = data?.choices?.[0];
    if (!choice) return { success: false, error: 'No choice', useFallback: true };

    const text = choice?.message?.content?.trim();
    const toolCalls = choice?.message?.tool_calls;

    return {
      success: true,
      text: text || null,
      toolCalls: Array.isArray(toolCalls) && toolCalls.length ? toolCalls : null,
      finishReason: choice?.finish_reason,
    };
  } catch (err) {
    const msg = err?.message || String(err);
    return {
      success: false,
      error: msg,
      useFallback: true,
    };
  }
}

export { TOOL_DEFINITIONS, BLOOD_COMPATIBILITY };
