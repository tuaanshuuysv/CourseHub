import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBookOpen, FaLock, FaShieldAlt, FaSignOutAlt, FaTicketAlt, FaUserCheck } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api, setStoredToken } from '@/api/client';

// Man hinh cai dat bao mat tai khoan Quan tri vien va doi mat khau xoay vong JWT
export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const { currentUser, signOut, notify } = useCourseHub();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      notify('New password must be at least 8 characters long', 'danger');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('New password confirmation does not match', 'danger');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await api.put('/api/admin/change-password', { oldPassword, newPassword });
      if (res.token) setStoredToken(res.token);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify(res.message || 'Admin password changed successfully');
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <WorkspaceLayout
      variant="admin"
      title="Admin Settings"
      subtitle="Review administrator session status, platform revenue split policy, and password security."
    >
      <div className="ch-grid-2" style={{ alignItems: 'start' }}>
        <div className="ch-card ch-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <FaShieldAlt style={{ color: 'var(--teal)' }} /> Administrator Session &amp; Policy
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
              <strong>{currentUser?.name || 'Administrator'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--ink-muted)' }}>Email: </span>
              <strong>{currentUser?.email || '-'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--ink-muted)' }}>Role: </span>
              <span className="ch-badge ch-badge--teal">Platform Administrator</span>
            </div>
            <div>
              <span style={{ color: 'var(--ink-muted)' }}>Revenue Split Policy: </span>
              <strong>80% Educator / 20% Platform</strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link to="/admin/instructor-requests" className="ch-btn ch-btn--sm ch-btn--outline">
              <FaUserCheck /> Instructor Requests
            </Link>
            <Link to="/admin/courses" className="ch-btn ch-btn--sm ch-btn--outline">
              <FaBookOpen /> Courses Queue
            </Link>
            <Link to="/admin/coupons" className="ch-btn ch-btn--sm ch-btn--outline">
              <FaTicketAlt /> Coupons
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
              <FaSignOutAlt /> Sign Out of Admin Console
            </button>
          </div>
        </div>

        <form
          onSubmit={handleChangePassword}
          className="ch-card ch-card--pad"
          style={{ display: 'flex', flexDirection: 'column', gap: 15 }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <FaLock style={{ color: 'var(--teal)' }} /> Change Admin Password
          </h2>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
            Changing your password immediately invalidates all older administrator JWT sessions and rotates your active token.
          </p>
          <div className="ch-field">
            <label className="ch-label">Current Password</label>
            <input
              type="password"
              className="ch-input"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div className="ch-field">
            <label className="ch-label">New Password (minimum 8 characters)</label>
            <input
              type="password"
              minLength={8}
              className="ch-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div className="ch-field">
            <label className="ch-label">Confirm New Password</label>
            <input
              type="password"
              minLength={8}
              className="ch-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <button type="submit" disabled={savingPassword} className="ch-btn ch-btn--dark">
              {savingPassword ? 'Updating Password...' : 'Update Admin Password'}
            </button>
          </div>
        </form>
      </div>
    </WorkspaceLayout>
  );
}
