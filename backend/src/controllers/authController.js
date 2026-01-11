import User from '../models/User.js';
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';

function computeMenus(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'both' || r === 'admin') return ['home', 'donor', 'request', 'notification', 'profile'];
  if (r === 'donor') return ['home', 'donor', 'notification', 'profile'];
  if (r === 'requester') return ['home', 'request', 'notification', 'profile'];
  return ['home'];
}

export const signup = async (req, res) => {
  try {
    let { name, email, password, phone, bloodType, role, location } = req.body || {};
    const normEmail = (email || '').trim().toLowerCase();
    email = normEmail;
    name = (name || '').trim();
    phone = typeof phone === 'string' ? phone.trim() : undefined;
    location = typeof location === 'string' ? location.trim() : undefined;
    // Normalize blood type to canonical format if it looks like one
    const bt = typeof bloodType === 'string' ? bloodType.trim().toUpperCase() : undefined;
    const btPattern = /^(A|B|AB|O)[+-]$/;
    if (bt && !btPattern.test(bt)) {
      return res.status(400).json({ error: 'Invalid blood type' });
    }
    // Basic phone format check (matches schema: 9-12 digits)
    if (phone && !/^\d{9,12}$/.test(phone)) {
      return res.status(400).json({ error: 'Enter a valid phone number' });
    }

    const existing = await User.findOne({ email: normEmail });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    const hashed = await bcrypt.hash(password, 10);
    // Accept optional fields on signup so profile shows phone and blood type immediately
    let finalRole = 'none';
    const r = String(role || '').toLowerCase();
    if (['donor','requester','both','admin'].includes(r)) finalRole = r;
    const user = await User.create({
      name,
      email: normEmail,
      password: hashed,
      role: finalRole,
      phone: phone || undefined,
      bloodType: bt || undefined,
      location: location || undefined,
    });
    res.status(201).json({ message: 'Signup successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const password = req.body?.password || '';
    const normEmail = (req.body?.email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normEmail });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.password);
    } catch {}
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
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const summary = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      donorStatus: user.donorStatus,
      unavailableUntil: user.unavailableUntil,
      menus: computeMenus(user.role),
    };
    res.json({ token, user: summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
