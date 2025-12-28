import mongoose from 'mongoose';
import { yearsBetween, addDays } from '../utils/dateUtils.js';

const districts = [
  'Abdiaziz', 'Bondhere', 'Daynile', 'Dharkenley', 'Hamar Jajab', 'Hamar Weyne',
  'Hodan', 'Howlwadag', 'Howlwadaag', 'Karaan', 'Kaaran', 'Shangani', 'Shibis',
  'Wadajir', 'Wadajir (Medina)', 'Waberi', 'Wartanabada', 'Wardhiigley (Warta Nabadda)',
  'Yaqshid', 'Garasbaley', 'Kahda',
];

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const donationSchema = new mongoose.Schema(
  {
    donationDate: { type: Date, required: true },
    volumeMl: { type: Number, required: true, min: 0 },
    screeningClear: { type: Boolean, required: true },
  },
  { _id: false }
);

const donorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    fullName: { type: String, required: true, trim: true, match: [/^[A-Za-z\s]+$/, 'Full name must contain letters and spaces only'] },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female'], required: true },
    phone: { type: String, required: true, trim: true, match: [/^\d{9,12}$/, 'Enter a valid phone number'] },
    email: { type: String, required: true, lowercase: true, trim: true, match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'] },
    district: { type: String, enum: districts, required: true },
    bloodGroup: { type: String, enum: bloodGroups, required: true },
    weightKg: { type: Number, required: true, min: 50 },
    consentGiven: { type: Boolean, required: true },

    emergencyContact: {
      name: { type: String, required: true, trim: true, match: [/^[A-Za-z\s]+$/, 'Name must contain letters and spaces only'] },
      relationship: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true, match: [/^\d{9,12}$/, 'Enter a valid phone number'] },
    },

    lastDonationDate: { type: Date, required: true },
    availabilityStatus: { type: String, enum: ['available', 'unavailable'], default: 'available', required: true },
    // Derived/operational fields
    isActive: { type: Boolean, default: true }, // false if donated within last 3 months
    age: { type: Number, min: 18, max: 65 }, // computed from dateOfBirth, but validate bounds
    nextAvailableDate: { type: Date },
    // Optional coordinates for proximity filtering (legacy fields)
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // GeoJSON location for 2dsphere index and $near queries
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [lng, lat]
        validate: v => !v || v.length === 2,
      },
    },

    donations: { type: [donationSchema], default: [] },

    // Track currently matched request (if any)
    matchedRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest' },
  },
  { timestamps: true }

);

donorSchema.index({ bloodGroup: 1, district: 1 });
donorSchema.index({ availabilityStatus: 1 });
// Enable fast geospatial queries when location is present
donorSchema.index({ location: '2dsphere' });

donorSchema.pre('save', function(next) {
  try {
    if (!this.age && this.dateOfBirth) {
      this.age = yearsBetween(this.dateOfBirth);
    }
    if (this.lastDonationDate) {
      const nextAvail = addDays(this.lastDonationDate, 90);
      this.nextAvailableDate = nextAvail;
      const now = new Date();
      const active = nextAvail.getTime() <= now.getTime();
      this.isActive = active;
      if (!active) this.availabilityStatus = 'unavailable';
    }
    // Validate HB by gender
    if (typeof this.hb === 'number' && this.gender) {
      const minHb = this.gender === 'male' ? 13.0 : 12.0;
      if (this.hb < minHb) {
        return next(new Error('Hemoglobin level is too low to donate'));
      }
    }
    // Enforce weight and age eligibility
    if (typeof this.weightKg === 'number' && this.weightKg < 50) {
      return next(new Error('Weight must be at least 50kg'));
    }
    if (typeof this.age === 'number' && (this.age < 18 || this.age > 65)) {
      return next(new Error('Age must be between 18 and 65'));
    }
    // Keep location <-> coordinates in sync (best-effort)
    if (this.coordinates && Number.isFinite(this.coordinates.lng) && Number.isFinite(this.coordinates.lat)) {
      this.location = this.location || {};
      this.location.type = 'Point';
      this.location.coordinates = [this.coordinates.lng, this.coordinates.lat];
    } else if (this.location && Array.isArray(this.location.coordinates) && this.location.coordinates.length === 2) {
      const [lng, lat] = this.location.coordinates;
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        this.coordinates = { lng, lat };
      }
    }
    return next();
  } catch (e) {
    return next(e);
  }
});

export default mongoose.model('Donor', donorSchema);
