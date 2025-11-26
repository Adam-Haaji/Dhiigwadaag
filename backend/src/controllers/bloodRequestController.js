import BloodRequest from '../models/BloodRequest.js';
import Donor from '../models/Donor.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

function computeMenus(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'both' || r === 'admin') return ['home', 'donor', 'request', 'notification', 'profile'];
  if (r === 'donor') return ['home', 'donor', 'notification', 'profile'];
  if (r === 'requester') return ['home', 'request', 'notification', 'profile'];
  return ['home'];
}

export const createBloodRequest = async (req, res) => {
  try {
    const requesterId = req?.user?.id || req?.user?._id;
    if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      patientName,
      bloodGroup,
      district,
      units,
      contactPerson,
      contactPhone,
      urgentLevel,
      reason,
      additionalNote,
      donorId,
      contactInfo, // optional alias from spec (location/hospital/area)
      lat,
      lng,
    } = req.body || {};

    // Basic validation (Mongoose will validate again)
    const required = [patientName, bloodGroup, district, contactPerson, contactPhone, urgentLevel, reason];
    if (required.some((v) => v === undefined || v === null || String(v).trim() === '')) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!Number.isFinite(Number(units)) || Number(units) < 1) {
      return res.status(400).json({ error: 'Invalid units: must be a positive number' });
    }
    // lightweight phone sanity
    if (!/^[0-9+\-()\s]{6,20}$/.test(String(contactPhone))) {
      return res.status(400).json({ error: 'Invalid contact phone' });
    }

    let doc = await BloodRequest.create({
      patientName: String(patientName).trim(),
      bloodGroup,
      district: district || String(contactInfo || '').trim() || 'Unknown',
      units: (Number.isFinite(Number(units)) && Number(units) >= 1) ? Number(units) : 1,
      contactPerson: String(contactPerson).trim(),
      contactPhone: String(contactPhone).trim(),
      urgentLevel,
      reason: String(reason).trim(),
      additionalNote: additionalNote ? String(additionalNote) : '',
      donorId: donorId || undefined,
      requesterId,
    });
    // Broadcast a notification to every user: New Blood Request
    try {
      // Notify only donors with same blood group (optionally near 50km if coords provided)
      const donorsQ = { bloodGroup: doc.bloodGroup };
      let donors = await Donor.find(donorsQ).select('user district location coordinates').lean();
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        donors = donors.filter(d => {
          const dLat = d?.coordinates?.lat; const dLng = d?.coordinates?.lng;
          if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) return true; // keep if no coords info
          const toRad = (x) => x * Math.PI / 180;
          const R = 6371; // km
          const dLatR = toRad(dLat - lat);
          const dLngR = toRad(dLng - lng);
          const a = Math.sin(dLatR/2)**2 + Math.cos(toRad(lat))*Math.cos(toRad(dLat))*Math.sin(dLngR/2)**2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distKm = R * c;
          return distKm <= 50;
        });
      }
      const userIds = donors.map(d => d.user).filter(Boolean);
      const urgencyLabel = String(urgentLevel).toLowerCase();
      const isUrgent = urgencyLabel === 'high' || urgencyLabel === 'critical';
      const notifications = userIds.map((uid) => ({
        userId: uid,
        title: 'New Blood Request',
        message: `A new request for blood type ${doc.bloodGroup} has been created near your location. Please check if you can help.`,
        type: 'request',
        urgent: isUrgent,
        meta: { source: 'blood-request', requestId: doc._id, bloodGroup: doc.bloodGroup, district: doc.district, urgentLevel: doc.urgentLevel, requesterId },
      }));
      if (notifications.length) await Notification.insertMany(notifications);
    } catch (notifyErr) {
      console.error('Broadcast notification error:', notifyErr?.message || notifyErr);
    }
    // Auto-match an available donor: same blood type, available, within 50km if coords provided; else by district.
    try {
      if (!doc.donorId) {
        let donor = null;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          // Prefer geospatial within 50km
          try {
            donor = await Donor.findOne({
              bloodGroup: doc.bloodGroup,
              availabilityStatus: 'available',
              isActive: true,
              location: {
                $near: {
                  $geometry: { type: 'Point', coordinates: [lng, lat] },
                  $maxDistance: 50 * 1000,
                },
              },
            });
          } catch (_) {
            // fall back to non-geo
          }
        }
        if (!donor) {
          donor = await Donor.findOne({ bloodGroup: doc.bloodGroup, district: doc.district, availabilityStatus: 'available', isActive: true });
        }
        if (donor) {
          doc.status = 'matched';
          doc.donorId = donor._id;
          donor.matchedRequest = doc._id;
          await donor.save();
          await doc.save();
          // Notify requester and donor
          const notes = [];
          notes.push({
            userId: doc.requesterId,
            title: 'Donor Matched',
            message: `A donor has been found for ${doc.patientName} (${doc.bloodGroup}) in ${doc.district}.`,
            type: 'request',
            urgent: ['high','critical'].includes(String(doc.urgentLevel)),
            meta: { source: 'blood-request', requestId: doc._id, status: 'matched', urgency: doc.urgentLevel },
          });
          if (donor.user) {
            notes.push({
              userId: donor.user,
              title: 'You have been matched',
              message: `You are matched to donate ${doc.bloodGroup} for ${doc.patientName} in ${doc.district}.`,
              type: 'request',
              urgent: ['high','critical'].includes(String(doc.urgentLevel)),
              meta: { source: 'blood-request', requestId: doc._id, status: 'matched', urgency: doc.urgentLevel },
            });
          }
          if (notes.length) await Notification.insertMany(notes);
        }
      }
    } catch (err) {
      // Matching/notification failure shouldn't break request creation
      console.error('Auto-match error:', err?.message || err);
    }
    // Update requesting user's role -> requester/both
    let updatedUser = null;
    try {
      const user = await User.findById(requesterId);
      if (user) {
        const current = String(user.role || '').toLowerCase();
        user.role = (current === 'donor' || current === 'both') ? 'both' : 'requester';
        await user.save();
        updatedUser = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          donorStatus: user.donorStatus,
          unavailableUntil: user.unavailableUntil,
          menus: computeMenus(user.role),
        };
      }
    } catch (e) {
      console.error('Failed to update user to requester/both:', e?.message || e);
    }

    return res.status(201).json({ request: doc, user: updatedUser });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getBloodRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await BloodRequest.findById(id)
      .populate('requesterId', 'name email phone')
      .populate('donorId', 'fullName phone bloodGroup district availabilityStatus user');
    if (!doc) return res.status(404).json({ error: 'Request not found' });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateBloodRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = ['pending', 'matched', 'accepted', 'donated', 'completed', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const requesterId = req?.user?.id || req?.user?._id;
    const doc = await BloodRequest.findById(id);
    if (!doc) return res.status(404).json({ error: 'Request not found' });
    // Only the owner can update status (basic rule)
    if (String(doc.requesterId) !== String(requesterId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    doc.status = status;
    if (status === 'donated' && !doc.fulfilledAt) doc.fulfilledAt = new Date();
    await doc.save();
    // Notify requester (self) and optionally donor user
    try {
      const notes = {
        pending: 'Your request is pending. We are looking for donors.',
        matched: 'A donor has been found for your request.',
        accepted: 'The donor accepted your request.',
        donated: 'Donation completed by donor.',
        completed: 'Request fulfilled and completed.',
        cancelled: 'Request has been cancelled.'
      };
      await Notification.create({
        userId: doc.requesterId,
        title: `Request ${status}`,
        message: notes[status] || `Status changed to ${status}.`,
        type: 'request',
        urgent: ['high','critical'].includes(String(doc.urgentLevel)),
        meta: { source: 'blood-request', requestId: doc._id, status, urgency: doc.urgentLevel },
      });
    } catch (notifyErr) {
      console.error('Status notification error:', notifyErr?.message || notifyErr);
    }
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/blood-requests/:id/donor-confirm
// Donor confirms they have donated ("I Have Donated")
export const donorConfirmDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { donorId: donorIdBody } = req.body || {};

    const doc = await BloodRequest.findById(id);
    if (!doc) return res.status(404).json({ error: 'Request not found' });

    // Resolve acting donor: prefer currently matched donor, else lookup by user
    let donor = null;
    if (donorIdBody) {
      donor = await Donor.findById(donorIdBody);
    }
    if (!donor && req.user?.id) {
      donor = await Donor.findOne({ user: req.user.id });
    }
    if (!donor) return res.status(400).json({ error: 'Donor not identified' });

    // If a donor is already matched to this request, only that donor can confirm
    if (doc.donorId && String(doc.donorId) !== String(donor._id)) {
      return res.status(403).json({ error: 'Forbidden: you are not the matched donor for this request' });
    }

    // Update request fulfillment fields
  doc.status = 'donated';
    doc.fulfilledBy = donor._id;
  if (!doc.fulfilledAt) doc.fulfilledAt = new Date();
  if (!doc.fulfilledDate) doc.fulfilledDate = doc.fulfilledAt;
    await doc.save();

    // Update donor availability (3 months cooldown)
    donor.lastDonationDate = new Date();
    donor.nextAvailableDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    donor.isActive = false;
    donor.availabilityStatus = 'unavailable';
    await donor.save();

    // Notifications: requester and (optionally) admins later
    try {
      const notes = [];
      if (doc.requesterId) {
        notes.push({
          userId: doc.requesterId,
          title: 'Donation Fulfilled',
          message: `Your blood request has been fulfilled successfully by ${donor.fullName || 'a donor'}.`,
          type: 'request',
          urgent: ['high','critical'].includes(String(doc.urgentLevel)),
          meta: { source: 'blood-request', requestId: doc._id, status: 'donated' },
        });
      }
      if (donor.user) {
        notes.push({
          userId: donor.user,
          title: 'Thank you for donating',
          message: 'Donation successfully fulfilled and recorded. You will be available again after 3 months.',
          type: 'request',
          urgent: false,
          meta: { source: 'blood-request', requestId: doc._id, status: 'donated' },
        });
      }
      if (notes.length) await Notification.insertMany(notes);
    } catch (notifyErr) {
      console.error('Donor confirm notify error:', notifyErr?.message || notifyErr);
    }

    return res.json({ success: true, message: 'Donation successfully fulfilled and recorded.', data: doc });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/blood-requests/:id/verify
export const verifyDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const adminName = req.user?.name || 'admin';
    const doc = await BloodRequest.findById(id);
    if (!doc) return res.status(404).json({ error: 'Request not found' });

    doc.verified = true;
    doc.verifiedBy = adminName;
    doc.verifiedDate = new Date();
    // If status was donated, move to completed
    if (doc.status === 'donated') doc.status = 'completed';
    await doc.save();

    try {
      const notifications = [];
      if (doc.requesterId) {
        notifications.push({
          userId: doc.requesterId,
          title: 'Donation Verified',
          message: 'Donation verified successfully by admin.',
          type: 'request',
          urgent: ['high','critical'].includes(String(doc.urgentLevel)),
          meta: { source: 'blood-request', requestId: doc._id, status: 'verified' },
        });
      }
      if (doc.donorId) {
        const donor = await Donor.findById(doc.donorId).select('user');
        if (donor?.user) {
          notifications.push({
            userId: donor.user,
            title: 'Donation Verified',
            message: 'Your donation has been verified. Thank you!',
            type: 'request',
            urgent: false,
            meta: { source: 'blood-request', requestId: doc._id, status: 'verified' },
          });
        }
      }
      if (notifications.length) await Notification.insertMany(notifications);
    } catch (notifyErr) {
      console.error('Verify notify error:', notifyErr?.message || notifyErr);
    }

    return res.json({ success: true, message: 'Donation verified successfully by admin.', data: doc });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /api/blood-requests/:id/proof
export const uploadProof = async (req, res) => {
  try {
    const { id } = req.params;
    const { proofImage } = req.body || {};
    if (!proofImage || typeof proofImage !== 'string') {
      return res.status(400).json({ error: 'proofImage (URL string) is required' });
    }
    const doc = await BloodRequest.findById(id);
    if (!doc) return res.status(404).json({ error: 'Request not found' });
    doc.proofImage = proofImage;
    await doc.save();
    return res.json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAvailableDonors = async (req, res) => {
  try {
    const { bloodGroup, district } = req.query;
    const q = { availabilityStatus: 'available' };
    if (bloodGroup) q.bloodGroup = String(bloodGroup).toUpperCase();
    if (district) q.district = String(district);
    const donors = await Donor.find(q).select('fullName phone email district bloodGroup availabilityStatus');
    return res.json(donors);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/blood-requests/:id/iam-matched
// Returns { isMatched: boolean } for the current user
export const iamMatchedDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const doc = await BloodRequest.findById(id).select('donorId');
    if (!doc) return res.status(404).json({ error: 'Request not found' });
    if (!doc.donorId) return res.json({ isMatched: false });
    const donor = await Donor.findOne({ user: userId }).select('_id');
    if (!donor) return res.json({ isMatched: false });
    const isMatched = String(doc.donorId) === String(donor._id);
    return res.json({ isMatched });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
