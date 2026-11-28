import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import Cart from '../models/Cart.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';
import Course from '../models/Course.js';
import Instructor from '../models/Instructor.js';
import LearningStreak from '../models/LearningStreak.js';
import Order from '../models/Order.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Wishlist from '../models/Wishlist.js';
import { authenticate, requireAdmin, setAuthCookie, signToken } from '../middleware/auth.js';
import { CERTIFICATES_DIR } from '../middleware/upload.js';

const router = express.Router();
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VALID_COURSE_STATUSES = ['Pending', 'Live', 'Rejected', 'Blocked', 'Draft'];

// Thoat cac ky tu dac biet cua bieu thuc chinh quy de chong tan cong ReDoS
function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Chuan hoa chuoi thanh duong dan tinh (slug) hop le cho danh muc
function makeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Tat ca tuyen API quan tri deu bat buoc dang nhap va thuoc vai tro admin
router.use(authenticate, requireAdmin);

// Lay thong ke tong quan toan san, bieu do doanh thu 12 thang va ty trong danh muc khoa hoc
router.get('/dashboard', async (_req, res, next) => {
  try {
    const [
      studentsCount,
      instructorsCount,
      coursesCount,
      liveCoursesCount,
      pendingCoursesCount,
      pendingRequestsCount,
      completedOrders,
      categories,
      courseAgg,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Instructor.countDocuments({ isApproved: true }),
      Course.countDocuments({ isDeleted: false }),
      Course.countDocuments({ isDeleted: false, status: 'Live' }),
      Course.countDocuments({ isDeleted: false, status: 'Pending' }),
      Instructor.countDocuments({ isApproved: false }),
      Order.find({ status: 'completed' }).select('totalAmount subTotal discountAmount createdAt'),
      Category.find({}).sort({ name: 1 }),
      Course.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const revenueByMonth = Array(12).fill(0);
    let totalRevenue = 0;
    let grossSales = 0;

    for (const ord of completedOrders) {
      const amount = Number(ord.totalAmount || 0);
      const sub = Number(ord.subTotal ?? amount);
      totalRevenue = Number((totalRevenue + amount).toFixed(2));
      grossSales = Number((grossSales + sub).toFixed(2));
      const mIdx = new Date(ord.createdAt).getMonth();
      revenueByMonth[mIdx] = Number((revenueByMonth[mIdx] + amount).toFixed(2));
    }

    const catCountMap = Object.fromEntries(courseAgg.map((row) => [String(row._id), row.count]));
    const categoryBreakdown = categories.map((cat) => ({
      _id: cat._id,
      name: cat.name,
      color: cat.color || '#0f766e',
      count: catCountMap[String(cat._id)] || 0,
    }));

    return res.json({
      stats: {
        studentsCount,
        instructorsCount,
        coursesCount,
        liveCoursesCount,
        pendingCoursesCount,
        pendingRequestsCount,
        totalRevenue,
        grossSales,
      },
      revenueSeries: MONTH_LABELS.map((month, idx) => ({ month, amount: revenueByMonth[idx] })),
      categoryBreakdown,
    });
  } catch (err) {
    return next(err);
  }
});

// Lay bao cao doi soat doanh thu toan san (gia ban, tro gia coupon, thuc thu, chi tra 80% giang vien) va so don hang
router.get('/earnings', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));

    const [orders, total, completedOrders] = await Promise.all([
      Order.find({})
        .populate('user', 'name email pfpImg')
        .populate('courses.course', 'title')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments({}),
      Order.find({ status: 'completed' }).select('subTotal discountAmount totalAmount courses createdAt'),
    ]);

    let grossSales = 0;
    let couponDiscounts = 0;
    let netCollected = 0;
    let educatorPayouts = 0;
    const monthlyCollected = Array(12).fill(0);

    for (const ord of completedOrders) {
      const itemsSum = (ord.courses || []).reduce((sum, item) => sum + Number(item.pricePaid || 0), 0);
      const sub = Number(ord.subTotal ?? itemsSum);
      const disc = Number(ord.discountAmount || 0);
      const collected = Number(ord.totalAmount || 0);

      grossSales = Number((grossSales + sub).toFixed(2));
      couponDiscounts = Number((couponDiscounts + disc).toFixed(2));
      netCollected = Number((netCollected + collected).toFixed(2));

      for (const item of ord.courses || []) {
        const netEdu = Number((Number(item.pricePaid || 0) * 0.8).toFixed(2));
        educatorPayouts = Number((educatorPayouts + netEdu).toFixed(2));
      }

      const mIdx = new Date(ord.createdAt).getMonth();
      monthlyCollected[mIdx] = Number((monthlyCollected[mIdx] + collected).toFixed(2));
    }

    const platformNetCommission = Number((netCollected - educatorPayouts).toFixed(2));

    return res.json({
      stats: {
        grossSales,
        couponDiscounts,
        netCollected,
        grossRevenue: netCollected,
        educatorPayouts,
        platformNetCommission,
        completedOrdersCount: completedOrders.length,
      },
      monthlyRevenue: MONTH_LABELS.map((month, idx) => ({ month, amount: monthlyCollected[idx] })),
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// Lay danh sach khoa hoc kiem duyet kem tim kiem, loc trang thai, phan trang va thong ke so luong
router.get('/courses', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : 'All';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));

    const filter = { isDeleted: false };
    if (status && status !== 'All' && VALID_COURSE_STATUSES.includes(status)) {
      filter.status = status;
    }
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: rx }, { subtitle: rx }, { 'instructor.name': rx }];
    }

    const [courses, total, counts] = await Promise.all([
      Course.find(filter)
        .select('-curriculum')
        .populate('category', 'name slug color')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Course.countDocuments(filter),
      Course.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    return res.json({
      courses,
      total,
      statusCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// Cap nhat trang thai kiem duyet cua khoa hoc (Live, Pending, Rejected, Blocked, Draft)
router.patch('/courses/:id/status', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }
    const status = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
    if (!VALID_COURSE_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid course status' });
    }

    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { status },
      { new: true, runValidators: true }
    )
      .select('-curriculum')
      .populate('category', 'name slug color');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    return res.json({ message: 'Course status updated successfully', course });
  } catch (err) {
    return next(err);
  }
});

