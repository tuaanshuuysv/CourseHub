import mongoose from 'mongoose';

// Mo hinh du lieu chuoi ngay hoc tap lien tuc cua hoc vien (Collection: learningstreaks)
const learningStreakSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: '' },
    activeDates: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.model('LearningStreak', learningStreakSchema);
