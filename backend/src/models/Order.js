import mongoose from 'mongoose';

// Mo hinh du lieu don hang va giao dich thanh toan khoa hoc (Collection: orders)
const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courses: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        pricePaid: { type: Number, required: true },
      },
    ],
    coupon: { type: mongoose.Schema.Types.Mixed, default: null },
    subTotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['momo', 'vnpay', 'free'], default: 'vnpay' },
    status: { type: String, enum: ['pending', 'completed', 'refunded', 'cancelled'], default: 'completed' },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
