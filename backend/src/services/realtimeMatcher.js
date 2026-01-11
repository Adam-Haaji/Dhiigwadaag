import Donor from '../models/Donor.js';
import User from '../models/User.js';
import Request from '../models/Request.js';
import BloodRequest from '../models/BloodRequest.js';
import Notification from '../models/Notification.js';
import { getPriorityTiers, tierLabel } from '../utils/bloodPriority.js';
import { getDistrictExpansionOrder } from '../utils/districtNeighbors.js';
import { evaluateEligibility } from '../utils/eligibility.js';

function norm(s) { return String(s || '').trim(); }

function donorMeetsHardPreconditions(d) {
  if (!d) return false;
  if (String(d.availabilityStatus) !== 'available') return false;
  if (d.isActive === false) return false; // inactive means within 90-day cooldown or disqualified
  // Extra eligibility safety check using available fields
  const elig = evaluateEligibility({
    age: d.age,
    weightKg: d.weightKg,
    gender: d.gender,
    hb: d.hb,
    lastDonationDate: d.lastDonationDate,
  });
  if (!elig.eligible) return false;
  // avoid assigning a donor already reserved
  if (d.matchedRequest) return false;
  return true;
}

function within90Days(date) {
  if (!date) return false;
  const last = new Date(date).getTime();
  return (Date.now() - last) < 90 * 24 * 60 * 60 * 1000;
}

async function findBestDonor({ bloodType, district }) {
  const tiers = getPriorityTiers(bloodType);
  const expansion = getDistrictExpansionOrder(district);
  for (let i = 0; i < tiers.length; i++) {
    const allowed = tiers[i];
    // Same-district first then expansion order (function already returns [district, neighbors, rest])
    for (const d of expansion) {
      // New Donor model first
      const candidates = await Donor.find({
        bloodGroup: { $in: allowed },
        district: d,
        availabilityStatus: 'available',
        isActive: true,
      }).limit(50).lean();
      const ok = candidates.find(dn => donorMeetsHardPreconditions(dn));
      if (ok) {
        return { donor: ok, tierIndex: i, tierUsed: allowed, districtTried: d };
      }

      // Fallback: legacy User donors (role-based)
      const users = await User.find({
        role: { $in: ['donor', 'both'] },
        bloodType: { $in: allowed },
        location: d,
      }).limit(100).lean();
      const userOk = users.find(u => {
        const available = (u.donorStatus === 'available') || (u.availability === true);
        if (!available) return false;
        if (within90Days(u.lastDonationDate)) return false;
        return true;
      });
      if (userOk) {
        return { donor: { _id: userOk._id, user: userOk._id, district: userOk.location, bloodGroup: userOk.bloodType, _src: 'User' }, tierIndex: i, tierUsed: allowed, districtTried: d };
      }
    }
  }
  return { donor: null, tierIndex: -1, tierUsed: [], districtTried: district };
}

