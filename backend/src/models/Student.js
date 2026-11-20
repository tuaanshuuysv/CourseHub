import mongoose from 'mongoose';

// Mo hinh du lieu ho so hoc vien va thong ke hoc tap (Collection: students)
const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    address: { type: String, default: '' },
    myCourses: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
      },
    ],
    stats: {
      totalCourses: { type: Number, default: 0 },
      completedCourses: { type: Number, default: 0 },
      totalLessons: { type: Number, default: 0 },
      completedLessons: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Student', studentSchema);
