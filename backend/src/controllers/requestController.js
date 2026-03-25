import Request from '../models/Request.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import BloodRequest from '../models/BloodRequest.js';
import Donor from '../models/Donor.js';
import { evaluateEligibility } from '../utils/eligibility.js';
import { getDistrictExpansionOrder } from '../utils/districtNeighbors.js';
import { isValidLocation } from '../utils/locations.js';
import { createNotificationOnce, filterNewNotifications } from '../utils/notificationHelper.js';

const pickMatchedDonorContact = async (doc) => {
  // Legacy Request: matchedDonorId is typically User._id; sometimes it may be a Donor._id
  const md = doc?.matchedDonorId;
  if (md && typeof md === 'object') {
    return {
      name: md?.name || md?.fullName || md?.email,
      phone: md?.phone,
      email: md?.email,
      location: md?.location || md?.district,
      bloodType: md?.bloodType || md?.bloodGroup,
    };
  }
  if (md) {
    const id = String(md);
    // Try as a User id first
    const u = await User.findById(id).select('name email phone location bloodType').lean().catch(() => null);
    if (u) {
      return { name: u?.name || u?.email, phone: u?.phone, email: u?.email, location: u?.location, bloodType: u?.bloodType };
    }
    // Then try as a Donor id
    const d = await Donor.findById(id).select('fullName phone email district bloodGroup user').lean().catch(() => null);
    if (d) {
      return {
        name: d?.fullName,
        phone: d?.phone,
        email: d?.email,
        location: d?.district,
        bloodType: d?.bloodGroup,
      };
    }
  }
  return null;
};

const pickMatchedDonorContactFromBloodRequest = async (br) => {
  // BloodRequest uses donorId -> Donor document
  const donor = br?.donorId;
  if (donor && typeof donor === 'object') {
    return {
      name: donor?.fullName || donor?.name,
      phone: donor?.phone,
      email: donor?.email,
      location: donor?.district || donor?.location,
      bloodType: donor?.bloodGroup || donor?.bloodType,
    };
  }
  if (donor) {
    const d = await Donor.findById(String(donor)).select('fullName phone email district bloodGroup').lean().catch(() => null);
    if (d) {
      return { name: d?.fullName, phone: d?.phone, email: d?.email, location: d?.district, bloodType: d?.bloodGroup };
    }
  }
  return null;
};

