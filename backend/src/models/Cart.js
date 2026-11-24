import mongoose from 'mongoose';

// Mo hinh du lieu gio hang cua hoc vien (Collection: carts)
const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // Khong tao _id thua va chan them trung cung mot khoa hoc vao gio hang
    courses: {
      type: [
        {
          _id: false,
          course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      validate: {
        validator: (items) => {
          const ids = items.map((item) => String(item.course));
          return new Set(ids).size === ids.length;
        },
        message: 'Duplicate courses are not allowed in cart',
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Cart', cartSchema);
