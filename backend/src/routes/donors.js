import express from 'express';
import { createDonor, searchDonors, getDonorMeta, getDonorById, registerDonor } from '../controllers/donorController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createDonor); // legacy full profile creation
router.post('/register', authMiddleware, registerDonor); // lightweight eligibility registration
router.get('/search', searchDonors);
router.get('/meta', getDonorMeta);
router.get('/:id', getDonorById);

export default router;
