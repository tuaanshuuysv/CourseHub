import mongoose from 'mongoose';

// Mo hinh du lieu tai khoan nguoi dung (Collection: users)
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'instructor'], default: 'student' },
    bio: { type: String, default: '' },
    phonenumber: { type: String, default: '' },
    pfpImg: { type: String, default: '/media/avatar/09.jpg' },
    socials: {
      facebook: { type: String, default: '' },
      youtube: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      instagram: { type: String, default: '' },
    },
    website: { type: String, default: '' },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    isVerified: { type: Boolean, default: false },
    isActivated: { type: Boolean, default: true },
    googleId: { type: String, default: '' },
    verifyOtp: { type: String, default: '' },
    verifyOtpExpireAt: { type: mongoose.Schema.Types.Mixed, default: 0 },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
