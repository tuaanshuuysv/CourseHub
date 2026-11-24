import mongoose from 'mongoose';

// Mo hinh du lieu danh gia va nhan xet khoa hoc cua hoc vien (Collection: reviews)
const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    description: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Chan mot hoc vien tao nhieu danh gia dang hoat dong cho cung mot khoa hoc
reviewSchema.index(
  { user: 1, course: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Chi muc phuc vu lay danh sach danh gia moi nhat theo khoa hoc
reviewSchema.index({ course: 1, isDeleted: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
