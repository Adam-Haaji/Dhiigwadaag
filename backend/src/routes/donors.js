import express from 'express';
import { createDonor, searchDonors, getDonorMeta, getDonorById } from '../controllers/donorController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createDonor);
router.get('/search', searchDonors);
router.get('/meta', getDonorMeta);
router.get('/:id', getDonorById);

export default router;
