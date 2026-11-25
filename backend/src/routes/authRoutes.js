import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Cart from '../models/Cart.js';
import LearningStreak from '../models/LearningStreak.js';
import { setAuthCookie, signToken } from '../middleware/auth.js';

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

// UC-1.1 Xac thuc ma OTP sau khi dang ky tai khoan
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const normalizedOtp = otp !== undefined && otp !== null ? String(otp).trim() : '';

    if (!normalizedEmail || !normalizedOtp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // Chu dong select them truong OTP vi schema dang dat select: false
    const user = await User.findOne({ email: normalizedEmail }).select('+verifyOtp +verifyOtpExpireAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.verifyOtp || user.verifyOtp !== normalizedOtp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    if (!user.verifyOtpExpireAt || user.verifyOtpExpireAt.getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    user.isVerified = true;
    user.verifyOtp = '';
    user.verifyOtpExpireAt = null;
    await user.save();

    return res.json({ message: 'Account verified successfully' });
  } catch (err) {
    return next(err);
  }
});

// UC-1.2 Dang nhap he thong cho ca 3 vai tro (Hoc vien, Giang vien, Quan tri vien)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Kiem tra tai khoan Quan tri vien truoc (select them password vi schema an mac dinh)
    const admin = await Admin.findOne({ email: normalizedEmail }).select('+password');
    if (admin) {
      const ok = await bcrypt.compare(String(password), admin.password);
      if (!ok) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      if (!admin.isApproved) {
        return res.status(403).json({ message: 'Admin account is not approved' });
      }

      const token = signToken({ id: admin._id.toString(), role: 'admin' });
      setAuthCookie(res, token);
      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: 'admin',
          pfpImg: '/media/avatar/02.jpg',
        },
      });
    }

    // Kiem tra tai khoan Nguoi dung (Hoc vien / Giang vien)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const ok = await bcrypt.compare(String(password), user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email OTP before signing in',
        needsVerify: true,
      });
    }
    if (!user.isActivated) {
      return res.status(403).json({ message: 'Account is currently blocked by Administrator' });
    }

    const token = signToken({ id: user._id.toString(), role: user.role });
    setAuthCookie(res, token);
    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        pfpImg: user.pfpImg,
        bio: user.bio,
        phonenumber: user.phonenumber,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// UC-1.2 Dang nhap nhanh bang tai khoan Google (OAuth demo flow)
router.post('/google', async (req, res, next) => {
  try {
    const rawEmail = req.body?.email || 'user@demo.com';
    const normalizedEmail = typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : '';
    const normalizedName =
      typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : 'Nguyen Tuan Huy';
    const incomingGoogleId =
      typeof req.body?.googleId === 'string' && req.body.googleId.trim() ? req.body.googleId.trim() : '';

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const randomPasswordHash = await bcrypt.hash(`google_oauth_${crypto.randomUUID()}`, 10);
      user = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        password: randomPasswordHash,
        role: 'student',
        isVerified: true,
        isActivated: true,
        googleId: incomingGoogleId || `google_${crypto.randomUUID()}`,
      });

      // Khoi tao ho so hoc vien, gio hang va chuoi ngay hoc cho tai khoan Google moi
      await Promise.all([
        Student.create({ user: user._id }),
        Cart.create({ user: user._id, courses: [] }),
        LearningStreak.create({ userId: user._id, currentStreak: 0, longestStreak: 0 }),
      ]);
    } else {
      if (!user.isActivated) {
        return res.status(403).json({ message: 'Account is currently blocked by Administrator' });
      }
      if (!user.isVerified) {
        user.isVerified = true;
        await user.save();
      }
    }

    const token = signToken({ id: user._id.toString(), role: user.role });
    setAuthCookie(res, token);
    return res.json({
      message: 'Google Sign-In successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        pfpImg: user.pfpImg,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// UC-1.2 Gui ma OTP khoi phuc mat khau qua email
router.post('/forgot-password', async (req, res, next) => {
  try {
    const normalizedEmail = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: 'Email not found in system' });
    }
    if (!user.isActivated) {
      return res.status(403).json({ message: 'Account is currently blocked by Administrator' });
    }

    const otp = generateOtp();
    user.verifyOtp = otp;
    user.verifyOtpExpireAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    return res.json({
      message: 'OTP sent to your email',
      // Tra ve demoOtp de kiem thu noi bo khi chua cau hinh may chu SMTP
      demoOtp: otp,
    });
  } catch (err) {
    return next(err);
  }
});

// UC-1.2 Dat lai mat khau bang ma OTP va vo hieu hoa phien dang nhap cu
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
    const normalizedOtp = otp !== undefined && otp !== null ? String(otp).trim() : '';

    if (!normalizedEmail || !normalizedOtp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+verifyOtp +verifyOtpExpireAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (
      !user.verifyOtp ||
      user.verifyOtp !== normalizedOtp ||
      !user.verifyOtpExpireAt ||
      user.verifyOtpExpireAt.getTime() < Date.now()
    ) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    user.verifyOtp = '';
    user.verifyOtpExpireAt = null;
    user.passwordChangedAt = new Date();
    await user.save();

    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    return next(err);
  }
});

export default router;
