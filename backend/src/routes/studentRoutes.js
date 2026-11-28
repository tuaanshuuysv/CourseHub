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
import Review from '../models/Review.js';
import { authenticate, requireRole, requireStudent, setAuthCookie, signToken } from '../middleware/auth.js';
import { AVATARS_DIR, CERTIFICATES_DIR, uploadAvatar, uploadCertificate } from '../middleware/upload.js';
import { isSmtpConfigured, sendOrderConfirmationEmail } from '../services/emailService.js';
import { formatLearningStreak } from '../utils/streakHelper.js';

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PROGRESS_STATUSES = ['Not_Started', 'In_Progress', 'Completed'];

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
      streak: formatLearningStreak(streak),
      instructorApplication: instructor
        ? {
            isApproved: instructor.isApproved,
            occupation: instructor.occupation,
            introduction: instructor.introduction,
            workExperience: instructor.workExperience || [],
            certificates: instructor.certificates || [],
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

// UC-3.1 Tai len anh chup chung chi phuc vu don dang ky tro thanh Giang vien
router.post(
  '/become-instructor/certificate',
  requireRole('student'),
  uploadCertificate.single('certificate'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Certificate image file is required' });
    }
    const imageUrl = `/api/media/certificates/${req.file.filename}`;
    return res.status(201).json({
      message: 'Certificate image uploaded successfully',
      imageUrl,
    });
  }
);

// UC-3.1 Hoc vien gui don dang ky tro thanh Giang vien kem kinh nghiem lam viec va chung chi
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

    // Kiem tra va chuan hoa danh sach kinh nghiem lam viec va thong tin cap tren cu
    const rawWork = req.body?.workExperience;
    if (!Array.isArray(rawWork) || rawWork.length === 0) {
      return res.status(400).json({ message: 'At least one work experience entry is required' });
    }
    if (rawWork.length > 10) {
      return res.status(400).json({ message: 'Maximum 10 work experience items allowed' });
    }

    const workExperience = [];
    for (const item of rawWork) {
      const organization = typeof item?.organization === 'string' ? item.organization.trim() : '';
      const position = typeof item?.position === 'string' ? item.position.trim() : '';
      const startDate = typeof item?.startDate === 'string' ? item.startDate.trim() : '';
      const endDate =
        typeof item?.endDate === 'string' && item.endDate.trim() ? item.endDate.trim() : 'Present';
      const supName =
        typeof item?.supervisor?.name === 'string'
          ? item.supervisor.name.trim()
          : typeof item?.supervisorName === 'string'
            ? item.supervisorName.trim()
            : '';
      const supContact =
        typeof item?.supervisor?.contact === 'string'
          ? item.supervisor.contact.trim()
          : typeof item?.supervisorContact === 'string'
            ? item.supervisorContact.trim()
            : '';

      if (!organization || !position || !startDate || !supName || !supContact) {
        return res.status(400).json({
          message:
            'Each work experience must include organization, position, startDate, supervisor name, and supervisor contact',
        });
      }

      workExperience.push({
        organization,
        position,
        startDate,
        endDate,
        supervisor: {
          name: supName,
          contact: supContact,
        },
      });
    }

    // Kiem tra va chuan hoa danh sach chung chi kem tep anh da tai len
    const rawCerts = req.body?.certificates;
    if (rawCerts !== undefined && !Array.isArray(rawCerts)) {
      return res.status(400).json({ message: 'Certificates must be an array' });
    }
    const certList = Array.isArray(rawCerts) ? rawCerts : [];
    if (certList.length > 10) {
      return res.status(400).json({ message: 'Maximum 10 certificates allowed' });
    }

    const certificates = [];
    for (const cert of certList) {
      const certName = typeof cert?.name === 'string' ? cert.name.trim() : '';
      const imageUrl = typeof cert?.imageUrl === 'string' ? cert.imageUrl.trim() : '';
      if (!certName || !imageUrl.startsWith('/api/media/certificates/')) {
        return res.status(400).json({
          message: 'Each certificate must include a name and a valid uploaded certificate image',
        });
      }
      const filename = path.basename(imageUrl);
      const filePath = path.join(CERTIFICATES_DIR, filename);
      if (!filename || !fs.existsSync(filePath)) {
        return res.status(400).json({ message: 'Uploaded certificate image file not found on server' });
      }
      certificates.push({
        name: certName,
        imageUrl: `/api/media/certificates/${filename}`,
      });
    }

    const application = await Instructor.create({
      user: req.auth.id,
      occupation,
      introduction,
      address,
      workExperience,
      certificates,
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
      streak: formatLearningStreak(streak),
      stats: student?.stats || { totalCourses: 0, completedCourses: 0, totalLessons: 0, completedLessons: 0 },
    });
  } catch (err) {
    return next(err);
  }
});

