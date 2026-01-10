import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, match: [/^[A-Za-z\s]+$/, 'Name must contain letters and spaces only'] },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'] },
  password: { type: String, required: true },
  // Optional profile fields (moved off of required to allow signup before choosing role)
  bloodType: { type: String },
  location: { type: String },
  phone: { type: String, match: [/^\d{9,12}$/, 'Enter a valid phone number'] },

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

  // Notification preferences
  pushNotificationsEnabled: { type: Boolean, default: true },
  emailNotificationsEnabled: { type: Boolean, default: true },

}, { timestamps: true });

// Normalize inputs
userSchema.pre('save', function(next) {
  try {
    if (typeof this.email === 'string') this.email = this.email.trim().toLowerCase();
    if (typeof this.name === 'string') this.name = this.name.trim();
    if (typeof this.phone === 'string') this.phone = this.phone.trim();
    next();
  } catch (e) { next(e); }
});

export default mongoose.model('User', userSchema);
