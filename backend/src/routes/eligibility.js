import express from 'express';
import { checkEligibility } from '../controllers/eligibilityController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/eligibility/check - Check donor eligibility using ML model
router.post('/check', authMiddleware, checkEligibility);

export default router;
