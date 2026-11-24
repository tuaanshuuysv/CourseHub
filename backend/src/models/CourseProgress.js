import mongoose from 'mongoose';

// Cau truc tien do hoc tap cua tung bai giang trong khoa hoc
const lectureProgressSchema = new mongoose.Schema(
  {
    lectureId: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ['Not_Started', 'In_Progress', 'Completed'], default: 'Not_Started' },
    durationSec: { type: Number, default: 0, min: 0 },
    lastPositionSec: { type: Number, default: 0, min: 0 },
    totalTimeSpentSec: { type: Number, default: 0, min: 0 },
    viewCount: { type: Number, default: 0, min: 0 },
    completedAt: { type: Date },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Mo hinh du lieu tien do hoc tap khoa hoc cua hoc vien (Collection: courseprogresses)
const courseProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    completedLecturesCount: { type: Number, default: 0, min: 0 },
    totalLectures: { type: Number, default: 0, min: 0 },
    totalTimeSpentSec: { type: Number, default: 0, min: 0 },
    firstStartedAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    lastLectureId: { type: mongoose.Schema.Types.ObjectId },
    lastPositionSec: { type: Number, default: 0, min: 0 },
    lectures: [lectureProgressSchema],
  },
  { timestamps: true }
);

// Rang buoc so bai da hoan thanh khong duoc vuot qua tong so bai giang
courseProgressSchema.pre('validate', function (next) {
  if (this.totalLectures > 0 && this.completedLecturesCount > this.totalLectures) {
    return next(new Error('completedLecturesCount cannot exceed totalLectures'));
  }
  next();
});

// Chi muc duy nhat cho cap hoc vien va khoa hoc
courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model('CourseProgress', courseProgressSchema);
