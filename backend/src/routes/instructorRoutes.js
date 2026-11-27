import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Course from '../models/Course.js';
import DraftVideo from '../models/DraftVideo.js';
import Instructor from '../models/Instructor.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { authenticate, requireInstructor } from '../middleware/auth.js';
import { VIDEOS_DIR, uploadThumbnail, uploadVideo } from '../middleware/upload.js';

const router = express.Router();
const DRAFT_VIDEO_TTL_MS = 24 * 60 * 60 * 1000;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const VALID_COURSE_STATUSES = ['Draft', 'Pending', 'Live', 'Rejected', 'Blocked'];
const INSTRUCTOR_CREATE_STATUSES = ['Draft', 'Pending'];
const VALID_LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const VALID_DURATION_UNITS = ['HOUR', 'MINUTE', 'SECOND', 'DAY'];

// Thoat cac ky tu dac biet cua Regex de chong tan cong ReDoS khi tim kiem
function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Tra cuu danh muc hop le theo categoryId, slug hoac ten danh muc
async function resolveCategory({ categoryId, categoryName }) {
  if (categoryId) {
    if (!mongoose.isValidObjectId(categoryId)) return null;
    return Category.findById(categoryId);
  }
  if (typeof categoryName === 'string' && categoryName.trim()) {
    const clean = categoryName.trim();
    return Category.findOne({
      $or: [{ slug: clean.toLowerCase() }, { name: new RegExp(`^${escapeRegex(clean)}$`, 'i') }],
    });
  }
  return null;
}

// Chuan hoa va kiem tra hop le cau truc giao trinh, bai giang va cau hoi trac nghiem
function normalizeCurriculumAndValidate(rawCurriculum) {
  if (!Array.isArray(rawCurriculum) || rawCurriculum.length === 0) {
    return { error: 'Curriculum must contain at least one section' };
  }

  const curriculum = [];
  let lecturesCount = 0;

  for (let sIdx = 0; sIdx < rawCurriculum.length; sIdx += 1) {
    const sec = rawCurriculum[sIdx];
    const sectionTitle = typeof sec?.section === 'string' ? sec.section.trim() : '';
    if (!sectionTitle) {
      return { error: 'Each curriculum section must have a title' };
    }

    const rawLectures = Array.isArray(sec?.lectures) ? sec.lectures : [];
    if (rawLectures.length === 0) {
      return { error: 'Each section must contain at least one lecture' };
    }

    const lectures = [];
    for (const lec of rawLectures) {
      const lecTitle = typeof lec?.title === 'string' ? lec.title.trim() : '';
      if (!lecTitle) {
        return { error: 'Each lecture must have a title' };
      }

      const duration = Number(lec?.duration ?? 600);
      if (!Number.isFinite(duration) || duration < 0) {
        return { error: 'Lecture duration must be a non-negative number' };
      }

      const rawQuestions = Array.isArray(lec?.questions) ? lec.questions : [];
      const questions = [];
      for (const q of rawQuestions) {
        const questionText = typeof q?.question === 'string' ? q.question.trim() : '';
        const options = Array.isArray(q?.options)
          ? q.options.map((opt) => String(opt ?? '').trim()).filter(Boolean)
          : [];
        const correctAnswer = typeof q?.correctAnswer === 'string' ? q.correctAnswer.trim() : '';
        const explanation = typeof q?.explanation === 'string' ? q.explanation.trim() : '';

        if (!questionText || options.length < 2 || !options.includes(correctAnswer)) {
          return {
            error:
              'Each quiz question must include text, at least 2 options, and a correctAnswer matching one option',
          };
        }

        const qObj = {
          question: questionText,
          options,
          correctAnswer,
          explanation,
        };
        if (mongoose.isValidObjectId(q?._id)) {
          qObj._id = q._id;
        }
        questions.push(qObj);
      }

      const lecObj = {
        title: lecTitle,
        videoUrl:
          typeof lec?.videoUrl === 'string' && lec.videoUrl.trim()
            ? lec.videoUrl.trim()
            : '/media/videos/720p.mp4',
        isFree: Boolean(lec?.isFree),
        duration,
        questions,
      };
      if (mongoose.isValidObjectId(lec?._id)) {
        lecObj._id = lec._id;
      }
      lectures.push(lecObj);
      lecturesCount += 1;
    }

    const secObj = {
      section: sectionTitle,
      order: Number.isFinite(Number(sec?.order)) && Number(sec.order) >= 1 ? Number(sec.order) : sIdx + 1,
      lectures,
    };
    if (mongoose.isValidObjectId(sec?._id)) {
      secObj._id = sec._id;
    }
    curriculum.push(secObj);
  }

  return { curriculum, lecturesCount };
}

// Trich xuat danh sach key video da upload qua /api/media/videos/ tu khoa hoc
function extractUploadedVideoKeys(previewVideo, curriculum = []) {
  const keys = new Set();
  const collect = (url) => {
    if (typeof url === 'string' && url.startsWith('/api/media/videos/')) {
      const key = path.basename(url);
      if (key) keys.add(key);
    }
  };
  collect(previewVideo);
  for (const sec of curriculum || []) {
    for (const lec of sec.lectures || []) {
      collect(lec.videoUrl);
    }
  }
  return [...keys];
}

