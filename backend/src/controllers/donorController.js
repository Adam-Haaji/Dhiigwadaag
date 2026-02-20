import User from '../models/User.js';
import Donor from '../models/Donor.js';
import Donation from '../models/Donation.js';
import DonorEligibilityLog from '../models/DonorEligibilityLog.js';
import { yearsBetween } from '../utils/dateUtils.js';
import { evaluateEligibility } from '../utils/eligibility.js';
import { LOCATIONS, isValidLocation } from '../utils/locations.js';

function computeMenus(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'both' || r === 'admin') return ['home', 'donor', 'request', 'notification', 'profile'];
  if (r === 'donor') return ['home', 'donor', 'notification', 'profile'];
  if (r === 'requester') return ['home', 'request', 'notification', 'profile'];
  return ['home'];
}

// Map app donor fields to ML API payload (exact keys required by eligibility-api)
// Use sensible defaults so the model never receives null/zero for required numerics
function mapDonorToEligibilityPayload(donor, hb, totalDonations) {
  const genderStr = String(donor.gender || '').trim().toLowerCase();
  const gender = genderStr === 'female' ? 'Female' : 'Male';
  const age = Number(donor.age);
  const weightKg = Number(donor.weightKg);
  const hbNum = Number(hb);
  const payload = {
    Gender: gender,
    Age: (age >= 18 && age <= 65) ? age : 28,
    Blood_Group: String(donor.bloodGroup || '').trim().toUpperCase() || 'O+',
    Total_Donations: Math.max(0, parseInt(totalDonations, 10) || 0),
    Medical_Condition: String(donor.medicalCondition || 'None').trim(),
    Weight_kg: (weightKg >= 50 && weightKg <= 200) ? weightKg : 72,
    Hemoglobin_g_dL: (hbNum >= 12 && hbNum <= 20) ? hbNum : 14.5,
  };
  return payload;
}

// Helper function to check donor eligibility using ML model
async function checkDonorEligibility(donorData, totalDonations = 0) {
  const apiUrl = (process.env.ELIGIBILITY_API_URL || 'https://eligibility-api-zec1.onrender.com').replace(/\/$/, '');
  const endpoint = `${apiUrl}/predict`;

  try {
    if (!apiUrl) {
      console.error('[checkDonorEligibility] ELIGIBILITY_API_URL not set');
      return {
        eligible: null,
        reason: 'Eligibility check unavailable. Please try again.',
        confidencePercent: null,
      };
    }

    // If medicalCondition !== "None" → immediate NOT eligible (no API call)
    if (donorData.medicalCondition && String(donorData.medicalCondition).trim() !== 'None') {
      return {
        eligible: false,
        reason: 'Medical condition not suitable for donation',
        confidencePercent: 100,
      };
    }

    const payload = mapDonorToEligibilityPayload(donorData, donorData.hb, totalDonations);

    // Render free tier cold start can take 30–60s; use 60s timeout and longer retry delay
    const timeoutMs = 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      const msg = (fetchErr?.message || '').toLowerCase();
      const isRetryable = msg.includes('aborted') || msg.includes('timeout') || msg.includes('fetch') || msg.includes('econnrefused') || msg.includes('enotfound');
      if (isRetryable) {
        await new Promise(r => setTimeout(r, 8000));
        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), timeoutMs);
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: retryController.signal,
          });
        } finally {
          clearTimeout(retryTimeout);
        }
      } else {
        throw fetchErr;
      }
    }
    clearTimeout(timeoutId);

    const statusCode = response.status;
    const responseText = await response.text().catch(() => '');

    if (!response.ok) {
      throw new Error(`ML model API returned status ${statusCode}: ${responseText}`);
    }

    let modelResponse;
    try {
      modelResponse = JSON.parse(responseText);
    } catch (e) {
      throw new Error('Invalid JSON response from eligibility API');
    }

    const eligible = modelResponse.eligible !== undefined ? Boolean(modelResponse.eligible) : false;
    const confidencePercent = modelResponse.confidence_percent != null
      ? Number(modelResponse.confidence_percent)
      : (modelResponse.confidence != null ? Number(modelResponse.confidence) * 100 : null);
    const reason = modelResponse.reason || modelResponse.message ||
      (eligible ? 'Eligible to donate' : 'Not eligible to donate');

    return {
      eligible,
      reason,
      confidencePercent,
      raw: modelResponse,
    };
  } catch (error) {
    if (error?.message && !error.message.includes('aborted')) {
      console.error('[checkDonorEligibility] API error:', error.message);
    }
    return {
      eligible: null,
      reason: 'Eligibility check unavailable. Please try again.',
      confidencePercent: null,
      error: error?.message || 'Service error',
    };
  }
}

