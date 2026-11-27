import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import DraftVideo from '../models/DraftVideo.js';
import Instructor from '../models/Instructor.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import { authenticate, requireInstructor } from '../middleware/auth.js';
import { VIDEOS_DIR, uploadThumbnail, uploadVideo } from '../middleware/upload.js';

const router = express.Router();
const DRAFT_VIDEO_TTL_MS = 24 * 60 * 60 * 1000;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VALID_COURSE_STATUSES = ['Draft', 'Pending', 'Live', 'Rejected', 'Blocked'];

// Thoat cac ky tu dac biet cua Regex de chong tan cong ReDoS khi tim kiem
function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Tat ca tuyen API giang vien deu yeu cau dang nhap dung vai tro instructor
router.use(authenticate, requireInstructor);

// Tai len anh bia khoa hoc cho giang vien (gioi han 5 MB)
router.post('/thumbnails/upload', uploadThumbnail.single('thumbnail'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Thumbnail image file is required' });
  }

  return res.status(201).json({
    message: 'Thumbnail uploaded successfully',
    imageUrl: `/api/media/thumbnails/${req.file.filename}`,
  });
});

// Tai len video bai giang va ghi nhan trang thai nhap DraftVideo (het han sau 24 gio neu chua gan khoa hoc)
router.post('/videos/upload', uploadVideo.single('video'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Video file is required' });
    }

    const expireAt = new Date(Date.now() + DRAFT_VIDEO_TTL_MS);
    const draft = await DraftVideo.create({
      key: req.file.filename,
      contentType: req.file.mimetype || 'video/mp4',
      expireAt,
    });

    return res.status(201).json({
      message: 'Video uploaded successfully',
      key: draft.key,
      videoUrl: `/api/media/videos/${draft.key}`,
      expireAt: draft.expireAt,
    });
  } catch (err) {
    if (req.file?.filename) {
      const filePath = path.join(VIDEOS_DIR, req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    return next(err);
  }
});

// UC-4.5 & UC-4.11 Lay thong ke tong quan va doanh thu 12 thang cua giang vien (thuc nhan 80%)
router.get('/dashboard', async (req, res, next) => {
  try {
    const [ownedCourses, instructorDoc] = await Promise.all([
      Course.find({ 'instructor.ref': req.auth.id, isDeleted: false })
        .select('-curriculum')
        .populate('category', 'name slug color')
        .sort({ createdAt: -1 }),
      Instructor.findOne({ user: req.auth.id }),
    ]);

    const courseIds = ownedCourses.map((c) => c._id);
    const ownedIdSet = new Set(courseIds.map((id) => String(id)));

    const orders =
      courseIds.length > 0
        ? await Order.find({ status: 'completed', 'courses.course': { $in: courseIds } }).select(
            'courses createdAt'
          )
        : [];

    const monthly = Array(12).fill(0);
    let totalRevenue = 0;

    for (const ord of orders) {
      const monthIdx = new Date(ord.createdAt).getMonth();
      for (const item of ord.courses || []) {
        if (ownedIdSet.has(String(item.course))) {
          const net = Number((Number(item.pricePaid || 0) * 0.8).toFixed(2));
          monthly[monthIdx] = Number((monthly[monthIdx] + net).toFixed(2));
          totalRevenue = Number((totalRevenue + net).toFixed(2));
        }
      }
    }

    // Chi tinh diem trung binh tren cac khoa hoc da co danh gia that (tranh ep mac dinh 5.0)
    const ratedCourses = ownedCourses.filter((c) => (c.rating?.count || 0) > 0);
    const averageRating =
      ratedCourses.length > 0
        ? Number(
            (
              ratedCourses.reduce((sum, c) => sum + Number(c.rating?.average || 0), 0) /
              ratedCourses.length
            ).toFixed(1)
          )
        : 0;

    return res.json({
      courses: ownedCourses,
      stats: {
        totalCourses: ownedCourses.length,
        liveCourses: ownedCourses.filter((c) => c.status === 'Live').length,
        pendingCourses: ownedCourses.filter((c) => c.status === 'Pending').length,
        totalStudents: ownedCourses.reduce((sum, c) => sum + (c.studentsEnrolled || 0), 0),
        totalRevenue,
        averageRating,
      },
      monthlyRevenue: MONTH_LABELS.map((month, idx) => ({ month, amount: monthly[idx] })),
      instructor: instructorDoc || null,
    });
  } catch (err) {
    return next(err);
  }
});

// UC-4.6 & UC-4.10 Lay danh sach khoa hoc so huu cua giang vien kem tim kiem va loc trang thai
router.get('/courses', async (req, res, next) => {
  try {
    const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    const status = typeof req.query?.status === 'string' ? req.query.status.trim() : 'All';

    const filter = { 'instructor.ref': req.auth.id, isDeleted: false };
    if (status && status !== 'All' && VALID_COURSE_STATUSES.includes(status)) {
      filter.status = status;
    }
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: rx }, { subtitle: rx }];
    }

    const courses = await Course.find(filter)
      .select('-curriculum')
      .populate('category', 'name slug color')
      .sort({ createdAt: -1 });

    return res.json(courses);
  } catch (err) {
    return next(err);
  }
});

// UC-4.9 Lay chi tiet mot khoa hoc so huu kem day du giao trinh, dap an quiz va danh gia
router.get('/courses/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid courseId' });
    }

    const course = await Course.findOne({
      _id: req.params.id,
      'instructor.ref': req.auth.id,
      isDeleted: false,
    }).populate('category', 'name slug color');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const reviews = await Review.find({ course: course._id, isDeleted: false })
      .populate('user', 'name pfpImg')
      .sort({ createdAt: -1 });

    return res.json({
      ...course.toObject(),
      reviews,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
