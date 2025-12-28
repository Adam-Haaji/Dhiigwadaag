import mongoose from 'mongoose';

const districts = [
  'Abdiaziz', 'Bondhere', 'Daynile', 'Dharkenley', 'Hamar Jajab', 'Hamar Weyne',
  'Hodan', 'Howlwadag', 'Howlwadaag', 'Karaan', 'Kaaran', 'Shangani', 'Shibis',
  'Wadajir', 'Wadajir (Medina)', 'Waberi', 'Wartanabada', 'Wardhiigley (Warta Nabadda)',
  'Yaqshid', 'Garasbaley', 'Kahda',
];

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const urgentLevels = ['critical', 'normal'];
const statuses = ['pending', 'matched', 'accepted', 'fulfilled', 'completed', 'cancelled'];

const bloodRequestSchema = new mongoose.Schema(
  {
    patientName: { type: String, required: true, trim: true, match: [/^[A-Za-z\s]+$/, 'Patient name must contain letters and spaces only'] },
    bloodGroup: { type: String, enum: bloodGroups, required: true },
    district: { type: String, enum: districts, required: true },
    // Units of blood requested (bags)
    units: { type: Number, min: 1, default: 1 },
    contactPerson: { type: String, required: true, trim: true, match: [/^[A-Za-z\s]+$/, 'Contact person must contain letters and spaces only'] },
    contactPhone: { type: String, required: true, trim: true, match: [/^\d{9,12}$/, 'Enter a valid phone number'] },
    urgencyLevel: { type: String, enum: urgentLevels, required: true },
    reason: { type: String, required: true, trim: true },
    additionalNote: { type: String, default: '' },
    // Status flow per spec
    status: { type: String, enum: statuses, default: 'pending' },
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