export async function onRequestCreated(reqDocLike) {
  try {
    // Accept both Request and BloodRequest shapes
    const isBloodReq = !!reqDocLike.bloodGroup;
    const id = reqDocLike._id;
    const status = String(reqDocLike.status || (isBloodReq ? 'pending' : 'Pending'));
    const bloodType = isBloodReq ? reqDocLike.bloodGroup : reqDocLike.bloodType;
    const district = isBloodReq ? reqDocLike.district : reqDocLike.location;

    // Preconditions
    const pendingOk = isBloodReq ? status.toLowerCase() === 'pending' : status.toLowerCase() === 'pending';
    if (!pendingOk) {
      console.info('[matcher] Skip: request not pending', { id, status });
      return { matched: false, reason: 'not_pending' };
    }

    const { donor, tierIndex, tierUsed } = await findBestDonor({ bloodType, district });
    if (!donor) {
      console.info('[matcher] No donor found', { id, bloodType, district });
      return { matched: false, reason: 'no_donor' };
    }

    if (isBloodReq) {
      const req = await BloodRequest.findById(id);
      if (!req) return { matched: false, reason: 'request_missing' };
      req.status = 'matched';
      req.donorId = donor._id;
      req.matchedAt = new Date();
      await req.save();
      // Reserve donor
      if (donor._src === 'User') {
        await User.findByIdAndUpdate(donor.user, { $set: { donorStatus: 'unavailable', availability: false, unavailableUntil: new Date(Date.now() + 90*24*60*60*1000) } }).catch(()=>{});
      } else {
        await Donor.findByIdAndUpdate(donor._id, { $set: { matchedRequest: id, availabilityStatus: 'unavailable' } }).catch(()=>{});
      }
      // Notify donor and requester
      const notes = [];
      notes.push({
        userId: req.requesterId,
        title: 'Donor Matched',
        message: `A donor has been found for ${req.patientName} (${req.bloodGroup}) in ${req.district}.`,
        type: 'request',
        urgent: String(req.urgencyLevel).toLowerCase() === 'critical',
        meta: { requestId: req._id, status: 'matched', tier: tierLabel(tierIndex) },
      });
      if (donor.user) {
        notes.push({
          userId: donor.user,
          title: 'You are matched',
          message: `You are matched to donate ${req.bloodGroup} in ${req.district}.`,
          type: 'request',
          urgent: String(req.urgencyLevel).toLowerCase() === 'critical',
          meta: { requestId: req._id, status: 'matched', tier: tierLabel(tierIndex) },
        });
      }
      if (notes.length) await Notification.insertMany(notes);
      return { matched: true, donorId: donor._id, tierIndex, tierUsed };
    }

    // Legacy Request model
    const req = await Request.findById(id);
    if (!req) return { matched: false, reason: 'request_missing' };
    req.status = 'Matched';
    req.matchedDonorId = donor.user || null; // legacy field references User
    req.matchedAt = new Date();
    req.matchedTier = tierLabel(tierIndex);
    req.tierUsed = tierUsed;
    await req.save();
    // Reserve donor
    if (donor._src === 'User') {
      await User.findByIdAndUpdate(donor.user, { $set: { donorStatus: 'unavailable', availability: false, unavailableUntil: new Date(Date.now() + 90*24*60*60*1000) } }).catch(()=>{});
    } else {
      await Donor.findByIdAndUpdate(donor._id, { $set: { matchedRequest: id, availabilityStatus: 'unavailable' } }).catch(()=>{});
    }
    const notes = [];
    if (req.requesterId) {
      notes.push({
        userId: req.requesterId,
        title: 'Donor Matched',
        message: `A donor has been found for ${req.patientName} (${req.bloodType}) in ${req.location}.`,
        type: 'request',
        urgent: String(req.urgency).toLowerCase() !== 'normal',
        meta: { requestId: req._id, status: 'Matched', tier: tierLabel(tierIndex) },
      });
    }
    if (donor.user) {
      notes.push({
        userId: donor.user,
        title: 'You are matched',
        message: `You are matched to donate ${req.bloodType} in ${req.location}.`,
        type: 'request',
        urgent: String(req.urgency).toLowerCase() !== 'normal',
        meta: { requestId: req._id, status: 'Matched', tier: tierLabel(tierIndex) },
      });
    }
    if (notes.length) await Notification.insertMany(notes);
    return { matched: true, donorId: donor._id, tierIndex, tierUsed };
  } catch (e) {
    console.error('[matcher] Failed onRequestCreated', e?.message || e);
    return { matched: false, reason: 'error', error: e?.message || String(e) };
  }
}

export async function onDonorAvailable(donorLike) {
  try {
    const donor = await Donor.findById(donorLike._id || donorLike.id).lean();
    if (!donor || !donorMeetsHardPreconditions(donor)) {
      return { matched: false, reason: 'donor_not_eligible' };
    }
    // Check BloodRequests first
    const req = await BloodRequest.findOne({
      bloodGroup: donor.bloodGroup,
      district: donor.district,
      status: 'pending',
    }).sort({ createdAt: 1 }).lean();
    if (req) {
      return onRequestCreated(req);
    }
    // Then legacy Requests with compatible tiers
    // Find first pending request compatible with donor blood
    const allPending = await Request.find({ status: 'Pending' }).lean();
    for (const r of allPending) {
      const tiers = getPriorityTiers(r.bloodType);
      const compatible = tiers.some(arr => arr.includes(donor.bloodGroup));
      const sameOrNear = getDistrictExpansionOrder(r.location)[0] === donor.district || getDistrictExpansionOrder(r.location).slice(0, 4).includes(donor.district);
      if (compatible && sameOrNear) {
        return onRequestCreated(r);
      }
    }
    console.info('[matcher] Donor available but no pending request matched', { donor: donor._id });
    return { matched: false, reason: 'no_pending_request' };
  } catch (e) {
    console.error('[matcher] Failed onDonorAvailable', e?.message || e);
    return { matched: false, reason: 'error', error: e?.message || String(e) };
  }
}

export default { onRequestCreated, onDonorAvailable };

// Backfill matching for existing pending requests (both models)
export async function backfillPending({ limit = 100 } = {}) {
  let matched = 0;
  try {
    const legacy = await Request.find({ status: 'Pending' }).limit(limit).lean();
    for (const r of legacy) {
      const res = await onRequestCreated(r);
      if (res?.matched) matched++;
    }
  } catch (e) {
    console.error('[matcher] backfill legacy error:', e?.message || e);
  }
  try {
    const blood = await BloodRequest.find({ status: 'pending' }).limit(limit).lean();
    for (const r of blood) {
      const res = await onRequestCreated(r);
      if (res?.matched) matched++;
    }
  } catch (e) {
    console.error('[matcher] backfill blood-requests error:', e?.message || e);
  }
  console.log(`[matcher] backfill complete. Matched: ${matched}`);
  return { matched };
}
