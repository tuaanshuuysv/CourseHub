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

export default router;
