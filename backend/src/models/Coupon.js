import mongoose from 'mongoose';

// Mo hinh du lieu ma giam gia khuyen mai (Collection: coupons)
const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    usersUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model('Coupon', couponSchema);
