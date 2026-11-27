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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastBanner />
    </CourseHubProvider>
  );
}
