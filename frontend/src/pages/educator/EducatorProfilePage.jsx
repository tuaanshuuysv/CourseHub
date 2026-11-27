import { useEffect, useRef, useState } from 'react';
import {
  FaBriefcase,
  FaCamera,
  FaCertificate,
  FaCheckCircle,
  FaGraduationCap,
  FaPlus,
  FaTools,
  FaTrash,
} from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

// Sinh ma dinh danh cuc bo cho muc hoc van hoac ky nang
function makeUid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Man hinh ho so chuyen mon giang vien: anh dai dien, thong tin, hoc van (<=5), ky nang (<=6) va minh chung
export default function EducatorProfilePage() {
  const { currentUser, setCurrentUser, refreshPublicCatalog, notify } = useCourseHub();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(currentUser?.name || '');
  const [phonenumber, setPhonenumber] = useState(currentUser?.phonenumber || '');
  const [website, setWebsite] = useState(currentUser?.website || '');
  const [bio, setBio] = useState(currentUser?.bio || '');

  const [occupation, setOccupation] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [address, setAddress] = useState('');
  const [education, setEducation] = useState([]);
  const [skills, setSkills] = useState([]);
  const [workExperience, setWorkExperience] = useState([]);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/instructor/profile');
        if (!active) return;
        if (res.user) {
          setCurrentUser(res.user);
          setName(res.user.name || '');
          setPhonenumber(res.user.phonenumber || '');
          setWebsite(res.user.website || '');
          setBio(res.user.bio || '');
        }
        if (res.instructor) {
          setOccupation(res.instructor.occupation || '');
          setIntroduction(res.instructor.introduction || '');
          setAddress(res.instructor.address || '');
          setEducation(
            (res.instructor.education || []).map((e) => ({
              uid: e._id || makeUid(),
              degree: e.degree || '',
              fieldOfStudy: e.fieldOfStudy || '',
              institution: e.institution || '',
            }))
          );
          setSkills(
            (res.instructor.skills || []).map((s) => ({
              uid: s._id || makeUid(),
              name: s.name || '',
              level: Number(s.level ?? 80),
            }))
          );
          setWorkExperience(res.instructor.workExperience || []);
          setCertificates(res.instructor.certificates || []);
        }
      } catch (err) {
        if (active) notify(err.message, 'danger');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [setCurrentUser, notify]);

  // Tai len anh dai dien moi va dong bo len cac khoa hoc cua giang vien
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
      await refreshPublicCatalog();
      notify(res.message || 'Avatar uploaded successfully');
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Luu thay doi ho so giang vien, hoc van va ky nang
  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      notify('Display name is required', 'danger');
      return;
    }

    const cleanSkills = skills
      .map((s) => ({ name: s.name.trim(), level: Math.min(100, Math.max(0, Number(s.level) || 0)) }))
      .filter((s) => s.name);

    const cleanEducation = education
      .map((ed) => ({
        degree: ed.degree.trim(),
        fieldOfStudy: ed.fieldOfStudy.trim(),
        institution: ed.institution.trim(),
      }))
      .filter((ed) => ed.degree || ed.fieldOfStudy || ed.institution);

    setSaving(true);
    try {
      const res = await api.put('/api/instructor/profile', {
        name: name.trim(),
        phonenumber: phonenumber.trim(),
        website: website.trim(),
        bio: bio.trim(),
        occupation: occupation.trim(),
        introduction: introduction.trim(),
        address: address.trim(),
        education: cleanEducation,
        skills: cleanSkills,
      });
      if (res.user) setCurrentUser(res.user);
      await refreshPublicCatalog();
      notify(res.message || 'Educator profile updated successfully');
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = currentUser?.pfpImg || '/media/avatar/01.jpg';

  return (
    <WorkspaceLayout
      variant="educator"
      title="Educator Profile"
      subtitle="Manage your public educator biography, avatar, academic background, and professional skills."
    >
      {loading ? (
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48, color: 'var(--ink-muted)' }}>
          Loading educator profile...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
          <div className="ch-card ch-card--pad" style={{ textAlign: 'center' }}>
            <img
              src={avatarSrc}
              alt={name || 'Educator avatar'}
              style={{
                width: 104,
                height: 104,
                borderRadius: '50%',
                objectFit: 'cover',
                margin: '0 auto 14px',
                border: '3px solid var(--teal-soft)',
              }}
            />

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

            <h2 style={{ fontSize: '1.22rem', fontWeight: 800, margin: '0 0 6px' }}>
              {name || 'Educator'}{' '}
              <FaCheckCircle style={{ color: 'var(--teal)', fontSize: '0.92rem', verticalAlign: '-1px' }} />
            </h2>
            <span className="ch-badge ch-badge--teal">Verified Educator</span>
            {occupation && <p style={{ fontSize: '0.86rem', color: 'var(--ink-muted)', marginTop: 12 }}>{occupation}</p>}

            {skills.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: 8 }}>Top Skills</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {skills.filter((s) => s.name.trim()).map((s) => (
                    <div key={s.uid}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: 3 }}>
                        <span>{s.name}</span>
                        <strong>{s.level}%</strong>
                      </div>
                      <div className="ch-progress">
                        <div className="ch-progress__bar" style={{ width: `${s.level}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <form onSubmit={handleSave} className="ch-card ch-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontSize: '1.12rem', fontWeight: 800, margin: 0 }}>Profile Information</h3>

              <div className="ch-grid-2">
                <div className="ch-field">
                  <label className="ch-label">Display Name</label>
                  <input className="ch-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="ch-field">
                  <label className="ch-label">Occupation / Headline</label>
                  <input
                    className="ch-input"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="e.g. Principal Software Architect"
                  />
                </div>
              </div>

              <div className="ch-grid-3">
                <div className="ch-field">
                  <label className="ch-label">Phone Number</label>
                  <input className="ch-input" value={phonenumber} onChange={(e) => setPhonenumber(e.target.value)} />
                </div>
                <div className="ch-field">
                  <label className="ch-label">Address</label>
                  <input className="ch-input" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="ch-field">
                  <label className="ch-label">Website</label>
                  <input className="ch-input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
                </div>
              </div>

              <div className="ch-field">
                <label className="ch-label">Educator Introduction</label>
                <textarea
                  className="ch-textarea"
                  rows={3}
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                  placeholder="Share your teaching experience and focus areas..."
                />
              </div>

              <div className="ch-field">
                <label className="ch-label">Short Bio</label>
                <textarea
                  className="ch-textarea"
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              {/* Muc trinh do hoc van (toi da 5 muc) */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong style={{ fontSize: '0.94rem', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <FaGraduationCap style={{ color: 'var(--teal)' }} /> Education ({education.length}/5)
                  </strong>
                  {education.length < 5 && (
                    <button
                      type="button"
                      onClick={() =>
                        setEducation((prev) => [
                          ...prev,
                          { uid: makeUid(), degree: '', fieldOfStudy: '', institution: '' },
                        ])
                      }
                      className="ch-btn ch-btn--sm ch-btn--outline"
                    >
                      <FaPlus size={10} /> Add Education
                    </button>
                  )}
                </div>

                {education.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', margin: 0 }}>
                    No education entries added yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {education.map((ed) => (
                      <div
                        key={ed.uid}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr auto',
                          gap: 8,
                          alignItems: 'center',
                          padding: 10,
                          borderRadius: 10,
                          background: 'var(--bg-canvas)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <input
                          className="ch-input"
                          value={ed.degree}
                          onChange={(e) =>
                            setEducation((prev) =>
                              prev.map((item) => (item.uid === ed.uid ? { ...item, degree: e.target.value } : item))
                            )
                          }
                          placeholder="Degree (e.g. M.Sc.)"
                        />
                        <input
                          className="ch-input"
                          value={ed.fieldOfStudy}
                          onChange={(e) =>
                            setEducation((prev) =>
                              prev.map((item) => (item.uid === ed.uid ? { ...item, fieldOfStudy: e.target.value } : item))
                            )
                          }
                          placeholder="Field of Study"
                        />
                        <input
                          className="ch-input"
                          value={ed.institution}
                          onChange={(e) =>
                            setEducation((prev) =>
                              prev.map((item) => (item.uid === ed.uid ? { ...item, institution: e.target.value } : item))
                            )
                          }
                          placeholder="Institution"
                        />
                        <button
                          type="button"
                          onClick={() => setEducation((prev) => prev.filter((item) => item.uid !== ed.uid))}
                          className="ch-btn ch-btn--sm ch-btn--danger-soft"
                        >
                          <FaTrash size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Muc ky nang chuyen mon (toi da 6 muc) */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong style={{ fontSize: '0.94rem', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <FaTools style={{ color: 'var(--coral)' }} /> Skills ({skills.length}/6)
                  </strong>
                  {skills.length < 6 && (
                    <button
                      type="button"
                      onClick={() => setSkills((prev) => [...prev, { uid: makeUid(), name: '', level: 85 }])}
                      className="ch-btn ch-btn--sm ch-btn--outline"
                    >
                      <FaPlus size={10} /> Add Skill
                    </button>
                  )}
                </div>

                {skills.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', margin: 0 }}>
                    No skills added yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {skills.map((sk) => (
                      <div
                        key={sk.uid}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 160px 52px auto',
                          gap: 10,
                          alignItems: 'center',
                          padding: 10,
                          borderRadius: 10,
                          background: 'var(--bg-canvas)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <input
                          className="ch-input"
                          value={sk.name}
                          onChange={(e) =>
                            setSkills((prev) =>
                              prev.map((item) => (item.uid === sk.uid ? { ...item, name: e.target.value } : item))
                            )
                          }
                          placeholder="Skill name (e.g. React 19)"
                        />
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={sk.level}
                          onChange={(e) =>
                            setSkills((prev) =>
                              prev.map((item) => (item.uid === sk.uid ? { ...item, level: Number(e.target.value) } : item))
                            )
                          }
                        />
                        <strong style={{ fontSize: '0.84rem', textAlign: 'right' }}>{sk.level}%</strong>
                        <button
                          type="button"
                          onClick={() => setSkills((prev) => prev.filter((item) => item.uid !== sk.uid))}
                          className="ch-btn ch-btn--sm ch-btn--danger-soft"
                        >
                          <FaTrash size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <button type="submit" disabled={saving} className="ch-btn ch-btn--primary">
                  {saving ? 'Saving Profile...' : 'Update Educator Profile'}
                </button>
              </div>
            </form>

            {(workExperience.length > 0 || certificates.length > 0) && (
              <div className="ch-card ch-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: '1.12rem', fontWeight: 800, margin: 0 }}>Verified Credentials</h3>

                {workExperience.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <FaBriefcase style={{ color: 'var(--teal)' }} /> Work Experience ({workExperience.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {workExperience.map((exp, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: 10,
                            borderRadius: 10,
                            background: 'var(--bg-canvas)',
                            border: '1px solid var(--border)',
                            fontSize: '0.84rem',
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>
                            {exp.position} - {exp.organization}
                          </div>
                          <div style={{ color: 'var(--ink-muted)' }}>
                            {exp.startDate} to {exp.endDate || 'Present'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {certificates.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <FaCertificate style={{ color: 'var(--coral)' }} /> Certificates ({certificates.length})
                    </div>
                    <div className="ch-grid-2">
                      {certificates.map((cert, idx) => (
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
                            background: 'var(--bg-canvas)',
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
            )}
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}
