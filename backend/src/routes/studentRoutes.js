import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Instructor from '../models/Instructor.js';
import Course from '../models/Course.js';
import LearningStreak from '../models/LearningStreak.js';
import Wishlist from '../models/Wishlist.js';
import { authenticate, requireRole, requireStudent, setAuthCookie, signToken } from '../middleware/auth.js';
import { AVATARS_DIR, uploadAvatar } from '../middleware/upload.js';

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

// UC-2.2 Tai len anh dai dien that cua nguoi dung va xoa tep anh cu (neu co)
router.post('/profile/avatar', uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Avatar image file is required' });
    }

    const user = await User.findById(req.auth.id);
    if (!user) {
      const tempPath = path.join(AVATARS_DIR, req.file.filename);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(404).json({ message: 'User not found' });
    }

    const previousAvatar = user.pfpImg || '';
    const avatarUrl = `/api/media/avatars/${req.file.filename}`;
    user.pfpImg = avatarUrl;
    await user.save();

    // Dong bo anh dai dien moi tren cac khoa hoc neu tai khoan la giang vien
    if (user.role === 'instructor') {
      await Course.updateMany(
        { 'instructor.ref': user._id },
        { $set: { 'instructor.avatar': avatarUrl } }
      );
    }

    // Xoa tep anh dai dien cu tren dia neu truoc do da upload len he thong
    if (previousAvatar.startsWith('/api/media/avatars/')) {
      const oldFilename = path.basename(previousAvatar);
      const oldPath = path.join(AVATARS_DIR, oldFilename);
      if (oldFilename !== req.file.filename && fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    return res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl,
      user,
    });
  } catch (err) {
    return next(err);
  }
});

// Doi mat khau nguoi dung, vo hieu hoa token cu va cap lai JWT phien moi
router.put('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (String(newPassword) === String(currentPassword)) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    // Select them truong password vi schema dang an mac dinh (select: false)
    const user = await User.findById(req.auth.id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const match = await bcrypt.compare(String(currentPassword), user.password);
    if (!match) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    user.passwordChangedAt = new Date();
    await user.save();

    // Cap lai JWT moi cho phien hien tai trong khi cac token cu bi vo hieu hoa
    const token = signToken({ id: user._id.toString(), role: user.role });
    setAuthCookie(res, token);

    return res.json({ message: 'Password changed successfully!', token });
  } catch (err) {
    return next(err);
  }
});

// UC-3.1 Hoc vien gui don dang ky tro thanh Giang vien cho Admin phe duyet
router.post('/become-instructor', requireRole('student'), async (req, res, next) => {
  try {
    const existing = await Instructor.findOne({ user: req.auth.id });
    if (existing) {
      return res.status(409).json({ message: 'Application already submitted' });
    }

    const occupation = typeof req.body?.occupation === 'string' ? req.body.occupation.trim() : '';
    const introduction = typeof req.body?.introduction === 'string' ? req.body.introduction.trim() : '';
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';

    if (!occupation || !introduction) {
      return res.status(400).json({ message: 'Occupation and introduction are required' });
    }

    const application = await Instructor.create({
      user: req.auth.id,
      occupation,
      introduction,
      address,
      isApproved: false,
    });

    return res.status(201).json({
      message: 'Registration successful. Waiting for Admin approval.',
      application,
    });
  } catch (err) {
    return next(err);
  }
});

// UC-3.2 Lay danh sach khoa hoc yeu thich cua hoc vien tu collection Wishlist
router.get('/wishlist', async (req, res, next) => {
  try {
    const items = await Wishlist.find({ userId: req.auth.id })
      .sort({ addedAt: -1 })
      .populate({
        path: 'courseId',
        match: { isDeleted: false },
        select: '-curriculum',
        populate: { path: 'category', select: 'name slug color' },
      });

    return res.json(items.map((w) => w.courseId).filter(Boolean));
  } catch (err) {
    return next(err);
  }
});

// UC-3.2 Them hoac go khoa hoc khoi danh sach yeu thich (chi luu tai collection Wishlist)
router.post('/wishlist/toggle', async (req, res, next) => {
  try {
    const { courseId } = req.body || {};
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }

    const course = await Course.findOne({ _id: courseId, isDeleted: false }).select('_id');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const existing = await Wishlist.findOne({ userId: req.auth.id, courseId: course._id });
    if (existing) {
      await Wishlist.deleteOne({ _id: existing._id });
      return res.json({ wished: false, message: 'Removed from wishlist' });
    }

    await Wishlist.create({ userId: req.auth.id, courseId: course._id });
    return res.json({ wished: true, message: 'Added to wishlist' });
  } catch (err) {
    return next(err);
  }
});

export default router;