// Kiem tra quyen truy cap phong hoc (hoc vien da ghi danh hoac giang vien so huu khoa hoc)
async function hasCourseLearningAccess(userId, course) {
  if (String(course.instructor?.ref) === String(userId)) {
    return true;
  }
  const enrolled = await Student.exists({ user: userId, 'myCourses.course': course._id });
  return Boolean(enrolled);
}

// An dap an va giai thich cau hoi trac nghiem khi tra ve phong hoc de chong gian lan
function sanitizeCourseForLearning(courseDoc) {
  const obj = courseDoc.toObject();
  obj.curriculum = (obj.curriculum || []).map((section) => ({
    ...section,
    lectures: (section.lectures || []).map((lecture) => ({
      ...lecture,
      questions: (lecture.questions || []).map((q) => ({
        _id: q._id,
        question: q.question,
        options: q.options,
      })),
    })),
  }));
  return obj;
}

// UC-3.6 & UC-3.7 Lay du lieu phong hoc cua khoa hoc da ghi danh kem tien do va chuoi ngay hoc
router.get('/learning/:courseId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.courseId)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }

    const course = await Course.findOne({ _id: req.params.courseId, isDeleted: false }).populate(
      'category',
      'name slug color'
    );
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const allowed = await hasCourseLearningAccess(req.auth.id, course);
    if (!allowed) {
      return res.status(403).json({ message: 'You must enroll in this course to access the learning studio' });
    }

    const allLectures = (course.curriculum || []).flatMap((sec) => sec.lectures || []);
    let [progress, streak] = await Promise.all([
      CourseProgress.findOne({ userId: req.auth.id, courseId: course._id }),
      LearningStreak.findOne({ userId: req.auth.id }),
    ]);

    if (!progress) {
      progress = await CourseProgress.create({
        userId: req.auth.id,
        courseId: course._id,
        totalLectures: allLectures.length,
        lectures: allLectures.map((l) => ({
          lectureId: l._id,
          status: 'Not_Started',
          durationSec: l.duration || 600,
        })),
      });
    }

    return res.json({
      course: sanitizeCourseForLearning(course),
      progress,
      streak: formatLearningStreak(streak),
    });
  } catch (err) {
    return next(err);
  }
});