// Chuyen cac video nhap da gan vao khoa hoc sang trang thai chinh thuc (go khoi DraftVideo)
async function promoteDraftVideos(previewVideo, curriculum = []) {
  const keys = extractUploadedVideoKeys(previewVideo, curriculum);
  if (keys.length > 0) {
    await DraftVideo.deleteMany({ key: { $in: keys } });
  }
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

// UC-4.7 Tao khoa hoc moi kem giao trinh, cau hoi trac nghiem va chuyen DraftVideo sang chinh thuc
router.post('/courses', async (req, res, next) => {
  try {
    const {
      title,
      subtitle = '',
      description,
      categoryId,
      categoryName,
      subCategory = '',
      tags = [],
      level = 'Intermediate',
      language = 'English / Vietnamese',
      price = 0,
      discountPrice = 0,
      enableDiscount = false,
      duration = 12,
      durationUnit = 'HOUR',
      thumbnail,
      image,
      previewVideo,
      status = 'Pending',
      isPrivate = false,
      objectives = [],
      curriculum,
    } = req.body || {};

    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    if (!cleanTitle) {
      return res.status(400).json({ message: 'Course title is required' });
    }

    const cat = await resolveCategory({ categoryId, categoryName });
    if (!cat) {
      return res.status(400).json({ message: 'Valid category is required' });
    }

    if (!VALID_LEVELS.includes(level)) {
      return res.status(400).json({ message: 'Invalid course level' });
    }
    if (!VALID_DURATION_UNITS.includes(durationUnit)) {
      return res.status(400).json({ message: 'Invalid durationUnit' });
    }

    const parsedPrice = Number(price);
    const parsedDiscount = Number(discountPrice);
    const parsedDuration = Number(duration);
    if (
      !Number.isFinite(parsedPrice) ||
      parsedPrice < 0 ||
      !Number.isFinite(parsedDiscount) ||
      parsedDiscount < 0 ||
      !Number.isFinite(parsedDuration) ||
      parsedDuration < 0
    ) {
      return res.status(400).json({ message: 'Price, discountPrice, and duration must be non-negative numbers' });
    }
    if (Boolean(enableDiscount) && parsedDiscount > parsedPrice) {
      return res.status(400).json({ message: 'discountPrice cannot exceed price' });
    }

    const rawCurr =
      Array.isArray(curriculum) && curriculum.length > 0
        ? curriculum
        : [
            {
              section: 'Module 1: Introduction',
              order: 1,
              lectures: [{ title: 'Welcome & Course Overview', duration: 600, isFree: true, questions: [] }],
            },
          ];

    const normalized = normalizeCurriculumAndValidate(rawCurr);
    if (normalized.error) {
      return res.status(400).json({ message: normalized.error });
    }

    const user = await User.findById(req.auth.id);
    if (!user) {
      return res.status(404).json({ message: 'Instructor account not found' });
    }

    // Giang vien chi duoc dat Draft hoac Pending khi tao khoa hoc (Admin duyet moi len Live)
    const safeStatus = INSTRUCTOR_CREATE_STATUSES.includes(status) ? status : 'Pending';
    const coverUrl =
      (typeof thumbnail === 'string' && thumbnail.trim()) ||
      (typeof image === 'string' && image.trim()) ||
      '/media/courses/01.jpg';
    const safePreview =
      typeof previewVideo === 'string' && previewVideo.trim()
        ? previewVideo.trim()
        : normalized.curriculum[0]?.lectures[0]?.videoUrl || '/media/videos/720p.mp4';

    const cleanObjectives = Array.isArray(objectives)
      ? objectives.map((o) => String(o ?? '').trim()).filter(Boolean)
      : [];
    const cleanTags = Array.isArray(tags) ? tags.map((t) => String(t ?? '').trim()).filter(Boolean) : [];

    const course = await Course.create({
      title: cleanTitle,
      subtitle: typeof subtitle === 'string' ? subtitle.trim() : '',
      description:
        typeof description === 'string' && description.trim()
          ? description.trim()
          : typeof subtitle === 'string'
            ? subtitle.trim()
            : '',
      category: cat._id,
      subCategory: typeof subCategory === 'string' ? subCategory.trim() : '',
      tags: cleanTags,
      level,
      language: typeof language === 'string' && language.trim() ? language.trim() : 'English / Vietnamese',
      price: parsedPrice,
      discountPrice: Boolean(enableDiscount) ? parsedDiscount : parsedPrice,
      enableDiscount: Boolean(enableDiscount),
      duration: parsedDuration,
      durationUnit,
      image: coverUrl,
      thumbnail: coverUrl,
      previewVideo: safePreview,
      lecturesCount: normalized.lecturesCount,
      status: safeStatus,
      isPrivate: Boolean(isPrivate),
      objectives: cleanObjectives,
      curriculum: normalized.curriculum,
      instructor: {
        ref: user._id,
        name: user.name,
        avatar: user.pfpImg || '/media/avatar/01.jpg',
      },
    });

    await Promise.all([
      Instructor.findOneAndUpdate({ user: user._id }, { $addToSet: { myCourses: course._id } }),
      promoteDraftVideos(course.previewVideo, course.curriculum),
    ]);

    const populated = await course.populate('category', 'name slug color');
    return res.status(201).json({
      message: 'Course created successfully',
      course: populated,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
