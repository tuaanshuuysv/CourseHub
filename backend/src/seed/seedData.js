import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Instructor from '../models/Instructor.js';
import Category from '../models/Category.js';
import Course from '../models/Course.js';
import CourseProgress from '../models/CourseProgress.js';
import LearningStreak from '../models/LearningStreak.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import DraftVideo from '../models/DraftVideo.js';
import { connectDB } from '../config/db.js';

// Khoi tao du lieu mau cho 14 collections neu database dang trong
export async function ensureSeeded() {
  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) return;

  console.log('Dang khoi tao du lieu mau CourseHub...');
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Khoi tao tai khoan Quan tri vien (Admin)
  await Admin.create({
    name: 'Nguyen Tuan Huy',
    email: 'admin@coursehub.io',
    password: passwordHash,
    isApproved: true,
    isVerified: true,
  });

  // 2. Khoi tao tai khoan Hoc vien demo va Giang vien demo (Nguyen Tuan Huy)
  const huyStudentUser = await User.create({
    name: 'Nguyen Tuan Huy',
    email: 'user@demo.com',
    password: passwordHash,
    role: 'student',
    bio: 'Software engineering student exploring MERN stack architecture, React design systems, and cloud engineering.',
    phonenumber: '+84 909 123 456',
    pfpImg: '/media/avatar/09.jpg',
    socials: {
      facebook: 'https://facebook.com/coursehub',
      linkedin: 'https://linkedin.com/in/nguyentuanhuy',
    },
    isVerified: true,
    isActivated: true,
  });

  const huyEducatorUser = await User.create({
    name: 'Nguyen Tuan Huy',
    email: 'educator@coursehub.io',
    password: passwordHash,
    role: 'instructor',
    bio: 'Principal Frontend Architect & Verified Educator teaching React, TypeScript, and Design Systems.',
    phonenumber: '+84 909 888 999',
    pfpImg: '/media/avatar/01.jpg',
    isVerified: true,
    isActivated: true,
  });

  // Khoi tao cac tai khoan giang vien va hoc vien phu tro
  const tuUser = await User.create({
    name: 'Dr. Hoang Anh Tu',
    email: 'tu.hoang@coursehub.io',
    password: passwordHash,
    role: 'instructor',
    pfpImg: '/media/avatar/06.jpg',
    isVerified: true,
    isActivated: true,
  });

  const datUser = await User.create({
    name: 'Vo Quoc Dat',
    email: 'dat.vo@coursehub.io',
    password: passwordHash,
    role: 'instructor',
    pfpImg: '/media/avatar/07.jpg',
    isVerified: true,
    isActivated: true,
  });

  const linhUser = await User.create({
    name: 'Dang Ngoc Linh',
    email: 'linh.dang@coursehub.io',
    password: passwordHash,
    role: 'instructor',
    pfpImg: '/media/avatar/08.jpg',
    isVerified: true,
    isActivated: true,
  });

  const khoaUser = await User.create({
    name: 'Tran Minh Khoa',
    email: 'khoa.tran@coursehub.io',
    password: passwordHash,
    role: 'student',
    pfpImg: '/media/avatar/03.jpg',
    isVerified: true,
    isActivated: true,
  });

  const haUser = await User.create({
    name: 'Le Thu Ha',
    email: 'ha.le@coursehub.io',
    password: passwordHash,
    role: 'student',
    pfpImg: '/media/avatar/04.jpg',
    isVerified: true,
    isActivated: true,
  });

  const applicant1 = await User.create({
    name: 'Nguyen Hoang Phuc',
    email: 'phuc.nguyen@gmail.com',
    password: passwordHash,
    role: 'student',
    pfpImg: '/media/avatar/05.jpg',
    isVerified: true,
    isActivated: true,
  });

  const applicant2 = await User.create({
    name: 'Tran Thao Vy',
    email: 'vy.tran@designlab.vn',
    password: passwordHash,
    role: 'student',
    pfpImg: '/media/avatar/02.jpg',
    isVerified: true,
    isActivated: true,
  });

  // 3. Khoi tao danh muc khoa hoc (Category)
  const categories = await Category.insertMany([
    { name: 'Web Development', slug: 'web-development', color: '#0f766e', description: 'React, MERN Stack, GraphQL, and full-stack web engineering.' },
    { name: 'UI/UX Design', slug: 'ui-ux-design', color: '#ea580c', description: 'Figma design systems, prototyping, and product thinking.' },
    { name: 'Data Science & Analytics', slug: 'data-science-ai', color: '#4f46e5', description: 'Python, Data Analysis, Statistical Modeling, and data pipelines.' },
    { name: 'Mobile Engineering', slug: 'mobile-engineering', color: '#0284c7', description: 'Flutter, React Native, iOS & Android apps.' },
    { name: 'Cloud & DevOps', slug: 'cloud-devops', color: '#059669', description: 'Docker, Kubernetes, AWS, CI/CD automation.' },
    { name: 'Digital Marketing', slug: 'digital-marketing', color: '#db2777', description: 'SEO, growth analytics, and conversion optimization.' },
  ]);

  // 4. Khoi tao danh sach khoa hoc (Course) kem bai giang va cau hoi trac nghiem
  const courses = await Course.insertMany([
    {
      title: 'Modern React 19 & Design Systems Architecture',
      subtitle: 'Build scalable component libraries, hooks patterns, and production MERN web apps.',
      description: 'Master React 19 architecture, semantic design tokens, Bento UI systems, and seamless Express/MongoDB API integration.',
      category: categories[0]._id,
      level: 'Intermediate',
      language: 'English / Vietnamese',
      price: 129,
      discountPrice: 79,
      enableDiscount: true,
      duration: 14,
      durationUnit: 'HOUR',
      image: '/media/courses/4by3/08.jpg',
      thumbnail: '/media/courses/4by3/08.jpg',
      previewVideo: '/media/videos/720p.mp4',
      lecturesCount: 6,
      studentsEnrolled: 3420,
      status: 'Live',
      objectives: [
        'Architect reusable component primitives and design tokens',
        'Connect React frontends to JWT-authenticated Express + MongoDB APIs',
        'Build role-based Student, Educator, and Admin dashboards',
        'Implement video learning progress and interactive lecture quizzes',
      ],
      instructor: {
        ref: huyEducatorUser._id,
        name: 'Nguyen Tuan Huy',
        avatar: '/media/avatar/01.jpg',
      },
      rating: { average: 4.9, count: 2 },
      curriculum: [
        {
          section: 'Module 1: Foundation & Token Architecture',
          order: 1,
          lectures: [
            {
              title: 'Course Roadmap & Workspace Setup',
              videoUrl: '/media/videos/720p.mp4',
              isFree: true,
              duration: 500,
              questions: [
                {
                  question: 'Which stack combines MongoDB, Express, React, and Node.js?',
                  options: ['MEAN Stack', 'MERN Stack', 'LAMP Stack', 'JAMstack'],
                  correctAnswer: 'MERN Stack',
                  explanation: 'MERN stands for MongoDB, Express.js, React, and Node.js.',
                },
                {
                  question: 'What format does MongoDB use internally to store documents?',
                  options: ['CSV', 'XML', 'BSON', 'YAML'],
                  correctAnswer: 'BSON',
                  explanation: 'MongoDB stores documents in Binary JSON (BSON) format.',
                },
              ],
            },
            {
              title: 'Designing Semantic Color & Spacing Tokens',
              videoUrl: '/media/videos/720p.mp4',
              isFree: true,
              duration: 640,
              questions: [
                {
                  question: 'Why use CSS custom properties for theme tokens?',
                  options: ['Runtime theming and consistency', 'They disable Flexbox', 'Required by MongoDB', 'Only for SVG'],
                  correctAnswer: 'Runtime theming and consistency',
                  explanation: 'CSS variables provide centralized design tokens across components.',
                },
              ],
            },
          ],
        },
        {
          section: 'Module 2: MERN API & Role Workspaces',
          order: 2,
          lectures: [
            {
              title: 'JWT Authentication & OTP Verification Flow',
              videoUrl: '/media/videos/720p.mp4',
              isFree: false,
              duration: 720,
              questions: [
                {
                  question: 'Where should JWT tokens ideally be stored to mitigate XSS?',
                  options: ['URL query params', 'HttpOnly Cookie', 'CSS comments', 'HTML title'],
                  correctAnswer: 'HttpOnly Cookie',
                  explanation: 'HttpOnly cookies cannot be read via document.cookie JavaScript.',
                },
              ],
            },
            {
              title: 'Tracking CourseProgress & LearningStreak in MongoDB',
              videoUrl: '/media/videos/720p.mp4',
              isFree: false,
              duration: 690,
              questions: [],
            },
          ],
        },
        {
          section: 'Module 3: Analytics & Checkout Flows',
          order: 3,
          lectures: [
            {
              title: 'Coupon Validation & Order Checkout Pipeline',
              videoUrl: '/media/videos/720p.mp4',
              isFree: false,
              duration: 610,
              questions: [],
            },
            {
              title: 'Admin Governance & Revenue Charts',
              videoUrl: '/media/videos/720p.mp4',
              isFree: false,
              duration: 580,
              questions: [],
            },
          ],
        },
      ],
    },
    {
      title: 'Figma Product Design & Interactive Prototyping',
      subtitle: 'Master auto-layout, variables, micro-interactions, and developer handoff.',
      description: 'Learn end-to-end SaaS UI/UX design using Figma variables, responsive Bento layouts, and clean component specs.',
      category: categories[1]._id,
      level: 'Beginner',
      language: 'English',
      price: 99,
      discountPrice: 59,
      enableDiscount: true,
      duration: 11,
      durationUnit: 'HOUR',
      image: '/media/courses/4by3/02.jpg',
      thumbnail: '/media/courses/4by3/02.jpg',
      previewVideo: '/media/videos/720p.mp4',
      lecturesCount: 3,
      studentsEnrolled: 2890,
      status: 'Live',
      objectives: [
        'Build multi-brand design systems with Figma variables',
        'Design high-converting EdTech & SaaS interfaces',
      ],
      instructor: {
        ref: huyEducatorUser._id,
        name: 'Nguyen Tuan Huy',
        avatar: '/media/avatar/01.jpg',
      },
      rating: { average: 4.8, count: 1 },
      curriculum: [
        {
          section: 'Module 1: Figma Variables & Auto-Layout',
          order: 1,
          lectures: [
            { title: 'Design System Foundations', videoUrl: '/media/videos/720p.mp4', isFree: true, duration: 540, questions: [] },
            { title: 'Responsive Grids & Spacing', videoUrl: '/media/videos/720p.mp4', isFree: false, duration: 600, questions: [] },
            { title: 'Smart Animate Prototyping', videoUrl: '/media/videos/720p.mp4', isFree: false, duration: 680, questions: [] },
          ],
        },
      ],
    },
    {
      title: 'Applied Python & Data Engineering Pipelines',
      subtitle: 'From feature engineering and data processing to FastAPI service endpoints.',
      description: 'Hands-on Python data workflow covering Pandas, data modeling, and backend service deployment.',
      category: categories[2]._id,
      level: 'Intermediate',
      language: 'English',
      price: 149,
      discountPrice: 89,
      enableDiscount: true,
      duration: 18,
      durationUnit: 'HOUR',
      image: '/media/courses/4by3/04.jpg',
      thumbnail: '/media/courses/4by3/04.jpg',
      previewVideo: '/media/videos/720p.mp4',
      lecturesCount: 2,
      studentsEnrolled: 4180,
      status: 'Live',
      objectives: ['Clean and analyze complex datasets', 'Build and deploy FastAPI data services'],
      instructor: { ref: tuUser._id, name: 'Dr. Hoang Anh Tu', avatar: '/media/avatar/06.jpg' },
      rating: { average: 4.9, count: 1 },
      curriculum: [
        {
          section: 'Module 1: Data Pipelines',
          order: 1,
          lectures: [
            { title: 'Modern Python Data Stack', videoUrl: '/media/videos/720p.mp4', isFree: true, duration: 480, questions: [] },
            { title: 'Feature Engineering Mastery', videoUrl: '/media/videos/720p.mp4', isFree: false, duration: 710, questions: [] },
          ],
        },
      ],
    },
    {
      title: 'Scalable GraphQL & Node.js Microservices',
      subtitle: 'Design federated GraphQL schemas, authentication, and Redis caching.',
      description: 'Production Node.js & MongoDB backend engineering for high-concurrency applications.',
      category: categories[0]._id,
      level: 'Advanced',
      language: 'English',
      price: 159,
      discountPrice: 95,
      enableDiscount: true,
      duration: 16,
      durationUnit: 'HOUR',
      image: '/media/courses/4by3/01.jpg',
      thumbnail: '/media/courses/4by3/01.jpg',
      previewVideo: '/media/videos/720p.mp4',
      lecturesCount: 2,
      studentsEnrolled: 1640,
      status: 'Live',
      objectives: ['Design type-safe GraphQL schemas', 'Optimize MongoDB indexes and Redis caching'],
      instructor: { ref: huyEducatorUser._id, name: 'Nguyen Tuan Huy', avatar: '/media/avatar/01.jpg' },
      rating: { average: 4.7, count: 0 },
      curriculum: [
        {
          section: 'Module 1: Schema Architecture',
          order: 1,
          lectures: [
            { title: 'Schema-First Design', videoUrl: '/media/videos/720p.mp4', isFree: true, duration: 520, questions: [] },
            { title: 'DataLoader & Caching', videoUrl: '/media/videos/720p.mp4', isFree: false, duration: 640, questions: [] },
          ],
        },
      ],
    },
    {
      title: 'Docker, Kubernetes & Production DevOps',
      subtitle: 'Containerize MERN apps, automate CI/CD, and orchestrate resilient clusters.',
      description: 'Master Docker multi-stage builds, Kubernetes deployments, and observability.',
      category: categories[4]._id,
      level: 'Intermediate',
      language: 'English',
      price: 139,
      discountPrice: 84,
      enableDiscount: true,
      duration: 14,
      durationUnit: 'HOUR',
      image: '/media/courses/4by3/07.jpg',
      thumbnail: '/media/courses/4by3/07.jpg',
      previewVideo: '/media/videos/720p.mp4',
      lecturesCount: 2,
      studentsEnrolled: 2110,
      status: 'Live',
      objectives: ['Write lean Dockerfiles', 'Deploy zero-downtime Kubernetes workloads'],
      instructor: { ref: datUser._id, name: 'Vo Quoc Dat', avatar: '/media/avatar/07.jpg' },
      rating: { average: 4.8, count: 0 },
      curriculum: [
        {
          section: 'Module 1: Containers',
          order: 1,
          lectures: [
            { title: 'Container Layers & Multi-Stage Builds', videoUrl: '/media/videos/720p.mp4', isFree: true, duration: 560, questions: [] },
            { title: 'Kubernetes Pods & Services', videoUrl: '/media/videos/720p.mp4', isFree: false, duration: 620, questions: [] },
          ],
        },
      ],
    },
    {
      title: 'Full-Stack Growth & Digital Marketing Analytics',
      subtitle: 'Combine SEO, conversion optimization, and attribution modeling for SaaS.',
      description: 'Practical marketing analytics framework for digital products.',
      category: categories[5]._id,
      level: 'Beginner',
      language: 'English',
      price: 89,
      discountPrice: 49,
      enableDiscount: true,
      duration: 9,
      durationUnit: 'HOUR',
      image: '/media/courses/4by3/06.jpg',
      thumbnail: '/media/courses/4by3/06.jpg',
      previewVideo: '/media/videos/720p.mp4',
      lecturesCount: 1,
      studentsEnrolled: 1920,
      status: 'Live',
      objectives: ['Build acquisition funnels', 'Measure CAC and LTV'],
      instructor: { ref: linhUser._id, name: 'Dang Ngoc Linh', avatar: '/media/avatar/08.jpg' },
      rating: { average: 4.6, count: 0 },
      curriculum: [
        {
          section: 'Module 1: Funnel Metrics',
          order: 1,
          lectures: [{ title: 'Landing Page Conversion Anatomy', videoUrl: '/media/videos/720p.mp4', isFree: true, duration: 490, questions: [] }],
        },
      ],
    },
    {
      title: 'Flutter Cross-Platform Mobile Mastery',
      subtitle: 'Craft 60fps iOS & Android apps with clean architecture and offline sync.',
      description: 'Mobile engineering with Flutter, Riverpod, and REST/GraphQL backends.',
      category: categories[3]._id,
      level: 'Intermediate',
      language: 'English',
      price: 119,
      discountPrice: 74,
      enableDiscount: true,
      duration: 15,
      durationUnit: 'HOUR',
      image: '/media/courses/4by3/09.jpg',
      thumbnail: '/media/courses/4by3/09.jpg',
      previewVideo: '/media/videos/720p.mp4',
      lecturesCount: 1,
      studentsEnrolled: 0,
      status: 'Pending',
      objectives: ['Structure Flutter apps with Riverpod'],
      instructor: { ref: huyEducatorUser._id, name: 'Nguyen Tuan Huy', avatar: '/media/avatar/01.jpg' },
      rating: { average: 5.0, count: 0 },
      curriculum: [
        {
          section: 'Module 1: Widget Composition',
          order: 1,
          lectures: [{ title: 'Render Tree & Profiling', videoUrl: '/media/videos/720p.mp4', isFree: true, duration: 510, questions: [] }],
        },
      ],
    },
  ]);

  // 5. Khoi tao ho so Giang vien va yeu cau xet duyet giang vien (Instructor)
  await Instructor.insertMany([
    {
      user: huyEducatorUser._id,
      address: 'Ho Chi Minh City, Vietnam',
      occupation: 'Principal Frontend Architect',
      introduction: 'Teaching scalable React, MERN stack, and Figma Design Systems.',
      isApproved: true,
      education: [{ degree: 'B.Sc.', fieldOfStudy: 'Software Engineering', institution: 'HCMUTE' }],
      skills: [
        { name: 'React & TypeScript', level: 96 },
        { name: 'Node.js & MongoDB', level: 92 },
        { name: 'UI/UX Systems', level: 90 },
      ],
      myCourses: [{ course: courses[0]._id }, { course: courses[1]._id }, { course: courses[3]._id }, { course: courses[6]._id }],
      myStudents: [huyStudentUser._id, khoaUser._id, haUser._id],
    },
    {
      user: tuUser._id,
      address: 'Ho Chi Minh City, Vietnam',
      occupation: 'Data Systems Architect',
      introduction: 'Applied Python data engineering and distributed systems.',
      isApproved: true,
      myCourses: [{ course: courses[2]._id }],
      myStudents: [khoaUser._id],
    },
    {
      user: datUser._id,
      address: 'Da Nang, Vietnam',
      occupation: 'Staff Site Reliability Engineer',
      introduction: 'Kubernetes, cloud infrastructure, and CI/CD.',
      isApproved: true,
      myCourses: [{ course: courses[4]._id }],
      myStudents: [haUser._id],
    },
    {
      user: linhUser._id,
      address: 'Ha Noi, Vietnam',
      occupation: 'Head of Growth',
      introduction: 'Product-led growth and marketing analytics.',
      isApproved: true,
      myCourses: [{ course: courses[5]._id }],
      myStudents: [],
    },
    // Yeu cau dang ky tro thanh giang vien dang cho Admin duyet
    {
      user: applicant1._id,
      address: 'Ho Chi Minh City, Vietnam',
      occupation: 'Senior Rust & Systems Engineer (7 years)',
      introduction: 'Portfolio: github.com/phuc-rust — Applying to teach Systems Programming.',
      isApproved: false,
    },
    {
      user: applicant2._id,
      address: 'Ho Chi Minh City, Vietnam',
      occupation: 'Motion Designer @ Studio X (5 years)',
      introduction: 'Portfolio: dribbble.com/thaovy — Applying to teach Motion & Interactive Prototyping.',
      isApproved: false,
    },
  ]);

  // 6. Khoi tao ho so Hoc vien (Student)
  await Student.insertMany([
    {
      user: huyStudentUser._id,
      address: 'Thu Duc City, HCMC',
      myCourses: [{ course: courses[0]._id }, { course: courses[1]._id }],
      stats: { totalCourses: 2, completedCourses: 0, totalLessons: 9, completedLessons: 2 },
    },
    {
      user: khoaUser._id,
      address: 'District 1, HCMC',
      myCourses: [{ course: courses[0]._id }, { course: courses[2]._id }],
      stats: { totalCourses: 2, completedCourses: 1, totalLessons: 8, completedLessons: 5 },
    },
    {
      user: haUser._id,
      address: 'District 7, HCMC',
      myCourses: [{ course: courses[0]._id }, { course: courses[4]._id }],
      stats: { totalCourses: 2, completedCourses: 0, totalLessons: 8, completedLessons: 3 },
    },
  ]);

  // 7. Khoi tao Tien do hoc tap (CourseProgress) va Chuoi ngay hoc (LearningStreak)
  const c0Lectures = courses[0].curriculum.flatMap((m) => m.lectures);
  await CourseProgress.create({
    userId: huyStudentUser._id,
    courseId: courses[0]._id,
    completedLecturesCount: 2,
    totalLectures: c0Lectures.length,
    totalTimeSpentSec: 1140,
    lastLectureId: c0Lectures[2]._id,
    lastPositionSec: 120,
    lectures: c0Lectures.map((l, i) => ({
      lectureId: l._id,
      status: i < 2 ? 'Completed' : i === 2 ? 'In_Progress' : 'Not_Started',
      durationSec: l.duration,
      lastPositionSec: i === 2 ? 120 : 0,
      completedAt: i < 2 ? new Date() : undefined,
    })),
  });

  const c1Lectures = courses[1].curriculum.flatMap((m) => m.lectures);
  await CourseProgress.create({
    userId: huyStudentUser._id,
    courseId: courses[1]._id,
    completedLecturesCount: 1,
    totalLectures: c1Lectures.length,
    totalTimeSpentSec: 540,
    lastLectureId: c1Lectures[0]._id,
    lectures: c1Lectures.map((l, i) => ({
      lectureId: l._id,
      status: i === 0 ? 'Completed' : 'Not_Started',
      durationSec: l.duration,
      completedAt: i === 0 ? new Date() : undefined,
    })),
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  await LearningStreak.create({
    userId: huyStudentUser._id,
    currentStreak: 12,
    longestStreak: 15,
    lastActiveDate: todayStr,
    activeDates: [todayStr],
  });

  // 8. Khoi tao Danh sach yeu thich (Wishlist) va Gio hang (Cart)
  await Wishlist.insertMany([
    { userId: huyStudentUser._id, courseId: courses[2]._id },
    { userId: huyStudentUser._id, courseId: courses[3]._id },
    { userId: huyStudentUser._id, courseId: courses[4]._id },
  ]);
  await User.findByIdAndUpdate(huyStudentUser._id, {
    wishlist: [courses[2]._id, courses[3]._id, courses[4]._id],
  });

  await Cart.create({
    user: huyStudentUser._id,
    courses: [{ course: courses[2]._id }, { course: courses[5]._id }],
  });

  // 9. Khoi tao Ma giam gia (Coupon)
  await Coupon.insertMany([
    {
      code: 'COURSEHUB20',
      description: 'CourseHub Launch 20% Off',
      discountPercent: 20,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-12-31'),
      isActive: true,
    },
    {
      code: 'WELCOME25',
      description: 'New Student 25% Discount',
      discountPercent: 25,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-06-30'),
      isActive: true,
    },
    {
      code: 'EDUCATOR15',
      description: 'Educator Community Promo',
      discountPercent: 15,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-03-31'),
      isActive: true,
    },
    {
      code: 'FLASH30',
      description: 'Weekend Flash Deal',
      discountPercent: 30,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
      isActive: false,
    },
  ]);

  // 10. Khoi tao Don hang (Order) phan bo theo cac thang de hien thi bieu do doanh thu
  const monthsAgo = (m) => {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    return d;
  };
  await Order.insertMany([
    {
      user: huyStudentUser._id,
      courses: [{ course: courses[0]._id, pricePaid: 79 }, { course: courses[1]._id, pricePaid: 59 }],
      subTotal: 138,
      discountAmount: 0,
      totalAmount: 138,
      paymentMethod: 'vnpay',
      status: 'completed',
      createdAt: monthsAgo(0),
    },
    {
      user: khoaUser._id,
      courses: [{ course: courses[0]._id, pricePaid: 79 }, { course: courses[2]._id, pricePaid: 89 }],
      subTotal: 168,
      discountAmount: 20,
      totalAmount: 148,
      paymentMethod: 'momo',
      status: 'completed',
      createdAt: monthsAgo(1),
    },
    {
      user: haUser._id,
      courses: [{ course: courses[0]._id, pricePaid: 79 }, { course: courses[4]._id, pricePaid: 84 }],
      subTotal: 163,
      discountAmount: 0,
      totalAmount: 163,
      paymentMethod: 'vnpay',
      status: 'completed',
      createdAt: monthsAgo(2),
    },
    {
      user: khoaUser._id,
      courses: [{ course: courses[3]._id, pricePaid: 95 }],
      subTotal: 95,
      discountAmount: 0,
      totalAmount: 95,
      paymentMethod: 'momo',
      status: 'completed',
      createdAt: monthsAgo(3),
    },
  ]);

  // 11. Khoi tao Danh gia khoa hoc (Review)
  await Review.insertMany([
    {
      user: khoaUser._id,
      course: courses[0]._id,
      rating: 5,
      description: 'Cleanest MERN & React architecture course I have taken. The design token and API modules are production-ready.',
    },
    {
      user: haUser._id,
      course: courses[0]._id,
      rating: 5,
      description: 'Very practical explanations and zero fluff. Used the layout and MongoDB patterns directly in my capstone project.',
    },
    {
      user: khoaUser._id,
      course: courses[2]._id,
      rating: 5,
      description: 'Clear Python feature engineering examples!',
    },
  ]);

  // 12. Khoi tao ban ghi video nhap (DraftVideo) de du 14 collections trong MongoDB
  await DraftVideo.create({
    key: 'drafts/react-19-preview-720p.mp4',
    contentType: 'video/mp4',
    expireAt: new Date('2027-12-31'),
  });

  console.log('Hoan tat khoi tao du lieu mau CourseHub.');
}

// Cho phep chay truc tiep qua lenh: npm run seed
if (process.argv[1]?.endsWith('seedData.js')) {
  import('dotenv/config').then(async () => {
    await connectDB();
    await ensureSeeded();
    process.exit(0);
  });
}
