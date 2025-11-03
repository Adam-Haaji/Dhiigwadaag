import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { createBloodRequest, getBloodRequestById, updateBloodRequestStatus, donorConfirmDonation, verifyDonation, uploadProof, iamMatchedDonor } from '../controllers/bloodRequestController.js';

const router = express.Router();

// Create a new blood request
router.post('/', authMiddleware, createBloodRequest);

// Get specific request details
router.get('/:id', authMiddleware, getBloodRequestById);

// Check if current user is the matched donor for this request
router.get('/:id/iam-matched', authMiddleware, iamMatchedDonor);

// Update request status
router.put('/:id/status', authMiddleware, updateBloodRequestStatus);
// New endpoints per spec
router.put('/:id/donor-confirm', authMiddleware, donorConfirmDonation);
router.put('/:id/verify', authMiddleware, verifyDonation);
router.put('/:id/proof', authMiddleware, uploadProof);

export default router;
