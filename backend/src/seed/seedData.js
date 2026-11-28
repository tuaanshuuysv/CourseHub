import mongoose from 'mongoose';
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
import { connectDB } from '../config/db.js';

// Ham tro giup tao danh sach tien do bai giang khop voi so bai hoan thanh
function buildLectureProgress(lectures, completedCount, inProgressIndex = -1, inProgressPosSec = 0) {
  let totalTimeSpentSec = 0;
  const items = lectures.map((lecture, index) => {
    if (index < completedCount) {
      totalTimeSpentSec += lecture.duration;
      return {
        lectureId: lecture._id,
        status: 'Completed',
        durationSec: lecture.duration,
        lastPositionSec: lecture.duration,
        totalTimeSpentSec: lecture.duration,
        viewCount: 1,
        completedAt: new Date(),
        lastActivityAt: new Date(),
      };
    }
    if (index === inProgressIndex) {
      totalTimeSpentSec += inProgressPosSec;
      return {
        lectureId: lecture._id,
        status: 'In_Progress',
        durationSec: lecture.duration,
        lastPositionSec: inProgressPosSec,
        totalTimeSpentSec: inProgressPosSec,
        viewCount: 1,
        lastActivityAt: new Date(),
      };
    }
    return {
      lectureId: lecture._id,
      status: 'Not_Started',
      durationSec: lecture.duration,
      lastPositionSec: 0,
      totalTimeSpentSec: 0,
      viewCount: 0,
    };
  });

  const lastLectureIndex =
    inProgressIndex >= 0
      ? inProgressIndex
      : completedCount > 0
        ? Math.min(completedCount - 1, lectures.length - 1)
        : 0;

  return {
    completedLecturesCount: completedCount,
    totalLectures: lectures.length,
    totalTimeSpentSec,
    lastLectureId: lectures[lastLectureIndex]?._id,
    lastPositionSec: inProgressIndex >= 0 ? inProgressPosSec : 0,
    lectures: items,
  };
}