// Lay danh sach danh muc khoa hoc kem tong so khoa hoc dang su dung tung danh muc
router.get('/categories', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const filter = q
      ? { $or: [{ name: new RegExp(escapeRegex(q), 'i') }, { slug: new RegExp(escapeRegex(q), 'i') }] }
      : {};

    const [categories, counts] = await Promise.all([
      Category.find(filter).sort({ createdAt: -1 }),
      Course.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
    return res.json(
      categories.map((cat) => ({
        ...cat.toObject(),
        coursesCount: countMap[String(cat._id)] || 0,
      }))
    );
  } catch (err) {
    return next(err);
  }
});

// Tao moi danh muc khoa hoc va chong trung ten hoac duong dan slug
router.post('/categories', async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const color = typeof req.body?.color === 'string' && req.body.color.trim() ? req.body.color.trim() : '#0f766e';

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    const slug = makeSlug(name);
    if (!slug) {
      return res.status(400).json({ message: 'Category name must contain alphanumeric characters' });
    }

    const exists = await Category.findOne({
      $or: [{ name: new RegExp('^' + escapeRegex(name) + '$', 'i') }, { slug }],
    });
    if (exists) {
      return res.status(409).json({ message: 'Category name or slug already exists' });
    }

    const category = await Category.create({ name, slug, description, color, isActive: true });
    return res.status(201).json({ message: 'Category created successfully', category });
  } catch (err) {
    return next(err);
  }
});