export const createRequest = async (req, res) => {
  try {
    const { patientName, bloodType } = req.body;
    let units = Number(req.body?.units);
    let { location, urgency, lat, lng } = req.body;
    const hospitalName = req.body?.hospitalName ? String(req.body.hospitalName).trim() : undefined;
    // Accept either contactPhone or phone for compatibility
    const contactPhone = req.body?.contactPhone ? String(req.body.contactPhone).trim() : (req.body?.phone ? String(req.body.phone).trim() : undefined);
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
    // Enforce standardized locations
    if (!isValidLocation(location)) {
      return res.status(400).json({ error: 'Invalid location. Please select a valid district.' });
    }
    // Validate units (require at least 1)
    if (!Number.isFinite(units) || units < 1) units = 1;

    // Calculate expiresAt: Critical = 24 hours, Normal/Urgent = 48 hours
    const now = new Date();
    const isCritical = String(urgency).toLowerCase() === 'critical';
    const expiryHours = isCritical ? 24 : 48;
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

    const request = await Request.create({
      patientName,
      bloodType,
      location,
      hospitalName,
      contactPhone,
      urgency,
      units,
      requesterId: req.user?.id,
      requester: req.body?.requester || (requester
        ? { name: requester.name, phone: requester.phone, email: requester.email }
        : undefined),
      expiresAt,
    });

    // Role upgrade disabled: keep main user role unchanged for strict requester flow
    try {
      const userDoc = await User.findById(req.user?.id);
      if (userDoc) {
        // No-op: preserve existing role
      }
    } catch (roleErr) {
      console.warn('Role check failed:', roleErr?.message || roleErr);
    }

    // Broadcast a notification to EVERY user in the app so all users see the new request
    try {
      // Notify donors with same blood type from Donor collection (not User collection)
      const Donor = (await import('../models/Donor.js')).default;
      const donorDocs = await Donor.find({ bloodGroup: bloodType, availabilityStatus: 'available', isActive: true })
        .populate('user', '_id')
        .select('user district')
        .lean();
      const notifications = donorDocs
        .filter(d => d.user && d.user._id) // Only donors with valid user reference
        .map((d) => ({
        userId: d.user._id,
        title: 'New Blood Request',
        message: `A new request for blood type ${bloodType} has been created near your location${hospitalName ? ` at ${hospitalName}` : ''}. Please check if you can help.`,
        type: 'request',
        urgent: String(urgency).toLowerCase() === 'critical' || String(urgency).toLowerCase() === 'urgent',
        meta: {
          requestId: request._id,
          bloodType,
          location,
          urgency,
          hospitalName,
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
    // Fire-and-forget real-time matcher for legacy Request model
    try {
      const { onRequestCreated } = await import('../services/realtimeMatcher.js');
      onRequestCreated(request).catch(() => {});
    } catch (_) {}
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

// POST /api/requests/emergency/create
export const createEmergencyRequest = async (req, res) => {
  try {
    const { bloodType, location, hospitalName, phone, units, reason } = req.body || {};
    if (!bloodType) return res.status(400).json({ error: 'bloodType is required' });
    if (!location) return res.status(400).json({ error: 'location is required' });
    if (!isValidLocation(location)) return res.status(400).json({ error: 'Invalid location. Please select a valid district.' });
    if (!phone || !/^\+?[0-9()\-\s]{7,}$/.test(String(phone))) return res.status(400).json({ error: 'valid phone is required' });

    // Prevent duplicate emergency within 30 minutes by same requester
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentSame = await Request.findOne({ requesterId: req.user.id, requestType: 'emergency', createdAt: { $gte: thirtyMinAgo } });
    if (recentSame) return res.status(429).json({ error: 'Please wait before creating another emergency request' });

    const doc = await Request.create({
      patientName: 'Emergency',
      bloodType: String(bloodType).toUpperCase(),
      location: String(location),
      hospitalName,
      contactPhone: String(phone),
      units: Number(units) > 0 ? Number(units) : undefined,
      urgency: 'Critical',
      status: 'Waiting',
      requestType: 'emergency',
      requesterId: req.user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      notes: reason ? String(reason).slice(0, 100) : undefined,
    });

    // Match donors: exact first then compatible; expand by district proximity
    const districts = getDistrictExpansionOrder(String(location));
    const type = String(bloodType).toUpperCase();
    const compatible = {
      'O-': ['O-'],
      'O+': ['O+', 'O-'],
      'A-': ['A-', 'O-'],
      'A+': ['A+', 'A-', 'O+', 'O-'],
      'B-': ['B-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'],
      'AB-': ['AB-', 'A-', 'B-', 'O-'],
      'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
    };
    const wanted = compatible[type] || [type];

    const donorCandidates = await Promise.all(districts.map((d) => (
      Donor.find({
        district: { $regex: new RegExp(d, 'i') },
        bloodGroup: { $in: wanted },
        availabilityStatus: 'available',
        isActive: true,
      }).select('_id user fullName phone bloodGroup district').lean()
    )));
    const donorsFlat = donorCandidates.flat();

    // Eligibility filter
    const eligibleDonors = [];
    for (const dn of donorsFlat) {
      try {
        const u = await User.findById(dn.user).lean();
        if (!u) continue;
        const elig = evaluateEligibility({ age: u.age, weightKg: u.weightKg, gender: u.gender, hb: u.hb, lastDonationDate: u.lastDonationDate });
        if (elig.eligible) eligibleDonors.push(dn);
      } catch {}
    }

    // Notify donors immediately with emergency type
    const notifications = eligibleDonors.map((dn) => ({
      userId: dn.user,
      title: '🚨 EMERGENCY BLOOD REQUEST',
      message: `Blood Type: ${type}\nLocation: ${location}${hospitalName ? `\nHospital: ${hospitalName}` : ''}\nTap to respond immediately`,
      type: 'emergency',
      urgent: true,
      meta: { requestId: doc._id, bloodType: type, location, hospitalName, phone },
    }));
    if (notifications.length) await Notification.insertMany(notifications);

    return res.status(201).json({ success: true, request: doc, notified: notifications.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/requests/:id - fetch a single request with requester details
export const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const viewerRole = String(req.user?.role || '').toLowerCase();
    const userId = req.user?.id;
    
    // Check if user has a donor record (for role separation)
    let hasDonorRecord = false;
    let userDonorId = null;
    try {
      const userDonor = await Donor.findOne({ user: userId }).select('_id').lean();
      if (userDonor) {
        hasDonorRecord = true;
        userDonorId = userDonor._id;
      }
    } catch {}
    
    // Check if there's a notification for this request (allows access via notification)
    let hasNotification = false;
    try {
      hasNotification = await Notification.exists({ userId, 'meta.requestId': id }).catch(() => false);
    } catch {}
    
    // Try legacy Request first
    let doc = await Request.findById(id)
      .populate('requesterId', 'name email phone bloodType location')
      .populate('matchedDonorId', 'name email phone')
      .populate('contactedBy.donorId');
    if (doc) {
      // Determine ownership/match access
      const isOwner = String(doc.requesterId?._id || doc.requesterId) === String(userId);
      let isMatchedDonorUser = false;
      try {
        if (doc.matchedDonorId) {
          // Support legacy shape where matchedDonorId can be a Donor _id or a User _id
          const md = doc.matchedDonorId;
          const mdId = typeof md === 'object' ? String(md._id || md) : String(md);
          if (mdId === String(userId)) {
            isMatchedDonorUser = true;
          } else {
            // Check if matchedDonorId is a Donor ID and matches user's donor record
            if (userDonorId && mdId === String(userDonorId)) {
              isMatchedDonorUser = true;
            } else {
              // Try to find donor by ID and check if it matches user
              const donor = await Donor.findById(mdId).select('user').lean();
              isMatchedDonorUser = donor?.user && String(donor.user) === String(userId);
            }
          }
        }
      } catch {}

      if (isOwner || isMatchedDonorUser || viewerRole === 'admin') {
        return res.json(doc);
      }

      // Fallback: sanitized donor view (hide requester contact info)
      // Allow access if user has donor record OR has notification for this request
      const isDonor = hasDonorRecord || viewerRole === 'donor' || viewerRole === 'both';
      if (isDonor || hasNotification) {
        const sanitized = {
          _id: doc._id,
          patientName: doc.patientName,
          bloodType: doc.bloodType,
          location: doc.location,
          hospitalName: doc.hospitalName,
          units: doc.units,
          urgency: doc.urgency,
          status: doc.status,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          requester: doc.requesterId ? { name: doc.requesterId.name || 'Requester', phone: (isMatchedDonorUser || doc.status === 'Accepted' || doc.status === 'Fulfilled') ? doc.requesterId.phone : undefined } : undefined,
          contactHidden: !(isMatchedDonorUser || doc.status === 'Accepted' || doc.status === 'Fulfilled'),
          viewer: 'donor',
        };
        return res.json(sanitized);
      }

      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fallback: Try new BloodRequest and map to legacy shape expected by old detail screen
    const br = await BloodRequest.findById(id)
      .populate('requesterId', 'name email phone bloodType location')
      .populate('donorId', 'fullName phone email bloodGroup district availabilityStatus user')
      .populate('fulfilledBy', 'fullName phone email bloodGroup district');
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
      // Also include donor info directly for easier access
      // Prefer fulfilledBy if available (for fulfilled requests), otherwise use donorId
      donor: (br.fulfilledBy || br.donorId) ? {
        _id: (br.fulfilledBy || br.donorId)?._id,
        fullName: (br.fulfilledBy || br.donorId)?.fullName,
        name: (br.fulfilledBy || br.donorId)?.fullName,
        phone: (br.fulfilledBy || br.donorId)?.phone,
        email: (br.fulfilledBy || br.donorId)?.email,
        bloodGroup: (br.fulfilledBy || br.donorId)?.bloodGroup,
        bloodType: (br.fulfilledBy || br.donorId)?.bloodGroup,
        district: (br.fulfilledBy || br.donorId)?.district,
        location: (br.fulfilledBy || br.donorId)?.district,
        availabilityStatus: br.donorId?.availabilityStatus,
      } : undefined,
      donorId: (br.fulfilledBy || br.donorId) ? {
        _id: (br.fulfilledBy || br.donorId)?._id,
        fullName: (br.fulfilledBy || br.donorId)?.fullName,
        name: (br.fulfilledBy || br.donorId)?.fullName,
        phone: (br.fulfilledBy || br.donorId)?.phone,
        email: (br.fulfilledBy || br.donorId)?.email,
        bloodGroup: (br.fulfilledBy || br.donorId)?.bloodGroup,
        bloodType: (br.fulfilledBy || br.donorId)?.bloodGroup,
        district: (br.fulfilledBy || br.donorId)?.district,
        location: (br.fulfilledBy || br.donorId)?.district,
      } : undefined,
      fulfilledBy: br.fulfilledBy ? {
        _id: br.fulfilledBy._id,
        fullName: br.fulfilledBy.fullName,
        name: br.fulfilledBy.fullName,
        phone: br.fulfilledBy.phone,
        email: br.fulfilledBy.email,
        bloodGroup: br.fulfilledBy.bloodGroup,
        bloodType: br.fulfilledBy.bloodGroup,
        district: br.fulfilledBy.district,
        location: br.fulfilledBy.district,
      } : undefined,
      matchedDonorUser: br.donorId?.user || undefined,
      createdAt: br.createdAt,
      updatedAt: br.updatedAt,
    };
    // Only requester (owner) or matched donor user may view mapped BR
    const isOwner = String(mapped.requesterId?._id || mapped.requesterId) === String(userId);
    let isMatchedDonorUser = false;
    try {
      if (br.donorId?.user) {
        isMatchedDonorUser = String(br.donorId.user) === String(userId);
      } else if (br.donorId?._id && userDonorId) {
        // Check if the matched donor ID matches user's donor record
        isMatchedDonorUser = String(br.donorId._id) === String(userDonorId);
      }
    } catch {}
    if (isOwner || isMatchedDonorUser || viewerRole === 'admin') {
      return res.json(mapped);
    }

    // Sanitized donor view for BloodRequest mapping
    // Allow access if user has donor record OR has notification for this request
    const isDonor = hasDonorRecord || viewerRole === 'donor' || viewerRole === 'both';
    if (isDonor || hasNotification) {
      const sanitized = {
        _id: mapped._id,
        patientName: mapped.patientName,
        bloodType: mapped.bloodType,
        location: mapped.location,
        units: mapped.units,
        urgency: mapped.urgency,
        status: mapped.status,
        createdAt: mapped.createdAt,
        updatedAt: mapped.updatedAt,
        requester: mapped.requesterId ? { name: mapped.requesterId.name || 'Requester' } : undefined,
        contactHidden: !isMatchedDonorUser,
        viewer: 'donor',
      };
      return res.json(sanitized);
    }

    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/requests/:id/matched-donor - minimal donor contact for requester
// Used by notification-driven screens where full request view might be forbidden.
export const getMatchedDonorForRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Try legacy Request first
    const doc = await Request.findById(id)
      .populate('requesterId', '_id')
      .populate('matchedDonorId', 'name email phone location bloodType')
      .lean();

    if (doc) {
      const isOwner = String((doc.requesterId && (doc.requesterId._id || doc.requesterId)) || '') === String(userId);
      const hasNoti = await Notification.exists({ userId, 'meta.requestId': doc._id }).catch(() => null);
      if (!isOwner && !hasNoti) return res.status(403).json({ error: 'Forbidden' });

      const donor = await pickMatchedDonorContact(doc);
      if (!donor) return res.status(404).json({ error: 'Donor not assigned' });
      return res.json({ success: true, donor });
    }

    // Fallback: BloodRequest
    // For fulfilled requests, prefer fulfilledBy over donorId
    const br = await BloodRequest.findById(id)
      .populate('requesterId', '_id')
      .populate('donorId', 'fullName phone email district bloodGroup')
      .populate('fulfilledBy', 'fullName phone email district bloodGroup')
      .lean();
    if (!br) return res.status(404).json({ error: 'Request not found' });

    const isOwner = String((br.requesterId && (br.requesterId._id || br.requesterId)) || '') === String(userId);
    const hasNoti = await Notification.exists({ userId, 'meta.requestId': br._id }).catch(() => null);
    if (!isOwner && !hasNoti) return res.status(403).json({ error: 'Forbidden' });

    // For fulfilled requests, use fulfilledBy if available (has complete donor info)
    if (br.fulfilledBy && (br.status === 'fulfilled' || br.status === 'completed' || br.status === 'donated')) {
      const donor = {
        name: br.fulfilledBy.fullName || br.fulfilledBy.name,
        phone: br.fulfilledBy.phone,
        email: br.fulfilledBy.email,
        location: br.fulfilledBy.district,
        bloodType: br.fulfilledBy.bloodGroup,
      };
      return res.json({ success: true, donor });
    }

    const donor = await pickMatchedDonorContactFromBloodRequest(br);
    if (!donor) return res.status(404).json({ error: 'Donor not assigned' });
    return res.json({ success: true, donor });
  } catch (err) {
    return res.status(500).json({ error: err.message });
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
    if (doc.status === 'Expired') {
      return res.status(400).json({ success: false, message: 'Request has expired' });
    }
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
          await createNotificationOnce(Notification, {
            userId: requesterUserId,
            title: 'Request fulfilled',
            message: 'Request fulfilled',
            type: 'request',
            urgent: false,
            meta: {
              type: 'FULFILLED',
              audience: 'requester',
              requestId: doc._id,
              matchId: doc._id,
              donorId: donorId || null,
              status: 'Fulfilled',
              source: 'request',
            },
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
// IMPORTANT: This sets donor to unavailable for 90 days. Only call this when donor has actually donated.
export const markFulfilled = async (req, res) => {
  try {
    const { id } = req.params;
    // Try legacy Request first
    let doc = await Request.findById(id)
      .populate('requesterId', 'name email phone role')
      .populate('matchedDonorId', 'name email phone')
      .populate('contactedBy.donorId');
    let isBloodRequest = false;
    
    // If not found, try BloodRequest
    if (!doc) {
      const BloodRequest = (await import('../models/BloodRequest.js')).default;
      doc = await BloodRequest.findById(id)
        .populate('requesterId', 'name email phone role')
        .populate('donorId', 'fullName phone email bloodGroup district');
      isBloodRequest = !!doc;
    }
    
    if (!doc) return res.status(404).json({ success: false, message: 'Request not found' });
    
    // Check if already fulfilled (handle both models)
    const currentStatus = String(doc.status || '').toLowerCase();
    if (currentStatus === 'fulfilled' || currentStatus === 'completed' || currentStatus === 'donated') {
      return res.json({ success: true, message: 'Request already fulfilled', data: doc });
    }

    // Authorization: requester, admin, or the matched donor can mark fulfilled
    // CRITICAL: For dual-role users (requester+donor), we must find their donor record
    // even if they are the requester, so we can update availability status on fulfillment
    let actingDonor = null;
    if (req.user) {
      const isOwner = doc.requesterId && String(doc.requesterId._id || doc.requesterId) === String(req.user.id);
      const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';
      
      // CRITICAL: Always try to find donor record for dual-role users
      // This ensures availability status is updated even when requester fulfills their own request
      try {
        actingDonor = await Donor.findOne({ user: req.user.id });
      } catch (_) {}
      
      if (!isOwner && !isAdmin) {
        // Not owner and not admin - must be the matched donor
        if (!actingDonor) {
          // For legacy Request: check if user is the matched donor (even without Donor document)
          if (!isBloodRequest && doc.matchedDonorId && String(doc.matchedDonorId._id || doc.matchedDonorId) === String(req.user.id)) {
            // proceed without actingDonor document; skip donor-specific cooldown later
            actingDonor = null; // Explicitly set to null since no Donor document exists
          } else {
            return res.status(403).json({ success: false, message: 'Forbidden: not allowed to fulfill this request' });
          }
        } else {
          // For BloodRequest: ensure this donor is the matched donor
          if (isBloodRequest && doc.donorId) {
            if (String(doc.donorId._id || doc.donorId) !== String(actingDonor._id)) {
              return res.status(403).json({ success: false, message: 'Forbidden: you are not the matched donor for this request' });
            }
          }
          // For legacy Request: check if user is the matched donor
          else if (!isBloodRequest && doc.matchedDonorId && String(doc.matchedDonorId._id || doc.matchedDonorId) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: 'Forbidden: you are not the matched donor for this request' });
          }
        }
      }
      // If isOwner (requester fulfilling their own request) and actingDonor exists (dual-role user),
      // we keep actingDonor so availability status can be updated correctly
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
  // Update status to fulfilled (handle both models)
  doc.status = isBloodRequest ? 'fulfilled' : 'Fulfilled';
  doc.fulfilledAt = new Date();
  if (!isBloodRequest) doc.fulfilledDate = doc.fulfilledAt;
  if (actingDonor) {
    if (isBloodRequest) {
      doc.fulfilledBy = actingDonor._id;
    } else {
      doc.fulfilledBy = actingDonor._id;
    }
  }
  await doc.save();

    // Notify requester and contacted donors that request is fulfilled
    try {
      const notifications = [];
      if (doc.requesterId) {
        const requesterUserId = typeof doc.requesterId === 'object' ? doc.requesterId._id : doc.requesterId;
        // Get donor details for requester notification
        let donorDetails = {};
        if (actingDonor) {
          donorDetails = {
            donorName: actingDonor.fullName || '',
            donorPhone: actingDonor.phone || '',
            donorDistrict: actingDonor.district || '',
            donorBloodGroup: actingDonor.bloodGroup || '',
          };
        } else if (isBloodRequest && doc.donorId) {
          // For BloodRequest, try to get donor from populated field or fetch
          const donorId = doc.donorId?._id || doc.donorId;
          if (donorId) {
            const Donor = (await import('../models/Donor.js')).default;
            const donorDoc = await Donor.findById(donorId).select('fullName phone district bloodGroup').lean().catch(() => null);
            if (donorDoc) {
              donorDetails = {
                donorName: donorDoc.fullName || '',
                donorPhone: donorDoc.phone || '',
                donorDistrict: donorDoc.district || '',
                donorBloodGroup: donorDoc.bloodGroup || '',
              };
            }
          }
        }

        notifications.push({
          userId: requesterUserId,
          title: 'Request fulfilled',
          message: 'Request fulfilled',
          type: 'request',
          urgent: false,
          meta: {
            type: 'FULFILLED',
            audience: 'requester',
            requestId: doc._id,
            matchId: doc._id,
            donorId: actingDonor?._id || (doc.fulfilledBy && (doc.fulfilledBy._id || doc.fulfilledBy)) || null,
            status: 'Fulfilled',
            source: 'request',
            ...donorDetails,
          },
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
              meta: { type: 'FULFILLED', audience: 'donor', requestId: doc._id, status: 'Fulfilled', source: 'request' },
            });
          }
        });
      }
      const toInsert = await filterNewNotifications(Notification, notifications);
      if (toInsert.length) await Notification.insertMany(toInsert);
    } catch (notifyErr) {
      console.error('Notify (fulfilled) error:', notifyErr?.message || notifyErr);
    }

    // CRITICAL: If a donor is acting, apply cooldown and set to unavailable
    // This is the ONLY place where donor availabilityStatus changes to 'unavailable'
    // Applies to both single-role donors and dual-role (donor+requester) users
    // For dual-role users fulfilling their own request, actingDonor is found above
    try {
      if (actingDonor) {
        // CRITICAL: Update donor availability status to 'unavailable' on fulfillment
        // This applies to ALL donors who fulfill, including dual-role (requester+donor) users
        // This ensures that when a requester who is also a donor fulfills their own request,
        // their donor availability status is correctly updated to 'unavailable'
        actingDonor.lastDonationDate = new Date();
        actingDonor.nextAvailableDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        actingDonor.isActive = false;
        actingDonor.availabilityStatus = 'unavailable'; // CRITICAL: Only changed here, not on accept
        await actingDonor.save();
        
        // Mirror cooldown to linked User so mobile UI reflects status immediately
        // This ensures both Donor document and User document are in sync
        try {
          const linkedUserId = actingDonor.user || (req.user && req.user.id);
          if (linkedUserId) {
            await User.findByIdAndUpdate(linkedUserId, {
              $set: {
                lastDonationDate: actingDonor.lastDonationDate,
                unavailableUntil: actingDonor.nextAvailableDate,
                donorStatus: 'unavailable',
                availability: false,
              },
            });
          }
        } catch (mirrorErr) {
          console.error('Mirror cooldown to user (fulfilled) failed:', mirrorErr?.message || mirrorErr);
        }
      }
      // Note: If actingDonor is null, either:
      // 1. User is requester-only (no Donor record) - request fulfilled, no donor status to update
      // 2. Legacy user matched by User._id without Donor document - handled separately
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
// IMPORTANT: Accepting does NOT change donor availability. Only fulfillment ("I Have Donated") sets donor to unavailable.
export const acceptDonation = async (req, res) => {
  try {
    const { id } = req.params;
    // Allow acceptance even if a Donor profile record doesn't exist.
    // Many donors are legacy users matched by `matchedDonorId` (User._id).
    // If a Donor document exists, great; otherwise proceed using the authenticated user.
    const actingDonor = await Donor.findOne({ user: req.user?.id }).select('_id user');

    // Try legacy Request first
    let doc = await Request.findById(id).populate('requesterId', 'name email phone');
    let isBloodRequest = false;
    
    // If not found, try BloodRequest
    if (!doc) {
      const BloodRequest = (await import('../models/BloodRequest.js')).default;
      doc = await BloodRequest.findById(id).populate('requesterId', 'name email phone');
      isBloodRequest = !!doc;
    }
    
    if (!doc) return res.status(404).json({ success: false, message: 'Request not found' });
    
    // Check status - allow both 'Matched' (legacy) and 'matched' (BloodRequest)
    const currentStatus = String(doc.status || '').toLowerCase();
    if (currentStatus !== 'matched') {
      return res.status(400).json({ success: false, message: 'Request is not in Matched state' });
    }
    
    // For legacy Request: ensure this donor is the matched donor if set
    if (!isBloodRequest && doc.matchedDonorId && String(doc.matchedDonorId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You are not the matched donor for this request' });
    }
    
    // For BloodRequest: ensure this donor is the matched donor if set
    if (isBloodRequest && doc.donorId) {
      const donor = await Donor.findOne({ user: req.user.id });
      if (!donor || String(doc.donorId) !== String(donor._id)) {
        return res.status(403).json({ success: false, message: 'You are not the matched donor for this request' });
      }
    }

    // Update status to accepted (case-insensitive for both models)
    doc.status = isBloodRequest ? 'accepted' : 'Accepted';
    // For legacy Request: persist matched donor to current user to lock the pairing
    if (!isBloodRequest) {
      doc.matchedDonorId = req.user.id;
    }
    await doc.save();

    // CRITICAL: Do NOT change donor availabilityStatus here. 
    // Donor remains 'available' until they click "I Have Donated" (fulfillment).
    // This applies to both single-role donors and dual-role (donor+requester) users.
    // We explicitly do NOT modify actingDonor.availabilityStatus here - it stays as-is.

    try {
      const requesterId = doc.requesterId ? (typeof doc.requesterId === 'object' ? doc.requesterId._id : doc.requesterId) : null;
      if (requesterId) {
        await createNotificationOnce(Notification, {
          userId: requesterId,
          title: 'Donor accepted your request',
          message: 'Donor accepted your request',
          type: 'request',
          urgent: true,
          meta: {
            type: 'DONOR_ACCEPTED',
            audience: 'requester',
            requestId: doc._id,
            donorId: isBloodRequest ? (doc.donorId?._id || doc.donorId) : (actingDonor?._id || null),
            status: isBloodRequest ? 'accepted' : 'Accepted',
            source: isBloodRequest ? 'blood-request' : 'request',
          },
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

// PATCH /api/requests/:id/decline - donor declines matched/accepted request
export const declineDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const doc = await Request.findById(id).populate('requesterId', 'name email phone');
    if (!doc) return res.status(404).json({ success: false, message: 'Request not found' });

    const status = String(doc.status || 'Pending');
    if (!['Matched', 'Accepted'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Request is not matched or accepted' });
    }
    // Only the matched donor can decline when set
    if (doc.matchedDonorId && String(doc.matchedDonorId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'You are not the matched donor for this request' });
    }

    const prevMatchedUserId = doc.matchedDonorId ? String(doc.matchedDonorId) : null;

    // Reset to pending and clear matched donor
    doc.status = 'Pending';
    doc.matchedDonorId = undefined;
    await doc.save();

    // Release donor reservation for both models
    try {
      await Donor.updateMany({ matchedRequest: id }, { $set: { matchedRequest: null, availabilityStatus: 'available' } });
      if (prevMatchedUserId) {
        await User.findByIdAndUpdate(prevMatchedUserId, { $set: { donorStatus: 'available', availability: true } });
      }
    } catch (e) { console.warn('Decline release error:', e?.message || e); }

    // Notify requester that donor declined; system will try to rematch
    try {
      if (doc.requesterId) {
        await createNotificationOnce(Notification, {
          userId: typeof doc.requesterId === 'object' ? doc.requesterId._id : doc.requesterId,
          title: 'Donor Declined',
          message: 'The matched donor declined. We are searching for another donor.',
          type: 'request',
          urgent: true,
          meta: { type: 'DONOR_DECLINED', audience: 'requester', requestId: doc._id, status: 'Pending', source: 'request' },
        });
      }
    } catch (e) { console.error('Notify decline error:', e?.message || e); }

    // Immediately attempt to rematch
    try {
      const { onRequestCreated } = await import('../services/realtimeMatcher.js');
      onRequestCreated(doc).catch(()=>{});
    } catch (_) {}

    return res.json({ success: true, message: 'Request declined', data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
