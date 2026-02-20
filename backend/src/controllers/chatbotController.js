/**
 * Chatbot Controller — Intent routing first, then OpenAI/tools.
 * Availability uses real MongoDB via donorSearchService.
 */

import BloodRequest from '../models/BloodRequest.js';
import { classify, extractBloodType } from '../utils/intentClassifier.js';
import { LOCATIONS } from '../utils/locations.js';
import { detectLanguage, getOpenAIChatCompletion, getFallbackResponse, explainBloodCompatibilityStatic, emergencyInstructionsStatic } from '../services/chatbotService.js';
import { findAvailableDonors, checkAvailability } from '../services/donorSearchService.js';

function isDbOrNetworkError(err) {
  const msg = String(err?.message || err).toLowerCase();
  return (
    msg.includes('getaddrinfo') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('mongodb') ||
    msg.includes('mongoose') ||
    msg.includes('network') ||
    err?.name === 'MongoNetworkError' ||
    err?.name === 'MongoServerSelectionError'
  );
}

function normalizeDistrict(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const match = LOCATIONS.find((d) => d.toLowerCase() === lower);
  return match || null;
}

function extractDistrictFromText(text) {
  const lower = String(text || '').toLowerCase();
  for (const d of LOCATIONS) {
    if (lower.includes(d.toLowerCase())) return d;
  }
  return null;
}

