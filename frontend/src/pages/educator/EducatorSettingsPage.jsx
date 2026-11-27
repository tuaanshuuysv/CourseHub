import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaGraduationCap, FaLock, FaShieldAlt, FaSignOutAlt, FaUser } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api, setStoredToken } from '@/api/client';

// Man hinh cai dat bao mat tai khoan va doi mat khau cua giang vien
export default function EducatorSettingsPage() {
  const navigate = useNavigate();
  const { currentUser, signOut, notify } = useCourseHub();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Doi mat khau tai khoan giang vien va xoay vong JWT phien hien tai
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      notify('New password must be at least 6 characters', 'danger');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('New password confirmation does not match', 'danger');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.put('/api/student/change-password', {
        currentPassword,
        newPassword,
      });
      if (res.token) setStoredToken(res.token);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify(res.message || 'Password changed successfully');
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <WorkspaceLayout
      variant="educator"
      title="Educator Settings"
      subtitle="Manage your account security, active session, and workspace navigation."
    >
      <div className="ch-grid-2" style={{ alignItems: 'start' }}>
        <div className="ch-card ch-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <FaShieldAlt style={{ color: 'var(--teal)' }} /> Account &amp; Workspace Access
          </h2>

          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: '0.9rem',
            }}
          >
            <div>
              <span style={{ color: 'var(--ink-muted)' }}>Signed in as: </span>
              <strong>{currentUser?.name || 'Educator'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--ink-muted)' }}>Email: </span>
              <strong>{currentUser?.email || '-'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--ink-muted)' }}>Role: </span>
              <span className="ch-badge ch-badge--teal">Verified Instructor</span>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--ink-muted)', lineHeight: 1.55 }}>
            Instructor accounts retain full access to the Student Learning Space so you can enroll in and watch courses
            from other educators at any time.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link to="/student/dashboard" className="ch-btn ch-btn--sm ch-btn--outline">
              <FaGraduationCap /> Open Student Workspace
            </Link>
            <Link to="/instructor/profile" className="ch-btn ch-btn--sm ch-btn--outline">
              <FaUser /> Edit Educator Profile
            </Link>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/auth/sign-in');
              }}
              className="ch-btn ch-btn--sm ch-btn--danger-soft"
            >
              <FaSignOutAlt /> Sign Out of All Active Local Sessions
            </button>
          </div>
        </div>

        <form
          onSubmit={handlePasswordChange}
          className="ch-card ch-card--pad"
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <FaLock style={{ color: 'var(--teal)' }} /> Security &amp; Password
          </h2>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
            Updating your password invalidates all older authentication tokens automatically.
          </p>

          <div className="ch-field">
            <label className="ch-label">Current Password</label>
            <input
              type="password"
              className="ch-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="ch-field">
            <label className="ch-label">New Password</label>
            <input
              type="password"
              minLength={6}
              className="ch-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>
          <div className="ch-field">
            <label className="ch-label">Confirm New Password</label>
            <input
              type="password"
              minLength={6}
              className="ch-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <button type="submit" disabled={savingPassword} className="ch-btn ch-btn--dark">
              {savingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </WorkspaceLayout>
  );
}
