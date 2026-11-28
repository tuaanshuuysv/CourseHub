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

export default router;