// Cap nhat thong tin danh muc khoa hoc (ten, slug, mo ta, mau sac, trang thai)
router.put('/categories/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid categoryId' });
    }

    const updatePayload = {};
    if (typeof req.body?.name === 'string' && req.body.name.trim()) {
      const cleanName = req.body.name.trim();
      const slug = makeSlug(cleanName);
      if (!slug) {
        return res.status(400).json({ message: 'Category name must contain alphanumeric characters' });
      }
      const dup = await Category.findOne({
        _id: { $ne: req.params.id },
        $or: [{ name: new RegExp('^' + escapeRegex(cleanName) + '$', 'i') }, { slug }],
      });
      if (dup) {
        return res.status(409).json({ message: 'Category name or slug already exists' });
      }
      updatePayload.name = cleanName;
      updatePayload.slug = slug;
    }

    if (req.body?.description !== undefined) {
      updatePayload.description = String(req.body.description).trim();
    }
    if (typeof req.body?.color === 'string' && req.body.color.trim()) {
      updatePayload.color = req.body.color.trim();
    }
    if (req.body?.isActive !== undefined) {
      updatePayload.isActive = Boolean(req.body.isActive);
    }

    const category = await Category.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.json({ message: 'Category updated successfully', category });
  } catch (err) {
    return next(err);
  }
});

// Xoa danh muc khoa hoc an toan (chan xoa khi van con khoa hoc dang su dung)
router.delete('/categories/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid categoryId' });
    }

    const usedCount = await Course.countDocuments({ category: req.params.id, isDeleted: false });
    if (usedCount > 0) {
      return res.status(409).json({
        message: 'Cannot delete this category because it is being used by existing courses. Please reassign or remove those courses first.',
      });
    }

    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    return next(err);
  }
});

// Lay danh sach hoc vien he thong kem so khoa ghi danh, hoan thanh va tong chi tieu
router.get('/students', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const filter = { role: 'student' };
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    const userIds = users.map((u) => u._id);

    const [students, orders] = await Promise.all([
      Student.find({ user: { $in: userIds } }),
      Order.find({ status: 'completed', user: { $in: userIds } }).select('user totalAmount'),
    ]);

    const studentMap = Object.fromEntries(students.map((s) => [String(s.user), s]));
    const spentMap = new Map();
    for (const ord of orders) {
      const key = String(ord.user);
      spentMap.set(key, Number(((spentMap.get(key) || 0) + Number(ord.totalAmount || 0)).toFixed(2)));
    }

    return res.json(
      users.map((u) => {
        const st = studentMap[String(u._id)];
        return {
          id: u._id,
          name: u.name,
          email: u.email,
          avatar: u.pfpImg,
          isVerified: u.isVerified,
          isActivated: u.isActivated,
          enrolledCourses: st?.myCourses?.length || 0,
          completedCourses: st?.stats?.completedCourses || 0,
          totalSpent: spentMap.get(String(u._id)) || 0,
          createdAt: u.createdAt,
        };
      })
    );
  } catch (err) {
    return next(err);
  }
});

// Khoa, mo khoa hoac xoa vinh vien tai khoan hoc vien chua xac thuc OTP
router.patch('/students/:id/status', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid studentId' });
    }
    const action = typeof req.body?.action === 'string' ? req.body.action.trim() : '';
    if (!['block', 'unblock', 'remove'].includes(action)) {
      return res.status(400).json({ message: 'Action must be block, unblock, or remove' });
    }

    const user = await User.findOne({ _id: req.params.id, role: 'student' });
    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (action === 'remove') {
      if (user.isVerified) {
        return res.status(400).json({ message: 'Only unverified accounts can be permanently removed' });
      }
      await Promise.all([
        Student.deleteOne({ user: user._id }),
        Cart.deleteOne({ user: user._id }),
        Wishlist.deleteMany({ userId: user._id }),
        LearningStreak.deleteOne({ userId: user._id }),
        Instructor.deleteOne({ user: user._id, isApproved: false }),
        User.deleteOne({ _id: user._id }),
      ]);
      return res.json({ message: 'Unverified student removed successfully' });
    }

    user.isActivated = action === 'unblock';
    await user.save();
    return res.json({
      message: user.isActivated ? 'Student unblocked successfully' : 'Student blocked successfully',
      isActivated: user.isActivated,
    });
  } catch (err) {
    return next(err);
  }
});

