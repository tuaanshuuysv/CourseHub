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
import CourseProgress from '../models/CourseProgress.js';
import LearningStreak from '../models/LearningStreak.js';
import Wishlist from '../models/Wishlist.js';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import { authenticate, requireRole, requireStudent, setAuthCookie, signToken } from '../middleware/auth.js';
import { AVATARS_DIR, uploadAvatar } from '../middleware/upload.js';
import { isSmtpConfigured, sendOrderConfirmationEmail } from '../services/emailService.js';

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

// UC-3.3 Lay danh sach khoa hoc trong gio hang cua hoc vien
router.get('/cart', async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.auth.id }).populate({
      path: 'courses.course',
      match: { isDeleted: false },
      select: '-curriculum',
      populate: { path: 'category', select: 'name slug color' },
    });

    const list = (cart?.courses || []).map((item) => item.course).filter(Boolean);
    return res.json(list);
  } catch (err) {
    return next(err);
  }
});

// UC-3.3 Them khoa hoc vao gio hang (chan khoa chua duyet, khoa cua chinh minh, da mua hoac trung)
router.post('/cart', async (req, res, next) => {
  try {
    const { courseId } = req.body || {};
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }

    const course = await Course.findOne({
      _id: courseId,
      status: 'Live',
      isDeleted: false,
      isPrivate: false,
    }).select('_id instructor.ref');
    if (!course) {
      return res.status(404).json({ message: 'Course not found or unavailable' });
    }

    if (String(course.instructor?.ref) === String(req.auth.id)) {
      return res.status(400).json({ message: 'You cannot purchase your own course' });
    }

    const student = await Student.findOne({ user: req.auth.id });
    if (student?.myCourses?.some((m) => String(m.course) === String(course._id))) {
      return res.status(409).json({ message: 'You are already enrolled in this course' });
    }

    let cart = await Cart.findOne({ user: req.auth.id });
    if (!cart) {
      cart = await Cart.create({ user: req.auth.id, courses: [] });
    }
    if (cart.courses.some((c) => String(c.course) === String(course._id))) {
      return res.status(409).json({ message: 'Course already in cart' });
    }

    cart.courses.push({ course: course._id });
    await cart.save();
    return res.status(201).json({ message: 'Added to cart!' });
  } catch (err) {
    return next(err);
  }
});

// UC-3.3 Xoa mot khoa hoc khoi gio hang cua hoc vien
router.delete('/cart/:courseId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.courseId)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }

    await Cart.findOneAndUpdate(
      { user: req.auth.id },
      { $pull: { courses: { course: req.params.courseId } } }
    );
    return res.json({ message: 'Removed from cart' });
  } catch (err) {
    return next(err);
  }
});

