import { Navigate, Route, Routes } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import { CourseHubProvider, useCourseHub } from '@/context/CourseHubContext';
import SignInPage from '@/pages/guest/SignInPage';

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
        <Route path="/auth/sign-in" element={<SignInPage />} />
        <Route path="*" element={<Navigate to="/auth/sign-in" replace />} />
      </Routes>
      <ToastBanner />
    </CourseHubProvider>
  );
}
