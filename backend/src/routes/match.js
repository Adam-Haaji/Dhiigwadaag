import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import Donor from '../models/Donor.js';
import Request from '../models/Request.js';
import BloodRequest from '../models/BloodRequest.js';
import Notification from '../models/Notification.js';
import { yearsBetween, addDays } from '../utils/dateUtils.js';
import { getPriorityTiers, tierLabel } from '../utils/bloodPriority.js';
import { notifyDonorEmergency } from '../services/notificationDelivery.js';

const router = express.Router();
const RADIUS_KM = Number(process.env.MATCH_RADIUS_KM || 30);

function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad((b.lat || b.latitude) - (a.lat || a.latitude));
  const dLon = toRad((b.lng || b.longitude) - (a.lng || a.longitude));
  const lat1 = toRad(a.lat || a.latitude);
  const lat2 = toRad(b.lat || b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * y;
}

function isEligibleByDonation(d) {
  if (!d?.lastDonationDate) return true;
  const nextAvail = d.nextAvailableDate || addDays(d.lastDonationDate, 90);
  return new Date(nextAvail).getTime() <= Date.now();
}

function donorAge(d) {
  if (typeof d?.age === 'number') return d.age;
  if (d?.dateOfBirth) return yearsBetween(d.dateOfBirth);
  return undefined;
}

function withinProximity(reqLoc, donor) {
  // Prefer coordinates if both sides have them; else fallback to district match
  const rLat = reqLoc?.lat ?? reqLoc?.latitude;
  const rLng = reqLoc?.lng ?? reqLoc?.longitude;
  const dLat = donor?.coordinates?.lat;
  const dLng = donor?.coordinates?.lng;
  if (Number.isFinite(rLat) && Number.isFinite(rLng) && Number.isFinite(dLat) && Number.isFinite(dLng)) {
    const dist = haversineKm({ lat: rLat, lng: rLng }, { lat: dLat, lng: dLng });
    return dist <= RADIUS_KM;
  }
  // Fallback: district or location string match
  if (reqLoc?.district && donor?.district) return String(reqLoc.district).toLowerCase() === String(donor.district).toLowerCase();
  if (reqLoc?.location && donor?.district) return String(reqLoc.location).toLowerCase() === String(donor.district).toLowerCase();
  return true; // if no info, don't exclude by location
}

