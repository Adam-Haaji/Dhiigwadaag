import User from '../models/User.js';
import Donor from '../models/Donor.js';
import BloodRequest from '../models/BloodRequest.js';
import Request from '../models/Request.js';
import Donation from '../models/Donation.js';
import Notification from '../models/Notification.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { isDBReady } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Helper function to handle MongoDB errors gracefully
const handleDBError = (err, res, endpointName) => {
  // Suppress connection errors if DB is not ready (already logged during connection)
  if (!isDBReady()) {
    return res.status(503).json({ 
      error: 'Database connection unavailable',
      message: 'Please check your MongoDB connection'
    });
  }
  console.error(`[${endpointName}] Error:`, err.message);
  return res.status(500).json({ error: err.message });
};

// Admin login endpoint (public, no auth required)
export const adminLogin = async (req, res) => {
  try {
    const password = req.body?.password || '';
    const normEmail = (req.body?.email || '').trim().toLowerCase();
    
    if (!normEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('[Admin Login] JWT_SECRET is not set in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const user = await User.findOne({ email: normEmail });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if user is admin
    const role = String(user.role || '').toLowerCase();
    
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Verify password
    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.password);
    } catch (bcryptErr) {
      console.error('[Admin Login] Bcrypt error:', bcryptErr?.message);
    }
    
    // Fallback: if legacy/plaintext password was stored (not bcrypt), allow once and upgrade to bcrypt hash
    if (!valid) {
      const looksHashed = typeof user.password === 'string' && user.password.startsWith('$2');
      if (!looksHashed && password && user.password === password) {
        const newHash = await bcrypt.hash(password, 10);
        user.password = newHash;
        await user.save();
        valid = true;
      }
    }
    
    if (!valid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Return admin-specific response (matching frontend expectations)
    return res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[Admin Login] Error:', err?.message || err, err?.stack);
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
};

// Admin middleware - check if user is admin
export const requireAdmin = (req, res, next) => {
  const role = String(req?.user?.role || '').toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET /admin/dashboard/stats - Use Request model (same as frontend)
export const getDashboardStats = async (req, res) => {
  try {
    if (!isDBReady()) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        users: { total: 0 },
        donors: { total: 0, available: 0 },
        requests: { total: 0, pending: 0, fulfilled: 0, cancelled: 0, critical: 0, normal: 0 }
      });
    }
    const [
      totalUsers,
      totalDonors,
      availableDonors,
      unavailableDonors,
      pendingRequests,
      matchedRequests,
      fulfilledRequests,
      cancelledRequests,
      totalDonations,
      criticalRequests,
      normalRequests,
      totalNotifications,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }), // Exclude admins from user count
      Donor.countDocuments(),
      Donor.countDocuments({ availabilityStatus: 'available', isActive: true }),
      Donor.countDocuments({ availabilityStatus: 'unavailable' }),
      // Request model uses: Pending, Contacted, Matched, Accepted, Fulfilled, Cancelled
      Request.countDocuments({ status: 'Pending' }),
      Request.countDocuments({ status: { $in: ['Matched', 'Contacted', 'Accepted'] } }),
      Request.countDocuments({ status: 'Fulfilled' }),
      Request.countDocuments({ status: 'Cancelled' }),
      Donation.countDocuments(),
      // Critical requests that are pending or matched (active emergencies)
      Request.countDocuments({ urgency: 'Critical', status: { $in: ['Pending', 'Matched', 'Contacted', 'Accepted'] } }),
      // Normal requests that are pending or matched
      Request.countDocuments({ urgency: 'Normal', status: { $in: ['Pending', 'Matched', 'Contacted', 'Accepted'] } }),
      Notification.countDocuments(),
    ]);

    return res.json({
      users: {
        total: totalUsers,
        donors: totalDonors,
        available: availableDonors,
        unavailable: unavailableDonors,
      },
      requests: {
        pending: pendingRequests,
        matched: matchedRequests,
        fulfilled: fulfilledRequests,
        expired: cancelledRequests, // Map cancelled to expired for compatibility
        critical: criticalRequests,
        normal: normalRequests,
      },
      donations: {
        total: totalDonations,
      },
      notifications: {
        total: totalNotifications,
      },
    });
  } catch (err) {
    return handleDBError(err, res, 'Admin getDashboardStats');
  }
};

// GET /admin/users - Return all users except admins (user, requester, none)
export const getUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      role, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status 
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = {};
    
    // Exclude admins - show normal users (user, requester, none)
    query.role = { $ne: 'admin' };
    
    // If specific role filter is provided, apply it
    if (role && role !== 'all') {
      if (role === 'donor') {
        // For donor filter, check if user has a donor record
        // We'll filter after fetching
      } else {
        query.role = role;
      }
    }
    
    // Search filter
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }
    
    // Status filter - for normal users, check availability flag
    if (status === 'active') {
      query.availability = { $ne: false };
    } else if (status === 'blocked' || status === 'inactive') {
      query.availability = false;
    }
    
    // Sort options
    const sort = {};
    const validSortFields = ['name', 'email', 'role', 'createdAt', 'updatedAt'];
    if (validSortFields.includes(sortBy)) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .skip(skip)
        .limit(Number(limit))
        .sort(sort),
      User.countDocuments(query),
    ]);
    
    // Add computed status field - normal users are active by default unless availability is false
    const usersWithStatus = users.map(u => {
      const userObj = u.toObject();
      // For normal users, status is active unless explicitly set to unavailable
      userObj.status = (u.availability === false) ? 'inactive' : 'active';
      userObj.isActive = userObj.status === 'active';
      // Map location to city for frontend compatibility
      userObj.city = userObj.location;
      return userObj;
    });
    
    return res.json({ 
      users: usersWithStatus, 
      total, 
      page: Number(page), 
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    console.error('[Admin getUsers] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/users/:id
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userObj = user.toObject();
    userObj.status = user.availability === false || user.donorStatus === 'unavailable' ? 'inactive' : 'active';
    userObj.isActive = userObj.status === 'active';
    // Map location to city for frontend compatibility
    userObj.city = userObj.location;
    
    return res.json({ user: userObj });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /admin/users - Create normal user (role: 'user') - matches frontend signup
export const createUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    console.log('[Admin createUser] Request body:', { name, email, hasPassword: !!password, phone });
    
    // Required fields validation (matching frontend signup)
    if (!name || !email || !password) {
      console.log('[Admin createUser] Missing required fields:', { hasName: !!name, hasEmail: !!email, hasPassword: !!password });
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    // Phone is required (matching frontend signup)
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhone = String(phone).replace(/[\s\-\(\)]/g, '');
    
    // Validate phone format (matching frontend: 9-12 digits)
    if (!/^\d{9,12}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Enter a valid phone number (9-12 digits)' });
    }
    
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    
    // Validate name format (letters and spaces only, matching User model)
    if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      return res.status(400).json({ error: 'Name must contain letters and spaces only' });
    }
    
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Check if phone already exists
    const existingPhone = await User.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }
    
    // Always create normal user (role: 'user') - matching frontend signup behavior
    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.default.hash(password, 10);
    
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role: 'user', // Always 'user' - matching frontend signup
      phone: cleanPhone,
      location: 'Unknown', // Default location matching frontend signup
      availability: true,
    });
    
    const userObj = (await User.findById(user._id).select('-password')).toObject();
    userObj.status = 'active';
    userObj.isActive = true;
    userObj.location = userObj.location || 'Unknown';
    
    return res.status(201).json({ user: userObj });
  } catch (err) {
    console.error('[Admin createUser] Error:', err);
    
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ error: `${field} already exists` });
    }
    
    return res.status(500).json({ error: err.message || 'Failed to create user' });
  }
};