// UC-3.4 Kiem tra tinh hop le, thoi han va lich su su dung cua ma giam gia
router.post('/coupons/validate', async (req, res, next) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code, isActive: true });
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon is invalid or inactive' });
    }

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) {
      return res.status(400).json({ message: 'Coupon is not active yet' });
    }
    if (coupon.expiryDate < now) {
      return res.status(400).json({ message: 'Coupon has expired' });
    }
    if ((coupon.usersUsed || []).some((uid) => String(uid) === String(req.auth.id))) {
      return res.status(409).json({ message: 'You have already used this coupon' });
    }

    return res.json({
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountPercent: coupon.discountPercent,
        expiryDate: coupon.expiryDate,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// Tinh gia ban thuc te cua mot khoa hoc co ap dung giam gia (neu hop le)
function getEffectivePrice(course) {
  const hasDiscount =
    Boolean(course.enableDiscount) &&
    typeof course.discountPrice === 'number' &&
    course.discountPrice < course.price;
  return hasDiscount ? course.discountPrice : course.price;
}

// UC-3.4 Thanh toan, tao don hang, ghi danh khoa hoc va gui email hoa don xac nhan
router.post('/checkout', async (req, res, next) => {
  try {
    const { courseIds, couponCode, paymentMethod = 'vnpay' } = req.body || {};
    if (!['vnpay', 'momo', 'free'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    let candidateCourses = [];
    if (Array.isArray(courseIds) && courseIds.length > 0) {
      const validIds = courseIds.filter((id) => mongoose.isValidObjectId(id));
      if (validIds.length !== courseIds.length) {
        return res.status(400).json({ message: 'One or more courseIds are invalid' });
      }
      candidateCourses = await Course.find({
        _id: { $in: validIds },
        status: 'Live',
        isDeleted: false,
        isPrivate: false,
      });
    } else {
      const cart = await Cart.findOne({ user: req.auth.id }).populate({
        path: 'courses.course',
        match: { status: 'Live', isDeleted: false, isPrivate: false },
      });
      candidateCourses = (cart?.courses || []).map((c) => c.course).filter(Boolean);
    }

    let student = await Student.findOne({ user: req.auth.id });
    if (!student) {
      student = await Student.create({ user: req.auth.id });
    }
    const enrolledSet = new Set((student.myCourses || []).map((m) => String(m.course)));

    // Loai bo khoa hoc da mua hoac khoa hoc do chinh nguoi dung giang day
    const selectedCourses = candidateCourses.filter(
      (c) => !enrolledSet.has(String(c._id)) && String(c.instructor?.ref) !== String(req.auth.id)
    );
    if (selectedCourses.length === 0) {
      return res.status(400).json({ message: 'No eligible courses selected for checkout' });
    }

    const subTotal = selectedCourses.reduce((sum, c) => sum + getEffectivePrice(c), 0);

    let discountAmount = 0;
    let couponSnapshot = { couponId: null, code: '', discountPercent: 0 };
    let usedCouponDoc = null;

    if (typeof couponCode === 'string' && couponCode.trim()) {
      const normalizedCode = couponCode.trim().toUpperCase();
      const cp = await Coupon.findOne({ code: normalizedCode, isActive: true });
      if (!cp) {
        return res.status(404).json({ message: 'Coupon is invalid or inactive' });
      }
      const now = new Date();
      if (cp.startDate && cp.startDate > now) {
        return res.status(400).json({ message: 'Coupon is not active yet' });
      }
      if (cp.expiryDate < now) {
        return res.status(400).json({ message: 'Coupon has expired' });
      }
      if ((cp.usersUsed || []).some((uid) => String(uid) === String(req.auth.id))) {
        return res.status(409).json({ message: 'You have already used this coupon' });
      }
      discountAmount = Math.min(subTotal, Math.round((subTotal * cp.discountPercent) / 100));
      couponSnapshot = {
        couponId: cp._id,
        code: cp.code,
        discountPercent: cp.discountPercent,
      };
      usedCouponDoc = cp;
    }

    const totalAmount = Math.max(0, subTotal - discountAmount);
    const resolvedMethod = totalAmount === 0 ? 'free' : paymentMethod;

    const orderItems = selectedCourses.map((c) => ({
      course: c._id,
      pricePaid: getEffectivePrice(c),
    }));

    const order = await Order.create({
      user: req.auth.id,
      courses: orderItems,
      coupon: couponSnapshot,
      subTotal,
      discountAmount,
      totalAmount,
      paymentMethod: resolvedMethod,
      status: 'completed',
    });

    if (usedCouponDoc) {
      await Coupon.findByIdAndUpdate(usedCouponDoc._id, {
        $addToSet: { usersUsed: req.auth.id },
      });
    }

    // Ghi danh hoc vien, tang so luong hoc vien khoa hoc va khoi tao tien do hoc tap
    let addedLessons = 0;
    for (const c of selectedCourses) {
      student.myCourses.push({ course: c._id, enrolledAt: new Date() });
      const allLectures = (c.curriculum || []).flatMap((sec) => sec.lectures || []);
      addedLessons += allLectures.length;

      await Promise.all([
        Course.findByIdAndUpdate(c._id, { $inc: { studentsEnrolled: 1 } }),
        Instructor.findOneAndUpdate(
          { user: c.instructor.ref },
          { $addToSet: { myStudents: req.auth.id } }
        ),
        CourseProgress.findOneAndUpdate(
          { userId: req.auth.id, courseId: c._id },
          {
            $setOnInsert: {
              userId: req.auth.id,
              courseId: c._id,
              totalLectures: allLectures.length,
              lectures: allLectures.map((l) => ({
                lectureId: l._id,
                status: 'Not_Started',
                durationSec: l.duration || 600,
              })),
            },
          },
          { upsert: true, new: true }
        ),
      ]);
    }

    student.stats.totalCourses = student.myCourses.length;
    student.stats.totalLessons = (student.stats.totalLessons || 0) + addedLessons;
    await student.save();

    // Go cac khoa hoc vua thanh toan khoi gio hang
    await Cart.findOneAndUpdate(
      { user: req.auth.id },
      { $pull: { courses: { course: { $in: selectedCourses.map((c) => c._id) } } } }
    );

    // Gui email xac nhan thanh toan va hoa don toi dia chi email cua hoc vien
    let emailSent = false;
    if (isSmtpConfigured() && req.auth.account?.email) {
      try {
        await sendOrderConfirmationEmail({
          to: req.auth.account.email,
          name: req.auth.account.name,
          orderId: order._id,
          courses: selectedCourses.map((c) => ({
            title: c.title,
            pricePaid: getEffectivePrice(c),
          })),
          subTotal,
          discountAmount,
          totalAmount,
          couponCode: couponSnapshot.code,
          paymentMethod: resolvedMethod,
        });
        emailSent = true;
      } catch (mailErr) {
        console.error('Order confirmation email failed:', mailErr.message);
      }
    }

    return res.status(201).json({
      message: emailSent
        ? 'Payment successful! Confirmation email sent and courses unlocked.'
        : 'Payment successful & courses enrolled!',
      order,
      emailSent,
    });
  } catch (err) {
    return next(err);
  }
});

// UC-3.5 & UC-3.7 Lay danh sach khoa hoc da ghi danh kem phan tram tien do va chuoi ngay hoc
router.get('/my-courses', async (req, res, next) => {
  try {
    const [student, progresses, streak] = await Promise.all([
      Student.findOne({ user: req.auth.id }).populate({
        path: 'myCourses.course',
        match: { isDeleted: false },
        select: '-curriculum',
        populate: { path: 'category', select: 'name slug color' },
      }),
      CourseProgress.find({ userId: req.auth.id }),
      LearningStreak.findOne({ userId: req.auth.id }),
    ]);

    const progressMap = Object.fromEntries(progresses.map((p) => [String(p.courseId), p]));

    const enrolled = (student?.myCourses || [])
      .filter((m) => Boolean(m.course))
      .map((m) => {
        const course = m.course;
        const prog = progressMap[String(course._id)];
        const totalLessons = course.lecturesCount || prog?.totalLectures || 1;
        const completed = prog?.completedLecturesCount || 0;
        return {
          ...course.toObject(),
          enrolledAt: m.enrolledAt,
          progress: {
            completedLecturesCount: completed,
            totalLectures: totalLessons,
            percent: Math.min(100, Math.round((completed / totalLessons) * 100)),
            lastLectureId: prog?.lastLectureId || null,
            lastPositionSec: prog?.lastPositionSec || 0,
            completedLectureIds: (prog?.lectures || [])
              .filter((l) => l.status === 'Completed')
              .map((l) => String(l.lectureId)),
          },
        };
      });

    return res.json({
      courses: enrolled,
      streak: streak || { currentStreak: 0, longestStreak: 0, activeDates: [] },
      stats: student?.stats || { totalCourses: 0, completedCourses: 0, totalLessons: 0, completedLessons: 0 },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
