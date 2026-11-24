import mongoose from 'mongoose';

// Cau truc cau hoi trac nghiem gan voi tung bai giang (UC-3.8)
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  options: {
    type: [{ type: String, required: true, trim: true }],
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length >= 2,
      message: 'Question must have at least 2 options',
    },
  },
  correctAnswer: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function (val) {
        return Array.isArray(this.options) && this.options.includes(val);
      },
      message: 'correctAnswer must match one of the options',
    },
  },
  explanation: { type: String, default: '', trim: true },
});

// Cau truc bai giang trong tung chuong cua khoa hoc
const lectureSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  videoUrl: { type: String, default: '/media/videos/720p.mp4' },
  isFree: { type: Boolean, default: false },
  duration: { type: Number, default: 600, min: 0 },
  questions: [questionSchema],
});

// Cau truc chuong hoc (section) trong giao trinh khoa hoc
const sectionSchema = new mongoose.Schema({
  section: { type: String, required: true, trim: true },
  order: { type: Number, default: 1, min: 1 },
  lectures: [lectureSchema],
});

// Mo hinh du lieu khoa hoc, giao trinh va thong tin giang vien (Collection: courses)
const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategory: { type: String, default: '', trim: true },
    tags: [{ type: String, trim: true }],
    level: { type: String, enum: ['All', 'Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
    language: { type: String, default: 'English / Vietnamese', trim: true },
    price: { type: Number, required: true, default: 0, min: 0 },
    discountPrice: { type: Number, default: 0, min: 0 },
    enableDiscount: { type: Boolean, default: false },
    duration: { type: Number, default: 12, min: 0 },
    durationUnit: { type: String, enum: ['HOUR', 'MINUTE', 'SECOND', 'DAY'], default: 'HOUR' },
    image: { type: String, default: '/media/courses/01.jpg' },
    thumbnail: { type: String, default: '/media/courses/01.jpg' },
    previewVideo: { type: String, default: '/media/videos/720p.mp4' },
    lecturesCount: { type: Number, default: 0, min: 0 },
    studentsEnrolled: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['Pending', 'Live', 'Rejected', 'Blocked', 'Draft'], default: 'Pending' },
    isPrivate: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    objectives: [{ type: String, trim: true }],
    instructor: {
      ref: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true, trim: true },
      avatar: { type: String, default: '/media/avatar/01.jpg' },
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    curriculum: [sectionSchema],
  },
  { timestamps: true }
);

// Kiem tra gia khuyen mai khong duoc lon hon gia goc khi bat giam gia
courseSchema.pre('validate', function (next) {
  if (this.enableDiscount && this.discountPrice > this.price) {
    return next(new Error('discountPrice cannot exceed price'));
  }
  next();
});

// Bo chi muc phuc vu loc danh sach, truy van theo giang vien va tim kiem toan van
courseSchema.index({ status: 1, isDeleted: 1, isPrivate: 1, createdAt: -1 });
courseSchema.index({ category: 1, status: 1 });
courseSchema.index({ 'instructor.ref': 1 });
// Doi truong language_override de tranh xung dot voi truong language cua khoa hoc
courseSchema.index(
  { title: 'text', subtitle: 'text', tags: 'text' },
  { language_override: 'textSearchLanguage', default_language: 'english' }
);

export default mongoose.model('Course', courseSchema);
