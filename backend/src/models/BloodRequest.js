import mongoose from 'mongoose';
import { LOCATIONS } from '../utils/locations.js';

// Use canonical locations list from locations.js to ensure consistency
const districts = LOCATIONS;

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const urgentLevels = ['critical', 'normal']; // Only critical or normal allowed
const statuses = ['pending', 'matched', 'accepted', 'fulfilled', 'completed', 'cancelled', 'expired', 'declined'];

const bloodRequestSchema = new mongoose.Schema(
  {
    patientName: { type: String, required: true, trim: true, match: [/^[A-Za-z\s]+$/, 'Patient name must contain letters and spaces only'] },
    bloodGroup: { type: String, enum: bloodGroups, required: true },
    district: { 
      type: String, 
      required: true,
      trim: true,
      // Validate and normalize to match canonical case from locations.js
      validate: {
        validator: function(v) {
          if (!v) return false;
          const normalized = String(v).trim();
          // Case-insensitive match against canonical list
          return districts.some(d => d.toLowerCase() === normalized.toLowerCase());
        },
        message: 'District must be one of: ' + districts.join(', ')
      },
      // Normalize to canonical case
      set: (v) => {
        if (!v) return v;
        const normalized = String(v).trim();
        // Find matching location (case-insensitive) and return canonical case
        const match = districts.find(d => d.toLowerCase() === normalized.toLowerCase());
        return match || normalized;
      }
    },
    // Units of blood requested (bags)
    units: { type: Number, min: 1, default: 1 },
    contactPerson: { type: String, required: true, trim: true, match: [/^[A-Za-z\s]+$/, 'Contact person must contain letters and spaces only'] },
    contactPhone: { type: String, required: true, trim: true, match: [/^\d{9,12}$/, 'Enter a valid phone number'] },
    urgencyLevel: { type: String, enum: urgentLevels, required: true },
    reason: { type: String, required: true, trim: true },
    additionalNote: { type: String, default: '' },
    // Status flow per spec (expired already included in statuses array)
    status: { type: String, enum: statuses, default: 'pending' },
    // Time-based expiry: automatically set on creation based on urgencyLevel
    expiresAt: { type: Date },
    // Matched donor (set by matcher)
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
    // Donor who fulfilled (explicit for history; may equal donorId)
    fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', default: null },
    fulfilledAt: { type: Date },
    // Verification fields (admin/system)
    verified: { type: Boolean, default: false },
    verifiedBy: { type: String, default: null },
    verifiedDate: { type: Date },
    // Optional proof asset URL (image/pdf)
    proofImage: { type: String, default: null },

    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

bloodRequestSchema.index({ bloodGroup: 1, district: 1, status: 1 });

export default mongoose.model('BloodRequest', bloodRequestSchema);
