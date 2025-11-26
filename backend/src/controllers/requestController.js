import Request from '../models/Request.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import BloodRequest from '../models/BloodRequest.js';
import Donor from '../models/Donor.js';
import { evaluateEligibility } from '../utils/eligibility.js';

export const createRequest = async (req, res) => {
  try {
    const { patientName, bloodType } = req.body;
    let units = Number(req.body?.units);
    let { location, urgency, lat, lng } = req.body;
    // Normalize urgency to Normal/Urgent/Critical
    const u = String(urgency || 'Normal').toLowerCase();
    urgency = u === 'critical' ? 'Critical' : u === 'urgent' ? 'Urgent' : 'Normal';

    // Load requester details for richer notifications
    const requester = req.user?.id
      ? await User.findById(req.user.id).select('name bloodType phone location email').lean()
      : null;
    // If request location missing/unknown, fall back to requester.location
    if (!location || /^unknown$/i.test(String(location))) {
      location = requester?.location || 'Unknown';
    }
    // Validate units (require at least 1)
    if (!Number.isFinite(units) || units < 1) units = 1;

    const request = await Request.create({
      patientName,
      bloodType,
      location,
      urgency,
      units,
      requesterId: req.user?.id,
      requester: req.body?.requester || (requester
        ? { name: requester.name, phone: requester.phone, email: requester.email }
        : undefined),
    });

    // Broadcast a notification to EVERY user in the app so all users see the new request
    try {
      // Notify only donors with same blood type; optionally in same area
      const donorUsers = await User.find({ role: 'Donor', bloodType: bloodType }).select('_id location').lean();
      const notifications = donorUsers.map((u) => ({
        userId: u._id,
        title: 'New Blood Request',
        message: `A new request for blood type ${bloodType} has been created near your location. Please check if you can help.`,
        type: 'request',
        urgent: String(urgency).toLowerCase() === 'critical' || String(urgency).toLowerCase() === 'urgent',
        meta: {
          requestId: request._id,
          bloodType,
          location,
          urgency,
          requesterId: req.user?.id,
          requesterName: requester?.name,
        },
      }));
      if (notifications.length) await Notification.insertMany(notifications);
    } catch (notifyErr) {
      // Log and continue without failing the request creation
      console.error('Notification enqueue error:', notifyErr?.message || notifyErr);
    }
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getRequests = async (req, res) => {
  try {
    const me = req.user?.id;
    const requests = await Request.find({ requesterId: me })
      .populate('requesterId matchedDonorId')
      .populate('contactedBy.donorId');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Legacy AI match endpoint removed

// POST /api/requests/emergency
export const emergencyBroadcast = async (req, res) => {
  try {
    const { bloodType, location, message } = req.body;
    const q = { role: 'Donor', availability: true };
    if (bloodType) q.bloodType = bloodType;
    if (location) q.location = { $regex: new RegExp(location, 'i') };
    const donors = await User.find(q).select('_id');
    const notifications = donors.map((d) => ({
      userId: d._id,
      title: 'Emergency Blood Request',
      message: message || `Emergency alert for ${bloodType || 'any'} blood near ${location || 'your area'}`,
      type: 'emergency',
      urgent: true,
      meta: { bloodType, location },
    }));
    if (notifications.length) await Notification.insertMany(notifications);
    res.json({ success: true, notified: donors.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/requests/:id - fetch a single request with requester details
export const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    // Try legacy Request first
    let doc = await Request.findById(id)
      .populate('requesterId', 'name email phone bloodType location')
      .populate('matchedDonorId', 'name email phone')
      .populate('contactedBy.donorId');
    if (doc) {
      // Only requester (owner) or matched donor (via donor user) can view legacy doc
      const isOwner = String(doc.requesterId?._id || doc.requesterId) === String(req.user?.id);
      let isMatchedDonorUser = false;
      try {
        if (doc.matchedDonorId) {
          const donor = await Donor.findById(doc.matchedDonorId).select('user');
          isMatchedDonorUser = donor?.user && String(donor.user) === String(req.user?.id);
        }
      } catch {}
      if (!isOwner && !isMatchedDonorUser && String(req.user?.role||'').toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      return res.json(doc);
    }

    // Fallback: Try new BloodRequest and map to legacy shape expected by old detail screen
    const br = await BloodRequest.findById(id)
      .populate('requesterId', 'name email phone bloodType location')
      .populate('donorId', 'fullName phone bloodGroup district availabilityStatus user');
    if (!br) return res.status(404).json({ error: 'Request not found' });

    // Map BloodRequest -> legacy Request-like response
    const urgencyMap = (u) => {
      const v = String(u || '').toLowerCase();
      if (v === 'critical') return 'Critical';
      if (v === 'high' || v === 'medium') return 'Urgent';
      return 'Normal';
    };
    const mapped = {
      _id: br._id,
      patientName: br.patientName,
      bloodType: br.bloodGroup, // legacy expects 'bloodType'
      location: br.district,    // legacy expects 'location'
      units: br.units,
      urgency: urgencyMap(br.urgentLevel),
      status: br.status,
      requesterId: br.requesterId,
      matchedDonorId: br.donorId ? {
        _id: br.donorId._id,
        name: br.donorId.fullName,
        phone: br.donorId.phone,
        bloodType: br.donorId.bloodGroup,
        location: br.donorId.district,
        availability: br.donorId.availabilityStatus === 'available',
      } : undefined,
      matchedDonorUser: br.donorId?.user || undefined,
      createdAt: br.createdAt,
      updatedAt: br.updatedAt,
    };
    // Only requester (owner) or matched donor user may view mapped BR
    const isOwner = String(mapped.requesterId?._id || mapped.requesterId) === String(req.user?.id);
    let isMatchedDonorUser = false;
    try {
      if (br.donorId?.user) isMatchedDonorUser = String(br.donorId.user) === String(req.user?.id);
    } catch {}
    if (!isOwner && !isMatchedDonorUser && String(req.user?.role||'').toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/requests/:id/respond
export const respondToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { donorId, method } = req.body || {};
    if (!donorId || !method) {
      return res.status(400).json({ success: false, message: 'donorId and method are required' });
    }
    const allowed = ['call', 'whatsapp', 'donate'];
    if (!allowed.includes(String(method))) {
      return res.status(400).json({ success: false, message: 'Invalid method' });
    }

    const doc = await Request.findById(id)
      .populate('requesterId', 'name email phone')
      .populate('contactedBy.donorId');
    if (!doc) return res.status(404).json({ success: false, message: 'Request not found' });
    if (doc.status === 'Fulfilled') {
      return res.status(400).json({ success: false, message: 'Request already fulfilled' });
    }

    // Determine next status (donation path requires eligibility re-check)
    const nextStatus = method === 'donate' ? 'Fulfilled' : 'Contacted';
    // Log response first
    doc.contactedBy = [...(doc.contactedBy || []), { donorId, method, date: new Date() }];

    if (method === 'donate') {
      // Eligibility authoritative re-check before fulfillment
      try {
        const donor = await Donor.findById(donorId).populate('user');
        if (!donor || !donor.user) {
          return res.status(403).json({ success: false, message: 'Donor profile not found for fulfillment' });
        }
        const u = donor.user;
        const elig = evaluateEligibility({ age: u.age, weightKg: u.weightKg, gender: u.gender, hb: u.hb, lastDonationDate: donor.lastDonationDate || u.lastDonationDate });
        if (!elig.eligible) {
          return res.status(403).json({ success: false, message: elig.reason, code: elig.code });
        }
        // Proceed with fulfillment
        doc.status = 'Fulfilled';
        doc.fulfilledAt = new Date();
        doc.fulfilledDate = doc.fulfilledAt;
        doc.fulfilledBy = donorId;
        await doc.save();
        donor.lastDonationDate = new Date();
        donor.nextAvailableDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        donor.isActive = false;
        donor.availabilityStatus = 'unavailable';
        await donor.save();
        // Mirror cooldown to User document
        try {
          const userDoc = await User.findById(u._id || u.id);
          if (userDoc) {
            userDoc.lastDonationDate = donor.lastDonationDate;
            userDoc.unavailableUntil = donor.nextAvailableDate;
            userDoc.donorStatus = 'unavailable';
            await userDoc.save();
          }
        } catch (mirrorErr) {
          console.error('Mirror cooldown to user failed:', mirrorErr?.message || mirrorErr);
        }
      } catch (e) {
        console.error('Fulfill eligibility error:', e?.message || e);
        return res.status(500).json({ success: false, message: 'Could not verify eligibility' });
      }
    } else {
      doc.status = nextStatus;
      await doc.save();
    }

    // Notify requester about the donor response / fulfillment
    try {
      if (doc.requesterId) {
        const requesterUserId = typeof doc.requesterId === 'object' ? doc.requesterId._id : doc.requesterId;
        if (method === 'donate') {
          await Notification.create({
            userId: requesterUserId,
            title: 'Request Fulfilled',
            message: `Your blood request has been fulfilled successfully${donorId ? ' by a donor' : ''}.`,
            type: 'request',
            urgent: false,
            meta: { requestId: doc._id, status: 'Fulfilled', source: 'request' },
          });
        } else {
          await Notification.create({
            userId: requesterUserId,
            title: 'Donor Response',
            message: `A donor ${`contacted you via ${method}`} for ${doc.bloodType} blood`,
            type: 'request',
            urgent: false,
            meta: { requestId: doc._id, method, source: 'request' },
          });
        }
      }
    } catch (notifyErr) {
      console.error('Notify requester (respond) error:', notifyErr?.message || notifyErr);
    }

    return res.json({ success: true, message: 'Response logged successfully', data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/requests/:id/mark-fulfilled
export const markFulfilled = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Request.findById(id)
      .populate('requesterId', 'name email phone role')
      .populate('matchedDonorId', 'name email phone')
      .populate('contactedBy.donorId');
    if (!doc) return res.status(404).json({ success: false, message: 'Request not found' });

    // Authorization: requester, admin, or the matched donor can mark fulfilled
    let actingDonor = null;
    if (req.user) {
      const isOwner = doc.requesterId && String(doc.requesterId._id || doc.requesterId) === String(req.user.id);
      const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';
      if (!isOwner && !isAdmin) {
        // Allow donor linked to current user
        try {
          actingDonor = await Donor.findOne({ user: req.user.id });
        } catch (_) {}
        if (!actingDonor) {
          return res.status(403).json({ success: false, message: 'Forbidden: not allowed to fulfill this request' });
        }
      }

      // If a matched donor is set, enforce only that donor's user (or admin) can fulfill
      if (doc.matchedDonorId && !isAdmin) {
        const matchedUserId = String(doc.matchedDonorId._id || doc.matchedDonorId);
        if (String(req.user.id) !== matchedUserId) {
          return res.status(403).json({ success: false, message: 'Forbidden: you are not the matched donor for this request' });
        }
      }
    }

    if (doc.status === 'Fulfilled') {
      return res.json({ success: true, message: 'Request already fulfilled', data: doc });
    }

  // Eligibility authoritative re-check if donor is acting
  if (actingDonor) {
    try {
      const u = await User.findById(actingDonor.user).lean();
      if (u) {
        const elig = evaluateEligibility({ age: u.age, weightKg: u.weightKg, gender: u.gender, hb: u.hb, lastDonationDate: actingDonor.lastDonationDate || u.lastDonationDate });
        if (!elig.eligible) {
          return res.status(403).json({ success: false, message: elig.reason, code: elig.code });
        }
      }
    } catch (e) {
      console.error('MarkFulfilled eligibility error:', e?.message || e);
      return res.status(500).json({ success: false, message: 'Eligibility verification failed' });
    }
  }
  doc.status = 'Fulfilled';
  doc.fulfilledAt = new Date();
  doc.fulfilledDate = doc.fulfilledAt;
  if (actingDonor) doc.fulfilledBy = actingDonor._id;
    await doc.save();

    // Notify requester and contacted donors that request is fulfilled
    try {
      const notifications = [];
      if (doc.requesterId) {
        const requesterUserId = typeof doc.requesterId === 'object' ? doc.requesterId._id : doc.requesterId;
        notifications.push({
          userId: requesterUserId,
          title: 'Request Fulfilled',
          message: `Your request for ${doc.bloodType} has been fulfilled${actingDonor ? ` by ${actingDonor.fullName || 'a donor'}` : ''}. Thank you!`,
          type: 'request',
          urgent: false,
          meta: { requestId: doc._id, status: 'Fulfilled', source: 'request' },
        });
      }
      // Inform all contacted donors (map Donor -> User)
      const donorIds = (doc.contactedBy || []).map((c) => c.donorId).filter(Boolean);
      if (donorIds.length) {
        const donors = await Donor.find({ _id: { $in: donorIds } }).select('user');
        donors.forEach((d) => {
          if (d.user) {
            notifications.push({
              userId: d.user,
              title: 'Request Fulfilled',
              message: 'The blood request you responded to has been fulfilled. Thank you for your support!',
              type: 'request',
              urgent: false,
              meta: { requestId: doc._id, status: 'Fulfilled', source: 'request' },
            });
          }
        });
      }
      if (notifications.length) await Notification.insertMany(notifications);
    } catch (notifyErr) {
      console.error('Notify (fulfilled) error:', notifyErr?.message || notifyErr);
    }

    // If a donor is acting, apply cooldown
    try {
      if (actingDonor) {
        actingDonor.lastDonationDate = new Date();
        actingDonor.nextAvailableDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        actingDonor.isActive = false;
        actingDonor.availabilityStatus = 'unavailable';
        await actingDonor.save();
      }
    } catch (e) {
      console.error('Fulfill cooldown error:', e?.message || e);
    }

    return res.json({ success: true, message: 'Request marked as Fulfilled successfully.', data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/requests/:id
export const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Request.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Request not found' });
    return res.json({ success: true, message: 'Request deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/requests/:id/cancel - mark a request as Cancelled
export const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Request.findById(id)
      .populate('requesterId', 'name email phone role')
      .populate('contactedBy.donorId');
    if (!doc) return res.status(404).json({ success: false, message: 'Request not found' });

    // Authorization: only requester or admin can cancel
    if (req.user) {
      const isOwner = doc.requesterId && String(doc.requesterId._id || doc.requesterId) === String(req.user.id);
      const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden: not allowed to cancel this request' });
      }
    }

    if (doc.status === 'Cancelled') {
      return res.json({ success: true, message: 'Request already cancelled', data: doc });
    }

    doc.status = 'Cancelled';
    doc.cancelledAt = new Date();
    await doc.save();

    // Notify requester and contacted donors that request is cancelled
    try {
      const notifications = [];
      if (doc.requesterId) {
        const requesterUserId = typeof doc.requesterId === 'object' ? doc.requesterId._id : doc.requesterId;
        notifications.push({
          userId: requesterUserId,
          title: 'Request Cancelled',
          message: `Your request for ${doc.bloodType} has been cancelled.`,
          type: 'request',
          urgent: false,
          meta: { requestId: doc._id, status: 'Cancelled', source: 'request' },
        });
      }
      const donorIds = (doc.contactedBy || []).map((c) => c.donorId).filter(Boolean);
      if (donorIds.length) {
        const donors = await Donor.find({ _id: { $in: donorIds } }).select('user');
        donors.forEach((d) => {
          if (d.user) {
            notifications.push({
              userId: d.user,
              title: 'Request Cancelled',
              message: 'The blood request you responded to has been cancelled by the requester.',
              type: 'request',
              urgent: false,
              meta: { requestId: doc._id, status: 'Cancelled', source: 'request' },
            });
          }
        });
      }
      if (notifications.length) await Notification.insertMany(notifications);
    } catch (notifyErr) {
      console.error('Notify (cancelled) error:', notifyErr?.message || notifyErr);
    }

    return res.json({ success: true, message: 'Request cancelled successfully', data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/requests/matches/me - list requests matched to the current donor user
export const listMatchesForMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const donor = await Donor.findOne({ user: userId }).select('_id');
    const q = [];
    if (donor) {
      q.push({ fulfilledBy: donor._id });
    }
    // Legacy Request model uses matchedDonorId as User
    q.push({ matchedDonorId: userId });

    const [legacy, br] = await Promise.all([
      Request.find({ $or: q, status: { $in: ['Matched', 'Accepted'] } }).lean(),
      BloodRequest.find({ donorId: donor?._id, status: { $in: ['matched', 'accepted'] } }).lean(),
    ]);
    const mapped = [
      ...legacy.map(r => ({
        _id: r._id,
        bloodType: r.bloodType,
        location: r.location,
        status: r.status,
        matchedTier: r.matchedTier || null,
        tierUsed: r.tierUsed || null,
        createdAt: r.createdAt,
        _src: 'Request',
      })),
      ...br.map(b => ({
        _id: b._id,
        bloodType: b.bloodGroup,
        location: b.district,
        status: b.status === 'matched' ? 'Matched' : (b.status === 'accepted' ? 'Accepted' : b.status),
        matchedTier: null,
        tierUsed: null,
        createdAt: b.createdAt,
        _src: 'BloodRequest',
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/requests/:id/accept - donor accepts matched request
export const acceptDonation = async (req, res) => {
  try {
    const { id } = req.params;
    // Find acting donor from current user
    const actingDonor = await Donor.findOne({ user: req.user?.id }).select('_id user');
    if (!actingDonor) return res.status(403).json({ success: false, message: 'Forbidden: donor profile not found' });

    const doc = await Request.findById(id).populate('requesterId', 'name email phone');
    if (!doc) return res.status(404).json({ success: false, message: 'Request not found' });
    if (doc.status !== 'Matched') {
      return res.status(400).json({ success: false, message: 'Request is not in Matched state' });
    }
    // Optionally ensure this donor is the matched donor if set
    if (doc.matchedDonorId && String(doc.matchedDonorId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You are not the matched donor for this request' });
    }

    doc.status = 'Accepted';
    // Persist matched donor to current user to lock the pairing
    doc.matchedDonorId = req.user.id;
    await doc.save();

    try {
      if (doc.requesterId) {
        await Notification.create({
          userId: typeof doc.requesterId === 'object' ? doc.requesterId._id : doc.requesterId,
          title: 'Donor Accepted',
          message: 'A donor has accepted your request and is preparing to donate.',
          type: 'request',
          urgent: true,
          meta: { requestId: doc._id, status: 'Accepted', source: 'request' },
        });
      }
    } catch (e) { console.error('Notify accept error:', e?.message || e); }

    return res.json({ success: true, message: 'Request accepted', data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/requests/:id/complete - donor confirms donation (alias to fulfilled with eligibility check)
export const completeDonation = async (req, res) => {
  // Reuse markFulfilled logic by delegating
  return markFulfilled(req, res);
};
