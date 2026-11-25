import express from 'express';
import Category from '../models/Category.js';
import Course from '../models/Course.js';

const router = express.Router();

// Lay danh sach danh muc khoa hoc dang hoat dong kem so luong khoa hoc cong khai
router.get('/categories', async (_req, res, next) => {
  try {
    const [categories, counts] = await Promise.all([
      Category.find({ isActive: true }).sort({ name: 1 }),
      Course.aggregate([
        { $match: { status: 'Live', isDeleted: false, isPrivate: false } },
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

export default router;