// Lay danh sach giang vien da duyet kem so khoa so huu va so hoc vien duy nhat thuc te
router.get('/instructors', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

    const [instructors, courses, students] = await Promise.all([
      Instructor.find({ isApproved: true })
        .populate('user', 'name email pfpImg isActivated createdAt')
        .sort({ createdAt: -1 }),
      Course.find({ isDeleted: false }).select('_id instructor.ref status'),
      Student.find({}).select('user myCourses'),
    ]);

    // Anh xa danh sach userId hoc vien theo tung courseId de dem so hoc vien duy nhat cho moi giang vien
    const learnersByCourse = new Map();
    for (const st of students) {
      const uid = String(st.user);
      for (const m of st.myCourses || []) {
        const cid = String(m.course);
        if (!learnersByCourse.has(cid)) learnersByCourse.set(cid, new Set());
        learnersByCourse.get(cid).add(uid);
      }
    }

    let rows = instructors
      .filter((ins) => Boolean(ins.user))
      .map((ins) => {
        const owned = courses.filter((c) => String(c.instructor?.ref) === String(ins.user._id));
        const uniqueStudents = new Set();
        for (const c of owned) {
          const set = learnersByCourse.get(String(c._id));
          if (set) {
            for (const uid of set) uniqueStudents.add(uid);
          }
        }
        return {
          id: ins.user._id,
          instructorDocId: ins._id,
          name: ins.user.name,
          email: ins.user.email,
          avatar: ins.user.pfpImg,
          occupation: ins.occupation || '',
          coursesCount: owned.length,
          liveCoursesCount: owned.filter((c) => c.status === 'Live').length,
          studentsCount: uniqueStudents.size,
          isActivated: ins.user.isActivated,
          createdAt: ins.user.createdAt,
        };
      });

    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.occupation.toLowerCase().includes(q)
      );
    }

    return res.json(rows);
  } catch (err) {
    return next(err);
  }
});

// Bat hoac tat quyen truy cap cua tai khoan giang vien da duyet
router.patch('/instructors/:userId/status', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }
    if (typeof req.body?.isActivated !== 'boolean') {
      return res.status(400).json({ message: 'isActivated boolean is required' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.userId, role: 'instructor' },
      { isActivated: req.body.isActivated },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'Instructor account not found' });
    }

    return res.json({
      message: user.isActivated
        ? 'Instructor access restored successfully'
        : 'Instructor account blocked successfully',
      isActivated: user.isActivated,
    });
  } catch (err) {
    return next(err);
  }
});

// Lay danh sach don dang ky tro thanh giang vien dang cho duyet kem kinh nghiem va chung chi
router.get('/instructor-requests', async (_req, res, next) => {
  try {
    const requests = await Instructor.find({ isApproved: false })
      .populate('user', 'name email pfpImg phonenumber createdAt')
      .sort({ createdAt: -1 });

    return res.json(
      requests
        .filter((r) => Boolean(r.user))
        .map((r) => ({
          id: r._id,
          userId: r.user._id,
          name: r.user.name,
          email: r.user.email,
          phonenumber: r.user.phonenumber || '',
          avatar: r.user.pfpImg,
          occupation: r.occupation,
          introduction: r.introduction,
          address: r.address || '',
          workExperience: r.workExperience || [],
          certificates: r.certificates || [],
          createdAt: r.createdAt,
        }))
    );
  } catch (err) {
    return next(err);
  }
});

