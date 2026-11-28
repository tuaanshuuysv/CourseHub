import { Navigate, Route, Routes } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { CourseHubProvider, useCourseHub } from '@/context/CourseHubContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import HomePage from '@/pages/guest/HomePage';
import AllCoursesPage from '@/pages/guest/AllCoursesPage';
import CourseDetailsPage from '@/pages/guest/CourseDetailsPage';
import SignInPage from '@/pages/guest/SignInPage';
import SignUpPage from '@/pages/guest/SignUpPage';
import ForgotPasswordPage from '@/pages/guest/ForgotPasswordPage';
import StudentDashboardPage from '@/pages/student/StudentDashboardPage';
import WishlistPage from '@/pages/student/WishlistPage';
import MyCartPage from '@/pages/student/MyCartPage';
import MyCoursesPage from '@/pages/student/MyCoursesPage';
import LearningCoursePage from '@/pages/student/LearningCoursePage';
import StudentProfilePage from '@/pages/student/StudentProfilePage';
import EducatorDashboardPage from '@/pages/educator/EducatorDashboardPage';
import EducatorCoursesPage from '@/pages/educator/EducatorCoursesPage';
import EducatorCourseDetailsPage from '@/pages/educator/EducatorCourseDetailsPage';
import CourseFormPage from '@/pages/educator/CourseFormPage';
import EducatorStudentsPage from '@/pages/educator/EducatorStudentsPage';
import EducatorEarningsPage from '@/pages/educator/EducatorEarningsPage';
import EducatorProfilePage from '@/pages/educator/EducatorProfilePage';
import EducatorSettingsPage from '@/pages/educator/EducatorSettingsPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminCoursesPage from '@/pages/admin/AdminCoursesPage';
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage';
import AdminCouponsPage from '@/pages/admin/AdminCouponsPage';
import AdminStudentsPage from '@/pages/admin/AdminStudentsPage';
import AdminInstructorsPage from '@/pages/admin/AdminInstructorsPage';
import AdminInstructorRequestsPage from '@/pages/admin/AdminInstructorRequestsPage';
import AdminEarningsPage from '@/pages/admin/AdminEarningsPage';

// Thanh thong bao nhanh hien thi trang thai thao tac toan cuc
function ToastBanner() {
  const { toast } = useCourseHub();
  if (!toast) return null;
  return (
    <div className="ch-toast">
      <FaCheckCircle style={{ color: toast.tone === 'danger' ? '#f87171' : '#5eead4' }} />
      <span>{toast.message}</span>
    </div>
  );
}

// Dinh tuyen goc cua ung dung Frontend CourseHub
export default function App() {
  return (
    <CourseHubProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/courses" element={<AllCoursesPage />} />
        <Route path="/courses/:id" element={<CourseDetailsPage />} />
        <Route path="/auth/sign-in" element={<SignInPage />} />
        <Route path="/auth/sign-up" element={<SignUpPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

        {/* Cac tuyen duong khong gian Hoc vien (yeu cau dang nhap vai tro student/instructor) */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student', 'instructor']}>
              <StudentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses"
          element={
            <ProtectedRoute allowedRoles={['student', 'instructor']}>
              <AllCoursesPage insideStudent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/courses/:id"
          element={
            <ProtectedRoute allowedRoles={['student', 'instructor']}>
              <CourseDetailsPage insideStudent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/wishlist"
          element={
            <ProtectedRoute allowedRoles={['student', 'instructor']}>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/cart"
          element={
            <ProtectedRoute allowedRoles={['student', 'instructor']}>
              <MyCartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/my-courses"
          element={
            <ProtectedRoute allowedRoles={['student', 'instructor']}>
              <MyCoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/learning"
          element={
            <ProtectedRoute allowedRoles={['student', 'instructor']}>
              <LearningCoursePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/learning/:id"
          element={
            <ProtectedRoute allowedRoles={['student', 'instructor']}>
              <LearningCoursePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={['student', 'instructor']}>
              <StudentProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Cac tuyen duong khong gian Giang vien (yeu cau dang nhap vai tro instructor) */}
        <Route
          path="/instructor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <EducatorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <EducatorCoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/courses/:id"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <EducatorCourseDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/create-course"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <CourseFormPage mode="create" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/edit-course"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <CourseFormPage mode="edit" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/edit-course/:id"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <CourseFormPage mode="edit" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/students"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <EducatorStudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/earnings"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <EducatorEarningsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/profile"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <EducatorProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/instructor/settings"
          element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <EducatorSettingsPage />
            </ProtectedRoute>
          }
        />


        {/* Cac tuyen duong khong gian Quan tri vien (yeu cau dang nhap vai tro admin) */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/courses"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCoursesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCategoriesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/coupons"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCouponsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/students"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminStudentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/instructors"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminInstructorsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/instructor-requests"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminInstructorRequestsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/earnings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminEarningsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastBanner />
    </CourseHubProvider>
  );
}
