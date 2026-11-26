import { Navigate, Route, Routes } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { CourseHubProvider, useCourseHub } from '@/context/CourseHubContext';
import HomePage from '@/pages/guest/HomePage';
import AllCoursesPage from '@/pages/guest/AllCoursesPage';
import CourseDetailsPage from '@/pages/guest/CourseDetailsPage';
import SignInPage from '@/pages/guest/SignInPage';
import SignUpPage from '@/pages/guest/SignUpPage';
import ForgotPasswordPage from '@/pages/guest/ForgotPasswordPage';

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastBanner />
    </CourseHubProvider>
  );
}
