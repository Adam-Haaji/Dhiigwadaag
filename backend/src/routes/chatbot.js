import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { chat, availableDonors, availability } from '../controllers/chatbotController.js';

const router = express.Router();

router.post('/chat', authMiddleware, chat);
router.get('/availability', authMiddleware, availability);
router.get('/available-donors', authMiddleware, availableDonors);

export default router;
