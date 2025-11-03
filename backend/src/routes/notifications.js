import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getMyNotifications, markAllRead, markOneRead } from '../controllers/notificationController.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/', authMiddleware, getMyNotifications);
router.post('/mark-all-read', authMiddleware, markAllRead);
router.post('/:id/read', authMiddleware, markOneRead);

// Register an Expo push token for the current user
router.post('/register-token', authMiddleware, async (req, res) => {
	try {
		const { token } = req.body || {};
		if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token required' });
		// Basic validation for Expo push token formats
		const isExpoToken = token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
		if (!isExpoToken) return res.status(400).json({ error: 'invalid_token' });
		const user = await User.findById(req.user.id);
		if (!user) return res.status(404).json({ error: 'user_not_found' });
		if (!user.expoPushTokens.includes(token)) {
			user.expoPushTokens.push(token);
			await user.save();
		}
		return res.json({ success: true, tokens: user.expoPushTokens });
	} catch (e) {
		return res.status(500).json({ error: e.message });
	}
});

export default router;
