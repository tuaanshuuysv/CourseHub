import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaArrowRight, FaEnvelope, FaLock } from 'react-icons/fa';
import AuthShell from '@/components/AuthShell';
import { useCourseHub } from '@/context/CourseHubContext';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const HAS_GOOGLE_OAUTH =
  Boolean(GOOGLE_CLIENT_ID) &&
  GOOGLE_CLIENT_ID !== 'your_google_oauth_client_id.apps.googleusercontent.com';

// Man hinh dang nhap (UC-1.2) ho tro Email/Mat khau va Google OAuth 2.0 that
export default function SignInPage() {
  const { signIn, signInWithGoogle, notify } = useCourseHub();
  const navigate = useNavigate();
  const location = useLocation();
  const googleBtnRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectAfterLogin = (user) => {
    const fromPath = location.state?.from?.pathname;
    if (fromPath && !fromPath.startsWith('/auth')) {
      navigate(fromPath, { replace: true });
      return;
    }
    if (user.role === 'instructor') navigate('/instructor/dashboard', { replace: true });
    else if (user.role === 'admin') navigate('/admin/dashboard', { replace: true });
    else navigate('/student/dashboard', { replace: true });
  };

  // Tai va khoi tao Google Identity Services (GSI) khi da cau hinh VITE_GOOGLE_CLIENT_ID
  useEffect(() => {
    if (!HAS_GOOGLE_OAUTH || !googleBtnRef.current) return;
    let cancelled = false;

    const initGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response?.credential) return;
          setError('');
          setLoading(true);
          try {
            const user = await signInWithGoogle(response.credential);
            redirectAfterLogin(user);
          } catch (err) {
            setError(err.message);
            notify(err.message, 'danger');
          } finally {
            setLoading(false);
          }
        },
      });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 380,
        text: 'signin_with',
        shape: 'pill',
      });
    };

    if (window.google?.accounts?.id) {
      initGoogleButton();
    } else {
      const existingScript = document.querySelector('script[data-gsi="true"]');
      if (existingScript) {
        existingScript.addEventListener('load', initGoogleButton);
      } else {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.gsi = 'true';
        script.onload = initGoogleButton;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [signInWithGoogle, notify]);

  // Xu ly gui form dang nhap bang email va mat khau
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await signIn({ email, password });
      redirectAfterLogin(user);
    } catch (err) {
      setError(err.message);
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back to CourseHub" subtitle="Sign in to access your courses and learning workspace.">
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
              placeholder="you@example.com"
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="ch-btn ch-btn--primary ch-btn--lg" style={{ marginTop: 4 }}>
          {loading ? 'Signing in...' : 'Sign In'} <FaArrowRight />
        </button>

        {HAS_GOOGLE_OAUTH && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-muted)', fontSize: '0.8rem', margin: '4px 0' }}>
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span>OR</span>
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 42 }} />
          </>
        )}
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
