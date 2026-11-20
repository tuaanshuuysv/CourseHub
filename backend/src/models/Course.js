import mongoose from 'mongoose';

// Cau truc cau hoi trac nghiem gan voi tung bai giang (UC-3.8)
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: '' },
});

// Cau truc bai giang trong tung chuong cua khoa hoc
const lectureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoUrl: { type: String, default: '/media/videos/720p.mp4' },
  isFree: { type: Boolean, default: false },
  duration: { type: Number, default: 600 },
  questions: [questionSchema],
});

// Cau truc chuong hoc (section) trong giao trinh khoa hoc
const sectionSchema = new mongoose.Schema({
  section: { type: String, required: true },
  order: { type: Number, default: 1 },
  lectures: [lectureSchema],
});

// Mo hinh du lieu khoa hoc, giao trinh va thong tin giang vien (Collection: courses)
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory: { type: String, default: '' },
    tags: [{ type: String }],
    level: { type: String, enum: ['All', 'Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    language: { type: String, default: 'English / Vietnamese' },
    price: { type: Number, required: true, default: 0 },
    discountPrice: { type: Number, default: 0 },
    enableDiscount: { type: Boolean, default: false },
    duration: { type: Number, default: 12 },
    durationUnit: { type: String, enum: ['HOUR', 'MINUTE', 'SECOND', 'DAY'], default: 'HOUR' },
    image: { type: String, default: '/media/courses/01.jpg' },
    thumbnail: { type: String, default: '/media/courses/01.jpg' },
    previewVideo: { type: String, default: '/media/videos/720p.mp4' },
    lecturesCount: { type: Number, default: 0 },
    studentsEnrolled: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'Live', 'Rejected', 'Blocked', 'Draft'], default: 'Pending' },
    isPrivate: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    objectives: [{ type: String }],
    instructor: {
      ref: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      avatar: { type: String, default: '/media/avatar/01.jpg' },
    },
    rating: {
      average: { type: Number, default: 5.0 },
      count: { type: Number, default: 0 },
    },
    curriculum: [sectionSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Course', courseSchema);
