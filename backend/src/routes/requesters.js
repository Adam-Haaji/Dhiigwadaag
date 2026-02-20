import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { registerRequester, getMyRequester } from '../controllers/requesterController.js';

const router = express.Router();

router.post('/register', authMiddleware, registerRequester);
router.get('/me', authMiddleware, getMyRequester);

export default router;