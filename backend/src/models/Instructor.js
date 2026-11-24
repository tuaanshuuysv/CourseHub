import mongoose from 'mongoose';

// Mo hinh du lieu ho so giang vien, hoc van va ky nang (Collection: instructors)
const instructorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    address: { type: String, default: '', trim: true },
    occupation: { type: String, default: '', trim: true },
    introduction: { type: String, default: '', trim: true },
    isApproved: { type: Boolean, default: false },
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
