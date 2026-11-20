import mongoose from 'mongoose';

// Mo hinh du lieu danh gia va nhan xet khoa hoc cua hoc vien (Collection: reviews)
const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    rating: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Review', reviewSchema);
