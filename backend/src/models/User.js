import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  // Optional profile fields (moved off of required to allow signup before choosing role)
  bloodType: { type: String },
  location: { type: String },
  phone: { type: String },

  // Role system
  role: { type: String, enum: ['none', 'donor', 'requester', 'both', 'admin'], default: 'none', required: true },
  donorStatus: { type: String, enum: ['not_a_donor', 'available', 'unavailable', 'ineligible'], default: 'not_a_donor' },
  lastDonationDate: { type: Date, default: null },
  unavailableUntil: { type: Date, default: null },

  // Eligibility & donor profile lightweight fields (for simplified registration path)
  age: { type: Number, min: 0 },
  weightKg: { type: Number, min: 0 },
  gender: { type: String, enum: ['male', 'female'] },
  hb: { type: Number, min: 0 }, // Hemoglobin level g/dL
  ineligibilityReason: { type: String, default: null },

  // Legacy availability flag (kept for older UIs)
  availability: { type: Boolean, default: true },

  avatarUrl: { type: String, default: '' },

  // Optional: Expo push tokens for this user (can have multiple devices)
  expoPushTokens: { type: [String], default: [] },

}, { timestamps: true });

export default mongoose.model('User', userSchema);
