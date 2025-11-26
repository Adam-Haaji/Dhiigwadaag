import mongoose from 'mongoose';

const donorEligibilityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  checkResults: {
    age: { type: Number },
    weightKg: { type: Number },
    gender: { type: String },
    hb: { type: Number },
    cooldown: {
      lastDonationDate: { type: Date },
      nextEligibleDate: { type: Date },
      withinCooldown: { type: Boolean },
    },
  },
  decision: { type: String, enum: ['eligible', 'ineligible'], required: true },
  reason: { type: String },
  adminOverride: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

donorEligibilityLogSchema.index({ user: 1, timestamp: -1 });

export default mongoose.model('DonorEligibilityLog', donorEligibilityLogSchema);
