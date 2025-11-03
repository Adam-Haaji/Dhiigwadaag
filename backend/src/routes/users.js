import express from 'express';
import { getProfile, updateProfile, listDonors, getUserById, updateUserById } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/me', authMiddleware, getProfile);
router.put('/me', authMiddleware, updateProfile);
router.get('/donors', listDonors);
// Spec compatibility
router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUserById);

export default router;
