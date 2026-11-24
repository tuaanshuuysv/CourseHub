import express from 'express';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Cart from '../models/Cart.js';
import LearningStreak from '../models/LearningStreak.js';

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sinh ma OTP ngau nhien gom 6 chu so
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// UC-1.1 Dang ky tai khoan moi va tao ma xac thuc OTP
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const [existingUser, existingAdmin] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      Admin.findOne({ email: normalizedEmail }),
    ]);
    if (existingUser || existingAdmin) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const otp = generateOtp();
    const otpExpireAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'student',
      isVerified: false,
      isActivated: true,
      verifyOtp: otp,
      verifyOtpExpireAt: otpExpireAt,
    });

    // Khoi tao ho so hoc vien, gio hang va chuoi ngay hoc tap cho tai khoan moi
    await Promise.all([
      Student.create({ user: user._id }),
      Cart.create({ user: user._id, courses: [] }),
      LearningStreak.create({ userId: user._id, currentStreak: 0, longestStreak: 0 }),
    ]);

    return res.status(201).json({
      message: 'Registration successful. Please verify OTP sent to your email.',
      email: user.email,
      // Tra ve demoOtp de phuc vu kiem thu noi bo khi chua cau hinh SMTP
      demoOtp: otp,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
