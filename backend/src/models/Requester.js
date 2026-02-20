import mongoose from 'mongoose';

const requesterSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
}, { timestamps: true });

export default mongoose.model('Requester', requesterSchema);