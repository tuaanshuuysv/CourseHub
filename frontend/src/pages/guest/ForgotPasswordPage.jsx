import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowRight, FaCheckCircle } from 'react-icons/fa';
import AuthShell from '@/components/AuthShell';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh quen mat khau va dat lai mat khau moi qua ma OTP (UC-1.2)
export default function ForgotPasswordPage() {
  const { notify } = useCourseHub();
  const navigate = useNavigate();
  const [email, setEmail] = useState('user@demo.com');
  const [step, setStep] = useState('request');
  const [demoOtp, setDemoOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Gui yeu cau nhan ma OTP khoi phuc mat khau
  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email });
      setDemoOtp(res.demoOtp || '');
      setOtp(res.demoOtp || '');
      setStep('reset');
      notify(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Xac nhan ma OTP va cap nhat mat khau moi
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      return setError('New password must be at least 6 characters');
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/reset-password', { email, otp, newPassword });
      notify(res.message);
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="Verify OTP and set a new password (UC-1.2).">
      {error && (
        <div className="ch-badge ch-badge--danger" style={{ width: '100%', padding: '10px 14px', borderRadius: 12, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {step === 'done' ? (
        <div style={{ textAlign: 'center', padding: '14px 0' }}>
          <FaCheckCircle size={42} style={{ color: 'var(--success)', marginBottom: 12 }} />
          <h3>Password Updated!</h3>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem' }}>You can now sign in with your new password.</p>
          <button type="button" onClick={() => navigate('/auth/sign-in')} className="ch-btn ch-btn--primary">
            Back to Sign In
          </button>
        </div>
      ) : step === 'reset' ? (
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {demoOtp && (
            <div className="ch-badge ch-badge--teal">
              Demo OTP: <code>{demoOtp}</code>
            </div>
          )}
          <div className="ch-field">
            <label className="ch-label">OTP Code</label>
            <input className="ch-input" value={otp} onChange={(e) => setOtp(e.target.value)} required />
          </div>
          <div className="ch-field">
            <label className="ch-label">New Password</label>
            <input
              type="password"
              className="ch-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="ch-btn ch-btn--primary ch-btn--lg">
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div className="ch-field">
            <label className="ch-label">Registered Email</label>
            <input type="email" className="ch-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="ch-btn ch-btn--primary ch-btn--lg">
            {loading ? 'Sending OTP...' : 'Send OTP'} <FaArrowRight />
          </button>
          <Link to="/auth/sign-in" className="ch-btn ch-btn--ghost">
            Return to Sign In
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
