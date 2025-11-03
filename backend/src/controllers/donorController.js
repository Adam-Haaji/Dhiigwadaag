import User from '../models/User.js';
import Donor from '../models/Donor.js';
import { yearsBetween } from '../utils/dateUtils.js';

// POST /api/donors
// Create a donor profile linked to the current user WITHOUT changing the User profile
export const createDonor = async (req, res) => {
  try {
    const userId = req?.user?.id || req?.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure user exists
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent duplicate donor profile per user
    const exists = await Donor.findOne({ user: userId });
    if (exists) return res.status(409).json({ error: 'Donor already registered for this user' });

    const {
      fullName,
      dateOfBirth,
      gender,
      phone,
      email,
      district,
      bloodGroup,
      weightKg,
      consentGiven,
      emergencyContact,
      lastDonationDate,
      availabilityStatus,
      donations,
    } = req.body || {};

    // Basic runtime validation (Mongoose will re-validate)
    if (!fullName || !dateOfBirth || !gender || !phone || !email || !district || !bloodGroup ||
        weightKg === undefined || consentGiven === undefined || !emergencyContact || !lastDonationDate || !availabilityStatus) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (typeof weightKg === 'number' && weightKg < 50) {
      return res.status(400).json({ error: 'Weight must be at least 50kg' });
    }
    // Age validation
    const age = yearsBetween(dateOfBirth);
    if (age < 18 || age > 80) return res.status(400).json({ error: 'Age must be between 18 and 80' });
    // Phone format and uniqueness across Users and Donors
    if (!/^[0-9+\-()\s]{6,20}$/.test(String(phone))) return res.status(400).json({ error: 'Invalid phone format' });
    const [uPhone, dPhone] = await Promise.all([
      User.findOne({ phone }).select('_id').lean(),
      Donor.findOne({ phone }).select('_id').lean(),
    ]);
    if (uPhone || dPhone) return res.status(409).json({ error: 'Phone already in use' });

    const donor = await Donor.create({
      user: userId,
      fullName,
      dateOfBirth,
      gender,
      phone,
      email,
      district,
      bloodGroup,
      weightKg,
      consentGiven,
      emergencyContact,
      lastDonationDate,
      availabilityStatus,
      donations: Array.isArray(donations) ? donations : [],
    });

    // Upgrade linked user role to 'Donor' so future logins are recognized as donor
    try {
      if (String(user.role || '').toLowerCase() !== 'donor') {
        user.role = 'Donor';
        await user.save();
      }
    } catch (e) {
      // Non-fatal: donor profile created even if role update fails
      console.error('Failed to update user role to Donor:', e?.message || e);
    }
    return res.status(201).json({ donor, roleUpdated: String(user.role).toLowerCase() === 'donor' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/donors/search?bloodType=A%2B&city=Mogadishu&available=true
export const searchDonors = async (req, res) => {
  try {
    const { bloodType, city, availability, q: query } = req.query;

    // Build Donor model query
    const donorAnd = [];
    if (availability !== undefined) {
      const val = String(availability).toLowerCase();
      if (val === 'true' || val === '1') donorAnd.push({ availabilityStatus: 'available' });
      if (val === 'false' || val === '0') donorAnd.push({ availabilityStatus: 'unavailable' });
    }
    if (bloodType) donorAnd.push({ bloodGroup: String(bloodType).toUpperCase() });
    if (city) {
      const esc = String(city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      donorAnd.push({ district: { $regex: new RegExp(esc, 'i') } });
    }
    if (query) {
      const val = String(query).trim();
      const btPattern = /^(A|B|AB|O)[+-]$/i;
      if (btPattern.test(val)) donorAnd.push({ bloodGroup: val.toUpperCase() });
      else {
        const esc = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        donorAnd.push({
          $or: [
            { district: { $regex: new RegExp(esc, 'i') } },
            { fullName: { $regex: new RegExp(esc, 'i') } },
            { phone: { $regex: new RegExp(esc, 'i') } },
            { email: { $regex: new RegExp(esc, 'i') } },
          ],
        });
      }
    }
    const donorQuery = donorAnd.length ? { $and: donorAnd } : {};

    // Build legacy User model query (for backward compatibility donors stored in Users)
    const userAnd = [{ role: 'Donor' }];
    if (availability !== undefined) {
      const val = String(availability).toLowerCase();
      if (val === 'true' || val === '1') userAnd.push({ availability: true });
      if (val === 'false' || val === '0') userAnd.push({ availability: false });
    }
    if (bloodType) userAnd.push({ bloodType: String(bloodType).toUpperCase() });
    if (city) {
      const esc = String(city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      userAnd.push({ location: { $regex: new RegExp(esc, 'i') } });
    }
    if (query) {
      const val = String(query).trim();
      const btPattern = /^(A|B|AB|O)[+-]$/i;
      if (btPattern.test(val)) userAnd.push({ bloodType: val.toUpperCase() });
      else {
        const esc = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        userAnd.push({
          $or: [
            { location: { $regex: new RegExp(esc, 'i') } },
            { name: { $regex: new RegExp(esc, 'i') } },
            { phone: { $regex: new RegExp(esc, 'i') } },
            { email: { $regex: new RegExp(esc, 'i') } },
          ],
        });
      }
    }
    const userQuery = userAnd.length ? { $and: userAnd } : {};

    const [donorDocs, userDocs] = await Promise.all([
      Donor.find(donorQuery).lean(),
      User.find(userQuery).select('-password').lean(),
    ]);

    const fromDonor = donorDocs.map((d) => ({
      _id: `donor:${d._id}`,
      name: d.fullName,
      email: d.email,
      bloodType: d.bloodGroup,
      location: d.district,
      phone: d.phone,
      availability: d.availabilityStatus === 'available',
      avatarUrl: '',
      _src: 'Donor',
    }));
    const fromUser = userDocs.map((u) => ({
      _id: `user:${u._id}`,
      name: u.name,
      email: u.email,
      bloodType: u.bloodType,
      location: u.location,
      phone: u.phone,
      availability: !!u.availability,
      avatarUrl: u.avatarUrl || '',
      _src: 'User',
    }));

    // Merge and deduplicate by email+phone+bloodType to avoid double entries if a user also has a Donor profile
    const seen = new Set();
    const merged = [];
    for (const item of [...fromDonor, ...fromUser]) {
      const key = `${(item.email||'').toLowerCase()}|${(item.phone||'').trim()}|${item.bloodType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }

    // Sort by blood type order then name for determinism
    const order = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
    merged.sort((a, b) => {
      const ia = order.indexOf(String(a.bloodType).toUpperCase());
      const ib = order.indexOf(String(b.bloodType).toUpperCase());
      if (ia !== ib) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return String(a.name||'').localeCompare(String(b.name||''));
    });

    return res.json(merged);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/donors/meta -> { bloodTypes: string[], locations: string[] }
export const getDonorMeta = async (req, res) => {
  try {
    const [bloodGroupsRaw, districtsRaw] = await Promise.all([
      Donor.distinct('bloodGroup', { bloodGroup: { $exists: true, $ne: '' } }),
      Donor.distinct('district', { district: { $exists: true, $ne: '' } }),
    ]);
    const order = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
    const bloodTypes = bloodGroupsRaw
      .filter(Boolean)
      .map((x) => String(x).toUpperCase())
      .sort((a, b) => {
        const ia = order.indexOf(a);
        const ib = order.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    const locations = districtsRaw
      .filter(Boolean)
      .map((x) => String(x))
      .sort((a, b) => a.localeCompare(b));
    return res.json({ bloodTypes, locations });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/donors/:id -> resolves either Donor or legacy User donor and returns unified shape
export const getDonorById = async (req, res) => {
  try {
    const rawId = String(req.params.id || '').trim();
    if (!rawId) return res.status(400).json({ error: 'Missing id' });

    let src = 'Donor';
    let id = rawId;
    const m = rawId.match(/^(donor|user):(.+)$/i);
    if (m) { src = m[1].toLowerCase() === 'user' ? 'User' : 'Donor'; id = m[2]; }

    let doc = null;
    if (src === 'Donor') {
      doc = await Donor.findById(id).lean();
      if (doc) {
        return res.json({
          _id: `donor:${doc._id}`,
          name: doc.fullName,
          email: doc.email,
          bloodType: doc.bloodGroup,
          location: doc.district,
          phone: doc.phone,
          availability: doc.availabilityStatus === 'available',
          _src: 'Donor',
          // extra fields
          gender: doc.gender,
          lastDonationDate: doc.lastDonationDate,
          weightKg: doc.weightKg,
          emergencyContact: doc.emergencyContact,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        });
      }
    }

    // fallback to legacy User donor
    const userDoc = await User.findById(id).select('-password').lean();
    if (userDoc) {
      return res.json({
        _id: `user:${userDoc._id}`,
        name: userDoc.name,
        email: userDoc.email,
        bloodType: userDoc.bloodType,
        location: userDoc.location,
        phone: userDoc.phone,
        availability: !!userDoc.availability,
        _src: 'User',
        createdAt: userDoc.createdAt,
        updatedAt: userDoc.updatedAt,
      });
    }

    return res.status(404).json({ error: 'Donor not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
