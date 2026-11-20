import mongoose from 'mongoose';

// Mo hinh du lieu gio hang cua hoc vien (Collection: carts)
const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    courses: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Cart', cartSchema);
