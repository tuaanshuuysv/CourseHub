import mongoose from 'mongoose';

// Mo hinh du lieu tai khoan nguoi dung (Collection: users)
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // An mat khau va OTP khoi ket qua truy van mac dinh de tranh ro ri du lieu nhay cam
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'instructor'], default: 'student', index: true },
    bio: { type: String, default: '', trim: true },
    phonenumber: { type: String, default: '', trim: true },
    pfpImg: { type: String, default: '/media/avatar/09.jpg' },
    socials: {
      facebook: { type: String, default: '', trim: true },
      youtube: { type: String, default: '', trim: true },
      linkedin: { type: String, default: '', trim: true },
      instagram: { type: String, default: '', trim: true },
    },
    website: { type: String, default: '', trim: true },
    // Da xoa truong wishlist de tranh luu trung lap voi collection Wishlist
    isVerified: { type: Boolean, default: false },
    isActivated: { type: Boolean, default: true },
    googleId: { type: String, trim: true },
    verifyOtp: { type: String, default: '', select: false },
    verifyOtpExpireAt: { type: Date, default: null, select: false },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Chi muc duy nhat cho googleId khi co gia tri chuoi khac rong (bo qua tai khoan dang ky bang email)
userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string', $gt: '' } } }
);

export default mongoose.model('User', userSchema);
