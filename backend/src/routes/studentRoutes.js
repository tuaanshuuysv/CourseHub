import express from 'express';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Instructor from '../models/Instructor.js';
import LearningStreak from '../models/LearningStreak.js';
import { authenticate, requireStudent } from '../middleware/auth.js';

const router = express.Router();

// Tat ca tuyen API hoc vien deu yeu cau dang nhap va thuoc vai tro student/instructor
router.use(authenticate, requireStudent);

// UC-2.1 Xem thong tin ho so ca nhan, thong ke hoc tap va chuoi ngay hoc
router.get('/profile', async (req, res, next) => {
  try {
    const [user, student, streak, instructor] = await Promise.all([
      User.findById(req.auth.id),
      Student.findOne({ user: req.auth.id }),
      LearningStreak.findOne({ userId: req.auth.id }),
      Instructor.findOne({ user: req.auth.id }),
    ]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      user,
      student: student || null,
      streak: streak || { currentStreak: 0, longestStreak: 0, activeDates: [] },
      instructorApplication: instructor
        ? {
            isApproved: instructor.isApproved,
            occupation: instructor.occupation,
            introduction: instructor.introduction,
          }
        : null,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
