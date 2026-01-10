import express from 'express';
import { createRequest, getRequests, emergencyBroadcast, createEmergencyRequest, getRequestById, getMatchedDonorForRequest, respondToRequest, markFulfilled, deleteRequest, cancelRequest, acceptDonation, completeDonation, declineDonation, listMatchesForMe } from '../controllers/requestController.js';
import { authMiddleware, requireRequester, requireDonor, blockNone } from '../middleware/authMiddleware.js';

const router = express.Router();

// Allow any authenticated user to create/list their requests; controller will
// auto-upgrade role to requester/both as needed.
router.post('/', authMiddleware, createRequest);
router.get('/', authMiddleware, getRequests);
router.get('/:id', authMiddleware, blockNone, getRequestById);
router.get('/:id/matched-donor', authMiddleware, blockNone, getMatchedDonorForRequest);
// Legacy AI-based match endpoint removed
// Emergency broadcast can be initiated by any authenticated user
router.post('/emergency', authMiddleware, emergencyBroadcast);
// Create emergency request with matching and notifications
router.post('/emergency/create', authMiddleware, createEmergencyRequest);

// New endpoints per spec
router.put('/:id/respond', authMiddleware, requireDonor, respondToRequest);
router.put('/:id/mark-fulfilled', authMiddleware, requireDonor, markFulfilled);
// Alias endpoint to satisfy clients expecting /fulfill
router.put('/:id/fulfill', authMiddleware, requireDonor, markFulfilled);
// New PATCH routes for donor app flow
router.patch('/:id/accept', authMiddleware, requireDonor, acceptDonation);
router.patch('/:id/complete', authMiddleware, requireDonor, completeDonation);
router.patch('/:id/decline', authMiddleware, requireDonor, declineDonation);
router.put('/:id/cancel', authMiddleware, requireRequester, cancelRequest);
router.delete('/:id', authMiddleware, requireRequester, deleteRequest);
// Matches list for current donor
router.get('/matches/me', authMiddleware, requireDonor, listMatchesForMe);

export default router;
