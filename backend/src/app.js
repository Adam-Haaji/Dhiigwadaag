import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import { isDBReady, isUsingMemoryDB } from './config/db.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import requestRoutes from './routes/requests.js';
import donationRoutes from './routes/donations.js';
import donorRoutes from './routes/donors.js';
import bloodRequestRoutes from './routes/bloodRequests.js';
import availableDonorsRoutes from './routes/availableDonors.js';
import notificationRoutes from './routes/notifications.js';
import matchRoutes from './routes/match.js';
import statsRoutes from './routes/stats.js';
import requesterRoutes from './routes/requesters.js';
import { startDonorReactivationCron } from './scheduler/reactivateDonors.js';
import startExpiryScheduler from './scheduler/expireRequests.js';

import priorityRoutes from './routes/priority.js';
import adminRoutes from './routes/admin.js';
import adminReportsRoutes from './routes/adminReports.js';
import eligibilityRoutes from './routes/eligibility.js';
import chatbotRoutes from './routes/chatbot.js';
const app = express();
// Allow all origins during development so physical devices can reach the backend
app.use(cors({ origin: '*'}));
app.use(express.json());

// If DB is temporarily unavailable, fail fast with 503 instead of letting requests hang.
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/api/health') return next();
  if (req.path.startsWith('/api') && !isDBReady()) {
    return res.status(503).json({ error: 'db_unavailable', message: 'Database connection is not ready. Please retry.' });
  }
  return next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/blood-requests', bloodRequestRoutes);
app.use('/api/available-donors', availableDonorsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api', priorityRoutes);
app.use('/api/requesters', requesterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/reports', adminReportsRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/chatbot', chatbotRoutes);

app.get('/', (req, res) => {
  res.send('AI Blood Donation Matching & Emergency Alert System Backend');
});

// Lightweight health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    dbReady: isDBReady(),
    usingMemoryDB: isUsingMemoryDB(),
  });
});

export default app;

// Start background schedulers only after DB is ready
(async () => {
  // In case connectDB is still in progress, poll readiness
  const startIfReady = () => {
    if (isDBReady()) {
      try {
        startDonorReactivationCron();
      } catch (e) {
        console.error('Failed to start donor reactivation cron:', e?.message || e);
      }
      try {
        startExpiryScheduler({ intervalMinutes: 5, emergencyHours: 1, normalHours: 12 });
      } catch (e) {
        console.error('Failed to start expiry scheduler:', e?.message || e);
      }
      // Backfill once after startup when DB is ready
      setTimeout(async () => {
        try {
          const { backfillPending } = await import('./services/realtimeMatcher.js');
          // Skip if DB lost connection unexpectedly
          if (isDBReady()) {
            await backfillPending({ limit: 500 });
          }
        } catch (e) {
          console.warn('Backfill pending failed:', e?.message || e);
        }
      }, 1500);
      return true;
    }
    return false;
  };
  if (!startIfReady()) {
    const poll = setInterval(() => {
      if (startIfReady()) clearInterval(poll);
    }, 500);
  }
})();
