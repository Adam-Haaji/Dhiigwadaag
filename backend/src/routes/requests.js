import express from 'express';
import { createRequest, getRequests, emergencyBroadcast, getRequestById, respondToRequest, markFulfilled, deleteRequest, cancelRequest, acceptDonation, completeDonation, listMatchesForMe } from '../controllers/requestController.js';
import { authMiddleware, requireRequester, requireDonor, blockNone } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, requireRequester, createRequest);
router.get('/', authMiddleware, requireRequester, getRequests);
router.get('/:id', authMiddleware, blockNone, getRequestById);
// Legacy AI-based match endpoint removed
router.post('/emergency', authMiddleware, requireRequester, emergencyBroadcast);

// New endpoints per spec
router.put('/:id/respond', authMiddleware, requireDonor, respondToRequest);
router.put('/:id/mark-fulfilled', authMiddleware, requireDonor, markFulfilled);
// Alias endpoint to satisfy clients expecting /fulfill
router.put('/:id/fulfill', authMiddleware, requireDonor, markFulfilled);
// New PATCH routes for donor app flow
router.patch('/:id/accept', authMiddleware, requireDonor, acceptDonation);
router.patch('/:id/complete', authMiddleware, requireDonor, completeDonation);
router.put('/:id/cancel', authMiddleware, requireRequester, cancelRequest);
router.delete('/:id', authMiddleware, requireRequester, deleteRequest);
// Matches list for current donor
router.get('/matches/me', authMiddleware, requireDonor, listMatchesForMe);

export default router;