// POST /api/donors
// Create a donor profile linked to the current user WITHOUT changing the User profile
export const createDonor = async (req, res) => {
  try {
    const userId = req?.user?.id || req?.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure user exists
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent duplicate donor profile per user
    const exists = await Donor.findOne({ user: userId });
    if (exists) return res.status(409).json({ error: 'Donor already registered for this user' });

    const {
      fullName,
      dateOfBirth,
      gender,
      phone,
      email,
      district,
      bloodGroup,
      weightKg,
      consentGiven,
      emergencyContact,
      lastDonationDate,
      medicalCondition,
      availabilityStatus,
      donations,
    } = req.body || {};

    // Basic runtime validation (Mongoose will re-validate)
    if (!fullName || !dateOfBirth || !gender || !phone || !email || !district || !bloodGroup ||
        weightKg === undefined || consentGiven === undefined || !emergencyContact || !availabilityStatus) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // New donor registration: never set lastDonationDate/unavailableUntil; only set on Fulfilled
    const lastDonationDateForCreate = null;
    // Derived age
    const age = yearsBetween(dateOfBirth);
    // Run eligibility (createDonor path: user already passed client validation; we enforce again server-side)
    const elig = evaluateEligibility({ age, weightKg, gender, hb: req.body?.hb, lastDonationDate: null });
    if (!elig.eligible) {
      // Do not modify users collection; just log eligibility result and return
      await DonorEligibilityLog.create({
        user: user._id,
        decision: 'ineligible',
        reason: elig.reason,
        checkResults: { age, weightKg, gender, hb: req.body?.hb, cooldown: { withinCooldown: false } },
      }).catch(()=>{});
      return res.status(400).json({ success: false, reason: elig.reason, donor: null });
    }
    // Phone format and uniqueness across Users and Donors
    // Allow the same user to use their own phone number from their user account
    if (!/^[0-9+\-()\s]{6,20}$/.test(String(phone))) return res.status(400).json({ error: 'Invalid phone format' });
    const [uPhone, dPhone] = await Promise.all([
      User.findOne({ phone }).select('_id').lean(),
      Donor.findOne({ phone }).select('_id').lean(),
    ]);
    // Check if phone is in use by a different user (not the current user registering as donor)
    if (uPhone && String(uPhone._id) !== String(userId)) {
      return res.status(409).json({ error: 'Phone already in use' });
    }
    // Check if phone is in use by a different donor (not linked to current user)
    if (dPhone) {
      const donorWithPhone = await Donor.findById(dPhone._id).select('user').lean();
      if (donorWithPhone && String(donorWithPhone.user) !== String(userId)) {
        return res.status(409).json({ error: 'Phone already in use' });
      }
    }

    // CRITICAL: Always set availabilityStatus to 'available' for new donor registrations
// Donors only become 'unavailable' after fulfilling a donation (90-day cooldown)
// This applies to both new donors and requester-to-donor conversions
const donor = await Donor.create({
      user: userId,
      fullName,
      dateOfBirth,
      gender,
      phone,
      email,
      district,
      bloodGroup,
      weightKg,
      consentGiven,
      emergencyContact,
      lastDonationDate: lastDonationDateForCreate,
      medicalCondition: medicalCondition || 'None', // Default to 'None' if not provided
      availabilityStatus: 'available', // Always 'available' on registration; only Fulfilled sets unavailable
      nextAvailableDate: null,
      donations: Array.isArray(donations) ? donations : [],
    });

    // Run ML eligibility check in background (do not block registration)
    const donorId = donor._id;
    const donorDoc = donor;
    const userIdForDonations = userId;
    const hbVal = req.body?.hb != null && req.body?.hb !== '' ? Number(req.body.hb) : undefined;
    setImmediate(async () => {
      try {
        const donorWithAge = await Donor.findById(donorId).lean();
        const finalAge = donorWithAge?.age || donorDoc.age;
        const donorPayload = {
          ...donorDoc,
          age: finalAge,
          hb: hbVal,
        };
        const totalDonations = await Donation.countDocuments({ donorId: userIdForDonations });
        const eligibilityResult = await checkDonorEligibility(donorPayload, totalDonations);
        const newStatus = eligibilityResult.eligible === true ? 'ELIGIBLE'
          : eligibilityResult.eligible === false ? 'NOT_ELIGIBLE'
          : 'UNKNOWN';
        const updatePayload = {
          eligibilityStatus: newStatus,
          eligibilityReason: newStatus === 'UNKNOWN' ? 'Eligibility check unavailable. Please try again.' : (eligibilityResult.reason || null),
          eligibilityConfidencePercent: eligibilityResult.confidencePercent ?? null,
          eligibilityConfidence: eligibilityResult.confidencePercent != null ? eligibilityResult.confidencePercent / 100 : null,
          eligibilityCheckedAt: new Date(),
          eligibilityRaw: eligibilityResult.raw || null,
        };
        await Donor.findByIdAndUpdate(donorId, updatePayload);
      } catch (e) {
        console.error('[createDonor] eligibility background error:', e?.message || e);
        await Donor.findByIdAndUpdate(donorId, {
          eligibilityStatus: 'UNKNOWN',
          eligibilityReason: 'Eligibility check unavailable. Please try again.',
          eligibilityCheckedAt: new Date(),
        }).catch(() => {});
      }
    });

    // Do not modify users collection; record eligibility log only
    try {
      await DonorEligibilityLog.create({
        user: user._id,
        donor: donor?._id,
        decision: 'eligible',
        reason: null,
        checkResults: { age, weightKg, gender, hb: req.body?.hb, cooldown: { withinCooldown: false } },
      }).catch(()=>{});
    } catch (e) {
      console.error('Eligibility log insert failed:', e?.message || e);
    }

    const summary = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      donorStatus: user.donorStatus,
      unavailableUntil: user.unavailableUntil,
      menus: computeMenus(user.role),
    };
    // Trigger real-time matching when a donor becomes available/registered
    try {
      const { onDonorAvailable } = await import('../services/realtimeMatcher.js');
      if (String(donor.availabilityStatus) === 'available') {
        onDonorAvailable(donor).catch(() => {});
      }
    } catch (_) {}

    // Return immediately; eligibility is written in background (dashboard reads from DB)
    return res.status(201).json({
      donor,
      user: summary
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/donors/register (lightweight eligibility pathway)
// Body: { age, weightKg, gender, hb, bloodType, location }
export const registerDonor = async (req, res) => {
  try {
    const userId = req?.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await User.findById(userId).select('_id name email phone lastDonationDate');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { age, weightKg, gender, hb, bloodType, location, phone, email } = req.body || {};
    if ([age, weightKg, gender, hb, bloodType, location].some(v => v === undefined || v === null || String(v).trim() === '')) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const ageNum = Number(age);
    const weightNum = Number(weightKg);
    const hbNum = Number(hb);
    const lastDonationDate = user.lastDonationDate;
    const elig = evaluateEligibility({ age: ageNum, weightKg: weightNum, gender, hb: hbNum, lastDonationDate });

    // If phone/email provided in eligibility registration, validate now (optional fields)
    let newPhone = typeof phone === 'string' ? phone.trim() : undefined;
    if (newPhone && !/^[0-9+\-()\s]{6,20}$/.test(newPhone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone format' });
    }
    let newEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
    if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (!elig.eligible) {
      await DonorEligibilityLog.create({
        user: user._id,
        decision: 'ineligible',
        reason: elig.reason,
        checkResults: {
          age: ageNum,
          weightKg: weightNum,
          gender,
          hb: hbNum,
          cooldown: { lastDonationDate, nextEligibleDate: elig.nextEligibleDate, withinCooldown: elig.code === 'cooldown' },
        },
      }).catch(()=>{});
      return res.status(400).json({ success: false, reason: elig.reason, donor: null });
    }

    // Eligible path
    // Do not modify users collection on eligibility success
    await DonorEligibilityLog.create({
      user: user._id,
      decision: 'eligible',
      reason: null,
      checkResults: {
        age: ageNum,
        weightKg: weightNum,
        gender,
        hb: hbNum,
        cooldown: { lastDonationDate, nextEligibleDate: null, withinCooldown: false },
      },
    }).catch(()=>{});
    return res.json({ success: true, message: 'You are eligible to donate' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/donors/search?bloodType=A%2B&city=Mogadishu&available=true
export const searchDonors = async (req, res) => {
  try {
    const { bloodType, city, availability, q: query } = req.query;

    // Enforce exact canonical location matching when a city is provided
    if (city !== undefined && city !== null) {
      const cityVal = String(city).trim();
      if (!isValidLocation(cityVal)) {
        return res.status(400).json({ error: 'Invalid location. Use a canonical district value.' });
      }
    }

    // Build Donor model query
    const donorAnd = [];
    if (availability !== undefined) {
      const val = String(availability).toLowerCase();
      if (val === 'true' || val === '1') donorAnd.push({ availabilityStatus: 'available' });
      if (val === 'false' || val === '0') donorAnd.push({ availabilityStatus: 'unavailable' });
    }
    if (bloodType) donorAnd.push({ bloodGroup: String(bloodType).toUpperCase() });
    if (city) {
      const cityVal = String(city).trim();
      donorAnd.push({ district: cityVal });
    }
    if (query) {
      const val = String(query).trim();
      const btPattern = /^(A|B|AB|O)[+-]$/i;
      if (btPattern.test(val)) donorAnd.push({ bloodGroup: val.toUpperCase() });
      else {
        // If query is a canonical location, match by exact district; otherwise search name/phone/email
        if (isValidLocation(val)) {
          donorAnd.push({ district: val });
        } else {
          const esc = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          donorAnd.push({
            $or: [
              { fullName: { $regex: new RegExp(esc, 'i') } },
              { phone: { $regex: new RegExp(esc, 'i') } },
              { email: { $regex: new RegExp(esc, 'i') } },
            ],
          });
        }
      }
    }
    const donorQuery = donorAnd.length ? { $and: donorAnd } : {};

    // Build legacy User model query (for backward compatibility donors stored in Users)
    const userAnd = [{ role: { $in: ['donor', 'both'] } }];
    if (availability !== undefined) {
      const val = String(availability).toLowerCase();
      if (val === 'true' || val === '1') userAnd.push({ availability: true });
      if (val === 'false' || val === '0') userAnd.push({ availability: false });
    }
    if (bloodType) userAnd.push({ bloodType: String(bloodType).toUpperCase() });
    if (city) {
      const cityVal = String(city).trim();
      userAnd.push({ location: cityVal });
    }
    if (query) {
      const val = String(query).trim();
      const btPattern = /^(A|B|AB|O)[+-]$/i;
      if (btPattern.test(val)) userAnd.push({ bloodType: val.toUpperCase() });
      else {
        // If query is a canonical location, match by exact location; otherwise search name/phone/email
        if (isValidLocation(val)) {
          userAnd.push({ location: val });
        } else {
          const esc = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          userAnd.push({
            $or: [
              { name: { $regex: new RegExp(esc, 'i') } },
              { phone: { $regex: new RegExp(esc, 'i') } },
              { email: { $regex: new RegExp(esc, 'i') } },
            ],
          });
        }
      }
    }
    const userQuery = userAnd.length ? { $and: userAnd } : {};

    const [donorDocs, userDocs] = await Promise.all([
      Donor.find(donorQuery).lean(),
      User.find(userQuery).select('-password').lean(),
    ]);

    const fromDonor = donorDocs.map((d) => ({
      _id: `donor:${d._id}`,
      name: d.fullName,
      email: d.email,
      bloodType: d.bloodGroup,
      location: d.district,
      phone: d.phone,
      availability: d.availabilityStatus === 'available',
      avatarUrl: '',
      _src: 'Donor',
    }));
    const fromUser = userDocs.map((u) => ({
      _id: `user:${u._id}`,
      name: u.name,
      email: u.email,
      bloodType: u.bloodType,
      location: u.location,
      phone: u.phone,
      availability: !!u.availability,
      avatarUrl: u.avatarUrl || '',
      _src: 'User',
    }));

    // Merge and deduplicate by email+phone+bloodType to avoid double entries if a user also has a Donor profile
    const seen = new Set();
    const merged = [];
    for (const item of [...fromDonor, ...fromUser]) {
      const key = `${(item.email||'').toLowerCase()}|${(item.phone||'').trim()}|${item.bloodType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }

    // Sort by blood type order then name for determinism
    const order = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
    merged.sort((a, b) => {
      const ia = order.indexOf(String(a.bloodType).toUpperCase());
      const ib = order.indexOf(String(b.bloodType).toUpperCase());
      if (ia !== ib) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return String(a.name||'').localeCompare(String(b.name||''));
    });

    return res.json(merged);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/donors/meta -> { bloodTypes: string[], locations: string[] }
export const getDonorMeta = async (req, res) => {
  try {
    const [bloodGroupsRaw] = await Promise.all([
      Donor.distinct('bloodGroup', { bloodGroup: { $exists: true, $ne: '' } }),
    ]);
    const order = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
    const bloodTypes = bloodGroupsRaw
      .filter(Boolean)
      .map((x) => String(x).toUpperCase())
      .sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    // Always return canonical locations to prevent drift
    const locations = [...LOCATIONS];
    return res.json({ bloodTypes, locations });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/donors/:id -> resolves either Donor or legacy User donor and returns unified shape
export const getDonorById = async (req, res) => {
  try {
    const rawId = String(req.params.id || '').trim();
    if (!rawId) return res.status(400).json({ error: 'Missing id' });

    let src = 'Donor';
    let id = rawId;
    const m = rawId.match(/^(donor|user):(.+)$/i);
    if (m) { src = m[1].toLowerCase() === 'user' ? 'User' : 'Donor'; id = m[2]; }

    let doc = null;
    if (src === 'Donor') {
      doc = await Donor.findById(id).lean();
      if (doc) {
        return res.json({
          _id: `donor:${doc._id}`,
          name: doc.fullName,
          email: doc.email,
          bloodType: doc.bloodGroup,
          location: doc.district,
          phone: doc.phone,
          availability: doc.availabilityStatus === 'available',
          _src: 'Donor',
          // extra fields
          gender: doc.gender,
          lastDonationDate: doc.lastDonationDate,
          weightKg: doc.weightKg,
          emergencyContact: doc.emergencyContact,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        });
      }
    }

    // fallback to legacy User donor
    const userDoc = await User.findById(id).select('-password').lean();
    if (userDoc) {
      return res.json({
        _id: `user:${userDoc._id}`,
        name: userDoc.name,
        email: userDoc.email,
        bloodType: userDoc.bloodType,
        location: userDoc.location,
        phone: userDoc.phone,
        availability: !!userDoc.availability,
        _src: 'User',
        createdAt: userDoc.createdAt,
        updatedAt: userDoc.updatedAt,
      });
    }

    return res.status(404).json({ error: 'Donor not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/donors/me - Get current user's donor profile
export const getMyDonor = async (req, res) => {
  try {
    const userId = req?.user?.id || req?.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const donor = await Donor.findOne({ user: userId }).lean();
    if (!donor) {
      return res.json({ exists: false, donor: null });
    }
    
    return res.json({ 
      exists: true, 
      donor: {
        _id: donor._id,
        fullName: donor.fullName,
        email: donor.email,
        phone: donor.phone,
        bloodGroup: donor.bloodGroup,
        district: donor.district,
        availabilityStatus: donor.availabilityStatus,
        lastDonationDate: donor.lastDonationDate,
        nextAvailableDate: donor.nextAvailableDate,
        medicalCondition: donor.medicalCondition,
        eligibilityStatus: donor.eligibilityStatus,
        eligibilityReason: donor.eligibilityReason,
        eligibilityConfidence: donor.eligibilityConfidence,
        eligibilityConfidencePercent: donor.eligibilityConfidencePercent,
        eligibilityCheckedAt: donor.eligibilityCheckedAt,
      }
    });
  } catch (err) {
    console.error('[getMyDonor] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/donors/me/recheck-eligibility - Re-run ML eligibility for existing donor (optional hb in body)
export const recheckEligibility = async (req, res) => {
  try {
    const userId = req?.user?.id || req?.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const donor = await Donor.findOne({ user: userId }).lean();
    if (!donor) return res.status(404).json({ error: 'Donor not found' });
    const hb = req.body?.hb != null ? Number(req.body.hb) : null;
    const totalDonations = await Donation.countDocuments({ donorId: donor.user });
    const donorPayload = { ...donor, hb };
    const eligibilityResult = await checkDonorEligibility(donorPayload, totalDonations);
    const newStatus = eligibilityResult.eligible === true ? 'ELIGIBLE'
      : eligibilityResult.eligible === false ? 'NOT_ELIGIBLE' : 'UNKNOWN';
    const updatePayload = {
      eligibilityStatus: newStatus,
      eligibilityReason: newStatus === 'UNKNOWN' ? 'Eligibility check unavailable. Please try again.' : (eligibilityResult.reason || null),
      eligibilityConfidencePercent: eligibilityResult.confidencePercent ?? null,
      eligibilityConfidence: eligibilityResult.confidencePercent != null ? eligibilityResult.confidencePercent / 100 : null,
      eligibilityCheckedAt: new Date(),
      eligibilityRaw: eligibilityResult.raw || null,
    };
    await Donor.findByIdAndUpdate(donor._id, updatePayload);
    const updated = await Donor.findById(donor._id).lean();
    return res.json({
      eligibilityStatus: updated.eligibilityStatus,
      eligibilityReason: updated.eligibilityReason,
      eligibilityConfidence: updated.eligibilityConfidence,
      eligibilityConfidencePercent: updated.eligibilityConfidencePercent,
      eligibilityCheckedAt: updated.eligibilityCheckedAt,
      donor: updated,
    });
  } catch (err) {
    console.error('[recheckEligibility] Error:', err?.message || err);
    return res.status(500).json({ error: err.message });
  }
};
