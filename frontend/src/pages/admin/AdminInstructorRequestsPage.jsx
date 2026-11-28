import { useCallback, useEffect, useState } from 'react';
import {
  FaBriefcase,
  FaCertificate,
  FaCheck,
  FaExternalLinkAlt,
  FaMapMarkerAlt,
  FaTimes,
  FaUserTie,
} from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh tham dinh don dang ky giang vien voi day du kinh nghiem lam viec, cap tren cu va anh chung chi
export default function AdminInstructorRequestsPage() {
  const { notify, refreshPublicCatalog } = useCourseHub();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/instructor-requests');
      setRequests(Array.isArray(res) ? res : []);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (id, action) => {
    setBusyId(id);
    try {
      const res = await api.patch(`/api/admin/instructor-requests/${id}`, { action });
      notify(res.message);
      await Promise.all([load(), refreshPublicCatalog()]);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <WorkspaceLayout
      variant="admin"
      title="Instructor Applications"
      subtitle="Verify applicant work history, former supervisor contacts, and uploaded certificates before approving Educator privileges."
    >
      {loading ? (
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 42, color: 'var(--ink-muted)' }}>
          Loading pending applications...
        </div>
      ) : requests.length === 0 ? (
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 42 }}>
          <FaUserTie size={32} style={{ color: 'var(--teal)', marginBottom: 10 }} />
          <h3 style={{ margin: '0 0 6px' }}>All caught up</h3>
          <p style={{ margin: 0, color: 'var(--ink-muted)' }}>There are no pending instructor applications to review.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {requests.map((req) => {
            const busy = busyId === req.id;
            const experiences = Array.isArray(req.workExperience) ? req.workExperience : [];
            const certs = Array.isArray(req.certificates) ? req.certificates : [];

            return (
              <article key={req.id} className="ch-card ch-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 16,
                    flexWrap: 'wrap',
                    paddingBottom: 14,
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <img
                      src={req.avatar || '/media/avatar/05.jpg'}
                      alt={req.name}
                      style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--teal-soft)' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800 }}>{req.name}</h3>
                        <span className="ch-badge ch-badge--amber">Pending Review</span>
                      </div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)', marginTop: 3 }}>
                        {req.email}
                        {req.phonenumber ? ` | ${req.phonenumber}` : ''}
                        {req.address ? (
                          <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <FaMapMarkerAlt size={11} /> {req.address}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 2 }}>
                        Submitted on {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAction(req.id, 'accept')}
                      className="ch-btn ch-btn--sm ch-btn--primary"
                    >
                      <FaCheck /> {busy ? 'Processing...' : 'Approve Educator'}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAction(req.id, 'reject')}
                      className="ch-btn ch-btn--sm ch-btn--danger-soft"
                    >
                      <FaTimes /> Reject
                    </button>
                  </div>
                </div>

                <div className="ch-grid-2" style={{ gap: 16 }}>
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                      Specialty / Occupation
                    </div>
                    <div style={{ fontWeight: 700, marginTop: 4 }}>{req.occupation}</div>
                  </div>
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase' }}>
                      Teaching Introduction
                    </div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--ink-secondary)', marginTop: 4 }}>{req.introduction}</div>
                  </div>
                </div>

                <div className="ch-grid-2" style={{ gap: 18, alignItems: 'start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <FaBriefcase style={{ color: 'var(--teal)' }} /> Work Experience &amp; Reference Supervisors ({experiences.length})
                    </div>
                    {experiences.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink-muted)' }}>No work experience provided.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {experiences.map((exp, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: 12,
                              borderRadius: 12,
                              background: 'var(--bg-canvas)',
                              border: '1px solid var(--border)',
                              fontSize: '0.85rem',
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>
                              {exp.position} at {exp.organization}
                            </div>
                            <div style={{ color: 'var(--ink-muted)', marginTop: 2 }}>
                              Tenure: {exp.startDate} to {exp.endDate || 'Present'}
                            </div>
                            <div style={{ color: 'var(--ink-secondary)', marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
                              Former Supervisor: <strong>{exp.supervisor?.name || '-'}</strong>
                              <div style={{ fontSize: '0.8rem', color: 'var(--teal-dark)', marginTop: 2 }}>
                                Contact: {exp.supervisor?.contact || '-'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <FaCertificate style={{ color: 'var(--coral)' }} /> Certificates &amp; Photo Proof ({certs.length})
                    </div>
                    {certs.length === 0 ? (
                      <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink-muted)' }}>No certificates uploaded.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {certs.map((cert, idx) => (
                          <a
                            key={idx}
                            href={cert.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: 10,
                              borderRadius: 12,
                              background: 'var(--bg-canvas)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <img
                              src={cert.imageUrl}
                              alt={cert.name}
                              style={{
                                width: 88,
                                height: 62,
                                objectFit: 'cover',
                                borderRadius: 8,
                                border: '1px solid var(--border)',
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{cert.name}</div>
                              <div
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--teal)',
                                  fontWeight: 600,
                                  marginTop: 4,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}
                              >
                                Inspect full image <FaExternalLinkAlt size={10} />
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </WorkspaceLayout>
  );
}