router.post('/request', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const requestId = body.requestId;
    let reqDoc = null;
    let sourceType = 'Request';
    if (requestId) {
      reqDoc = await Request.findById(requestId).lean();
      if (!reqDoc) {
        // try BloodRequest
        const br = await BloodRequest.findById(requestId).lean();
        if (br) {
          sourceType = 'BloodRequest';
          reqDoc = { _id: br._id, bloodType: br.bloodGroup, location: br.district, urgency: (String(br.urgentLevel).toLowerCase() === 'critical' ? 'Critical' : (String(br.urgentLevel).toLowerCase() === 'high' ? 'Urgent' : 'Normal')), requesterId: br.requesterId, patientName: br.patientName, contactPhone: br.contactPhone };
        }
      }
    }
    // Normalize request fields
    const bloodType = body.bloodType || body.bloodGroup || reqDoc?.bloodType;
    const district = body.district || body.location || reqDoc?.location;
    const urgency = body.urgency || body.urgentLevel || reqDoc?.urgency || 'Normal';
    const coords = { lat: body.lat ?? body.latitude, lng: body.lng ?? body.longitude };
    if (!bloodType) return res.status(400).json({ success: false, message: 'bloodType/bloodGroup is required' });

    // Priority tiers search sequence
    const tiers = getPriorityTiers(bloodType);
    const hasCoords = Number.isFinite(coords?.lat) && Number.isFinite(coords?.lng);
    let chosenTierIndex = -1;
    let top = [];
    let searchedBloodGroups = [];

    for (let i = 0; i < tiers.length; i++) {
      const tierBloods = tiers[i];
      searchedBloodGroups = tierBloods; // last attempted
      // Query donors for ANY of the blood groups in this tier
      let donors = [];
      if (hasCoords) {
        try {
          const meters = (RADIUS_KM || 30) * 1000;
          donors = await Donor.find({
            bloodGroup: { $in: tierBloods },
            availabilityStatus: 'available',
            isActive: true,
            location: {
              $near: {
                $geometry: { type: 'Point', coordinates: [coords.lng, coords.lat] },
                $maxDistance: meters,
              },
            },
          }).limit(150).populate('user');
        } catch (e) {
          donors = await Donor.find({ bloodGroup: { $in: tierBloods } }).populate('user');
        }
      } else {
        donors = await Donor.find({ bloodGroup: { $in: tierBloods } }).populate('user');
      }

      const filtered = donors.filter((d) => {
        const age = donorAge(d);
        if (typeof age === 'number' && (age < 18 || age > 65)) return false;
        const eligible = d.isActive !== undefined ? d.isActive : isEligibleByDonation(d);
        if (!eligible || String(d.availabilityStatus) !== 'available') return false;
        return withinProximity({ district, ...coords }, d);
      });

      if (!filtered.length) continue;

      // rank by proximity
      const rLat = coords?.lat; const rLng = coords?.lng;
      const withDistance = filtered.map(d => {
        const dLat = d?.coordinates?.lat; const dLng = d?.coordinates?.lng;
        let dist = null;
        if (Number.isFinite(rLat) && Number.isFinite(rLng) && Number.isFinite(dLat) && Number.isFinite(dLng)) {
          dist = haversineKm({ lat: rLat, lng: rLng }, { lat: dLat, lng: dLng });
        }
        return { donor: d, distanceKm: dist };
      });
      const sorted = withDistance.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
      top = sorted.slice(0, Math.min(sorted.length, 3));
      chosenTierIndex = i;
      break; // stop at first non-empty tier
    }

    // Set request status to Matched and record matched donor if available
    if (reqDoc && reqDoc._id) {
      const meta = {};
      if (chosenTierIndex >= 0) {
        meta.matchedTier = tierLabel(chosenTierIndex);
        meta.tierUsed = searchedBloodGroups;
      }
      await Request.findByIdAndUpdate(reqDoc._id, { $set: { status: 'Matched', ...meta } }).catch(() => {});
      if (sourceType === 'BloodRequest') {
        const updates = { status: top.length ? 'matched' : 'pending' };
        if (top.length > 0 && top[0]?.donor?._id) {
          updates.donorId = top[0].donor._id;
          try {
            await Donor.findByIdAndUpdate(top[0].donor._id, { $set: { matchedRequest: reqDoc._id } }).catch(() => {});
          } catch (_) {}
        }
        await BloodRequest.findByIdAndUpdate(reqDoc._id, { $set: updates }).catch(() => {});
      }
    }

    // Step 4: Notify matched donors
    const notified = [];
    for (const item of top) {
      const d = item.donor;
      if (!d) continue;
      const tlabel = chosenTierIndex >= 0 ? tierLabel(chosenTierIndex) : 'Match';
      const title = 'Urgent Blood Match';
      const message = `You are matched (${tlabel}) for patient needing ${bloodType} near ${district || 'your area'}.`;
      // Save app notification
      if (d.user) {
        await Notification.create({
          userId: d.user._id || d.user,
          title,
          message,
          type: 'request',
          urgent: String(urgency).toLowerCase() !== 'normal',
          meta: { requestId: reqDoc?._id, bloodType, location: district, tier: chosenTierIndex + 1, source: 'request' },
        });
      }
      // Try push/SMS
      await notifyDonorEmergency(d, { title, message, meta: { requestId: reqDoc?._id, bloodType, location: district, tier: chosenTierIndex + 1 } }).catch(() => {});
      notified.push(String(d._id));
    }

    // Build structured JSON response per spec
    const patientName = body.patientName || reqDoc?.patientName || 'Patient';
    const contactPhone = body.contactPhone || reqDoc?.contactPhone || (reqDoc?.requester?.phone) || '';
    const matchedDonors = top.map(({ donor, distanceKm }) => {
      const dist = typeof distanceKm === 'number' && Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(1)) : null;
      return {
        donor_id: String(donor._id),
        donor_name: donor.fullName,
        blood_type: donor.bloodGroup,
        distance_km: dist,
      };
    });

    // Include a broader list so the requester can see other nearby donors if needed
    const nearby_candidates = sorted.slice(0, Math.min(sorted.length, 20)).map(({ donor, distanceKm }) => ({
      donor_id: String(donor._id),
      donor_name: donor.fullName,
      blood_type: donor.bloodGroup,
      distance_km: typeof distanceKm === 'number' && Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(1)) : null,
    }));

    const request_status = matchedDonors.length > 0 ? 'Matched tier found' : 'No donors found';
    const messageOut = matchedDonors.length > 0 ? 'Matching completed successfully. Donors have been notified.' : 'No donors matched the priority tiers.';

    return res.json({
      request_status,
      matchedTier: chosenTierIndex >= 0 ? tierLabel(chosenTierIndex) : null,
      tierUsed: searchedBloodGroups,
      patientBloodType: bloodType,
      matched_donors: matchedDonors,
      nearby_candidates,
      message: messageOut,
    });
  } catch (e) {
    console.error('/api/match/request error:', e);
    return res.status(500).json({ success: false, message: e?.message || 'Internal error' });
  }
});

export default router;
