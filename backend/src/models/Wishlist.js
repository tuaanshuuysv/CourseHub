import mongoose from 'mongoose';

// Mo hinh du lieu danh sach khoa hoc yeu thich cua hoc vien (Collection: wishlists)
const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Dam bao moi hoc vien chi luu mot khoa hoc vao danh sach yeu thich mot lan
wishlistSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model('Wishlist', wishlistSchema);