// Xet duyet (accept) hoac tu choi (reject) don dang ky giang vien va don tep chung chi neu tu choi
router.patch('/instructor-requests/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid requestId' });
    }
    const action = typeof req.body?.action === 'string' ? req.body.action.trim() : '';
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be accept or reject' });
    }

    const appDoc = await Instructor.findOne({ _id: req.params.id, isApproved: false });
    if (!appDoc) {
      return res.status(404).json({ message: 'Pending instructor request not found' });
    }

    if (action === 'accept') {
      appDoc.isApproved = true;
      await appDoc.save();
      await User.findByIdAndUpdate(appDoc.user, { role: 'instructor' });
      return res.json({ message: 'Instructor request accepted successfully' });
    }

    // Xoa cac anh chung chi nguoi dung da tai len tren dia khi tu choi don (khong dung vao tep mau tinh)
    for (const cert of appDoc.certificates || []) {
      const url = typeof cert?.imageUrl === 'string' ? cert.imageUrl : '';
      if (url.startsWith('/api/media/certificates/')) {
        const filename = path.basename(url);
        const filePath = path.join(CERTIFICATES_DIR, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await Instructor.deleteOne({ _id: appDoc._id });
    return res.json({ message: 'Instructor request rejected' });
  } catch (err) {
    return next(err);
  }
});

// Lay danh sach ma giam gia khuyen mai tren he thong kem tim kiem theo ma hoac mo ta
router.get('/coupons', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const filter = q
      ? { $or: [{ code: new RegExp(escapeRegex(q), 'i') }, { description: new RegExp(escapeRegex(q), 'i') }] }
      : {};
    const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
    return res.json(coupons);
  } catch (err) {
    return next(err);
  }
});

// Tao ma giam gia moi voi kiem tra phan tram giam (1-100) va khoang thoi gian hieu luc
router.post('/coupons', async (req, res, next) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const discountPercent = Number(req.body?.discountPercent);

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }
    if (!Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 100) {
      return res.status(400).json({ message: 'discountPercent must be between 1 and 100' });
    }

    const startDate = req.body?.startDate ? new Date(req.body.startDate) : new Date();
    const expiryDate = req.body?.expiryDate
      ? new Date(req.body.expiryDate)
      : new Date(Date.now() + 90 * 86400000);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(expiryDate.getTime())) {
      return res.status(400).json({ message: 'Invalid startDate or expiryDate' });
    }
    if (expiryDate <= startDate) {
      return res.status(400).json({ message: 'expiryDate must be later than startDate' });
    }

    const exists = await Coupon.findOne({ code });
    if (exists) {
      return res.status(409).json({ message: 'Coupon code already exists' });
    }

    const coupon = await Coupon.create({
      code,
      description,
      discountPercent,
      startDate,
      expiryDate,
      isActive: true,
    });
    return res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (err) {
    return next(err);
  }
});

// Bat hoac tat nhanh trang thai hoat dong cua mot ma giam gia
router.patch('/coupons/:id/toggle', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid couponId' });
    }

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();
    return res.json({
      message: coupon.isActive ? 'Coupon activated successfully' : 'Coupon deactivated successfully',
      coupon,
    });
  } catch (err) {
    return next(err);
  }
});

// Xoa ma giam gia khoi he thong (lich su don hang da luu snapshot nen khong bi anh huong)
router.delete('/coupons/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid couponId' });
    }

    const deleted = await Coupon.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    return res.json({ message: 'Coupon deleted successfully' });
  } catch (err) {
    return next(err);
  }
});

// Doi mat khau tai khoan Quan tri vien, vo hieu hoa token cu va cap lai JWT phien moi
router.put('/change-password', async (req, res, next) => {
  try {
    const oldPassword = req.body?.oldPassword ?? req.body?.currentPassword ?? '';
    const newPassword = req.body?.newPassword ?? '';

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }
    if (String(newPassword) === String(oldPassword)) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    const admin = await Admin.findById(req.auth.id).select('+password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    const ok = await bcrypt.compare(String(oldPassword), admin.password);
    if (!ok) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    admin.password = await bcrypt.hash(String(newPassword), 10);
    admin.passwordChangedAt = new Date();
    await admin.save();

    const token = signToken({ id: admin._id.toString(), role: 'admin' });
    setAuthCookie(res, token);

    return res.json({ message: 'Admin password changed successfully!', token });
  } catch (err) {
    return next(err);
  }
});

export default router;
