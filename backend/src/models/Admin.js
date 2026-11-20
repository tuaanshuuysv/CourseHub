import mongoose from 'mongoose';

// Mo hinh du lieu quan tri vien he thong (Collection: admins)
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    isApproved: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
    verifyOtp: { type: String, default: '' },
    verifyOtpExpireAt: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Admin', adminSchema);