// UC-3.6, UC-3.7 & UC-3.10 Cap nhat moc xem video, hoan thanh bai giang va chuoi ngay hoc
router.post('/learning/:courseId/progress', async (req, res, next) => {
  try {
    const { lectureId, status, lastPositionSec = 0, timeDeltaSec = 0 } = req.body || {};

    if (!mongoose.isValidObjectId(req.params.courseId)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }
    if (!mongoose.isValidObjectId(lectureId)) {
      return res.status(400).json({ message: 'Invalid lectureId' });
    }
    if (status !== undefined && !VALID_PROGRESS_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid progress status' });
    }

    const posSec = Number(lastPositionSec);
    const deltaSec = Number(timeDeltaSec);
    if (!Number.isFinite(posSec) || posSec < 0 || !Number.isFinite(deltaSec) || deltaSec < 0) {
      return res.status(400).json({ message: 'lastPositionSec and timeDeltaSec must be non-negative numbers' });
    }

    const course = await Course.findOne({ _id: req.params.courseId, isDeleted: false });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const allowed = await hasCourseLearningAccess(req.auth.id, course);
    if (!allowed) {
      return res.status(403).json({ message: 'You must enroll in this course to update learning progress' });
    }

    const allLectures = (course.curriculum || []).flatMap((sec) => sec.lectures || []);
    const targetLecture = allLectures.find((l) => String(l._id) === String(lectureId));
    if (!targetLecture) {
      return res.status(404).json({ message: 'Lecture not found in this course' });
    }

    let progress = await CourseProgress.findOne({ userId: req.auth.id, courseId: course._id });
    if (!progress) {
      progress = await CourseProgress.create({
        userId: req.auth.id,
        courseId: course._id,
        totalLectures: allLectures.length,
        lectures: allLectures.map((l) => ({
          lectureId: l._id,
          status: 'Not_Started',
          durationSec: l.duration || 600,
        })),
      });
    }

    let lecEntry = progress.lectures.find((l) => String(l.lectureId) === String(targetLecture._id));
    if (!lecEntry) {
      progress.lectures.push({
        lectureId: targetLecture._id,
        status: status || 'In_Progress',
        durationSec: targetLecture.duration || 600,
        lastPositionSec: posSec,
      });
      lecEntry = progress.lectures[progress.lectures.length - 1];
    }

    const prevStatus = lecEntry.status;
    if (status) {
      lecEntry.status = status;
    }
    if (lecEntry.status === 'Completed' && !lecEntry.completedAt) {
      lecEntry.completedAt = new Date();
    } else if (lecEntry.status === 'Not_Started') {
      lecEntry.completedAt = undefined;
    }
    if (prevStatus === 'Not_Started' && lecEntry.status !== 'Not_Started') {
      lecEntry.viewCount = (lecEntry.viewCount || 0) + 1;
    }
    lecEntry.lastPositionSec = posSec;
    lecEntry.totalTimeSpentSec = (lecEntry.totalTimeSpentSec || 0) + deltaSec;
    lecEntry.lastActivityAt = new Date();

    const validLectureIds = new Set(allLectures.map((l) => String(l._id)));
    progress.lastLectureId = targetLecture._id;
    progress.lastPositionSec = posSec;
    progress.lastActivityAt = new Date();
    progress.totalLectures = allLectures.length;
    progress.completedLecturesCount = progress.lectures.filter(
      (l) => validLectureIds.has(String(l.lectureId)) && l.status === 'Completed'
    ).length;
    progress.totalTimeSpentSec = (progress.totalTimeSpentSec || 0) + deltaSec;
    await progress.save();

    // Dong bo thong ke hoan thanh tren ho so Student theo dung rang buoc cua schema
    const student = await Student.findOne({ user: req.auth.id });
    if (student) {
      const enrolledSet = new Set((student.myCourses || []).map((m) => String(m.course)));
      const allUserProg = await CourseProgress.find({ userId: req.auth.id });
      const enrolledProgs = allUserProg.filter((p) => enrolledSet.has(String(p.courseId)));
      const totalCompletedLessons = enrolledProgs.reduce((s, p) => s + p.completedLecturesCount, 0);
      const totalLessonsTracked = enrolledProgs.reduce((s, p) => s + p.totalLectures, 0);
      const completedCourses = enrolledProgs.filter(
        (p) => p.totalLectures > 0 && p.completedLecturesCount >= p.totalLectures
      ).length;

      student.stats.totalCourses = Math.max(student.myCourses.length, completedCourses);
      student.stats.totalLessons = Math.max(
        student.stats.totalLessons || 0,
        totalLessonsTracked,
        totalCompletedLessons
      );
      student.stats.completedLessons = totalCompletedLessons;
      student.stats.completedCourses = completedCourses;
      await student.save();
    }

    // Cap nhat chuoi ngay hoc tap lien tuc khi hoc vien danh dau hoan thanh bai giang
    let streak = await LearningStreak.findOne({ userId: req.auth.id });
    if (status === 'Completed') {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (!streak) {
        streak = await LearningStreak.create({
          userId: req.auth.id,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
          activeDates: [today],
        });
      } else if (streak.lastActiveDate !== today) {
        const nextStreak = streak.lastActiveDate === yesterday ? streak.currentStreak + 1 : 1;
        streak.currentStreak = nextStreak;
        streak.longestStreak = Math.max(streak.longestStreak || 0, nextStreak);
        streak.lastActiveDate = today;
        if (!streak.activeDates.includes(today)) {
          streak.activeDates.push(today);
        }
        await streak.save();
      }
    }

    return res.json({
      progress,
      streak: formatLearningStreak(streak),
    });
  } catch (err) {
    return next(err);
  }
});

// UC-3.8 Cham diem bai trac nghiem gan voi tung bai giang phia may chu
router.post('/learning/:courseId/quiz/check', async (req, res, next) => {
  try {
    const { lectureId, answers } = req.body || {};

    if (!mongoose.isValidObjectId(req.params.courseId)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }
    if (!mongoose.isValidObjectId(lectureId)) {
      return res.status(400).json({ message: 'Invalid lectureId' });
    }

    const course = await Course.findOne({ _id: req.params.courseId, isDeleted: false });
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const allowed = await hasCourseLearningAccess(req.auth.id, course);
    if (!allowed) {
      return res.status(403).json({ message: 'You must enroll in this course to take this quiz' });
    }

    const allLectures = (course.curriculum || []).flatMap((sec) => sec.lectures || []);
    const lecture = allLectures.find((l) => String(l._id) === String(lectureId));
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found in this course' });
    }

    const answerMap = answers && typeof answers === 'object' ? answers : {};
    const results = (lecture.questions || []).map((q) => {
      const rawSelected = answerMap[String(q._id)];
      const selected = typeof rawSelected === 'string' ? rawSelected : '';
      const isCorrect = selected === q.correctAnswer;
      return {
        questionId: q._id,
        selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || '',
      };
    });

    const total = results.length;
    const score = results.filter((r) => r.isCorrect).length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    return res.json({ results, score, total, percentage });
  } catch (err) {
    return next(err);
  }
});

