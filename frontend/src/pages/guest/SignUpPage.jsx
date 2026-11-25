import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight, FaEnvelope, FaShieldAlt, FaUser } from 'react-icons/fa';
import AuthShell from '@/components/AuthShell';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh dang ky tai khoan va xac thuc ma OTP qua email (UC-1.1)
export default function SignUpPage() {
  const { notify } = useCourseHub();
  const navigate = useNavigate();
  const [name, setName] = useState('Nguyen Tuan Huy');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpModal, setOtpModal] = useState(null);
  const [otpInput, setOtpInput] = useState('');

  // Gui yeu cau dang ky tai khoan moi va nhan ma OTP xac thuc
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!agreed) return setError('Please agree to the terms of service');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords must match');

    setLoading(true);
    try {
      const res = await api.post('/api/auth/register', { name, email, password });
      notify(res.message);
      setOtpModal({ email: res.email, demoOtp: res.demoOtp });
      setOtpInput(res.demoOtp || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Gui ma OTP 6 chu so de kich hoat tai khoan vua dang ky
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/verify-otp', { email: otpModal.email, otp: otpInput });
      notify(res.message);
      setOtpModal(null);
      navigate('/auth/sign-in');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your CourseHub account" subtitle="Register and verify via Email OTP (UC-1.1).">
      {error && (
        <div className="ch-badge ch-badge--danger" style={{ width: '100%', padding: '10px 14px', borderRadius: 12, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {otpModal ? (
        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ background: 'var(--teal-soft)', padding: 14, borderRadius: 12, fontSize: '0.86rem' }}>
            <FaShieldAlt style={{ color: 'var(--teal)', marginRight: 6 }} />
            OTP sent to <strong>{otpModal.email}</strong>
            {otpModal.demoOtp && (
              <div style={{ marginTop: 4 }}>
                Demo OTP: <code>{otpModal.demoOtp}</code>
              </div>
            )}
          </div>
          <div className="ch-field">
            <label className="ch-label">6-Digit Verification OTP</label>
            <input className="ch-input" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="ch-btn ch-btn--primary ch-btn--lg">
            {loading ? 'Verifying...' : 'Verify OTP & Activate'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="ch-field">
            <label className="ch-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <FaUser style={{ position: 'absolute', left: 13, top: 13, color: 'var(--ink-muted)' }} />
              <input className="ch-input" style={{ paddingLeft: 38 }} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
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
                placeholder="student@coursehub.io"
                required
              />
            </div>
          </div>
          <div className="ch-grid-2">
            <div className="ch-field">
              <label className="ch-label">Password</label>
              <input type="password" className="ch-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="ch-field">
              <label className="ch-label">Confirm Password</label>
              <input type="password" className="ch-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I agree to CourseHub Terms &amp; Privacy Policy
          </label>
          <button type="submit" disabled={loading} className="ch-btn ch-btn--coral ch-btn--lg">
            {loading ? 'Sending OTP...' : 'Sign Up & Send OTP'} <FaArrowRight />
          </button>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: 20, marginBottom: 0, fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
        Already have an account?{' '}
        <Link to="/auth/sign-in" style={{ color: 'var(--teal)', fontWeight: 700 }}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
