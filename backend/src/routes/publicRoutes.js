import express from 'express';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';
import Course from '../models/Course.js';
import Instructor from '../models/Instructor.js';
import Review from '../models/Review.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Thoat ky tu dac biet cua bieu thuc chinh quy de tranh loi va tan cong ReDoS
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Lay thong ke thuc te cua nen tang va ma khuyen mai dang hoat dong tu co so du lieu
router.get('/stats', async (_req, res, next) => {
  try {
    const now = new Date();
    const [liveCourses, categoriesCount, instructorsCount, learnersCount, activePromo] =
      await Promise.all([
        Course.countDocuments({ status: 'Live', isDeleted: false, isPrivate: false }),
        Category.countDocuments({ isActive: true }),
        Instructor.countDocuments({ isApproved: true }),
        User.countDocuments({ role: 'student', isVerified: true, isActivated: true }),
        Coupon.findOne({
          isActive: true,
          startDate: { $lte: now },
          expiryDate: { $gte: now },
        })
          .sort({ discountPercent: -1, code: 1 })
          .select('code description discountPercent expiryDate'),
      ]);

    return res.json({
      liveCourses,
      categoriesCount,
      instructorsCount,
      learnersCount,
      activePromo: activePromo
        ? {
            code: activePromo.code,
            description: activePromo.description,
            discountPercent: activePromo.discountPercent,
            expiryDate: activePromo.expiryDate,
          }
        : null,
    });
  } catch (err) {
    return next(err);
  }
});

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

