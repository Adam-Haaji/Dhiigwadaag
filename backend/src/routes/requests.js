import express from 'express';
import { createRequest, getRequests, emergencyBroadcast, getRequestById, respondToRequest, markFulfilled, deleteRequest, cancelRequest } from '../controllers/requestController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createRequest);
router.get('/', getRequests);
router.get('/:id', authMiddleware, getRequestById);
// Legacy AI-based match endpoint removed
router.post('/emergency', authMiddleware, emergencyBroadcast);

// New endpoints per spec
router.put('/:id/respond', respondToRequest);
router.put('/:id/mark-fulfilled', authMiddleware, markFulfilled);
// Alias endpoint to satisfy clients expecting /fulfill
router.put('/:id/fulfill', authMiddleware, markFulfilled);
router.put('/:id/cancel', authMiddleware, cancelRequest);
router.delete('/:id', deleteRequest);

export default router;
