import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight, FaEnvelope, FaGoogle, FaLock } from 'react-icons/fa';
import AuthShell from '@/components/AuthShell';
import { useCourseHub } from '@/context/CourseHubContext';

// Man hinh dang nhap (UC-1.2) ket noi API /api/auth/login va /api/auth/google
export default function SignInPage() {
  const { signIn, signInWithGoogle, notify } = useCourseHub();
  const navigate = useNavigate();
  const [email, setEmail] = useState('user@demo.com');
  const [password, setPassword] = useState('123456');
  const [selectedRole, setSelectedRole] = useState('Student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Chon nhanh thong tin tai khoan demo theo vai tro
  const pickRole = (roleName) => {
    setSelectedRole(roleName);
    if (roleName === 'Student') setEmail('user@demo.com');
    else if (roleName === 'Educator') setEmail('educator@coursehub.io');
    else setEmail('admin@coursehub.io');
    setPassword('123456');
  };

  // Xu ly gui form dang nhap bang email va mat khau
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signIn({ email, password });
      if (user.role === 'instructor') navigate('/instructor/dashboard');
      else if (user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/student/dashboard');
    } catch (err) {
      setError(err.message);
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Xu ly dang nhap nhanh bang Google OAuth demo
  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.message);
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back to CourseHub" subtitle="Sign in with MongoDB + JWT authentication.">
      <div style={{ background: 'var(--teal-soft)', borderRadius: 14, padding: 14, marginBottom: 18 }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--teal-dark)', marginBottom: 8 }}>
          QUICK DEMO ACCOUNT: NGUYEN TUAN HUY
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Student', 'Educator', 'Admin'].map((roleName) => (
            <button
              key={roleName}
              type="button"
              onClick={() => pickRole(roleName)}
              className={`ch-btn ch-btn--sm ${selectedRole === roleName ? 'ch-btn--primary' : 'ch-btn--outline'}`}
            >
              {roleName}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="ch-badge ch-badge--danger" style={{ width: '100%', padding: '10px 14px', borderRadius: 12, marginBottom: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <div className="ch-field">
          <label className="ch-label">Email Address</label>
          <div style={{ position: 'relative' }}>
            <FaEnvelope style={{ position: 'absolute', left: 13, top: 13, color: 'var(--ink-muted)' }} />
            <input
              type="email"
              className="ch-input"
              style={{ paddingLeft: 38 }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="ch-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="ch-label">Password</label>
            <Link to="/auth/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 600 }}>
              Forgot password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <FaLock style={{ position: 'absolute', left: 13, top: 13, color: 'var(--ink-muted)' }} />
            <input
              type="password"
              className="ch-input"
              style={{ paddingLeft: 38 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="ch-btn ch-btn--primary ch-btn--lg" style={{ marginTop: 4 }}>
          {loading ? 'Signing in...' : `Sign In as ${selectedRole}`} <FaArrowRight />
        </button>

        <button type="button" disabled={loading} onClick={handleGoogle} className="ch-btn ch-btn--outline">
          <FaGoogle style={{ color: '#ea4335' }} /> Sign in with Google
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, marginBottom: 0, fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
        New to CourseHub?{' '}
        <Link to="/auth/sign-up" style={{ color: 'var(--teal)', fontWeight: 700 }}>
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
