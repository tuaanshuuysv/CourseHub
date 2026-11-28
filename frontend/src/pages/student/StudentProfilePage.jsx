import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaBriefcase,
  FaCamera,
  FaCertificate,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaClock,
  FaLock,
  FaPlus,
  FaTrash,
  FaUpload,
  FaUserTie,
} from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api, setStoredToken } from '@/api/client';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Khoi tao mot dong kinh nghiem lam viec trong moi
function createEmptyExperience() {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    organization: '',
    position: '',
    startDate: '',
    endDate: '',
    supervisorName: '',
    supervisorContact: '',
  };
}

// Khoi tao mot dong chung chi trong moi
function createEmptyCertificate() {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    imageUrl: '',
    uploading: false,
  };
}

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

  // Form dang ky tro thanh Giang vien kem kinh nghiem lam viec va chung chi (UC-3.1)
  const [instructorApp, setInstructorApp] = useState(null);
  const [occupation, setOccupation] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [workExperience, setWorkExperience] = useState([createEmptyExperience()]);
  const [certificates, setCertificates] = useState([createEmptyCertificate()]);

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
    if (file.size > MAX_IMAGE_BYTES) {
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

  // Cap nhat truong cua mot muc kinh nghiem lam viec
  const updateExperienceField = (id, field, value) => {
    setWorkExperience((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  // Cap nhat ten cua mot chung chi
  const updateCertificateName = (id, value) => {
    setCertificates((prev) => prev.map((item) => (item.id === id ? { ...item, name: value } : item)));
  };

  // Tai len anh chup chung chi va hien thi xem truoc
  const handleCertificateUpload = async (certId, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Please select a valid image file (JPG, PNG, WEBP, GIF)', 'danger');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      notify('Certificate image must be 5MB or smaller', 'danger');
      return;
    }

    setCertificates((prev) => prev.map((item) => (item.id === certId ? { ...item, uploading: true } : item)));
    try {
      const formData = new FormData();
      formData.append('certificate', file);
      const res = await api.upload('/api/student/become-instructor/certificate', formData);
      setCertificates((prev) =>
        prev.map((item) => (item.id === certId ? { ...item, imageUrl: res.imageUrl, uploading: false } : item))
      );
      notify(res.message || 'Certificate photo uploaded');
    } catch (err) {
      setCertificates((prev) => prev.map((item) => (item.id === certId ? { ...item, uploading: false } : item)));
      notify(err.message, 'danger');
    }
  };

  // Gui don dang ky tro thanh Giang vien cho Admin phe duyet
  const handleBecomeInstructor = async (e) => {
    e.preventDefault();

    const formattedWork = workExperience.map((item) => ({
      organization: item.organization.trim(),
      position: item.position.trim(),
      startDate: item.startDate.trim(),
      endDate: item.endDate.trim() || 'Present',
      supervisor: {
        name: item.supervisorName.trim(),
        contact: item.supervisorContact.trim(),
      },
    }));

    const hasIncompleteWork = formattedWork.some(
      (item) =>
        !item.organization ||
        !item.position ||
        !item.startDate ||
        !item.supervisor.name ||
        !item.supervisor.contact
    );
    if (formattedWork.length === 0 || hasIncompleteWork) {
      notify('Please fill in all required work experience and former supervisor fields', 'danger');
      return;
    }

    // Bo qua dong chung chi hoan toan trong; neu co ten hoac anh thi yeu cau day du ca hai
    const nonEmptyCerts = certificates.filter((c) => c.name.trim() || c.imageUrl);
    if (nonEmptyCerts.some((c) => !c.name.trim() || !c.imageUrl)) {
      notify('Each certificate must include both a name and an uploaded photo', 'danger');
      return;
    }

    const formattedCerts = nonEmptyCerts.map((c) => ({
      name: c.name.trim(),
      imageUrl: c.imageUrl,
    }));

    setSubmittingApplication(true);
    try {
      const res = await api.post('/api/student/become-instructor', {
        occupation: occupation.trim(),
        introduction: introduction.trim(),
        address: address.trim(),
        workExperience: formattedWork,
        certificates: formattedCerts,
      });
      setInstructorApp({
        isApproved: false,
        occupation: res.application?.occupation || occupation.trim(),
        introduction: res.application?.introduction || introduction.trim(),
        workExperience: res.application?.workExperience || formattedWork,
        certificates: res.application?.certificates || formattedCerts,
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
                  <p style={{ margin: 0, color: 'var(--ink-secondary)', fontSize: '0.92rem' }}>
                    Your account already has Instructor privileges to create and manage courses.
                  </p>
                  <Link to="/instructor/dashboard" className="ch-btn ch-btn--sm ch-btn--primary">
                    <FaChalkboardTeacher /> Open Educator Studio
                  </Link>
                </div>
              ) : instructorApp ? (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Your application is under review</div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', marginBottom: 4 }}>
                      <strong>Occupation:</strong> {instructorApp.occupation}
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)' }}>
                      <strong>Introduction:</strong> {instructorApp.introduction}
                    </div>
                  </div>

                  {(instructorApp.workExperience || []).length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 8 }}>
                        Work Experience ({instructorApp.workExperience.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {instructorApp.workExperience.map((exp, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: 10,
                              borderRadius: 10,
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              fontSize: '0.84rem',
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>
                              {exp.position} - {exp.organization}
                            </div>
                            <div style={{ color: 'var(--ink-muted)', marginTop: 2 }}>
                              Period: {exp.startDate} to {exp.endDate || 'Present'}
                            </div>
                            <div style={{ color: 'var(--ink-secondary)', marginTop: 2 }}>
                              Reference Supervisor: <strong>{exp.supervisor?.name}</strong> ({exp.supervisor?.contact})
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(instructorApp.certificates || []).length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 8 }}>
                        Uploaded Certificates ({instructorApp.certificates.length})
                      </div>
                      <div className="ch-grid-2">
                        {instructorApp.certificates.map((cert, idx) => (
                          <a
                            key={idx}
                            href={cert.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: 8,
                              borderRadius: 10,
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <img
                              src={cert.imageUrl}
                              alt={cert.name}
                              style={{ width: 54, height: 42, objectFit: 'cover', borderRadius: 6 }}
                            />
                            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{cert.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleBecomeInstructor} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

                  {/* Phan khai bao kinh nghiem lam viec va cap tren cu de xac minh */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <strong style={{ fontSize: '0.94rem', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        <FaBriefcase style={{ color: 'var(--teal)' }} /> Work Experience & Reference Supervisor
                      </strong>
                      {workExperience.length < 10 && (
                        <button
                          type="button"
                          onClick={() => setWorkExperience((prev) => [...prev, createEmptyExperience()])}
                          className="ch-btn ch-btn--sm ch-btn--outline"
                        >
                          <FaPlus size={10} /> Add Experience
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {workExperience.map((exp, idx) => (
                        <div
                          key={exp.id}
                          style={{
                            padding: 14,
                            borderRadius: 12,
                            background: 'var(--bg-canvas)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                              Experience #{idx + 1}
                            </span>
                            {workExperience.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setWorkExperience((prev) => prev.filter((item) => item.id !== exp.id))}
                                className="ch-btn ch-btn--sm ch-btn--danger-soft"
                              >
                                <FaTrash size={10} /> Remove
                              </button>
                            )}
                          </div>

                          <div className="ch-grid-2">
                            <div className="ch-field">
                              <label className="ch-label">Organization / Company</label>
                              <input
                                className="ch-input"
                                value={exp.organization}
                                onChange={(e) => updateExperienceField(exp.id, 'organization', e.target.value)}
                                placeholder="e.g. FPT Software"
                                required
                              />
                            </div>
                            <div className="ch-field">
                              <label className="ch-label">Position / Title</label>
                              <input
                                className="ch-input"
                                value={exp.position}
                                onChange={(e) => updateExperienceField(exp.id, 'position', e.target.value)}
                                placeholder="e.g. Tech Lead"
                                required
                              />
                            </div>
                          </div>

                          <div className="ch-grid-2">
                            <div className="ch-field">
                              <label className="ch-label">Start Date</label>
                              <input
                                className="ch-input"
                                value={exp.startDate}
                                onChange={(e) => updateExperienceField(exp.id, 'startDate', e.target.value)}
                                placeholder="e.g. 03/2021"
                                required
                              />
                            </div>
                            <div className="ch-field">
                              <label className="ch-label">End Date (or Present)</label>
                              <input
                                className="ch-input"
                                value={exp.endDate}
                                onChange={(e) => updateExperienceField(exp.id, 'endDate', e.target.value)}
                                placeholder="e.g. Present or 12/2024"
                              />
                            </div>
                          </div>

                          <div className="ch-grid-2">
                            <div className="ch-field">
                              <label className="ch-label">Former Supervisor Name</label>
                              <input
                                className="ch-input"
                                value={exp.supervisorName}
                                onChange={(e) => updateExperienceField(exp.id, 'supervisorName', e.target.value)}
                                placeholder="e.g. Tran Quoc Minh"
                                required
                              />
                            </div>
                            <div className="ch-field">
                              <label className="ch-label">Supervisor Contact (Email / Phone)</label>
                              <input
                                className="ch-input"
                                value={exp.supervisorContact}
                                onChange={(e) => updateExperienceField(exp.id, 'supervisorContact', e.target.value)}
                                placeholder="e.g. manager@company.com / 0909..."
                                required
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phan khai bao chung chi va tai len anh chup chung chi */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <strong style={{ fontSize: '0.94rem', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                        <FaCertificate style={{ color: 'var(--coral)' }} /> Certificates & Photo Proof
                      </strong>
                      {certificates.length < 10 && (
                        <button
                          type="button"
                          onClick={() => setCertificates((prev) => [...prev, createEmptyCertificate()])}
                          className="ch-btn ch-btn--sm ch-btn--outline"
                        >
                          <FaPlus size={10} /> Add Certificate
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {certificates.map((cert, idx) => (
                        <div
                          key={cert.id}
                          style={{
                            padding: 14,
                            borderRadius: 12,
                            background: 'var(--bg-canvas)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink-secondary)' }}>
                              Certificate #{idx + 1}
                            </span>
                            {certificates.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setCertificates((prev) => prev.filter((item) => item.id !== cert.id))}
                                className="ch-btn ch-btn--sm ch-btn--danger-soft"
                              >
                                <FaTrash size={10} /> Remove
                              </button>
                            )}
                          </div>

                          <div className="ch-grid-2" style={{ alignItems: 'end' }}>
                            <div className="ch-field">
                              <label className="ch-label">Certificate Name</label>
                              <input
                                className="ch-input"
                                value={cert.name}
                                onChange={(e) => updateCertificateName(cert.id, e.target.value)}
                                placeholder="e.g. AWS Certified Solutions Architect"
                              />
                            </div>
                            <div className="ch-field">
                              <label className="ch-label">Certificate Photo (JPG/PNG/WEBP, max 5MB)</label>
                              <label
                                className="ch-btn ch-btn--sm ch-btn--outline"
                                style={{ cursor: cert.uploading ? 'wait' : 'pointer', justifyContent: 'center' }}
                              >
                                <FaUpload size={11} />{' '}
                                {cert.uploading
                                  ? 'Uploading...'
                                  : cert.imageUrl
                                    ? 'Replace Certificate Photo'
                                    : 'Upload Certificate Photo'}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  disabled={cert.uploading}
                                  onChange={(e) => handleCertificateUpload(cert.id, e)}
                                  style={{ display: 'none' }}
                                />
                              </label>
                            </div>
                          </div>

                          {cert.imageUrl && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <img
                                src={cert.imageUrl}
                                alt={cert.name || 'Certificate preview'}
                                style={{
                                  width: 84,
                                  height: 58,
                                  objectFit: 'cover',
                                  borderRadius: 8,
                                  border: '1px solid var(--border)',
                                }}
                              />
                              <a
                                href={cert.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: '0.82rem', color: 'var(--teal)', fontWeight: 700 }}
                              >
                                View uploaded certificate photo
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={submittingApplication || certificates.some((c) => c.uploading)}
                      className="ch-btn ch-btn--coral"
                    >
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
