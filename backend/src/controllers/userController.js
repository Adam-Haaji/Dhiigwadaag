import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const updateProfile = async (req, res) => {
  try {
    const allow = ['name', 'email', 'phone', 'bloodType', 'location', 'pushNotificationsEnabled', 'emailNotificationsEnabled'];
    const updates = {};
    for (const k of allow) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) updates[k] = req.body[k];
    }
    if (typeof updates.email === 'string') updates.email = updates.email.trim().toLowerCase();
    if (typeof updates.name === 'string') updates.name = updates.name.trim();
    if (typeof updates.phone === 'string') updates.phone = updates.phone.trim();
    if (typeof updates.location === 'string') updates.location = updates.location.trim();

    // Prevent email collision
    if (updates.email) {
      const existing = await User.findOne({ email: updates.email, _id: { $ne: req.user.id } }).select('_id').lean();
      if (existing) return res.status(400).json({ error: 'Email already in use' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/change-password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'oldPassword and newPassword are required' });
    if (String(newPassword).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Not found' });

    let valid = false;
    try {
      valid = await bcrypt.compare(String(oldPassword), String(user.password || ''));
    } catch {}

    if (!valid) {
      const looksHashed = typeof user.password === 'string' && user.password.startsWith('$2');
      if (!looksHashed && String(user.password || '') === String(oldPassword)) {
        valid = true;
      }
    }
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
export const selectRole = async (req, res) => {
  try {
    // Role selection via Users collection is disabled to enforce collection separation
    return res.status(403).json({ error: 'forbidden_role_selection_disabled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Legacy endpoint now blocked to prevent manual switching after initial selection
export const switchRole = async (req, res) => {
  try {
    return res.status(403).json({ error: 'forbidden_role_switch_disabled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

import Donor from '../models/Donor.js';
export const listDonors = async (req, res) => {
  try {
    // Return donors strictly from Donor collection to respect separation
    const donors = await Donor.find({}).select('_id fullName email phone district bloodGroup availabilityStatus createdAt updatedAt user').lean();
    res.json(donors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateUserById = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
