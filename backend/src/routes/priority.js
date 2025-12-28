import express from 'express';
const router = express.Router();
import { findPriorityMatches } from '../services/priorityMatcher.js';
import BloodRequest from '../models/BloodRequest.js';
import Notification from '../models/Notification.js';
import Donor from '../models/Donor.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

// POST /request/create → runs priority matching
router.post('/request/create', authMiddleware, async (req, res) => {
  try {
    const { patientType, bloodGroup, patientName, district, notes, units, contactPerson, contactPhone, urgencyLevel, reason } = req.body;
    const patientBloodType = bloodGroup || patientType;
    const lvl = String(urgencyLevel || '').toLowerCase();
    if (!['critical','normal'].includes(lvl)) return res.status(400).json({ error: 'invalid_urgency' });
    const match = await findPriorityMatches(patientBloodType, { district, urgencyLevel: lvl });

    const chosenDonorId = match.donors.length ? match.donors[0]._id : null;
    const request = await BloodRequest.create({
      patientName: patientName || 'Unknown',
      bloodGroup: patientBloodType,
      district,
      units: units || 1,
      contactPerson: contactPerson || 'Requester',
      contactPhone: contactPhone || 'N/A',
      urgencyLevel: lvl,
      reason: reason || (notes || 'Blood needed'),
      additionalNote: notes || '',
      status: match.donors.length ? 'matched' : 'pending',
      requesterId: req.user.id,
      donorId: chosenDonorId,
    });

    if (match.donors.length) {
      const title = `You are matched (${match.matchedTier})`;
      const message = `A patient needs your blood type ${patientBloodType}. (${lvl.toUpperCase()})`;
      const notifications = match.donors.map(d => ({
        userId: d.user, // Donor schema links to User via `user`
        type: 'system',
        title,
        message,
        read: false,
        urgent: false,
        meta: { requestId: request._id, matchedTier: match.matchedTier, tierUsed: match.tierUsed },
      }));
      if (notifications.length) await Notification.insertMany(notifications);
    }

    res.json({
      matchedTier: match.matchedTier,
      donors: match.donors,
      patientBloodType,
      tierUsed: match.tierUsed,
      request,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /request/matches/:userId → donor/requester view
router.get('/request/matches/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const donor = await Donor.findOne({ user: userId });
    const requests = donor ? await BloodRequest.find({ donorId: donor._id }).lean() : [];
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /donor/donated/:requestId → mark donation completed
router.post('/donor/donated/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await BloodRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // remove donor from active list and mark donation completed
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    donor.availabilityStatus = 'unavailable';
    await donor.save();

    request.status = 'fulfilled';
    request.fulfilledBy = donor._id;
    request.fulfilledAt = new Date();
    await request.save();

    res.json({ ok: true, requestId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /requests/:id/accept → only matched donor can accept
router.patch('/requests/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await BloodRequest.findById(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) return res.status(404).json({ error: 'Donor not found' });
    if (!request.donorId || String(request.donorId) !== String(donor._id)) {
      return res.status(403).json({ error: 'not_matched_donor' });
    }
    request.status = 'accepted';
    await request.save();
    return res.json({ ok: true, status: request.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /requests/emergency-donors → list all available donors immediately
router.get('/requests/emergency-donors', authMiddleware, async (req, res) => {
  try {
    const donors = await Donor.find({ availabilityStatus: 'available', isActive: true }).select('_id fullName phone district bloodGroup email').lean();
    res.json({ donors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /notifications/:userId
router.get('/notifications/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
