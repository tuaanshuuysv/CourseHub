import mongoose from 'mongoose';

// Mo hinh du lieu ho so giang vien, hoc van va ky nang (Collection: instructors)
const instructorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    address: { type: String, default: '' },
    occupation: { type: String, default: '' },
    introduction: { type: String, default: '' },
    isApproved: { type: Boolean, default: false },
    education: [
      {
        degree: String,
        fieldOfStudy: String,
        institution: String,
        addedAt: { type: Date, default: Date.now },
      },
    ],
    skills: [
      {
        name: String,
        level: { type: Number, min: 0, max: 100, default: 80 },
      },
    ],
    myCourses: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
      },
    ],
    myStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model('Instructor', instructorSchema);
