import mongoose from 'mongoose';

// Mo hinh du lieu quan tri vien he thong (Collection: admins)
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // An mat khau va thong tin OTP khoi ket qua truy van mac dinh
    password: { type: String, required: true, select: false },
    isApproved: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },
    verifyOtp: { type: String, default: '', select: false },
    verifyOtpExpireAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

export default mongoose.model('Admin', adminSchema);