// PUT /admin/users/:id
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowed = ['name', 'email', 'role', 'phone', 'bloodType', 'location', 'city'];
    
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        // Map 'city' to 'location' for consistency
        if (key === 'city') {
          updates.location = req.body[key];
        } else {
          updates[key] = req.body[key];
        }
      }
    }
    
    if (updates.email) {
      updates.email = updates.email.toLowerCase().trim();
      const existing = await User.findOne({ email: updates.email, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    
    // Validate role if provided
    if (updates.role && !['user', 'admin'].includes(updates.role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
    }
    
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userObj = user.toObject();
    userObj.status = user.availability === false || user.donorStatus === 'unavailable' ? 'inactive' : 'active';
    userObj.isActive = userObj.status === 'active';
    // Map location to city for frontend compatibility
    userObj.city = userObj.location;
    
    return res.json({ user: userObj });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deleting admin users
    if (String(user.role).toLowerCase() === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin user' });
    }
    
    // Also delete associated donor record if exists
    await Donor.findOneAndDelete({ user: id });
    
    await User.findByIdAndDelete(id);
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PATCH /admin/users/:id/status
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'blocked'/'inactive'
    
    if (!['active', 'blocked', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use: active, blocked, or inactive' });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update status by setting availability and donorStatus
    if (status === 'active') {
      user.availability = true;
      if (user.donorStatus === 'unavailable') {
        // Only change if it was explicitly set to unavailable
        // Don't override if user is legitimately unavailable due to cooldown
      }
    } else {
      user.availability = false;
      // Don't update donorStatus in users collection - donors are in donors collection
    }
    
    await user.save();
    
    const userObj = user.toObject();
    userObj.status = status;
    
    return res.json({ user: userObj, message: `User status updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/donors
export const getDonors = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      availability, 
      bloodGroup, 
      district, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = {};
    
    if (availability) query.availabilityStatus = availability;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (district) query.district = district;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Sort options
    const sort = {};
    const validSortFields = ['fullName', 'email', 'bloodGroup', 'district', 'availabilityStatus', 'lastDonationDate', 'createdAt'];
    if (validSortFields.includes(sortBy)) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    
    const [donors, total] = await Promise.all([
      Donor.find(query)
        .populate('user', 'name email phone')
        .skip(skip)
        .limit(Number(limit))
        .sort(sort),
      Donor.countDocuments(query),
    ]);
    
    // Add computed fields (nextEligibilityDate calculation)
    const donorsWithComputed = donors.map(d => {
      const donorObj = d.toObject();
      if (d.lastDonationDate) {
        const lastDonation = new Date(d.lastDonationDate);
        const nextEligible = new Date(lastDonation.getTime() + 90 * 24 * 60 * 60 * 1000);
        donorObj.nextEligibilityDate = nextEligible;
        donorObj.daysUntilEligible = Math.ceil((nextEligible.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      } else {
        donorObj.nextEligibilityDate = null;
        donorObj.daysUntilEligible = 0;
      }
      return donorObj;
    });
    
    return res.json({ 
      donors: donorsWithComputed, 
      total, 
      page: Number(page), 
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/donors/:id
export const getDonorById = async (req, res) => {
  try {
    const { id } = req.params;
    const donor = await Donor.findById(id).populate('user', 'name email phone');
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }
    
    const donorObj = donor.toObject();
    // Calculate next eligibility date
    if (donor.lastDonationDate) {
      const lastDonation = new Date(donor.lastDonationDate);
      const nextEligible = new Date(lastDonation.getTime() + 90 * 24 * 60 * 60 * 1000);
      donorObj.nextEligibilityDate = nextEligible;
      donorObj.daysUntilEligible = Math.ceil((nextEligible.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    } else {
      donorObj.nextEligibilityDate = null;
      donorObj.daysUntilEligible = 0;
    }
    
    return res.json({ donor: donorObj });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /admin/donors/:id
export const updateDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    const allowed = ['fullName', 'phone', 'email', 'district', 'bloodGroup', 'weightKg', 'availabilityStatus', 'isActive'];
    
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    
    const donor = await Donor.findByIdAndUpdate(id, updates, { new: true }).populate('user', 'name email');
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }
    
    return res.json({ donor });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /admin/donors/:id
export const deleteDonor = async (req, res) => {
  try {
    const { id } = req.params;
    const donor = await Donor.findById(id);
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }
    
    // Update user role if linked
    if (donor.user) {
      const user = await User.findById(donor.user);
      if (user) {
        // Don't change user.role - donors are in separate collection
        user.donorStatus = 'not_a_donor';
        await user.save();
      }
    }
    
    await Donor.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Donor deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PATCH /admin/donors/:id/availability
export const updateDonorAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { availabilityStatus } = req.body; // 'available' or 'unavailable'
    
    if (!['available', 'unavailable'].includes(availabilityStatus)) {
      return res.status(400).json({ error: 'Invalid availabilityStatus. Use: available or unavailable' });
    }
    
    const donor = await Donor.findById(id);
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }
    
    donor.availabilityStatus = availabilityStatus;
    if (availabilityStatus === 'unavailable') {
      donor.isActive = false;
    } else {
      // Check if donor is eligible (not in cooldown)
      if (donor.lastDonationDate) {
        const lastDonation = new Date(donor.lastDonationDate);
        const nextEligible = new Date(lastDonation.getTime() + 90 * 24 * 60 * 60 * 1000);
        if (nextEligible.getTime() > Date.now()) {
          return res.status(400).json({ 
            error: 'Donor is in cooldown period', 
            nextEligibilityDate: nextEligible 
          });
        }
      }
      donor.isActive = true;
    }
    
    await donor.save();
    
    // Also update linked user if exists
    if (donor.user) {
      const user = await User.findById(donor.user);
      if (user) {
        user.donorStatus = availabilityStatus;
        user.availability = availabilityStatus === 'available';
        await user.save();
      }
    }
    
    return res.json({ 
      donor: await Donor.findById(id).populate('user', 'name email'),
      message: `Donor availability updated to ${availabilityStatus}` 
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/requests - Use Request model (same as frontend)
export const getRequests = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      urgency, 
      urgencyLevel,
      bloodType,
      bloodGroup,
      location,
      district,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = {};
    
    // Map status filter (Request model uses: Pending, Contacted, Matched, Accepted, Fulfilled, Cancelled)
    if (status) {
      // Map lowercase admin status to Request model status
      const statusMap = {
        'pending': 'Pending',
        'matched': 'Matched',
        'fulfilled': 'Fulfilled',
        'cancelled': 'Cancelled',
        'expired': 'Cancelled',
        'accepted': 'Accepted',
        'contacted': 'Contacted'
      };
      query.status = statusMap[status.toLowerCase()] || status;
    }
    
    // Map urgency filter (Request model uses: Normal, Urgent, Critical)
    if (urgency || urgencyLevel) {
      const urgencyValue = urgency || urgencyLevel;
      const urgencyMap = {
        'normal': 'Normal',
        'urgent': 'Urgent',
        'critical': 'Critical',
        'emergency': 'Critical'
      };
      query.urgency = urgencyMap[urgencyValue?.toLowerCase()] || urgencyValue;
    }
    
    // Map blood type filter
    if (bloodType || bloodGroup) {
      query.bloodType = bloodType || bloodGroup;
    }
    
    // Map location/district filter
    if (location || district) {
      query.location = location || district;
    }
    
    if (search) {
      query.$or = [
        { patientName: { $regex: search, $options: 'i' } },
        { hospitalName: { $regex: search, $options: 'i' } },
        { contactPhone: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    
    // Sort options
    const sort = {};
    const validSortFields = ['patientName', 'bloodType', 'location', 'status', 'urgency', 'createdAt', 'fulfilledAt'];
    if (validSortFields.includes(sortBy)) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    
    const [requests, total] = await Promise.all([
      Request.find(query)
        .populate('requesterId', 'name email phone')
        .populate('matchedDonorId', 'name email phone bloodType location')
        .populate('fulfilledBy', 'fullName phone email bloodGroup district')
        .skip(skip)
        .limit(Number(limit))
        .sort(sort)
        .lean(),
      Request.countDocuments(query),
    ]);
    
    // Map Request model fields to admin frontend expectations
    const mappedRequests = requests.map(req => {
      // Helper to format dates
      const formatDate = (date) => {
        if (!date) return new Date().toISOString();
        if (date instanceof Date) return date.toISOString();
        if (typeof date === 'string') return date;
        return new Date().toISOString();
      };

      // Extract requesterId (could be ObjectId or populated object)
      const requesterIdValue = req.requesterId ? 
        (typeof req.requesterId === 'object' && req.requesterId._id ? req.requesterId._id.toString() : req.requesterId.toString()) 
        : null;

      // Extract requester object if populated
      const requesterObj = req.requester || (req.requesterId && typeof req.requesterId === 'object' && req.requesterId.name ? {
        _id: req.requesterId._id?.toString() || requesterIdValue,
        name: req.requesterId.name || '',
        email: req.requesterId.email || '',
        phone: req.requesterId.phone || '',
      } : undefined);

      // Map Request status to lowercase for admin frontend
      const statusMap = {
        'Pending': 'pending',
        'Contacted': 'matched',
        'Matched': 'matched',
        'Accepted': 'matched',
        'Fulfilled': 'fulfilled',
        'Cancelled': 'cancelled'
      };

      // Map Request urgency to lowercase for admin frontend
      const urgencyMap = {
        'Normal': 'normal',
        'Urgent': 'urgent',
        'Critical': 'critical'
      };

      return {
        _id: req._id?.toString() || String(req._id),
        requesterId: requesterIdValue,
        requester: requesterObj,
        patientName: req.patientName || '',
        bloodType: req.bloodType || '', // Request model uses bloodType
        bloodGroup: req.bloodType || '', // Alias for compatibility
        location: req.location || '', // Request model uses location
        district: req.location || '', // Alias for compatibility
        units: req.units || 1,
        urgency: urgencyMap[req.urgency] || 'normal', // Map to lowercase
        urgencyLevel: req.urgency === 'Critical' ? 'critical' : (req.urgency === 'Urgent' ? 'urgent' : 'normal'), // Alias
        status: statusMap[req.status] || req.status?.toLowerCase() || 'pending', // Map to lowercase
        hospital: req.hospitalName || '', // Request model uses hospitalName
        description: '', // Request model doesn't have description field
        contactPhone: req.contactPhone || '',
        createdAt: formatDate(req.createdAt),
        updatedAt: formatDate(req.updatedAt),
        // Include donor info if available
        donorId: req.matchedDonorId ? (typeof req.matchedDonorId === 'object' ? req.matchedDonorId._id?.toString() : req.matchedDonorId.toString()) : undefined,
        fulfilledBy: req.fulfilledBy ? (typeof req.fulfilledBy === 'object' ? req.fulfilledBy._id?.toString() : req.fulfilledBy.toString()) : undefined,
      };
    });
    
    
    return res.json({ 
      requests: mappedRequests, 
      total, 
      page: Number(page), 
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    console.error('[Admin getRequests] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/requests/:id - Use Request model
export const getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id)
      .populate('requesterId', 'name email phone')
      .populate('matchedDonorId', 'name email phone bloodType location')
      .populate('fulfilledBy', 'fullName phone email bloodGroup district')
      .lean();
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Map Request model to admin frontend format
    const statusMap = {
      'Pending': 'pending',
      'Contacted': 'matched',
      'Matched': 'matched',
      'Accepted': 'matched',
      'Fulfilled': 'fulfilled',
      'Cancelled': 'cancelled'
    };
    
    const urgencyMap = {
      'Normal': 'normal',
      'Urgent': 'urgent',
      'Critical': 'critical'
    };
    
    const mappedRequest = {
      ...request,
      bloodGroup: request.bloodType,
      district: request.location,
      urgency: urgencyMap[request.urgency] || 'normal',
      urgencyLevel: request.urgency === 'Critical' ? 'critical' : (request.urgency === 'Urgent' ? 'urgent' : 'normal'),
      status: statusMap[request.status] || request.status?.toLowerCase() || 'pending',
      hospital: request.hospitalName || '',
      location: request.location,
    };
    
    return res.json({ request: mappedRequest });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// POST /admin/requests - Create request using Request model (same as frontend)
export const createRequest = async (req, res) => {
  try {
    const { patientName, bloodType, bloodGroup, units, urgency, urgencyLevel, hospital, hospitalName, city, district, location, description, contactPerson, contactPhone, phone } = req.body;
    
    // Map admin form fields to Request model fields
    const mappedBloodType = bloodGroup || bloodType;
    const mappedLocation = location || district || city;
    const mappedHospitalName = hospitalName || hospital || '';
    const mappedContactPhone = contactPhone || phone || '0000000000';
    
    // Map urgency to Request model format (Normal, Urgent, Critical)
    let mappedUrgency = 'Normal';
    const urgencyValue = urgencyLevel || urgency || '';
    if (urgencyValue.toLowerCase() === 'critical' || urgencyValue.toLowerCase() === 'emergency') {
      mappedUrgency = 'Critical';
    } else if (urgencyValue.toLowerCase() === 'urgent') {
      mappedUrgency = 'Urgent';
    }
    
    // Validation
    if (!patientName || !mappedBloodType || !mappedLocation || !units) {
      return res.status(400).json({ error: 'Patient name, blood type, location, and units are required' });
    }
    
    // Validate blood type
    const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validBloodTypes.includes(mappedBloodType)) {
      return res.status(400).json({ error: 'Invalid blood type' });
    }
    
    // Validate location using canonical locations
    const { isValidLocation } = await import('../utils/locations.js');
    if (!isValidLocation(mappedLocation)) {
      return res.status(400).json({ error: 'Invalid location. Please select a valid district.' });
    }
    
    // Use admin's ID as requesterId
    const requesterId = req.user?.id || req.user?._id;
    
    // Get admin user details for requester object
    const adminUser = await User.findById(requesterId).select('name email phone').lean();
    
    // Create request using Request model (same as frontend)
    const request = await Request.create({
      patientName: String(patientName).trim(),
      bloodType: mappedBloodType,
      location: mappedLocation,
      hospitalName: mappedHospitalName || undefined,
      contactPhone: mappedContactPhone,
      urgency: mappedUrgency,
      units: Number(units) || 1,
      requesterId: requesterId,
      requester: adminUser ? {
        name: adminUser.name || 'Admin',
        phone: adminUser.phone || mappedContactPhone,
        email: adminUser.email || '',
      } : {
        name: 'Admin',
        phone: mappedContactPhone,
        email: '',
      },
      status: 'Pending',
    });
    
    const populatedRequest = await Request.findById(request._id)
      .populate('requesterId', 'name email phone')
      .lean();
    
    // Map Request model to admin frontend format
    const statusMap = {
      'Pending': 'pending',
      'Contacted': 'matched',
      'Matched': 'matched',
      'Accepted': 'matched',
      'Fulfilled': 'fulfilled',
      'Cancelled': 'cancelled'
    };
    
    const urgencyMap = {
      'Normal': 'normal',
      'Urgent': 'urgent',
      'Critical': 'critical'
    };
    
    const mappedRequest = {
      ...populatedRequest,
      location: populatedRequest.location,
      district: populatedRequest.location, // Alias
      bloodType: populatedRequest.bloodType,
      bloodGroup: populatedRequest.bloodType, // Alias
      urgency: urgencyMap[populatedRequest.urgency] || 'normal',
      urgencyLevel: populatedRequest.urgency === 'Critical' ? 'critical' : (populatedRequest.urgency === 'Urgent' ? 'urgent' : 'normal'),
      status: statusMap[populatedRequest.status] || 'pending',
      hospital: populatedRequest.hospitalName || '',
    };
    
    return res.status(201).json(mappedRequest);
  } catch (err) {
    console.error('[Admin createRequest] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// POST /admin/requests/emergency - Create emergency request using Request model
export const createEmergencyRequest = async (req, res) => {
  try {
    const { bloodType, bloodGroup, units, hospital, hospitalName, city, district, location, description } = req.body;
    
    // Map admin form fields to Request model fields
    const mappedBloodType = bloodGroup || bloodType;
    const mappedLocation = location || district || city;
    const mappedHospitalName = hospitalName || hospital || 'Emergency Hospital';
    
    // Validation
    if (!mappedBloodType || !mappedLocation) {
      return res.status(400).json({ error: 'Blood type and location are required' });
    }
    
    // Validate blood type
    const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validBloodTypes.includes(mappedBloodType)) {
      return res.status(400).json({ error: 'Invalid blood type' });
    }
    
    // Validate location using canonical locations
    const { isValidLocation } = await import('../utils/locations.js');
    if (!isValidLocation(mappedLocation)) {
      return res.status(400).json({ error: 'Invalid location. Please select a valid district.' });
    }
    
    // Use admin's ID as requesterId
    const requesterId = req.user?.id || req.user?._id;
    
    // Get admin user details for requester object
    const adminUser = await User.findById(requesterId).select('name email phone').lean();
    
    // Create emergency request with Critical urgency using Request model
    const request = await Request.create({
      patientName: 'Emergency',
      bloodType: mappedBloodType,
      location: mappedLocation,
      hospitalName: mappedHospitalName,
      contactPhone: '0000000000', // Default phone for emergency
      urgency: 'Critical',
      units: Number(units) || 1,
      requesterId: requesterId,
      requester: adminUser ? {
        name: adminUser.name || 'Admin',
        phone: adminUser.phone || '0000000000',
        email: adminUser.email || '',
      } : {
        name: 'Admin',
        phone: '0000000000',
        email: '',
      },
      status: 'Pending',
    });
    
    const populatedRequest = await Request.findById(request._id)
      .populate('requesterId', 'name email phone')
      .lean();
    
    // Map Request model to admin frontend format
    const statusMap = {
      'Pending': 'pending',
      'Contacted': 'matched',
      'Matched': 'matched',
      'Accepted': 'matched',
      'Fulfilled': 'fulfilled',
      'Cancelled': 'cancelled'
    };
    
    const urgencyMap = {
      'Normal': 'normal',
      'Urgent': 'urgent',
      'Critical': 'critical'
    };
    
    const mappedRequest = {
      ...populatedRequest,
      location: populatedRequest.location,
      district: populatedRequest.location, // Alias
      bloodType: populatedRequest.bloodType,
      bloodGroup: populatedRequest.bloodType, // Alias
      urgency: urgencyMap[populatedRequest.urgency] || 'critical',
      urgencyLevel: 'critical',
      status: statusMap[populatedRequest.status] || 'pending',
      hospital: populatedRequest.hospitalName || '',
    };
    
    return res.status(201).json(mappedRequest);
  } catch (err) {
    console.error('[Admin createEmergencyRequest] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// PUT /admin/requests/:id
export const updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    
    // Map admin frontend fields to Request model fields
    if (req.body.patientName !== undefined) updates.patientName = req.body.patientName;
    if (req.body.bloodType !== undefined) updates.bloodType = req.body.bloodType;
    if (req.body.bloodGroup !== undefined) updates.bloodType = req.body.bloodGroup; // Map bloodGroup to bloodType
    if (req.body.location !== undefined) updates.location = req.body.location;
    if (req.body.district !== undefined) updates.location = req.body.district; // Map district to location
    if (req.body.hospitalName !== undefined) updates.hospitalName = req.body.hospitalName;
    if (req.body.hospital !== undefined) updates.hospitalName = req.body.hospital; // Map hospital to hospitalName
    if (req.body.contactPhone !== undefined) updates.contactPhone = req.body.contactPhone;
    if (req.body.units !== undefined) updates.units = req.body.units;
    
    // Map urgency
    if (req.body.urgency !== undefined || req.body.urgencyLevel !== undefined) {
      const urgencyValue = req.body.urgency || req.body.urgencyLevel || '';
      if (urgencyValue.toLowerCase() === 'critical' || urgencyValue.toLowerCase() === 'emergency') {
        updates.urgency = 'Critical';
      } else if (urgencyValue.toLowerCase() === 'urgent') {
        updates.urgency = 'Urgent';
      } else {
        updates.urgency = 'Normal';
      }
    }
    
    // Map status (admin uses lowercase, Request model uses title case)
    if (req.body.status !== undefined) {
      const statusMap = {
        'pending': 'Pending',
        'matched': 'Matched',
        'contacted': 'Contacted',
        'accepted': 'Accepted',
        'fulfilled': 'Fulfilled',
        'cancelled': 'Cancelled'
      };
      updates.status = statusMap[req.body.status.toLowerCase()] || req.body.status;
    }
    
    // If status is being updated to fulfilled, set fulfilledAt
    if (updates.status === 'Fulfilled') {
      updates.fulfilledAt = new Date();
    } else if (updates.status === 'Cancelled') {
      updates.cancelledAt = new Date();
    }
    
    const request = await Request.findByIdAndUpdate(id, updates, { new: true })
      .populate('requesterId', 'name email phone')
      .populate('matchedDonorId', 'name email phone bloodType location')
      .populate('fulfilledBy', 'fullName phone email bloodGroup district')
      .lean();
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Map Request model to admin frontend format
    const statusMap = {
      'Pending': 'pending',
      'Contacted': 'matched',
      'Matched': 'matched',
      'Accepted': 'matched',
      'Fulfilled': 'fulfilled',
      'Cancelled': 'cancelled'
    };
    
    const urgencyMap = {
      'Normal': 'normal',
      'Urgent': 'urgent',
      'Critical': 'critical'
    };
    
    const mappedRequest = {
      ...request,
      bloodGroup: request.bloodType,
      district: request.location,
      urgency: urgencyMap[request.urgency] || 'normal',
      urgencyLevel: request.urgency === 'Critical' ? 'critical' : (request.urgency === 'Urgent' ? 'urgent' : 'normal'),
      status: statusMap[request.status] || request.status?.toLowerCase() || 'pending',
      hospital: request.hospitalName || '',
    };
    
    return res.json({ request: mappedRequest });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// PUT /admin/requests/:id/status
export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Map admin status to Request model status
    const statusMap = {
      'pending': 'Pending',
      'matched': 'Matched',
      'contacted': 'Contacted',
      'accepted': 'Accepted',
      'fulfilled': 'Fulfilled',
      'completed': 'Fulfilled',
      'cancelled': 'Cancelled',
      'expired': 'Cancelled'
    };
    
    const mappedStatus = statusMap[status?.toLowerCase()] || status;
    
    if (!mappedStatus || !['Pending', 'Contacted', 'Matched', 'Accepted', 'Fulfilled', 'Cancelled'].includes(mappedStatus)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: pending, matched, fulfilled, cancelled` });
    }
    
    const updates = { status: mappedStatus };
    if (mappedStatus === 'Fulfilled') {
      updates.fulfilledAt = new Date();
    } else if (mappedStatus === 'Cancelled') {
      updates.cancelledAt = new Date();
    }
    
    const request = await Request.findByIdAndUpdate(id, updates, { new: true })
      .populate('requesterId', 'name email phone')
      .populate('matchedDonorId', 'name email phone bloodType location')
      .populate('fulfilledBy', 'fullName phone email bloodGroup district')
      .lean();
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Map back to admin frontend format
    const reverseStatusMap = {
      'Pending': 'pending',
      'Contacted': 'matched',
      'Matched': 'matched',
      'Accepted': 'matched',
      'Fulfilled': 'fulfilled',
      'Cancelled': 'cancelled'
    };
    
    const urgencyMap = {
      'Normal': 'normal',
      'Urgent': 'urgent',
      'Critical': 'critical'
    };
    
    const mappedRequest = {
      ...request,
      bloodGroup: request.bloodType,
      district: request.location,
      urgency: urgencyMap[request.urgency] || 'normal',
      urgencyLevel: request.urgency === 'Critical' ? 'critical' : (request.urgency === 'Urgent' ? 'urgent' : 'normal'),
      status: reverseStatusMap[request.status] || request.status?.toLowerCase() || 'pending',
      hospital: request.hospitalName || '',
    };
    
    return res.json({ request: mappedRequest, message: `Request status updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE /admin/requests/:id
export const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Clear donor's matchedRequest if this request is matched (Request model uses matchedDonorId)
    if (request.matchedDonorId) {
      const donor = await Donor.findOne({ user: request.matchedDonorId });
      if (donor && String(donor.matchedRequest) === String(id)) {
        donor.matchedRequest = null;
        await donor.save();
      }
    }
    
    await Request.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Request deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/matches
export const getMatches = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      status,
      bloodGroup,
      district,
      sortBy = 'matchedAt',
      sortOrder = 'desc'
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = { 
      donorId: { $ne: null } // Must have a matched donor
    };
    
    // Status filter
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['matched', 'accepted', 'fulfilled'] };
    }
    
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (district) query.district = district;
    
    // Sort options
    const sort = {};
    const validSortFields = ['matchedAt', 'createdAt', 'bloodGroup', 'district', 'status'];
    if (validSortFields.includes(sortBy)) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.matchedAt = -1;
    }
    
    const [matches, total] = await Promise.all([
      BloodRequest.find(query)
        .populate('requesterId', 'name email phone')
        .populate('donorId', 'fullName phone email bloodGroup district availabilityStatus')
        .populate('fulfilledBy', 'fullName phone bloodGroup district')
        .skip(skip)
        .limit(Number(limit))
        .sort(sort),
      BloodRequest.countDocuments(query),
    ]);
    
    // Format matches with additional computed fields
    const formattedMatches = matches.map(m => ({
      _id: m._id,
      requestId: m._id,
      donor: m.donorId ? {
        _id: m.donorId._id,
        name: m.donorId.fullName,
        phone: m.donorId.phone,
        email: m.donorId.email,
        bloodGroup: m.donorId.bloodGroup,
        district: m.donorId.district,
        availabilityStatus: m.donorId.availabilityStatus,
      } : null,
      requester: m.requesterId ? {
        _id: m.requesterId._id,
        name: m.requesterId.name,
        email: m.requesterId.email,
        phone: m.requesterId.phone,
      } : null,
      bloodType: m.bloodGroup,
      location: m.district,
      status: m.status,
      donorAccepted: m.donorAccepted,
      donorDeclined: m.donorDeclined,
      matchedAt: m.matchedAt,
      fulfilledAt: m.fulfilledAt,
      createdAt: m.createdAt,
    }));
    
    return res.json({ 
      matches: formattedMatches, 
      total, 
      page: Number(page), 
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/matches/:id
export const getMatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await BloodRequest.findById(id)
      .populate('requesterId', 'name email phone')
      .populate('donorId', 'fullName phone email bloodGroup district availabilityStatus')
      .populate('fulfilledBy', 'fullName phone bloodGroup district');
    
    if (!request || !request.donorId) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const match = {
      _id: request._id,
      requestId: request._id,
      donor: {
        _id: request.donorId._id,
        name: request.donorId.fullName,
        phone: request.donorId.phone,
        email: request.donorId.email,
        bloodGroup: request.donorId.bloodGroup,
        district: request.donorId.district,
        availabilityStatus: request.donorId.availabilityStatus,
      },
      requester: request.requesterId ? {
        _id: request.requesterId._id,
        name: request.requesterId.name,
        email: request.requesterId.email,
        phone: request.requesterId.phone,
      } : null,
      bloodType: request.bloodGroup,
      location: request.district,
      status: request.status,
      donorAccepted: request.donorAccepted,
      donorDeclined: request.donorDeclined,
      matchedAt: request.matchedAt,
      fulfilledAt: request.fulfilledAt,
      createdAt: request.createdAt,
      patientName: request.patientName,
      units: request.units,
      urgencyLevel: request.urgencyLevel,
    };
    
    return res.json({ match });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/donations - Get donations from both Donation model and fulfilled Requests
export const getDonations = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      status, // 'pending', 'fulfilled', 'cancelled'
      sortBy = 'donationDate',
      sortOrder = 'desc'
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    // Get donations from Donation model
    const donationQuery = {};
    if (status === 'scheduled' || status === 'pending') {
      donationQuery.status = 'Pending';
    } else if (status === 'fulfilled') {
      donationQuery.status = 'Completed';
    }
    
    const [donationsFromModel, fulfilledRequests, matchedRequests] = await Promise.all([
      Donation.find(donationQuery)
        .populate('donorId', 'name email phone bloodType location')
        .populate({
          path: 'requestId',
          select: 'patientName units hospitalName location bloodType fulfilledBy status',
          populate: {
            path: 'fulfilledBy',
            select: 'fullName phone email bloodGroup district',
            model: 'Donor'
          }
        })
        .lean(),
      // Get fulfilled requests as donations (since donations are created when requests are fulfilled)
      Request.find({ status: 'Fulfilled' })
        .populate('requesterId', 'name email phone')
        .populate('fulfilledBy', 'fullName phone email bloodGroup district')
        .populate('matchedDonorId', 'name email phone bloodType location')
        .lean(),
      // Get matched/accepted requests as scheduled donations (donor matched but not yet fulfilled)
      // These are requests that have a donor assigned but haven't been fulfilled yet
      Request.find({ 
        status: { $in: ['Matched', 'Accepted', 'Contacted'] }
      })
        .populate('requesterId', 'name email phone')
        .populate('fulfilledBy', 'fullName phone email bloodGroup district')
        .populate('matchedDonorId', 'name email phone bloodType location')
        .populate('contactedBy.donorId', 'fullName phone email bloodGroup district')
        .lean(),
    ]);
    
    // Format donations from Donation model
    const donationsFromDonationModel = donationsFromModel.map(donation => {
      const request = donation.requestId;
      const donorUser = donation.donorId;
      
      // Get donor info
      let donorInfo = null;
      if (request && request.fulfilledBy) {
        donorInfo = {
          _id: request.fulfilledBy._id?.toString() || '',
          name: request.fulfilledBy.fullName || '',
          fullName: request.fulfilledBy.fullName || '',
          phone: request.fulfilledBy.phone || '',
          email: request.fulfilledBy.email || '',
          bloodGroup: request.fulfilledBy.bloodGroup || '',
          district: request.fulfilledBy.district || '',
        };
      } else if (donorUser) {
        donorInfo = {
          _id: donorUser._id?.toString() || '',
          name: donorUser.name || '',
          fullName: donorUser.name || '',
          phone: donorUser.phone || '',
          email: donorUser.email || '',
          bloodGroup: donorUser.bloodType || '',
          district: donorUser.location || '',
        };
      }
      
      const formatDate = (date) => {
        if (!date) return null;
        if (date instanceof Date) return date.toISOString();
        if (typeof date === 'string') return date;
        return new Date(date).toISOString();
      };
      
      return {
        _id: donation._id?.toString() || String(donation._id),
        requestId: request ? (typeof request === 'object' ? request._id?.toString() : request.toString()) : null,
        donor: donorInfo,
        donorName: donorInfo?.name || donorInfo?.fullName || '-',
        units: request?.units || 1,
        hospital: request?.hospitalName || '-',
        donationDate: formatDate(donation.donationDate) || formatDate(donation.createdAt),
        status: donation.status === 'Completed' ? 'fulfilled' : 'scheduled',
        createdAt: formatDate(donation.createdAt),
        updatedAt: formatDate(donation.updatedAt),
        patientName: request?.patientName || '',
        bloodType: request?.bloodType || '',
        location: request?.location || '',
      };
    });
    
    // Format matched/accepted requests as scheduled donations
    // Debug: log how many matched requests we found
    
    // Use Promise.all to handle async operations
    const pendingDonationsFromRequestsPromises = matchedRequests.map(async (request) => {
      // Skip if already fulfilled
      if (request.status === 'Fulfilled' || request.fulfilledAt) {
        return null;
      }
      
      // Get donor info - prioritize matchedDonorId (most common for scheduled), then fulfilledBy, then contactedBy
      let donorInfo = null;
      
      // First try matchedDonorId (most common for scheduled donations)
      if (request.matchedDonorId) {
        const user = request.matchedDonorId;
        // Handle populated User object
        if (user && typeof user === 'object' && (user._id || user.name)) {
          donorInfo = {
            _id: user._id?.toString() || String(user._id) || '',
            name: user.name || '',
            fullName: user.name || '',
            phone: user.phone || '',
            email: user.email || '',
            bloodGroup: user.bloodType || '',
            district: user.location || '',
          };
        } else if (typeof user === 'string' || (user && user.toString)) {
          // Unpopulated ObjectId - fetch the user
          try {
            const fetchedUser = await User.findById(user).select('name email phone bloodType location').lean();
            if (fetchedUser) {
              donorInfo = {
                _id: fetchedUser._id?.toString() || '',
                name: fetchedUser.name || '',
                fullName: fetchedUser.name || '',
                phone: fetchedUser.phone || '',
                email: fetchedUser.email || '',
                bloodGroup: fetchedUser.bloodType || '',
                district: fetchedUser.location || '',
              };
            }
          } catch (err) {
            console.error(`[Admin getDonations] Error fetching user ${user}:`, err.message);
          }
        }
      }
      
      // Fallback to fulfilledBy (shouldn't happen for scheduled, but just in case)
      if (!donorInfo && request.fulfilledBy) {
        const donor = request.fulfilledBy;
        if (donor && typeof donor === 'object' && donor._id) {
          donorInfo = {
            _id: donor._id?.toString() || '',
            name: donor.fullName || '',
            fullName: donor.fullName || '',
            phone: donor.phone || '',
            email: donor.email || '',
            bloodGroup: donor.bloodGroup || '',
            district: donor.district || '',
          };
        }
      }
      
      // Last resort: contactedBy array
      if (!donorInfo && request.contactedBy && request.contactedBy.length > 0) {
        const lastContact = request.contactedBy[request.contactedBy.length - 1];
        if (lastContact && lastContact.donorId) {
          const donor = lastContact.donorId;
          if (typeof donor === 'object' && donor._id) {
            donorInfo = {
              _id: donor._id?.toString() || '',
              name: donor.fullName || donor.name || '',
              fullName: donor.fullName || donor.name || '',
              phone: donor.phone || '',
              email: donor.email || '',
              bloodGroup: donor.bloodGroup || '',
              district: donor.district || '',
            };
          }
        }
      }
      
      // If no donor info, skip this request
      if (!donorInfo) return null;
      
      const formatDate = (date) => {
        if (!date) return null;
        if (date instanceof Date) return date.toISOString();
        if (typeof date === 'string') return date;
        return new Date(date).toISOString();
      };
      
      return {
        _id: `pending_req_${request._id?.toString() || String(request._id)}`,
        requestId: request._id?.toString() || String(request._id),
        donor: donorInfo,
        donorName: donorInfo?.name || donorInfo?.fullName || '-',
        units: request.units || 1,
        hospital: request.hospitalName || '-',
        donationDate: formatDate(request.createdAt), // Use created date for scheduled
        status: 'scheduled',
        createdAt: formatDate(request.createdAt),
        updatedAt: formatDate(request.updatedAt),
        patientName: request.patientName || '',
        bloodType: request.bloodType || '',
        location: request.location || '',
      };
    });
    
    // Wait for all async operations to complete and filter nulls
    const pendingDonationsFromRequests = (await Promise.all(pendingDonationsFromRequestsPromises)).filter(d => d !== null);
    
    // Format fulfilled requests as donations
    const donationsFromRequests = fulfilledRequests.map(request => {
      // Get donor info from fulfilledBy (Donor model)
      let donorInfo = null;
      if (request.fulfilledBy) {
        const donor = request.fulfilledBy;
        donorInfo = {
          _id: donor._id?.toString() || '',
          name: donor.fullName || '',
          fullName: donor.fullName || '',
          phone: donor.phone || '',
          email: donor.email || '',
          bloodGroup: donor.bloodGroup || '',
          district: donor.district || '',
        };
      } else if (request.matchedDonorId) {
        // Fallback to matchedDonorId (User model)
        const user = request.matchedDonorId;
        donorInfo = {
          _id: user._id?.toString() || '',
          name: user.name || '',
          fullName: user.name || '',
          phone: user.phone || '',
          email: user.email || '',
          bloodGroup: user.bloodType || '',
          district: user.location || '',
        };
      }
      
      const formatDate = (date) => {
        if (!date) return null;
        if (date instanceof Date) return date.toISOString();
        if (typeof date === 'string') return date;
        return new Date(date).toISOString();
      };
      
      return {
        _id: `req_${request._id?.toString() || String(request._id)}`, // Prefix to avoid conflicts
        requestId: request._id?.toString() || String(request._id),
        donor: donorInfo,
        donorName: donorInfo?.name || donorInfo?.fullName || '-',
        units: request.units || 1,
        hospital: request.hospitalName || '-',
        donationDate: formatDate(request.fulfilledAt) || formatDate(request.fulfilledDate) || formatDate(request.createdAt),
        status: 'fulfilled',
        createdAt: formatDate(request.createdAt),
        updatedAt: formatDate(request.updatedAt),
        patientName: request.patientName || '',
        bloodType: request.bloodType || '',
        location: request.location || '',
      };
    });
    
    // Combine all sources and remove duplicates (prefer Donation model records, then fulfilled, then pending)
    const donationMap = new Map();
    
    // Add donations from Donation model first (highest priority)
    donationsFromDonationModel.forEach(d => {
      if (d.requestId) {
        donationMap.set(d.requestId, d);
      } else {
        donationMap.set(d._id, d);
      }
    });
    
    // Add fulfilled requests that don't have a Donation record
    donationsFromRequests.forEach(d => {
      if (d.requestId && !donationMap.has(d.requestId)) {
        donationMap.set(d.requestId, d);
      }
    });
    
    // Add scheduled donations from matched requests (only if not already in map)
    const validScheduledDonations = pendingDonationsFromRequests.filter(d => d !== null);
    
    validScheduledDonations.forEach(d => {
      if (d.requestId && !donationMap.has(d.requestId)) {
        donationMap.set(d.requestId, d);
      }
    });
    
    let allDonations = Array.from(donationMap.values());
    
    // Apply status filter
    if (status === 'scheduled' || status === 'pending') {
      allDonations = allDonations.filter(d => d.status === 'scheduled' || d.status === 'pending');
    } else if (status === 'fulfilled') {
      allDonations = allDonations.filter(d => d.status === 'fulfilled');
    } else if (status === 'cancelled') {
      allDonations = allDonations.filter(d => d.status === 'cancelled');
    }
    
    // Sort
    const sort = {};
    if (sortBy === 'donationDate') {
      allDonations.sort((a, b) => {
        const dateA = new Date(a.donationDate || a.createdAt || 0);
        const dateB = new Date(b.donationDate || b.createdAt || 0);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortBy === 'createdAt') {
      allDonations.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }
    
    // Paginate
    const total = allDonations.length;
    const paginatedDonations = allDonations.slice(skip, skip + Number(limit));
    
    return res.json({ 
      donations: paginatedDonations, 
      total, 
      page: Number(page), 
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    console.error('[Admin getDonations] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/donations/:id - Get single donation by ID
export const getDonationById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await BloodRequest.findById(id)
      .populate('requesterId', 'name email phone')
      .populate('fulfilledBy', 'fullName phone email bloodGroup district')
      .populate('donorId', 'fullName phone bloodGroup district');
    
    if (!request) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    // Map backend status to frontend status
    let displayStatus = 'scheduled';
    if (request.status === 'fulfilled' || request.status === 'completed') {
      displayStatus = 'completed';
    } else if (request.status === 'cancelled' || request.status === 'declined') {
      displayStatus = 'cancelled';
    } else if (request.status === 'matched') {
      displayStatus = 'scheduled';
    }
    
    const donation = {
      _id: request._id,
      requestId: request._id,
      donor: request.fulfilledBy ? {
        _id: request.fulfilledBy._id,
        name: request.fulfilledBy.fullName,
        phone: request.fulfilledBy.phone,
        email: request.fulfilledBy.email,
        bloodGroup: request.fulfilledBy.bloodGroup,
        district: request.fulfilledBy.district,
      } : (request.donorId ? {
        _id: request.donorId._id,
        name: request.donorId.fullName,
        phone: request.donorId.phone,
        bloodGroup: request.donorId.bloodGroup,
        district: request.donorId.district,
      } : null),
      requester: request.requesterId ? {
        _id: request.requesterId._id,
        name: request.requesterId.name,
        email: request.requesterId.email,
        phone: request.requesterId.phone,
      } : null,
      donationDate: request.fulfilledAt || request.matchedAt || request.createdAt,
      bloodType: request.bloodGroup,
      location: request.district,
      units: request.units,
      patientName: request.patientName,
      hospital: request.hospital || request.district,
      status: displayStatus,
      notes: request.additionalNote || request.reason || '',
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
    
    return res.json(donation);
  } catch (err) {
    console.error('[Admin getDonationById] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// PUT /admin/donations/:id - Update donation
export const updateDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, units, hospital, notes } = req.body;
    
    const updates = {};
    
    // Map frontend status to backend status
    if (status) {
      if (status === 'completed' || status === 'fulfilled') {
        updates.status = 'fulfilled';
        updates.fulfilledAt = new Date();
      } else if (status === 'cancelled') {
        updates.status = 'cancelled';
      } else if (status === 'scheduled' || status === 'pending') {
        updates.status = 'matched';
      }
    }
    
    if (units !== undefined) updates.units = Number(units);
    if (hospital !== undefined) updates.hospital = hospital;
    if (notes !== undefined) {
      updates.additionalNote = notes;
      updates.reason = notes; // Also update reason field
    }
    
    const request = await BloodRequest.findByIdAndUpdate(id, updates, { new: true })
      .populate('requesterId', 'name email phone')
      .populate('fulfilledBy', 'fullName phone email bloodGroup district')
      .populate('donorId', 'fullName phone bloodGroup district');
    
    if (!request) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    // Map backend status to frontend status
    let displayStatus = 'scheduled';
    if (request.status === 'fulfilled' || request.status === 'completed') {
      displayStatus = 'fulfilled';
    } else if (request.status === 'cancelled' || request.status === 'declined') {
      displayStatus = 'cancelled';
    } else if (request.status === 'matched' || request.status === 'accepted' || request.status === 'contacted') {
      displayStatus = 'scheduled';
    }
    
    const donation = {
      _id: request._id,
      requestId: request._id,
      donor: request.fulfilledBy ? {
        _id: request.fulfilledBy._id,
        name: request.fulfilledBy.fullName,
        phone: request.fulfilledBy.phone,
        email: request.fulfilledBy.email,
        bloodGroup: request.fulfilledBy.bloodGroup,
        district: request.fulfilledBy.district,
      } : (request.donorId ? {
        _id: request.donorId._id,
        name: request.donorId.fullName,
        phone: request.donorId.phone,
        bloodGroup: request.donorId.bloodGroup,
        district: request.donorId.district,
      } : null),
      requester: request.requesterId ? {
        _id: request.requesterId._id,
        name: request.requesterId.name,
        email: request.requesterId.email,
        phone: request.requesterId.phone,
      } : null,
      donationDate: request.fulfilledAt || request.matchedAt || request.createdAt,
      bloodType: request.bloodGroup,
      location: request.district,
      units: request.units,
      patientName: request.patientName,
      hospital: hospital || request.hospital || request.district,
      status: displayStatus,
      notes: notes || request.additionalNote || request.reason || '',
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
    
    return res.json(donation);
  } catch (err) {
    console.error('[Admin updateDonation] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/emergencies - Returns critical requests AND available donors for search
export const getEmergencies = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      bloodGroup,
      district,
      search, // Search donors by name
      availability = 'available' // Filter by availability status
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    // Get critical emergency requests
    const emergencyQuery = { 
      urgencyLevel: 'critical', 
      status: { $in: ['pending', 'matched'] } 
    };
    
    const [emergencies, emergenciesTotal] = await Promise.all([
      BloodRequest.find(emergencyQuery)
        .populate('requesterId', 'name email phone')
        .populate('donorId', 'fullName phone bloodGroup district')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      BloodRequest.countDocuments(emergencyQuery),
    ]);
    
    // Get available donors for emergency search (blood type and location filter)
    const donorQuery = {
      availabilityStatus: availability === 'all' ? { $exists: true } : availability,
      isActive: true
    };
    
    if (bloodGroup) donorQuery.bloodGroup = bloodGroup;
    if (district) donorQuery.district = district;
    if (search) {
      donorQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    
    const [availableDonors, donorsTotal] = await Promise.all([
      Donor.find(donorQuery)
        .populate('user', 'name email phone')
        .select('fullName email phone bloodGroup district availabilityStatus isActive lastDonationDate')
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Donor.countDocuments(donorQuery),
    ]);
    
    // Format donors with computed eligibility
    const formattedDonors = availableDonors.map(d => {
      const donorObj = d.toObject();
      // Calculate next eligibility date
      if (d.lastDonationDate) {
        const lastDonation = new Date(d.lastDonationDate);
        const nextEligible = new Date(lastDonation.getTime() + 90 * 24 * 60 * 60 * 1000);
        donorObj.nextEligibilityDate = nextEligible;
        donorObj.isEligible = nextEligible.getTime() <= Date.now();
      } else {
        donorObj.nextEligibilityDate = null;
        donorObj.isEligible = true;
      }
      return donorObj;
    });
    
    return res.json({ 
      emergencies,
      emergenciesTotal,
      availableDonors: formattedDonors,
      donorsTotal,
      page: Number(page), 
      limit: Number(limit) 
    });
  } catch (err) {
    console.error('[Admin getEmergencies] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/notifications
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, read, type, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = {};
    
    if (userId) query.userId = userId;
    if (read !== undefined) query.read = read === 'true';
    if (type) query.type = type;
    
    // Sort options
    const sort = {};
    const validSortFields = ['createdAt', 'read', 'type', 'urgent'];
    if (validSortFields.includes(sortBy)) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('userId', 'name email')
        .skip(skip)
        .limit(Number(limit))
        .sort(sort),
      Notification.countDocuments(query),
    ]);
    
    return res.json({ 
      notifications, 
      total, 
      page: Number(page), 
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ==================== STATISTICS ENDPOINTS (Chart-Ready) ====================

// GET /admin/stats/overview
export const getStatsOverview = async (req, res) => {
  try {
    const [
      totalUsers,
      totalDonors,
      totalRequests,
      totalDonations,
      activeDonors,
      pendingRequests,
      fulfilledRequests,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Donor.countDocuments(),
      BloodRequest.countDocuments(),
      BloodRequest.countDocuments({ status: { $in: ['fulfilled', 'completed'] } }),
      Donor.countDocuments({ availabilityStatus: 'available', isActive: true }),
      BloodRequest.countDocuments({ status: 'pending' }),
      BloodRequest.countDocuments({ status: { $in: ['fulfilled', 'completed'] } }),
    ]);
    
    return res.json({
      users: { total: totalUsers },
      donors: { total: totalDonors, active: activeDonors },
      requests: { total: totalRequests, pending: pendingRequests, fulfilled: fulfilledRequests },
      donations: { total: totalDonations },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/reports/summary - Returns counts for reports page
export const getReportsSummary = async (req, res) => {
  try {
    const [
      totalUsers,
      totalDonors,
      totalRequests,
      totalDonations,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Donor.countDocuments(),
      Request.countDocuments(), // Use Request model (unified with frontend)
      // Count ONLY fulfilled requests - these represent donors who have actually donated blood
      // Excludes: pending, matched, accepted, contacted (not yet fulfilled)
      Request.countDocuments({ status: 'Fulfilled' }),
    ]);
    
    return res.json({
      users: { total: totalUsers },
      donors: { total: totalDonors },
      requests: { total: totalRequests },
      donations: { total: totalDonations },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/stats/donors (Pie chart: available vs unavailable)
export const getStatsDonors = async (req, res) => {
  try {
    const result = await Donor.aggregate([
      {
        $group: {
          _id: '$availabilityStatus',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          label: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'available'] }, then: 'Available' },
                { case: { $eq: ['$_id', 'unavailable'] }, then: 'Unavailable' }
              ],
              default: 'Unknown'
            }
          },
          value: '$count'
        }
      }
    ]);
    
    // Ensure both labels exist
    const labels = ['Available', 'Unavailable'];
    const data = labels.map(label => {
      const found = result.find(r => r.label === label);
      return { label, value: found ? found.value : 0 };
    });
    
    return res.json({ chart: { type: 'pie', data } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/stats/requests (Bar chart: pending/fulfilled/expired)
export const getStatsRequests = async (req, res) => {
  try {
    if (!isDBReady()) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        chart: { type: 'bar', data: [] }
      });
    }
    // Use Request model (unified model) with title-case statuses
    const result = await Request.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          label: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'Pending'] }, then: 'Pending' },
                { case: { $eq: ['$_id', 'Contacted'] }, then: 'Matched' },
                { case: { $eq: ['$_id', 'Matched'] }, then: 'Matched' },
                { case: { $eq: ['$_id', 'Accepted'] }, then: 'Accepted' },
                { case: { $eq: ['$_id', 'Fulfilled'] }, then: 'Fulfilled' },
                { case: { $eq: ['$_id', 'Cancelled'] }, then: 'Cancelled' }
              ],
              default: 'Unknown'
            }
          },
          value: '$count'
        }
      }
    ]);
    
    // Order: pending, matched, accepted, fulfilled, completed, expired, cancelled
    // Map Request statuses to display labels
    const statusMap = {
      'Pending': 'Pending',
      'Contacted': 'Matched',
      'Matched': 'Matched',
      'Accepted': 'Accepted',
      'Fulfilled': 'Fulfilled',
      'Cancelled': 'Cancelled'
    };
    
    const order = ['Pending', 'Matched', 'Accepted', 'Fulfilled', 'Completed', 'Expired', 'Cancelled'];
    const data = order.map(label => {
      // Find matching result (handle both direct match and status mapping)
      const found = result.find(r => {
        if (r.label === label) return true;
        // Handle Matched status (could be Contacted or Matched)
        if (label === 'Matched' && (r.label === 'Matched' || r.label === 'Contacted')) return true;
        return false;
      });
      return { label, value: found ? found.value : 0 };
    });
    
    return res.json({ chart: { type: 'bar', data } });
  } catch (err) {
    return handleDBError(err, res, 'getStatsRequests');
  }
};

// GET /admin/stats/blood-types (Donor distribution by blood group)
export const getStatsBloodTypes = async (req, res) => {
  try {
    if (!isDBReady()) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        chart: { type: 'pie', data: [] }
      });
    }
    // Get all donors grouped by blood type
    const result = await Donor.aggregate([
      {
        $group: {
          _id: '$bloodGroup',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          label: '$_id',
          value: '$count'
        }
      },
      { $sort: { label: 1 } }
    ]);
    
    // Ensure all blood types are included (even if count is 0)
    const allBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const data = allBloodTypes.map(bt => {
      const found = result.find(r => r.label === bt);
      return {
        label: bt,
        value: found ? found.value : 0
      };
    });
    
    return res.json({ chart: { type: 'pie', data } });
  } catch (err) {
    return handleDBError(err, res, 'getStatsBloodTypes');
  }
};

// GET /admin/stats/locations (Donor distribution by district)
export const getStatsLocations = async (req, res) => {
  try {
    if (!isDBReady()) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        chart: { type: 'bar', data: [] }
      });
    }
    // Get all donors grouped by district
    const result = await Donor.aggregate([
      {
        $match: {
          district: { $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$district',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          label: '$_id',
          value: '$count'
        }
      },
      { $sort: { value: -1 } }
    ]);
    
    return res.json({ chart: { type: 'bar', data: result } });
  } catch (err) {
    return handleDBError(err, res, 'getStatsLocations');
  }
};

// GET /admin/stats/blood-inventory (Blood inventory by type)
export const getStatsBloodInventory = async (req, res) => {
  try {
    if (!isDBReady()) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        inventory: []
      });
    }
    // Get fulfilled requests grouped by blood type to calculate current units
    const fulfilledRequests = await Request.aggregate([
      {
        $match: {
          status: 'Fulfilled'
        }
      },
      {
        $group: {
          _id: '$bloodType',
          units: { $sum: { $ifNull: ['$units', 1] } }
        }
      },
      {
        $project: {
          _id: 0,
          bloodType: '$_id',
          units: '$units'
        }
      }
    ]);
    
    // Get available donors by blood type to estimate capacity
    const availableDonors = await Donor.aggregate([
      {
        $match: {
          availabilityStatus: 'available',
          isActive: true
        }
      },
      {
        $group: {
          _id: '$bloodGroup',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          bloodType: '$_id',
          donorCount: '$count'
        }
      }
    ]);
    
    // Define base capacity per blood type (can be adjusted)
    const baseCapacity = {
      'A+': 100,
      'A-': 50,
      'B+': 80,
      'B-': 40,
      'AB+': 60,
      'AB-': 30,
      'O+': 120,
      'O-': 50
    };
    
    // Build inventory data for all blood types
    const allBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const data = allBloodTypes.map(bt => {
      const fulfilled = fulfilledRequests.find(r => r.bloodType === bt);
      const donors = availableDonors.find(d => d.bloodType === bt);
      
      // Units = sum of fulfilled request units
      const units = fulfilled ? fulfilled.units : 0;
      
      // Capacity = base capacity + (available donors * 2 units per donor)
      // This gives a dynamic capacity based on available donors
      const donorCapacity = donors ? donors.donorCount * 2 : 0;
      const capacity = Math.max(baseCapacity[bt] || 100, donorCapacity);
      
      return {
        type: bt,
        units: units,
        capacity: capacity
      };
    });
    
    return res.json({ inventory: data });
  } catch (err) {
    return handleDBError(err, res, 'getStatsBloodInventory');
  }
};

// GET /admin/stats/donations-trend (Monthly donations)
export const getStatsDonationsTrend = async (req, res) => {
  try {
    if (!isDBReady()) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        chart: { type: 'line', data: [] }
      });
    }
    // Use Request model (unified model) and look for Fulfilled status
    const result = await Request.aggregate([
      {
        $match: {
          status: 'Fulfilled',
          $or: [
            { fulfilledAt: { $ne: null } },
            { fulfilledDate: { $ne: null } }
          ]
        }
      },
      {
        $group: {
          _id: {
            year: { 
              $year: { 
                $ifNull: ['$fulfilledAt', '$fulfilledDate'] 
              } 
            },
            month: { 
              $month: { 
                $ifNull: ['$fulfilledAt', '$fulfilledDate'] 
              } 
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          monthNum: '$_id.month',
          count: '$count'
        }
      },
      { $sort: { year: 1, monthNum: 1 } }
    ]);
    
    // Generate last 6 months and fill missing months with 0
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const monthNum = date.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const monthLabel = `${monthNames[date.getMonth()]} ${year}`;
      
      const found = result.find(r => r.year === year && r.monthNum === monthNum);
      last6Months.push({
        month: monthLabel,
        count: found ? found.count : 0
      });
    }
    
    return res.json({ chart: { type: 'line', data: last6Months } });
  } catch (err) {
    return handleDBError(err, res, 'getStatsDonationsTrend');
  }
};

// GET /admin/activity/recent - Get recent activities for dashboard feed
export const getRecentActivities = async (req, res) => {
  try {
    if (!isDBReady()) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        activities: []
      });
    }
    const limit = Number(req.query.limit) || 10;
    const activities = [];
    
    // 1. Get recent fulfilled requests (donations)
    const fulfilledRequests = await Request.find({ status: 'Fulfilled' })
      .populate('requesterId', 'name')
      .populate('fulfilledBy', 'fullName')
      .sort({ fulfilledAt: -1 })
      .limit(limit)
      .lean();
    
    fulfilledRequests.forEach(req => {
      const donorName = req.fulfilledBy?.fullName || 'Unknown Donor';
      const units = req.units || 1;
      activities.push({
        id: `donation-${req._id}`,
        type: 'donation',
        title: 'Donation Completed',
        description: `${donorName} donated ${units} unit${units > 1 ? 's' : ''} of ${req.bloodType} blood`,
        timestamp: req.fulfilledAt || req.updatedAt || req.createdAt,
        user: donorName
      });
    });
    
    // 2. Get recent critical requests (emergency)
    const criticalRequests = await Request.find({ 
      urgency: 'Critical',
      status: { $ne: 'Fulfilled' }
    })
      .populate('requesterId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    criticalRequests.forEach(req => {
      const hospital = req.hospitalName || 'Hospital';
      activities.push({
        id: `emergency-${req._id}`,
        type: 'emergency',
        title: 'Emergency Alert',
        description: `Urgent need for ${req.bloodType} blood at ${hospital}`,
        timestamp: req.createdAt
      });
    });
    
    // 3. Get recent matched requests
    const matchedRequests = await Request.find({ 
      status: { $in: ['Matched', 'Accepted', 'Contacted'] }
    })
      .populate('matchedDonorId', 'name')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
    
    matchedRequests.forEach(req => {
      const donorCount = req.matchedDonorId ? 1 : 0; // Simplified - could count actual matches
      activities.push({
        id: `match-${req._id}`,
        type: 'match',
        title: 'Donor Matched',
        description: `${donorCount} donor${donorCount > 1 ? 's' : ''} matched for blood request #${String(req._id).slice(-4)}`,
        timestamp: req.updatedAt || req.createdAt
      });
    });
    
    // 4. Get recent new requests
    const newRequests = await Request.find({ status: 'Pending' })
      .populate('requesterId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    newRequests.forEach(req => {
      activities.push({
        id: `request-${req._id}`,
        type: 'request',
        title: 'New Request',
        description: `Blood request submitted for ${req.bloodType} type`,
        timestamp: req.createdAt
      });
    });
    
    // 5. Get recent user registrations
    const recentUsers = await User.find({ role: { $ne: 'admin' } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Check if users are donors
    const donorUsers = await Donor.find({ 
      user: { $in: recentUsers.map(u => u._id) }
    })
      .populate('user', 'name')
      .lean();
    
    recentUsers.forEach(user => {
      const donor = donorUsers.find(d => String(d.user?._id) === String(user._id));
      if (donor) {
        activities.push({
          id: `user-${user._id}`,
          type: 'user',
          title: 'New Registration',
          description: `${user.name || 'User'} registered as a donor`,
          timestamp: user.createdAt,
          user: user.name
        });
      }
    });
    
    // Sort all activities by timestamp (most recent first) and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    
    return res.json({ activities: sortedActivities });
  } catch (err) {
    return handleDBError(err, res, 'getRecentActivities');
  }
};

// GET /admin/activity-logs
export const getActivityLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    // Activity logs are derived from notifications and request status changes
    // We'll combine notifications with request status history
    
    // Get notifications as activity logs
    const notificationQuery = {};
    if (type) {
      // Map activity types to notification types
      if (type === 'match') notificationQuery.type = 'request';
      else if (type === 'donation') notificationQuery.type = 'request';
    }
    
    const [notifications, notificationsTotal] = await Promise.all([
      Notification.find(notificationQuery)
        .populate('userId', 'name email')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Notification.countDocuments(notificationQuery),
    ]);
    
    // Format as activity logs
    const activityLogs = notifications.map(n => ({
      _id: n._id,
      type: n.type === 'request' ? 'match' : n.type,
      action: n.title,
      description: n.message,
      userId: n.userId?._id,
      userName: n.userId?.name,
      userEmail: n.userId?.email,
      metadata: n.meta,
      timestamp: n.createdAt,
      read: n.read,
    }));
    
    // Also get request status changes (from BloodRequest history)
    // For now, we'll use recent requests with status changes as activity
    const recentRequests = await BloodRequest.find({
      status: { $in: ['matched', 'fulfilled', 'cancelled'] },
      $or: [
        { matchedAt: { $ne: null } },
        { fulfilledAt: { $ne: null } },
        { cancelledAt: { $ne: null } }
      ]
    })
      .populate('requesterId', 'name email')
      .populate('donorId', 'fullName')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();
    
    const requestActivities = recentRequests.map(r => {
      let action = '';
      let timestamp = r.createdAt;
      
      if (r.fulfilledAt) {
        action = 'Donation Fulfilled';
        timestamp = r.fulfilledAt;
      } else if (r.matchedAt) {
        action = 'Donor Matched';
        timestamp = r.matchedAt;
      } else if (r.cancelledAt) {
        action = 'Request Cancelled';
        timestamp = r.cancelledAt;
      }
      
      return {
        _id: `req_${r._id}`,
        type: 'request',
        action,
        description: `${action} for ${r.patientName} (${r.bloodGroup}) in ${r.district}`,
        userId: r.requesterId?._id,
        userName: r.requesterId?.name,
        userEmail: r.requesterId?.email,
        metadata: {
          requestId: r._id,
          bloodGroup: r.bloodGroup,
          district: r.district,
          status: r.status,
        },
        timestamp,
        read: false,
      };
    });
    
    // Combine and sort by timestamp
    const allLogs = [...activityLogs, ...requestActivities].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, Number(limit));
    
    return res.json({
      logs: allLogs,
      total: notificationsTotal + requestActivities.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((notificationsTotal + requestActivities.length) / Number(limit))
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
