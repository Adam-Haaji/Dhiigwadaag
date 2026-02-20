import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  adminLogin,
  requireAdmin,
  getDashboardStats,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  getDonors,
  getDonorById,
  updateDonor,
  deleteDonor,
  updateDonorAvailability,
  getRequests,
  getRequestById,
  updateRequest,
  updateRequestStatus,
  deleteRequest,
  getMatches,
  getMatchById,
  getDonations,
  getDonationById,
  updateDonation,
  getEmergencies,
  getNotifications,
  getStatsOverview,
  getStatsDonors,
  getStatsRequests,
  getStatsBloodTypes,
  getStatsLocations,
  getStatsDonationsTrend,
  getStatsBloodInventory,
  getRecentActivities,
  getActivityLogs,
  getReportsSummary,
  createRequest,
  createEmergencyRequest,
} from '../controllers/adminController.js';

const router = express.Router();

// Public admin login endpoint (no auth required)
router.post('/auth/login', adminLogin);

// All other admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Dashboard stats
router.get('/dashboard/stats', getDashboardStats);

// ==================== USER MANAGEMENT ====================
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

// ==================== DONOR MANAGEMENT ====================
router.get('/donors', getDonors);
router.get('/donors/:id', getDonorById);
router.put('/donors/:id', updateDonor);
router.patch('/donors/:id/availability', updateDonorAvailability);
router.delete('/donors/:id', deleteDonor);

// ==================== REQUEST MANAGEMENT ====================
router.get('/requests', getRequests);
router.get('/requests/:id', getRequestById);
router.post('/requests', createRequest);
router.post('/requests/emergency', createEmergencyRequest);
router.put('/requests/:id', updateRequest);
router.put('/requests/:id/status', updateRequestStatus);
router.delete('/requests/:id', deleteRequest);

// ==================== MATCHES ====================
router.get('/matches', getMatches);
router.get('/matches/:id', getMatchById);

// ==================== DONATIONS ====================
router.get('/donations', getDonations);
router.get('/donations/:id', getDonationById);
router.put('/donations/:id', updateDonation);

// ==================== EMERGENCIES ====================
router.get('/emergencies', getEmergencies);

// ==================== STATISTICS (Chart-Ready) ====================
router.get('/stats/overview', getStatsOverview);
router.get('/stats/donors', getStatsDonors);
router.get('/stats/requests', getStatsRequests);
router.get('/stats/blood-types', getStatsBloodTypes);
router.get('/stats/locations', getStatsLocations);
router.get('/stats/donations-trend', getStatsDonationsTrend);
router.get('/stats/blood-inventory', getStatsBloodInventory);

// ==================== NOTIFICATIONS & ACTIVITY ====================
router.get('/notifications', getNotifications);
router.get('/activity/recent', getRecentActivities);
router.get('/activity-logs', getActivityLogs);

// ==================== REPORTS ====================
router.get('/reports/summary', getReportsSummary);

export default router;