// UC-3.9 Hoc vien gui danh gia khoa hoc da mua va tinh lai diem trung binh bang aggregate
router.post('/courses/:courseId/reviews', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.courseId)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }

    const { rating, description } = req.body || {};
    const parsedRating = Number(rating);
    const cleanDesc = typeof description === 'string' ? description.trim() : '';
    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5 || !cleanDesc) {
      return res.status(400).json({ message: 'Please provide a rating between 1 and 5 and a review comment' });
    }

    const course = await Course.findOne({ _id: req.params.courseId, isDeleted: false }).select('_id');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const isEnrolled = await Student.exists({ user: req.auth.id, 'myCourses.course': course._id });
    if (!isEnrolled) {
      return res.status(403).json({ message: 'You must purchase this course to submit a review' });
    }

    const review = await Review.create({
      user: req.auth.id,
      course: course._id,
      rating: parsedRating,
      description: cleanDesc,
    });

    const agg = await Review.aggregate([
      { $match: { course: course._id, isDeleted: false } },
      { $group: { _id: '$course', average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const nextRating =
      agg.length > 0
        ? { average: Number(agg[0].average.toFixed(1)), count: agg[0].count }
        : { average: 0, count: 0 };

    await Course.findByIdAndUpdate(course._id, {
      'rating.average': nextRating.average,
      'rating.count': nextRating.count,
    });

    const populated = await review.populate('user', 'name pfpImg');
    return res.status(201).json({
      message: 'Review submitted!',
      review: populated,
      rating: nextRating,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this course' });
    }
    return next(err);
  }
});

// Goi y khoa hoc ca nhan hoa dua tren danh muc (category) cua cac khoa hoc trong Wishlist cua hoc vien
router.get('/recommendations', async (req, res, next) => {
  try {
    const [wishlistItems, student] = await Promise.all([
      Wishlist.find({ userId: req.auth.id }).populate({
        path: 'courseId',
        match: { isDeleted: false },
        select: '_id category',
        populate: { path: 'category', select: 'name slug color' },
      }),
      Student.findOne({ user: req.auth.id }).select('myCourses'),
    ]);

    const validWishlistCourses = wishlistItems.map((item) => item.courseId).filter(Boolean);
    if (validWishlistCourses.length === 0) {
      return res.json({
        courses: [],
        basedOnCategories: [],
        hasWishlist: false,
      });
    }

    // Thong ke tan suat xuat hien cua tung danh muc trong Wishlist de uu tien goi y phu hop nhat
    const categoryFreq = new Map();
    const categoryMeta = new Map();
    const excludedIds = new Set();

    for (const course of validWishlistCourses) {
      excludedIds.add(String(course._id));
      const cat = course.category;
      if (cat && cat._id) {
        const key = String(cat._id);
        categoryFreq.set(key, (categoryFreq.get(key) || 0) + 1);
        if (!categoryMeta.has(key)) {
          categoryMeta.set(key, {
            _id: cat._id,
            name: cat.name,
            slug: cat.slug,
            color: cat.color,
          });
        }
      }
    }

    for (const enrolled of student?.myCourses || []) {
      if (enrolled?.course) {
        excludedIds.add(String(enrolled.course));
      }
    }

    const sortedCategoryIds = [...categoryFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => new mongoose.Types.ObjectId(id));

    if (sortedCategoryIds.length === 0) {
      return res.json({
        courses: [],
        basedOnCategories: [],
        hasWishlist: true,
      });
    }

    const excludedObjectIds = [...excludedIds]
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const candidates = await Course.find({
      status: 'Live',
      isDeleted: false,
      isPrivate: false,
      category: { $in: sortedCategoryIds },
      _id: { $nin: excludedObjectIds },
    })
      .select('-curriculum')
      .populate('category', 'name slug color')
      .sort({ 'rating.average': -1, studentsEnrolled: -1, createdAt: -1 })
      .limit(18);

    // Sap xep uu tien theo so lan danh muc xuat hien trong Wishlist, sau do den danh gia va luot hoc
    const ranked = [...candidates]
      .sort((a, b) => {
        const freqA = categoryFreq.get(String(a.category?._id)) || 0;
        const freqB = categoryFreq.get(String(b.category?._id)) || 0;
        if (freqB !== freqA) return freqB - freqA;
        const ratingDiff = (b.rating?.average || 0) - (a.rating?.average || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.studentsEnrolled || 0) - (a.studentsEnrolled || 0);
      })
      .slice(0, 6);

    const basedOnCategories = sortedCategoryIds
      .map((id) => categoryMeta.get(String(id)))
      .filter(Boolean);

    return res.json({
      courses: ranked,
      basedOnCategories,
      hasWishlist: true,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