async function executeTool(name, args, context) {
  const { userId } = context;
  try {
    if (name === 'checkDonorAvailability') {
      const bloodType = args?.bloodType || args?.bloodGroup;
      const location = args?.location || args?.district;
      const urgency = args?.urgency || 'normal';
      const data = await checkAvailability(bloodType, location, urgency);
      return JSON.stringify(data);
    }

    if (name === 'createBloodRequest') {
      const patientName = args?.patientName || args?.patientName?.trim();
      const bloodGroup = String(args?.bloodType || args?.bloodGroup || '').trim().toUpperCase();
      const district = normalizeDistrict(args?.location || args?.hospital || args?.district) || 'Hodan';
      const units = Math.max(1, parseInt(args?.units, 10) || 1);
      const contactPerson = (args?.contactPerson || patientName || 'Requester').trim();
      const contactPhone = String(args?.phone || args?.contactPhone || '').trim().replace(/\D/g, '');
      const urgentLevel = /critical|urgent|emergency|degdeg/i.test(String(args?.urgency || '')) ? 'critical' : 'normal';
      const reason = args?.reason || 'Blood request from chatbot';

      if (!patientName || !bloodGroup || !contactPhone) {
        return JSON.stringify({
          success: false,
          error: 'Missing required: patientName, bloodType, phone',
        });
      }
      if (contactPhone.length < 9) {
        return JSON.stringify({ success: false, error: 'Invalid phone number' });
      }
      if (!['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup)) {
        return JSON.stringify({ success: false, error: 'Invalid blood type' });
      }

      const doc = await BloodRequest.create({
        patientName,
        bloodGroup,
        district,
        units,
        contactPerson,
        contactPhone,
        urgentLevel,
        reason,
        additionalNote: '',
        requesterId: userId,
      });
      return JSON.stringify({
        success: true,
        requestId: doc._id.toString(),
        message: 'Blood request created successfully. Donors will be notified.',
      });
    }

    if (name === 'explainBloodCompatibility') {
      const result = explainBloodCompatibilityStatic(args?.bloodType);
      return JSON.stringify(result);
    }

    if (name === 'emergencyInstructions') {
      const result = emergencyInstructionsStatic();
      return JSON.stringify(result);
    }

    return JSON.stringify({ error: `Unknown tool: ${name}` });
  } catch (err) {
    return JSON.stringify({ error: err?.message || 'Tool execution failed' });
  }
}

const OFF_TOPIC_REPLY_EN = 'I can only help with blood donation requests and donors inside this app.';
const OFF_TOPIC_REPLY_SO = 'Waxaan kaliya kaa caawin karaa codsiyada dhiigga iyo dhiibayaasha ee app-kan gudaheeda.';

const ASK_DISTRICT_EN = 'To check donors near you, please tell me your district (e.g. Hodan, Wadajir).';
const ASK_DISTRICT_SO = 'Si aan u hubiyo donor-ada, fadlan ii sheeg degmada aad joogto (tusaale: Hodan, Wadajir).';

const ASK_BLOOD_AND_DISTRICT_EN = 'Please tell me which blood type you need (e.g. A+, O-) and which district you are in.';
const ASK_BLOOD_AND_DISTRICT_SO = 'Fadlan ii sheeg nooca dhiigga aad u baahan tahay (tusaale: A+, O-) iyo degmada aad joogto.';

/** GET /api/chatbot/availability — availability only, no donor data. On DB failure returns available: false, status: DB_UNAVAILABLE. */
export const availability = async (req, res) => {
  try {
    const userId = req?.user?.id || req?.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const bloodType = req.query.bloodType || req.query.bloodGroup;
    const district = req.query.district;
    const urgency = req.query.urgency || 'normal';

    if (!bloodType || !district) {
      return res.status(400).json({ error: 'bloodType and district are required' });
    }

    const data = await checkAvailability(bloodType, district, urgency);
    if (data.available) {
      return res.json({
        bloodType: data.bloodType,
        requestedDistrict: data.requestedDistrict,
        matchedDistrict: data.matchedDistrict,
        available: true,
        district: data.matchedDistrict,
      });
    }
    return res.json({
      bloodType: data.bloodType,
      requestedDistrict: data.requestedDistrict,
      searchedDistricts: data.searchedDistricts,
      available: false,
      district: data.requestedDistrict,
    });
  } catch (err) {
    if (isDbOrNetworkError(err)) {
      const district = req.query.district || '';
      return res.status(200).json({ available: false, status: 'DB_UNAVAILABLE', district: district || null });
    }
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
};

/** GET /api/chatbot/available-donors — legacy; returns count + donors (no phone) */
export const availableDonors = async (req, res) => {
  try {
    const userId = req?.user?.id || req?.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const bloodType = req.query.bloodType || req.query.bloodGroup;
    const district = req.query.district;
    const urgency = req.query.urgency || 'normal';

    if (!bloodType || !district) {
      return res.status(400).json({ error: 'bloodType and district are required' });
    }

    const data = await findAvailableDonors(bloodType, district, urgency);
    return res.json({
      bloodType: data.bloodType,
      requestedDistrict: data.requestedDistrict,
      searchedDistricts: data.searchedDistricts,
      count: data.count,
      donors: data.donors,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
};

export const chat = async (req, res) => {
  try {
    const userId = req?.user?.id || req?.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { message, history = [] } = req.body || {};
    const userMessage = typeof message === 'string' ? message.trim() : '';
    if (!userMessage) return res.status(400).json({ error: 'message is required' });

    const context = { userId };
    const lang = detectLanguage(userMessage);
    const isSomali = lang === 'so';

    const { intent } = classify(userMessage);

    const districtFromMessage = extractDistrictFromText(userMessage);
    const bloodTypeFromMessage = extractBloodType(userMessage);
    let bloodTypeFromHistory = null;
    let districtFromHistory = null;
    if (Array.isArray(history)) {
      for (let i = history.length - 1; i >= 0; i--) {
        const h = history[i];
        if (String(h?.role || '').toLowerCase() !== 'user') continue;
        if (!bloodTypeFromHistory) bloodTypeFromHistory = extractBloodType(h.content || '');
        if (!districtFromHistory) districtFromHistory = extractDistrictFromText(h.content || '');
        if (bloodTypeFromHistory && districtFromHistory) break;
      }
    }

    const runAvailability = intent === 'AVAILABILITY_CHECK' ||
      (districtFromMessage && bloodTypeFromHistory) ||
      (bloodTypeFromMessage && districtFromHistory);

    if (intent === 'OFF_TOPIC' && !runAvailability) {
      return res.json({
        reply: isSomali ? OFF_TOPIC_REPLY_SO : OFF_TOPIC_REPLY_EN,
        source: 'intent',
        toolUsed: null,
      });
    }

    if (runAvailability) {
      let bloodType = bloodTypeFromMessage || bloodTypeFromHistory;
      let district = districtFromMessage || districtFromHistory;

      if (!bloodType) {
        return res.json({
          reply: isSomali ? ASK_BLOOD_AND_DISTRICT_SO : ASK_BLOOD_AND_DISTRICT_EN,
          source: 'intent',
          toolUsed: null,
        });
      }

      if (!district) {
        return res.json({
          reply: isSomali ? ASK_DISTRICT_SO : ASK_DISTRICT_EN,
          source: 'intent',
          toolUsed: null,
        });
      }

      let data;
      try {
        data = await checkAvailability(bloodType, district, 'normal');
      } catch (err) {
        if (isDbOrNetworkError(err)) {
          const dbUnavailableEn = 'Eligibility check unavailable. Please try again.';
          const dbUnavailableSo = 'Hubinta diyaar gelinta way suurtagal ma noqon. Fadlan isku day mar kale.';
          return res.status(200).json({
            reply: isSomali ? dbUnavailableSo : dbUnavailableEn,
            source: 'fallback',
            status: 'DB_UNAVAILABLE',
            toolUsed: null,
          });
        }
        throw err;
      }

      const districtLabel = data.requestedDistrict || district;
      const districtList = data.searchedDistricts?.length ? data.searchedDistricts.join(', ') : districtLabel;
      let reply;

      if (data.available) {
        if (isSomali) {
          reply = `✅ Dhiig ${data.bloodType} waa diyaar ${districtLabel}. Fadlan samee codsi si loo kuu xiro.`;
        } else {
          reply = `✅ ${data.bloodType} blood is available in ${districtLabel}. Please create a request to get matched.`;
        }
      } else {
        if (isSomali) {
          reply = `❌ Ma helin dhiibayaal ${data.bloodType} ah ${districtLabel} ama degmooyinka u dhow. Waad sameyn kartaa codsi degdeg ah, nidaamku wuu sii raadin doonaa.`;
        } else {
          reply = `❌ No ${data.bloodType} donors found in ${districtLabel} or nearby districts. You can create an emergency request and we will continue searching.`;
        }
      }

      return res.json({
        reply,
        source: 'db',
        toolUsed: 'checkDonorAvailability',
      });
    }

    const messages = [
      ...history.slice(-20).map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || '',
      })),
      { role: 'user', content: userMessage },
    ];

    let completion = await getOpenAIChatCompletion(messages, { tools: true });

    if (!completion.success && completion.useFallback) {
      const fallbackText = getFallbackResponse(userMessage, context);
      if (process.env.NODE_ENV !== 'test') {
        console.log('[Chatbot] Fallback used:', completion.error);
      }
      return res.json({
        reply: fallbackText,
        source: 'fallback',
        toolUsed: null,
      });
    }

    if (!completion.success) {
      return res.json({
        reply: getFallbackResponse(userMessage, context),
        source: 'fallback',
        toolUsed: null,
      });
    }

    let assistantText = completion.text;
    let toolUsed = null;

    if (completion.toolCalls && completion.toolCalls.length > 0) {
      for (const tc of completion.toolCalls) {
        const fn = tc.function;
        const name = fn?.name;
        let toolArgs = {};
        try {
          if (fn?.arguments) toolArgs = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments;
        } catch {}
        const toolResult = await executeTool(name, toolArgs, context);
        toolUsed = name;
        if (process.env.NODE_ENV !== 'test') {
          console.log('[Chatbot] Tool:', name);
        }
        messages.push(
          { role: 'assistant', content: completion.text || '', tool_calls: completion.toolCalls },
          { role: 'tool', tool_call_id: tc.id, content: toolResult }
        );
      }
      const second = await getOpenAIChatCompletion(messages, { tools: false });
      if (second.success && second.text) assistantText = second.text;
    }

    return res.json({
      reply: assistantText || getFallbackResponse(userMessage, context),
      source: 'openai',
      toolUsed,
    });
  } catch (err) {
    console.error('[Chatbot] Error:', err?.message || err);
    const userMessage = (req.body && req.body.message) || '';
    if (isDbOrNetworkError(err)) {
      return res.json({
        reply: 'Eligibility check unavailable. Please try again.',
        source: 'fallback',
        status: 'DB_UNAVAILABLE',
        toolUsed: null,
      });
    }
    return res.json({
      reply: getFallbackResponse(userMessage, {}),
      source: 'fallback',
      toolUsed: null,
    });
  }
};
