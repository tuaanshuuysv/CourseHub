import mongoose from 'mongoose';

// Mo hinh du lieu ma giam gia khuyen mai (Collection: coupons)
const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '', trim: true },
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    usersUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Kiem tra ngay het han phai sau ngay bat dau ap dung
couponSchema.pre('validate', function (next) {
  if (this.startDate && this.expiryDate && this.expiryDate <= this.startDate) {
    return next(new Error('expiryDate must be later than startDate'));
  }
  next();
});

// Chi muc phuc vu loc ma giam gia dang hoat dong va con han
couponSchema.index({ isActive: 1, expiryDate: 1 });

export default mongoose.model('Coupon', couponSchema);
