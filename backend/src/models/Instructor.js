import mongoose from 'mongoose';

// Cau truc kinh nghiem lam viec va nguoi tham chieu (cap tren cu) cua ung vien giang vien
const workExperienceSchema = new mongoose.Schema(
  {
    organization: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    startDate: { type: String, required: true, trim: true },
    endDate: { type: String, default: 'Present', trim: true },
    supervisor: {
      name: { type: String, required: true, trim: true },
      contact: { type: String, required: true, trim: true },
    },
  },
  { _id: false }
);

// Cau truc chung chi chuyen mon kem anh chup xac minh
const certificateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Mo hinh du lieu ho so giang vien, hoc van, kinh nghiem, chung chi va ky nang (Collection: instructors)
const instructorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    address: { type: String, default: '', trim: true },
    occupation: { type: String, default: '', trim: true },
    introduction: { type: String, default: '', trim: true },
    isApproved: { type: Boolean, default: false },
    // Danh sach kinh nghiem lam viec va thong tin cap tren cu de xac minh (toi da 10 muc)
    workExperience: {
      type: [workExperienceSchema],
      default: [],
      validate: [(arr) => arr.length <= 10, 'Maximum 10 work experience items allowed'],
    },
    // Danh sach chung chi kem anh chup tai len (toi da 10 muc)
    certificates: {
      type: [certificateSchema],
      default: [],
      validate: [(arr) => arr.length <= 10, 'Maximum 10 certificates allowed'],
    },
    // Gioi han toi da 5 muc trinh do hoc van theo quy dinh ho so
    education: {
      type: [
        {
          degree: { type: String, trim: true },
          fieldOfStudy: { type: String, trim: true },
          institution: { type: String, trim: true },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      validate: [(arr) => arr.length <= 5, 'Maximum 5 education items allowed'],
    },
    // Gioi han toi da 6 ky nang chuyen mon cua giang vien
    skills: {
      type: [
        {
          name: { type: String, trim: true },
          level: { type: Number, min: 0, max: 100, default: 80 },
        },
      ],
      validate: [(arr) => arr.length <= 6, 'Maximum 6 skills allowed'],
    },
    // Lam phang mang myCourses thanh mang ObjectId de dong nhat voi myStudents
    myCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    myStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Chi muc phuc vu trang Admin loc va duyet don dang ky giang vien
instructorSchema.index({ isApproved: 1, createdAt: -1 });

export default mongoose.model('Instructor', instructorSchema);
