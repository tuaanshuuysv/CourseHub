import mongoose from 'mongoose';

// Mo hinh du lieu ho so hoc vien va thong ke hoc tap (Collection: students)
const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    address: { type: String, default: '', trim: true },
    // Khong tao _id thua cho tung phan tu va luu moc thoi gian ghi danh
    myCourses: [
      {
        _id: false,
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
        enrolledAt: { type: Date, default: Date.now },
      },
    ],
    stats: {
      totalCourses: { type: Number, default: 0, min: 0 },
      completedCourses: { type: Number, default: 0, min: 0 },
      totalLessons: { type: Number, default: 0, min: 0 },
      completedLessons: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

// Dam bao chi so hoan thanh khong vuot qua tong so khoa hoc va bai giang
studentSchema.pre('validate', function (next) {
  if (this.stats) {
    if (this.stats.totalCourses > 0 && this.stats.completedCourses > this.stats.totalCourses) {
      return next(new Error('completedCourses cannot exceed totalCourses'));
    }
    if (this.stats.totalLessons > 0 && this.stats.completedLessons > this.stats.totalLessons) {
      return next(new Error('completedLessons cannot exceed totalLessons'));
    }
  }
  next();
});

export default mongoose.model('Student', studentSchema);
