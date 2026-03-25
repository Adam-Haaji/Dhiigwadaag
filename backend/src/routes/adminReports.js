import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireAdmin, exportReportCsv } from '../controllers/adminController.js';

const router = express.Router();

// All admin report exports require auth + admin role
router.use(authMiddleware);
router.use(requireAdmin);

// GET /api/admin/reports/export?type=users|donors|requests|donations
router.get('/export', exportReportCsv);

export default router;

