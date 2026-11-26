import { Navigate, useLocation } from 'react-router-dom';
import { useCourseHub } from '@/context/CourseHubContext';

// Xac dinh duong dan mac dinh khi nguoi dung truy cap sai pham vi vai tro
function getFallbackPathForRole(role) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'instructor') return '/instructor/dashboard';
  return '/';
}

// Component bao ve tuyen duong theo trang thai dang nhap va phan quyen vai tro (RBAC)
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { authReady, currentUser } = useCourseHub();
  const location = useLocation();

  if (!authReady) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-muted)',
          fontSize: '0.95rem',
        }}
      >
        Checking session...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={getFallbackPathForRole(currentUser.role)} replace />;
  }

  return children;
}
