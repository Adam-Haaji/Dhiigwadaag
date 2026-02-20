import express from 'express';
import { createDonor, searchDonors, getDonorMeta, getDonorById, registerDonor, getMyDonor, recheckEligibility } from '../controllers/donorController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createDonor); // legacy full profile creation
router.post('/register', authMiddleware, registerDonor); // lightweight eligibility registration
router.get('/me', authMiddleware, getMyDonor); // get current user's donor profile
router.post('/me/recheck-eligibility', authMiddleware, recheckEligibility); // re-run eligibility for existing donor
router.get('/search', searchDonors);
router.get('/meta', getDonorMeta);
router.get('/:id', getDonorById);

export default router;
