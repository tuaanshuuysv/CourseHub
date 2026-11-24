import mongoose from 'mongoose';

// Mo hinh du lieu don hang va giao dich thanh toan khoa hoc (Collection: orders)
const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courses: [
      {
        _id: false,
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        pricePaid: { type: Number, required: true, min: 0 },
      },
    ],
    // Luu snapshot ma giam gia de giu nguyen lich su hoa don ke ca khi Admin xoa Coupon
    coupon: {
      couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
      code: { type: String, default: '', uppercase: true, trim: true },
      discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    },
    subTotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['momo', 'vnpay', 'free'], default: 'vnpay' },
    // Don hang moi khoi tao mac dinh o trang thai pending cho cong thanh toan xac nhan
    status: { type: String, enum: ['pending', 'completed', 'refunded', 'cancelled'], default: 'pending' },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Rang buoc so tien giam gia khong duoc vuot qua tong tam tinh
orderSchema.pre('validate', function (next) {
  if (this.discountAmount > this.subTotal) {
    return next(new Error('discountAmount cannot exceed subTotal'));
  }
  next();
});

// Chi muc phuc vu thong ke doanh thu theo trang thai va thoi gian
orderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
