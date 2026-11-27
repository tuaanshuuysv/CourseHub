import { useEffect, useRef, useState } from 'react';
import { FaCamera, FaCheckCircle, FaClock, FaLock, FaUserTie } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api, setStoredToken } from '@/api/client';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Man hinh ho so ca nhan hoc vien: tai len anh dai dien, cap nhat thong tin, doi mat khau va dang ky giang vien
export default function StudentProfilePage() {
  const { currentUser, setCurrentUser, streak, setStreak, notify } = useCourseHub();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [submittingApplication, setSubmittingApplication] = useState(false);

  // Thong tin ho so ca nhan (UC-2.1, UC-2.2)
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phonenumber, setPhonenumber] = useState(currentUser?.phonenumber || '');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState(currentUser?.website || '');
  const [bio, setBio] = useState(currentUser?.bio || '');

  // Form doi mat khau
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form dang ky tro thanh Giang vien (UC-3.1)
  const [instructorApp, setInstructorApp] = useState(null);
  const [occupation, setOccupation] = useState('');
  const [introduction, setIntroduction] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/student/profile');
        if (!active) return;
        if (res.user) {
          setCurrentUser(res.user);
          setName(res.user.name || '');
          setEmail(res.user.email || '');
          setPhonenumber(res.user.phonenumber || '');
          setWebsite(res.user.website || '');
          setBio(res.user.bio || '');
        }
        setAddress(res.student?.address || '');
        if (res.streak) setStreak(res.streak);
        setInstructorApp(res.instructorApplication || null);
      } catch (err) {
        if (active) notify(err.message, 'danger');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [setCurrentUser, setStreak, notify]);

  // Xu ly chon tep va tai len anh dai dien that qua multipart/form-data
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Please select a valid image file (JPG, PNG, WEBP, GIF)', 'danger');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      notify('Avatar image must be 5MB or smaller', 'danger');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);
    setUploadingAvatar(true);
    try {
      const res = await api.upload('/api/student/profile/avatar', formData);
      if (res.user) setCurrentUser(res.user);
      notify(res.message || 'Avatar updated successfully');
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Luu thay doi thong tin ho so ca nhan
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/api/student/profile', {
        name,
        email,
        phonenumber,
        address,
        website,
        bio,
      });
      if (res.user) setCurrentUser(res.user);
      notify(res.message || 'Profile updated successfully');
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSavingProfile(false);
    }
  };

  // Doi mat khau va luu lai JWT moi de phien lam viec khong bi ngat
  const handleChangePassword = async (e) => {
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

  // Gui don dang ky tro thanh Giang vien cho Admin phe duyet
  const handleBecomeInstructor = async (e) => {
    e.preventDefault();
    setSubmittingApplication(true);
    try {
      const res = await api.post('/api/student/become-instructor', {
        occupation: occupation.trim(),
        introduction: introduction.trim(),
        address: address.trim(),
      });
      setInstructorApp({
        isApproved: false,
        occupation: res.application?.occupation || occupation.trim(),
        introduction: res.application?.introduction || introduction.trim(),
      });
      notify(res.message);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSubmittingApplication(false);
    }
  };

  const avatarSrc = currentUser?.pfpImg || '/media/avatar/09.jpg';
  const roleLabel = currentUser?.role === 'instructor' ? 'Instructor Account' : 'Student Account';

  return (
    <WorkspaceLayout
      variant="student"
      title="My Profile"
      subtitle="Update your profile photo, personal details, account password, and educator application."
    >
      {loading ? (
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48, color: 'var(--ink-muted)' }}>
          Loading profile settings...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
          <div className="ch-card ch-card--pad" style={{ textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 104, height: 104, margin: '0 auto 14px' }}>
              <img
                src={avatarSrc}
                alt={name || 'Profile avatar'}
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--teal-soft)',
                }}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="ch-btn ch-btn--sm ch-btn--outline"
              style={{ marginBottom: 14 }}
            >
              <FaCamera size={12} /> {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
            </button>

            <h2 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '0 0 6px' }}>{name || 'Student'}</h2>
            <span className="ch-badge ch-badge--teal">{roleLabel}</span>
            {bio && <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', marginTop: 12 }}>{bio}</p>}

            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div>
                <strong style={{ fontSize: '1.15rem' }}>{streak?.currentStreak ?? 0}d</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Current Streak</div>
              </div>
              <div>
                <strong style={{ fontSize: '1.15rem' }}>{streak?.longestStreak ?? 0}d</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>Longest Streak</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <form
              onSubmit={handleSaveProfile}
              className="ch-card ch-card--pad"
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <h3 style={{ fontSize: '1.12rem', fontWeight: 800 }}>Account Details</h3>
              <div className="ch-grid-2">
                <div className="ch-field">
                  <label className="ch-label">Full Name</label>
                  <input className="ch-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="ch-field">
                  <label className="ch-label">Email Address</label>
                  <input
                    className="ch-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="ch-grid-2">
                <div className="ch-field">
                  <label className="ch-label">Phone Number</label>
                  <input
                    className="ch-input"
                    value={phonenumber}
                    onChange={(e) => setPhonenumber(e.target.value)}
                    placeholder="+84 ..."
                  />
                </div>
                <div className="ch-field">
                  <label className="ch-label">Address</label>
                  <input
                    className="ch-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="City, Country"
                  />
                </div>
              </div>
              <div className="ch-field">
                <label className="ch-label">Website / Portfolio</label>
                <input
                  className="ch-input"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="ch-field">
                <label className="ch-label">Bio</label>
                <textarea
                  className="ch-textarea"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell others a little about your learning goals..."
                />
              </div>
              <div>
                <button type="submit" disabled={savingProfile} className="ch-btn ch-btn--primary">
                  {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>

            <form
              onSubmit={handleChangePassword}
              className="ch-card ch-card--pad"
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <h3 style={{ fontSize: '1.12rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FaLock size={14} style={{ color: 'var(--teal)' }} /> Change Password
              </h3>
              <div className="ch-field">
                <label className="ch-label">Current Password</label>
                <input
                  className="ch-input"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="ch-grid-2">
                <div className="ch-field">
                  <label className="ch-label">New Password</label>
                  <input
                    className="ch-input"
                    type="password"
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                  />
                </div>
                <div className="ch-field">
                  <label className="ch-label">Confirm New Password</label>
                  <input
                    className="ch-input"
                    type="password"
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <button type="submit" disabled={savingPassword} className="ch-btn ch-btn--outline">
                  {savingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>

            <div className="ch-card ch-card--pad">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14,
                  flexWrap: 'wrap',
                }}
              >
                <h3 style={{ fontSize: '1.12rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <FaUserTie size={15} style={{ color: 'var(--coral)' }} /> Become an Instructor
                </h3>
                {currentUser?.role === 'instructor' ? (
                  <span className="ch-badge ch-badge--teal">
                    <FaCheckCircle /> Approved Instructor
                  </span>
                ) : instructorApp ? (
                  <span className="ch-badge ch-badge--coral">
                    <FaClock /> Pending Admin Approval
                  </span>
                ) : (
                  <span className="ch-badge ch-badge--coral">Apply for Educator Role</span>
                )}
              </div>

              {currentUser?.role === 'instructor' ? (
                <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.92rem' }}>
                  Your account already has Instructor privileges to create and manage courses.
                </p>
              ) : instructorApp ? (
                <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg-canvas)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Your application is under review</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', marginBottom: 4 }}>
                    <strong>Occupation:</strong> {instructorApp.occupation}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)' }}>
                    <strong>Introduction:</strong> {instructorApp.introduction}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBecomeInstructor} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="ch-field">
                    <label className="ch-label">Current Occupation / Specialty</label>
                    <input
                      className="ch-input"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="e.g. Senior Full-Stack Engineer"
                      required
                    />
                  </div>
                  <div className="ch-field">
                    <label className="ch-label">Teaching Introduction</label>
                    <textarea
                      className="ch-textarea"
                      rows={3}
                      value={introduction}
                      onChange={(e) => setIntroduction(e.target.value)}
                      placeholder="Describe the topics you plan to teach on CourseHub..."
                      required
                    />
                  </div>
                  <div>
                    <button type="submit" disabled={submittingApplication} className="ch-btn ch-btn--coral">
                      {submittingApplication ? 'Submitting...' : 'Submit Instructor Application'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