// Khoi tao du lieu mau dong bo cho 14 collections neu database dang trong
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

  // 2. Khoi tao tai khoan Hoc vien va Giang vien khoi tao mac dinh
  const huyStudentUser = await User.create({
    name: 'Nguyen Tuan Huy',
    email: 'student@coursehub.io',
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

  // 3. Khoi tao danh muc khoa hoc (Category) voi slug dong bo
  const categories = await Category.insertMany([
    { name: 'Web Development', slug: 'web-development', color: '#0f766e', description: 'React, MERN Stack, GraphQL, and full-stack web engineering.' },
    { name: 'UI/UX Design', slug: 'ui-ux-design', color: '#ea580c', description: 'Figma design systems, prototyping, and product thinking.' },
    { name: 'Data Science & Analytics', slug: 'data-science-analytics', color: '#4f46e5', description: 'Python, Data Analysis, Statistical Modeling, and data pipelines.' },
    { name: 'Mobile Engineering', slug: 'mobile-engineering', color: '#0284c7', description: 'Flutter, React Native, iOS & Android apps.' },
    { name: 'Cloud & DevOps', slug: 'cloud-devops', color: '#059669', description: 'Docker, Kubernetes, AWS, CI/CD automation.' },
    { name: 'Digital Marketing', slug: 'digital-marketing', color: '#db2777', description: 'SEO, growth analytics, and conversion optimization.' },
  ]);

  // 4. Khoi tao danh sach khoa hoc (Course) voi diem rating khop tuyet doi voi collection Review
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
      studentsEnrolled: 3,
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
      // Khop voi 2 danh gia 5 sao cua khoaUser va haUser
      rating: { average: 5.0, count: 2 },
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
      studentsEnrolled: 1,
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
      // Khop voi 1 danh gia 5 sao cua huyStudentUser
      rating: { average: 5.0, count: 1 },
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
      studentsEnrolled: 1,
      status: 'Live',
      objectives: ['Clean and analyze complex datasets', 'Build and deploy FastAPI data services'],
      instructor: { ref: tuUser._id, name: 'Dr. Hoang Anh Tu', avatar: '/media/avatar/06.jpg' },
      // Khop voi 1 danh gia 5 sao cua khoaUser
      rating: { average: 5.0, count: 1 },
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
      studentsEnrolled: 1,
      status: 'Live',
      objectives: ['Design type-safe GraphQL schemas', 'Optimize MongoDB indexes and Redis caching'],
      instructor: { ref: huyEducatorUser._id, name: 'Nguyen Tuan Huy', avatar: '/media/avatar/01.jpg' },
      // Chua co danh gia nen mac dinh average = 0, count = 0
      rating: { average: 0, count: 0 },
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
      studentsEnrolled: 1,
      status: 'Live',
      objectives: ['Write lean Dockerfiles', 'Deploy zero-downtime Kubernetes workloads'],
      instructor: { ref: datUser._id, name: 'Vo Quoc Dat', avatar: '/media/avatar/07.jpg' },
      rating: { average: 0, count: 0 },
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
      studentsEnrolled: 0,
      status: 'Live',
      objectives: ['Build acquisition funnels', 'Measure CAC and LTV'],
      instructor: { ref: linhUser._id, name: 'Dang Ngoc Linh', avatar: '/media/avatar/08.jpg' },
      rating: { average: 0, count: 0 },
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
      rating: { average: 0, count: 0 },
      curriculum: [
        {
          section: 'Module 1: Widget Composition',
          order: 1,
          lectures: [{ title: 'Render Tree & Profiling', videoUrl: '/media/videos/720p.mp4', isFree: true, duration: 510, questions: [] }],
        },
      ],
    },
  ]);

  // 5. Khoi tao ho so Giang vien va yeu cau xet duyet giang vien kem kinh nghiem va chung chi
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
      workExperience: [
        {
          organization: 'VNG Corporation',
          position: 'Principal Frontend Architect',
          startDate: '2022-03',
          endDate: 'Present',
          supervisor: {
            name: 'Le Quang Minh',
            contact: 'minh.le@vng.example.vn | +84 903 111 222',
          },
        },
        {
          organization: 'FPT Software',
          position: 'Senior React & MERN Engineer',
          startDate: '2019-06',
          endDate: '2022-02',
          supervisor: {
            name: 'Pham Thi Mai',
            contact: 'mai.pham@fsoft.example.vn',
          },
        },
      ],
      certificates: [
        {
          name: 'Meta Front-End Architect Certificate',
          imageUrl: '/media/certificates/meta-frontend-architect.svg',
        },
      ],
      myCourses: [courses[0]._id, courses[1]._id, courses[3]._id, courses[6]._id],
      myStudents: [huyStudentUser._id, khoaUser._id, haUser._id],
    },
    {
      user: tuUser._id,
      address: 'Ho Chi Minh City, Vietnam',
      occupation: 'Data Systems Architect',
      introduction: 'Applied Python data engineering and distributed systems.',
      isApproved: true,
      workExperience: [
        {
          organization: 'HCMUTE Data & Systems Lab',
          position: 'Lead Data Systems Architect',
          startDate: '2020-01',
          endDate: 'Present',
          supervisor: {
            name: 'Assoc. Prof. Tran Van Nam',
            contact: 'nam.tran@hcmute.example.edu.vn',
          },
        },
      ],
      certificates: [
        {
          name: 'AWS Solutions Architect Professional',
          imageUrl: '/media/certificates/aws-solutions-architect.svg',
        },
      ],
      myCourses: [courses[2]._id],
      myStudents: [khoaUser._id],
    },
    {
      user: datUser._id,
      address: 'Da Nang, Vietnam',
      occupation: 'Staff Site Reliability Engineer',
      introduction: 'Kubernetes, cloud infrastructure, and CI/CD.',
      isApproved: true,
      workExperience: [
        {
          organization: 'CloudScale Vietnam',
          position: 'Staff Site Reliability Engineer',
          startDate: '2021-04',
          endDate: 'Present',
          supervisor: {
            name: 'Nguyen Duc Anh',
            contact: 'anh.nguyen@cloudscale.example.vn',
          },
        },
      ],
      certificates: [
        {
          name: 'AWS Solutions Architect Professional',
          imageUrl: '/media/certificates/aws-solutions-architect.svg',
        },
      ],
      myCourses: [courses[4]._id],
      myStudents: [haUser._id],
    },
    {
      user: linhUser._id,
      address: 'Ha Noi, Vietnam',
      occupation: 'Head of Growth',
      introduction: 'Product-led growth and marketing analytics.',
      isApproved: true,
      workExperience: [
        {
          organization: 'SaaS Growth Lab',
          position: 'Head of Growth Analytics',
          startDate: '2021-01',
          endDate: 'Present',
          supervisor: {
            name: 'Do Hoang Yen',
            contact: 'yen.do@growthlab.example.vn',
          },
        },
      ],
      certificates: [
        {
          name: 'Google UX & Product Analytics Certificate',
          imageUrl: '/media/certificates/google-ux-motion.svg',
        },
      ],
      myCourses: [courses[5]._id],
      myStudents: [],
    },
    // Yeu cau dang ky tro thanh giang vien dang cho Admin duyet voi day du kinh nghiem va chung chi
    {
      user: applicant1._id,
      address: 'Ho Chi Minh City, Vietnam',
      occupation: 'Senior Rust & Systems Engineer (7 years)',
      introduction: 'Portfolio: github.com/phuc-rust - Applying to teach Systems Programming.',
      isApproved: false,
      workExperience: [
        {
          organization: 'Zalo Infrastructure Engineering',
          position: 'Senior Rust & Systems Engineer',
          startDate: '2021-05',
          endDate: 'Present',
          supervisor: {
            name: 'Bui Thanh Son',
            contact: 'son.bui@zalo-infra.example.vn | +84 912 345 678',
          },
        },
        {
          organization: 'KMS Technology',
          position: 'Systems Software Engineer',
          startDate: '2018-08',
          endDate: '2021-04',
          supervisor: {
            name: 'Tran Huu Loc',
            contact: 'loc.tran@kms.example.vn',
          },
        },
      ],
      certificates: [
        {
          name: 'Linux Foundation Certified Systems & Rust Engineer',
          imageUrl: '/media/certificates/rust-systems-engineer.svg',
        },
      ],
    },
    {
      user: applicant2._id,
      address: 'Ho Chi Minh City, Vietnam',
      occupation: 'Motion Designer @ Studio X (5 years)',
      introduction: 'Portfolio: dribbble.com/thaovy - Applying to teach Motion & Interactive Prototyping.',
      isApproved: false,
      workExperience: [
        {
          organization: 'Studio X Product Design',
          position: 'Senior Motion & Interactive Designer',
          startDate: '2021-02',
          endDate: 'Present',
          supervisor: {
            name: 'Vo Ngoc Khanh',
            contact: 'khanh.vo@studiox.example.vn | +84 908 765 432',
          },
        },
      ],
      certificates: [
        {
          name: 'Google UX & Interactive Prototyping Certificate',
          imageUrl: '/media/certificates/google-ux-motion.svg',
        },
      ],
    },
  ]);

  // 6. Khoi tao ho so Hoc vien (Student) dong bo 100% voi Order va CourseProgress
  await Student.insertMany([
    {
      user: huyStudentUser._id,
      address: 'Thu Duc City, HCMC',
      myCourses: [{ course: courses[0]._id }, { course: courses[1]._id }],
      // Tong bai hoc: 6 + 3 = 9; hoan thanh: 2 + 1 = 3
      stats: { totalCourses: 2, completedCourses: 0, totalLessons: 9, completedLessons: 3 },
    },
    {
      user: khoaUser._id,
      address: 'District 1, HCMC',
      // Bo sung courses[3] cho khop voi Order #4 (tong 3 khoa: 6 + 2 + 2 = 10 bai)
      myCourses: [{ course: courses[0]._id }, { course: courses[2]._id }, { course: courses[3]._id }],
      // Hoan thanh: 3 (courses[0]) + 2 (courses[2] - xong 1 khoa) + 0 (courses[3]) = 5 bai
      stats: { totalCourses: 3, completedCourses: 1, totalLessons: 10, completedLessons: 5 },
    },
    {
      user: haUser._id,
      address: 'District 7, HCMC',
      myCourses: [{ course: courses[0]._id }, { course: courses[4]._id }],
      // Tong bai hoc: 6 + 2 = 8; hoan thanh: 2 (courses[0]) + 1 (courses[4]) = 3 bai
      stats: { totalCourses: 2, completedCourses: 0, totalLessons: 8, completedLessons: 3 },
    },
  ]);

  // 7. Khoi tao Tien do hoc tap (CourseProgress) day du cho ca 3 hoc vien va LearningStreak
  const c0Lectures = courses[0].curriculum.flatMap((m) => m.lectures);
  const c1Lectures = courses[1].curriculum.flatMap((m) => m.lectures);
  const c2Lectures = courses[2].curriculum.flatMap((m) => m.lectures);
  const c3Lectures = courses[3].curriculum.flatMap((m) => m.lectures);
  const c4Lectures = courses[4].curriculum.flatMap((m) => m.lectures);

  await CourseProgress.insertMany([
    // Tien do cua huyStudentUser (2 + 1 = 3 bai hoan thanh)
    {
      userId: huyStudentUser._id,
      courseId: courses[0]._id,
      ...buildLectureProgress(c0Lectures, 2, 2, 120),
    },
    {
      userId: huyStudentUser._id,
      courseId: courses[1]._id,
      ...buildLectureProgress(c1Lectures, 1),
    },
    // Tien do cua khoaUser (3 + 2 + 0 = 5 bai hoan thanh, hoan thanh 1 khoa courses[2])
    {
      userId: khoaUser._id,
      courseId: courses[0]._id,
      ...buildLectureProgress(c0Lectures, 3, 3, 90),
    },
    {
      userId: khoaUser._id,
      courseId: courses[2]._id,
      ...buildLectureProgress(c2Lectures, 2),
    },
    {
      userId: khoaUser._id,
      courseId: courses[3]._id,
      ...buildLectureProgress(c3Lectures, 0, 0, 60),
    },
    // Tien do cua haUser (2 + 1 = 3 bai hoan thanh)
    {
      userId: haUser._id,
      courseId: courses[0]._id,
      ...buildLectureProgress(c0Lectures, 2, 2, 150),
    },
    {
      userId: haUser._id,
      courseId: courses[4]._id,
      ...buildLectureProgress(c4Lectures, 1),
    },
  ]);

  // Tao chuoi ngay lien tiep ket thuc o ngay hom nay cho cac hoc vien da ghi danh
  const buildRecentDates = (count) =>
    Array.from({ length: count }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (count - 1 - idx));
      return d.toISOString().slice(0, 10);
    });

  const huyDates = buildRecentDates(12);
  const khoaDates = buildRecentDates(5);
  const haDates = buildRecentDates(3);

  await LearningStreak.insertMany([
    {
      userId: huyStudentUser._id,
      currentStreak: 12,
      longestStreak: 15,
      lastActiveDate: huyDates[huyDates.length - 1],
      activeDates: huyDates,
    },
    {
      userId: khoaUser._id,
      currentStreak: 5,
      longestStreak: 8,
      lastActiveDate: khoaDates[khoaDates.length - 1],
      activeDates: khoaDates,
    },
    {
      userId: haUser._id,
      currentStreak: 3,
      longestStreak: 4,
      lastActiveDate: haDates[haDates.length - 1],
      activeDates: haDates,
    },
  ]);

  // 8. Khoi tao Danh sach yeu thich (chi luu tai collection Wishlist) va Gio hang (Cart)
  await Wishlist.insertMany([
    { userId: huyStudentUser._id, courseId: courses[2]._id },
    { userId: huyStudentUser._id, courseId: courses[3]._id },
    { userId: huyStudentUser._id, courseId: courses[4]._id },
  ]);

  await Cart.create({
    user: huyStudentUser._id,
    courses: [{ course: courses[2]._id }, { course: courses[5]._id }],
  });

  // 9. Khoi tao Ma giam gia (Coupon) truoc Order de lien ket chinh xac
  const coupons = await Coupon.insertMany([
    {
      code: 'COURSEHUB20',
      description: 'CourseHub Launch 20% Off',
      discountPercent: 20,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-12-31'),
      isActive: true,
      usersUsed: [khoaUser._id],
    },
    {
      code: 'WELCOME25',
      description: 'New Student 25% Discount',
      discountPercent: 25,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-06-30'),
      isActive: true,
      usersUsed: [],
    },
    {
      code: 'EDUCATOR15',
      description: 'Educator Community Promo',
      discountPercent: 15,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2027-03-31'),
      isActive: true,
      usersUsed: [],
    },
    {
      code: 'FLASH30',
      description: 'Weekend Flash Deal',
      discountPercent: 30,
      startDate: new Date('2026-01-01'),
      expiryDate: new Date('2026-12-31'),
      isActive: false,
      usersUsed: [],
    },
  ]);

  // 10. Khoi tao Don hang (Order) co snapshot coupon va dong bo tong tien
  const monthsAgo = (m) => {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    return d;
  };
  await Order.insertMany([
    {
      user: huyStudentUser._id,
      courses: [{ course: courses[0]._id, pricePaid: 79 }, { course: courses[1]._id, pricePaid: 59 }],
      coupon: { couponId: null, code: '', discountPercent: 0 },
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
      // Ap dung ma COURSEHUB20 giam 20% tren 168 => giam 34, tong thanh toan 134
      coupon: {
        couponId: coupons[0]._id,
        code: coupons[0].code,
        discountPercent: coupons[0].discountPercent,
      },
      subTotal: 168,
      discountAmount: 34,
      totalAmount: 134,
      paymentMethod: 'momo',
      status: 'completed',
      createdAt: monthsAgo(1),
    },
    {
      user: haUser._id,
      courses: [{ course: courses[0]._id, pricePaid: 79 }, { course: courses[4]._id, pricePaid: 84 }],
      coupon: { couponId: null, code: '', discountPercent: 0 },
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
      coupon: { couponId: null, code: '', discountPercent: 0 },
      subTotal: 95,
      discountAmount: 0,
      totalAmount: 95,
      paymentMethod: 'momo',
      status: 'completed',
      createdAt: monthsAgo(3),
    },
  ]);

  // 11. Khoi tao Danh gia khoa hoc (Review) khop voi rating tren collection Course
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
      user: huyStudentUser._id,
      course: courses[1]._id,
      rating: 5,
      description: 'Figma variables and auto-layout patterns are explained step by step with clean real-world examples.',
    },
    {
      user: khoaUser._id,
      course: courses[2]._id,
      rating: 5,
      description: 'Clear Python feature engineering examples!',
    },
  ]);

  console.log('Hoan tat khoi tao du lieu mau CourseHub.');
}

// Cho phep chay truc tiep qua lenh: npm run seed va dong ket noi DB an toan
if (process.argv[1]?.endsWith('seedData.js')) {
  import('dotenv/config').then(async () => {
    try {
      await connectDB();
      await ensureSeeded();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Seed data failed:', err);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    }
  });
}
