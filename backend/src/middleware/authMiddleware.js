import jwt from 'jsonwebtoken';
import Donor from '../models/Donor.js';

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role guard utilities
// Normalize role to lower-case for comparisons
const roleOf = (req) => String(req?.user?.role || '').toLowerCase();

export const requireDonor = async (req, res, next) => {
  const r = roleOf(req);
  // Check role first (legacy support)
  if (r === 'donor' || r === 'both' || r === 'admin') return next();
  
  // With role separation, check if user has a donor record
  try {
    const userId = req.user?.id || req.user?._id;
    if (userId) {
      const donor = await Donor.findOne({ user: userId }).select('_id').lean();
      if (donor) return next();
    }
  } catch (err) {
    // If check fails, fall through to error
  }
  
  return res.status(403).json({ error: 'forbidden_donor_only' });
};

export const requireRequester = (req, res, next) => {
  const r = roleOf(req);
  if (r === 'requester' || r === 'both' || r === 'admin') return next();
  return res.status(403).json({ error: 'forbidden_requester_only' });
};

export const blockNone = (req, res, next) => {
  const r = roleOf(req);
  if (r && r !== 'none') return next();
  return res.status(403).json({ error: 'forbidden_role_none' });
};
