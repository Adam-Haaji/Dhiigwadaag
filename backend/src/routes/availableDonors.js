import express from 'express';
import { getAvailableDonors } from '../controllers/bloodRequestController.js';

const router = express.Router();

// Public endpoint to list available donors matching optional filters
router.get('/', getAvailableDonors);

export default router;
