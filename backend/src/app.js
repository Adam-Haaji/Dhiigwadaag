import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import requestRoutes from './routes/requests.js';
import donationRoutes from './routes/donations.js';
import donorRoutes from './routes/donors.js';
import bloodRequestRoutes from './routes/bloodRequests.js';
import availableDonorsRoutes from './routes/availableDonors.js';
import notificationRoutes from './routes/notifications.js';
import matchRoutes from './routes/match.js';
import { startDonorReactivationCron } from './scheduler/reactivateDonors.js';
import startExpiryScheduler from './scheduler/expireRequests.js';

import priorityRoutes from './routes/priority.js';
const app = express();
// Allow all origins during development so physical devices can reach the backend
app.use(cors({ origin: '*'}));
app.use(express.json());

// Connect to MongoDB Atlas
connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/blood-requests', bloodRequestRoutes);
app.use('/api/available-donors', availableDonorsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/match', matchRoutes);
app.use('/api', priorityRoutes);

app.get('/', (req, res) => {
  res.send('AI Blood Donation Matching & Emergency Alert System Backend');
});

// Lightweight health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

export default app;

// Start background schedulers after app is initialized
startDonorReactivationCron();
try {
  startExpiryScheduler({ intervalMinutes: 5, emergencyHours: 1, normalHours: 12 });
} catch (e) {
  console.error('Failed to start expiry scheduler:', e?.message || e);
}

// Kick off a one-time backfill of pending requests shortly after startup
try {
  setTimeout(async () => {
    try {
      const { backfillPending } = await import('./services/realtimeMatcher.js');
      await backfillPending({ limit: 500 });
    } catch (e) {
      console.warn('Backfill pending failed:', e?.message || e);
    }
  }, 3000);
} catch (_) {}
