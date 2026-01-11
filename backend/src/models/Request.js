import mongoose from 'mongoose';

// Support both legacy fields and new requirements. We keep requesterId/matchedDonorId
// for backward compatibility, and add `requester` object and `contactedBy` timeline.
const requestSchema = new mongoose.Schema({
  // Core details
  patientName: { type: String, required: true },
  bloodType: { type: String, required: true },
  location: { type: String, required: true },
  // Optional hospital name where the patient is admitted
  hospitalName: { type: String },
  // Optional primary contact phone for the request
  contactPhone: { type: String },
  urgency: { type: String, enum: ['Normal', 'Urgent', 'Critical'], required: true },
  // Units of blood requested (bags)
  units: { type: Number, min: 1, default: 1 },

  // Required status per spec
  status: { type: String, enum: ['Pending', 'Contacted', 'Matched', 'Accepted', 'Fulfilled', 'Cancelled'], default: 'Pending' },

  // New: requester embedded object
  requester: {
    name: { type: String },
    phone: { type: String },
    email: { type: String },
  },

  // New: contact/response timeline from donors
  contactedBy: [
    {
      donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
      method: { type: String, enum: ['call', 'whatsapp', 'donate'], required: true },
      date: { type: Date, default: Date.now },
    },
  ],

  // Optional timestamp when the request is fulfilled
  fulfilledAt: { type: Date },
  // Spec fields for fulfillment
  fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', default: null },
  fulfilledDate: { type: Date },

  // Optional timestamp when the request is cancelled
  cancelledAt: { type: Date },

  // Legacy/compatibility fields retained
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  matchedDonorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Priority matching metadata (optional)
  matchedTier: { type: String },
  tierUsed: [{ type: String }],
}, { timestamps: true });

export default mongoose.model('Request', requestSchema);
