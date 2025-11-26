import express from 'express';
import { trackDonation, getMyDonations } from '../controllers/donationController.js';
import { authMiddleware, requireDonor } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, requireDonor, trackDonation);
router.get('/mine', authMiddleware, requireDonor, getMyDonations);

export default router;
