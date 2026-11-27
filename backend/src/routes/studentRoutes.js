import express from 'express';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Instructor from '../models/Instructor.js';
import LearningStreak from '../models/LearningStreak.js';
import { authenticate, requireStudent } from '../middleware/auth.js';

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// UC-2.2 Cap nhat thong tin ho so ca nhan va dia chi hoc vien
router.put('/profile', async (req, res, next) => {
  try {
    const { name, email, bio, phonenumber, website, socials, pfpImg, address } = req.body || {};
    const updatePayload = {};

    if (typeof name === 'string' && name.trim()) {
      updatePayload.name = name.trim();
    }

    if (typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.toLowerCase().trim();
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      const [dupUser, dupAdmin] = await Promise.all([
        User.findOne({ email: normalizedEmail, _id: { $ne: req.auth.id } }),
        Admin.findOne({ email: normalizedEmail }),
      ]);
      if (dupUser || dupAdmin) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      updatePayload.email = normalizedEmail;
    }

    if (bio !== undefined) updatePayload.bio = String(bio).trim();
    if (phonenumber !== undefined) updatePayload.phonenumber = String(phonenumber).trim();
    if (website !== undefined) updatePayload.website = String(website).trim();
    if (typeof pfpImg === 'string' && pfpImg.trim()) updatePayload.pfpImg = pfpImg.trim();

    if (socials && typeof socials === 'object') {
      updatePayload.socials = {
        facebook: typeof socials.facebook === 'string' ? socials.facebook.trim() : '',
        youtube: typeof socials.youtube === 'string' ? socials.youtube.trim() : '',
        linkedin: typeof socials.linkedin === 'string' ? socials.linkedin.trim() : '',
        instagram: typeof socials.instagram === 'string' ? socials.instagram.trim() : '',
      };
    }

    const updatedUser = await User.findByIdAndUpdate(req.auth.id, updatePayload, {
      new: true,
      runValidators: true,
    });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let student = await Student.findOne({ user: req.auth.id });
    if (address !== undefined) {
      student = await Student.findOneAndUpdate(
        { user: req.auth.id },
        { $set: { address: String(address).trim() } },
        { new: true, upsert: true, runValidators: true }
      );
    }

    return res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
      student,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