// UC-1.3 Lay danh sach khoa hoc cong khai co tim kiem, bo loc, sap xep va phan trang
router.get('/courses', async (req, res, next) => {
  try {
    const {
      q = '',
      category = '',
      level = '',
      language = '',
      sort = 'newest',
      page = 1,
      limit = 9,
      maxPrice,
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(50, Number(limit) || 9));
    const filter = { status: 'Live', isDeleted: false, isPrivate: false };

    if (typeof q === 'string' && q.trim()) {
      const regex = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ title: regex }, { subtitle: regex }, { 'instructor.name': regex }];
    }

    if (typeof category === 'string' && category.trim() && category !== 'All') {
      const normalizedCat = category.trim();
      const catDoc = await Category.findOne({
        isActive: true,
        $or: [{ slug: normalizedCat.toLowerCase() }, { name: normalizedCat }],
      });
      if (!catDoc) {
        return res.json({
          courses: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 1 },
        });
      }
      filter.category = catDoc._id;
    }

    if (typeof level === 'string' && level.trim() && level !== 'All') {
      filter.level = level.trim();
    }

    if (typeof language === 'string' && language.trim() && language !== 'All') {
      filter.language = new RegExp(escapeRegex(language.trim()), 'i');
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      const numericMaxPrice = Number(maxPrice);
      if (Number.isFinite(numericMaxPrice) && numericMaxPrice >= 0) {
        filter.$expr = {
          $lte: [{ $cond: ['$enableDiscount', '$discountPrice', '$price'] }, numericMaxPrice],
        };
      }
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'popular') sortObj = { studentsEnrolled: -1 };
    else if (sort === 'rating') sortObj = { 'rating.average': -1, 'rating.count': -1 };
    else if (sort === 'price-asc') sortObj = { discountPrice: 1, price: 1 };
    else if (sort === 'price-desc') sortObj = { discountPrice: -1, price: -1 };

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .select('-curriculum')
        .populate('category', 'name slug color')
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Course.countDocuments(filter),
    ]);

    return res.json({
      courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// UC-1.4 Xem chi tiet khoa hoc, giao trinh (che video tra phi voi khach) va danh sach danh gia
router.get('/courses/:id', optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid course id' });
    }

    const course = await Course.findOne({ _id: req.params.id, isDeleted: false }).populate(
      'category',
      'name slug color'
    );
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const isOwner = Boolean(req.auth && String(course.instructor.ref) === String(req.auth.id));
    const isAdmin = req.auth?.role === 'admin';
    let isEnrolled = false;

    if (req.auth && !isAdmin) {
      const student = await Student.findOne({ user: req.auth.id });
      isEnrolled = Boolean(student?.myCourses?.some((m) => String(m.course) === String(course._id)));
    }

    const hasFullAccess = isEnrolled || isOwner || isAdmin;

    // An khoa hoc chua duyet hoac rieng tu doi voi nguoi chua ghi danh va khong phai chu so huu
    if (!hasFullAccess && (course.status !== 'Live' || course.isPrivate)) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const [reviews, instructorUser, instructorDoc, instructorLiveCourses] = await Promise.all([
      Review.find({ course: course._id, isDeleted: false })
        .populate('user', 'name pfpImg')
        .sort({ createdAt: -1 }),
      User.findById(course.instructor.ref).select('name pfpImg bio website socials'),
      Instructor.findOne({ user: course.instructor.ref }),
      Course.find({
        'instructor.ref': course.instructor.ref,
        status: 'Live',
        isDeleted: false,
        isPrivate: false,
      }).select('_id rating'),
    ]);

    const instructorLiveIds = instructorLiveCourses.map((c) => c._id);
    const uniqueInstructorStudents =
      instructorLiveIds.length > 0
        ? await Student.countDocuments({ 'myCourses.course': { $in: instructorLiveIds } })
        : 0;
    const ratedInstructorCourses = instructorLiveCourses.filter((c) => (c.rating?.count || 0) > 0);
    const instructorAvgRating =
      ratedInstructorCourses.length > 0
        ? Number(
            (
              ratedInstructorCourses.reduce((sum, c) => sum + Number(c.rating?.average || 0), 0) /
              ratedInstructorCourses.length
            ).toFixed(1)
          )
        : 0;
    const totalInstructorReviews = instructorLiveCourses.reduce(
      (sum, c) => sum + Number(c.rating?.count || 0),
      0
    );

    // Chuan hoa ho so cong khai cua giang vien (an thong tin lien he rieng tu va cap tren cu)
    const instructorProfile = {
      id: instructorUser?._id || course.instructor?.ref || null,
      name: instructorUser?.name || course.instructor?.name || 'Educator',
      avatar: instructorUser?.pfpImg || course.instructor?.avatar || '/media/avatar/01.jpg',
      bio: instructorUser?.bio || '',
      website: instructorUser?.website || '',
      socials: instructorUser?.socials || {},
      occupation: instructorDoc?.occupation || '',
      introduction: instructorDoc?.introduction || '',
      address: instructorDoc?.address || '',
      isApproved: Boolean(instructorDoc?.isApproved),
      education: (instructorDoc?.education || []).map((ed) => ({
        degree: ed.degree || '',
        fieldOfStudy: ed.fieldOfStudy || '',
        institution: ed.institution || '',
      })),
      skills: (instructorDoc?.skills || []).map((sk) => ({
        name: sk.name || '',
        level: Number(sk.level || 0),
      })),
      workExperience: (instructorDoc?.workExperience || []).map((exp) => ({
        organization: exp.organization || '',
        position: exp.position || '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || 'Present',
      })),
      certificates: (instructorDoc?.certificates || []).map((cert) => ({
        name: cert.name || '',
        imageUrl: cert.imageUrl || '',
      })),
      stats: {
        liveCoursesCount: instructorLiveCourses.length,
        studentsCount: uniqueInstructorStudents,
        averageRating: instructorAvgRating,
        reviewsCount: totalInstructorReviews,
      },
    };

    const obj = course.toObject();
    if (!isOwner && !isAdmin) {
      obj.curriculum = (obj.curriculum || []).map((sec) => ({
        ...sec,
        lectures: (sec.lectures || []).map((lec) => {
          const canWatch = hasFullAccess || Boolean(lec.isFree);
          return {
            ...lec,
            videoUrl: canWatch ? lec.videoUrl : '',
            // An dap an dung tren API cong khai; an danh sach cau hoi voi bai giang tra phi chua mua
            questions: canWatch
              ? (lec.questions || []).map(({ _id, question, options }) => ({ _id, question, options }))
              : [],
          };
        }),
      }));
    }

    return res.json({
      course: obj,
      reviews,
      instructorProfile,
      isEnrolled: hasFullAccess,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
