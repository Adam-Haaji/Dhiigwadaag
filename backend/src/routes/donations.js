import express from 'express';
import { trackDonation } from '../controllers/donationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, trackDonation);

export default router;
