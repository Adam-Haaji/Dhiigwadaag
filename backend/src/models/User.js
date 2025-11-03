import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  bloodType: { type: String, required: true },
  role: { type: String, enum: ['Donor', 'Requester'], required: true },
  location: { type: String, required: true },
  phone: { type: String, required: true },
  availability: { type: Boolean, default: true },
  
  avatarUrl: { type: String, default: '' },

  // Optional: Expo push tokens for this user (can have multiple devices)
  expoPushTokens: { type: [String], default: [] },

}, { timestamps: true });

export default mongoose.model('User', userSchema);
