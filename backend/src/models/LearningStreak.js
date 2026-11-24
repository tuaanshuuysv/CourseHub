import mongoose from 'mongoose';

// Bieu thuc chinh quy kiem tra dinh dang ngay YYYY-MM-DD
const DATE_YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Mo hinh du lieu chuoi ngay hoc tap lien tuc cua hoc vien (Collection: learningstreaks)
const learningStreakSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastActiveDate: {
      type: String,
      default: '',
      validate: {
        validator: (val) => val === '' || DATE_YYYY_MM_DD_REGEX.test(val),
        message: 'lastActiveDate must be in YYYY-MM-DD format or empty',
      },
    },
    activeDates: [
      {
        type: String,
        match: [DATE_YYYY_MM_DD_REGEX, 'Each activeDate must be in YYYY-MM-DD format'],
      },
    ],
  },
  { timestamps: true }
);

// Dam bao chuoi dai nhat khong nho hon chuoi hien tai
learningStreakSchema.pre('validate', function (next) {
  if (this.longestStreak < this.currentStreak) {
    return next(new Error('longestStreak cannot be less than currentStreak'));
  }
  next();
});

export default mongoose.model('LearningStreak', learningStreakSchema);
