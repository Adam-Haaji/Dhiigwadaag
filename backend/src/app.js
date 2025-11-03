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

const app = express();
app.use(cors());
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
