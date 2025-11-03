import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const signup = async (req, res) => {
  try {
    let { name, email, password, bloodType, role, location, phone } = req.body;
    const normEmail = (email || '').trim().toLowerCase();
    email = normEmail;
    name = (name || '').trim();
    phone = (phone || '').trim();
    location = (location || '').trim();

    const existing = await User.findOne({ email: normEmail });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: normEmail, password: hashed, bloodType, role, location, phone });
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
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
