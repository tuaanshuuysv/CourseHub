import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaBan,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaPlayCircle,
  FaQuestionCircle,
  FaStar,
  FaTimes,
  FaUnlock,
} from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Anh xa mau huy hieu theo trang thai kiem duyet khoa hoc
function getStatusBadge(status) {
  if (status === 'Live') return 'ch-badge--success';
  if (status === 'Pending') return 'ch-badge--amber';
  if (status === 'Draft') return 'ch-badge--neutral';
  return 'ch-badge--danger';
}

// Man hinh tham dinh toan bo noi dung khoa hoc danh cho Admin: xem moi video, bai giang, dap an quiz va duyet
export default function AdminCourseDetailsPage() {
  const { id } = useParams();
  const { notify, refreshPublicCatalog } = useCourseHub();
  const [course, setCourse] = useState(null);
  const [educator, setEducator] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [activeLecture, setActiveLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/courses/${id}`);
      setCourse(res.course || null);
      setEducator(res.educator || null);
      setReviews(res.reviews || []);
      const firstLecture = (res.course?.curriculum || []).flatMap((sec) => sec.lectures || [])[0] || null;
      setActiveLecture(firstLecture);
    } catch (err) {
      setCourse(null);
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [id, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (newStatus) => {
    if (!course) return;
    setUpdating(true);
    try {
      const res = await api.patch(`/api/admin/courses/${course._id}/status`, { status: newStatus });
      setCourse((prev) => (prev ? { ...prev, status: res.course?.status || newStatus } : prev));
      await refreshPublicCatalog();
      notify(res.message);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <WorkspaceLayout variant="admin" title="Course Moderation Review" subtitle="Loading full course content...">
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48, color: 'var(--ink-muted)' }}>
          Loading curriculum, videos, and quizzes...
        </div>
      </WorkspaceLayout>
    );
  }

  if (!course) {
    return (
      <WorkspaceLayout variant="admin" title="Course Not Found" subtitle="Unable to load moderation target">
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--ink-muted)', marginBottom: 16 }}>
            This course does not exist or has been removed.
          </p>
          <Link to="/admin/courses" className="ch-btn ch-btn--primary">
            <FaArrowLeft /> Back to Courses Management
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

  const allLectures = (course.curriculum || []).flatMap((sec) => sec.lectures || []);
  const totalQuestions = allLectures.reduce((sum, lec) => sum + (lec.questions?.length || 0), 0);
  const hasDiscount =
    Boolean(course.enableDiscount) &&
    typeof course.discountPrice === 'number' &&
    course.discountPrice < course.price;
  const effectivePrice = hasDiscount ? course.discountPrice : course.price;

  return (
    <WorkspaceLayout
      variant="admin"
      title={course.title}
      subtitle={`Full Content Review | ${allLectures.length} lectures | ${totalQuestions} quiz questions`}
      actions={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/admin/courses" className="ch-btn ch-btn--sm ch-btn--outline">
            <FaArrowLeft size={11} /> Back
          </Link>
          {course.status === 'Pending' && (
            <>
              <button
                type="button"
                disabled={updating}
                onClick={() => handleStatusChange('Live')}
                className="ch-btn ch-btn--sm ch-btn--primary"
              >
                <FaCheck /> Approve &amp; Publish Live
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => handleStatusChange('Rejected')}
                className="ch-btn ch-btn--sm ch-btn--danger-soft"
              >
                <FaTimes /> Reject
              </button>
            </>
          )}
          {course.status === 'Live' && (
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange('Blocked')}
              className="ch-btn ch-btn--sm ch-btn--danger-soft"
            >
              <FaBan /> Block Course
            </button>
          )}
          {(course.status === 'Rejected' || course.status === 'Blocked') && (
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange('Live')}
              className="ch-btn ch-btn--sm ch-btn--primary"
            >
              <FaUnlock /> Approve &amp; Restore Live
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.85fr', gap: 22, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Trinh phat kiem duyet toan bo video bai giang (ca bai tra phi lan mien phi) */}
          <div className="ch-video-theater">
            <video
              key={activeLecture?._id || course.previewVideo || 'preview'}
              controls
              poster={course.thumbnail || '/media/videos/poster.jpg'}
            >
              <source src={activeLecture?.videoUrl || course.previewVideo || '/media/videos/720p.mp4'} type="video/mp4" />
            </video>
            <div
              style={{
                padding: '14px 18px',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: '0.74rem', color: '#5eead4', fontWeight: 700 }}>ADMIN INSPECTION PLAYER</div>
                <strong style={{ fontSize: '1.02rem' }}>{activeLecture?.title || 'Course Preview Video'}</strong>
              </div>
              {activeLecture && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`ch-badge ${activeLecture.isFree ? 'ch-badge--teal' : 'ch-badge--amber'}`}>
                    {activeLecture.isFree ? 'Free Preview' : 'Paid Lecture'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                    {Math.round((activeLecture.duration || 0) / 60)} min
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Kiem duyet toan bo giao trinh va dap an cau hoi trac nghiem */}
          <div className="ch-card ch-card--pad">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>
              Full Curriculum &amp; Quiz Inspection ({allLectures.length} lectures, {totalQuestions} questions)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(course.curriculum || []).map((sec, sIdx) => (
                <div key={sec._id || sIdx} style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'var(--bg-subtle)',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{sec.section}</span>
                    <span style={{ color: 'var(--ink-muted)', fontWeight: 600 }}>
                      {(sec.lectures || []).length} lectures
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {(sec.lectures || []).map((lec) => {
                      const isSelected = String(activeLecture?._id) === String(lec._id);
                      const qs = lec.questions || [];
                      return (
                        <div
                          key={lec._id}
                          style={{
                            padding: 14,
                            borderTop: '1px solid var(--border)',
                            background: isSelected ? 'var(--teal-soft)' : 'var(--bg-surface)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => setActiveLecture(lec)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                color: 'var(--ink)',
                                textAlign: 'left',
                              }}
                            >
                              <FaPlayCircle style={{ color: 'var(--teal)', flexShrink: 0 }} />
                              <span>{lec.title}</span>
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className={`ch-badge ${lec.isFree ? 'ch-badge--teal' : 'ch-badge--neutral'}`}>
                                {lec.isFree ? 'Free' : 'Paid'}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                                {Math.round((lec.duration || 0) / 60)} min
                              </span>
                              <button
                                type="button"
                                onClick={() => setActiveLecture(lec)}
                                className="ch-btn ch-btn--sm ch-btn--outline"
                              >
                                {isSelected ? 'Playing' : 'Watch Video'}
                              </button>
                            </div>
                          </div>

                          {qs.length > 0 && (
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--teal-dark)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <FaQuestionCircle /> Lecture Quiz ({qs.length} questions)
                              </div>
                              {qs.map((q, qi) => (
                                <div
                                  key={q._id || qi}
                                  style={{
                                    padding: 10,
                                    borderRadius: 10,
                                    background: 'var(--bg-canvas)',
                                    border: '1px solid var(--border)',
                                    fontSize: '0.84rem',
                                  }}
                                >
                                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                    Q{qi + 1}. {q.question}
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {(q.options || []).map((opt, oi) => {
                                      const isCorrect = opt === q.correctAnswer;
                                      return (
                                        <span
                                          key={oi}
                                          className={`ch-badge ${isCorrect ? 'ch-badge--success' : 'ch-badge--neutral'}`}
                                        >
                                          {isCorrect ? <FaCheckCircle size={10} /> : null} {opt}
                                        </span>
                                      );
                                    })}
                                  </div>
                                  {q.explanation && (
                                    <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                                      Explanation: {q.explanation}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cot ben phai: Thong tin tong quan, gia, muc tieu va giang vien */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="ch-card ch-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <img
              src={course.thumbnail || '/media/courses/01.jpg'}
              alt={course.title}
              style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 12 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span className={`ch-badge ${getStatusBadge(course.status)}`}>{course.status}</span>
              <span className="ch-badge ch-badge--teal">{course.category?.name || 'Uncategorized'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <strong style={{ fontSize: '1.65rem', color: 'var(--teal-dark)' }}>
                {effectivePrice === 0 ? 'Free' : `$${effectivePrice}`}
              </strong>
              {hasDiscount && (
                <span style={{ textDecoration: 'line-through', color: 'var(--ink-muted)' }}>${course.price}</span>
              )}
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--ink-secondary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <strong>Level:</strong> {course.level} | <strong>Language:</strong> {course.language}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FaClock size={12} /> {course.duration} {course.durationUnit?.toLowerCase()} | {course.studentsEnrolled || 0} enrolled
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FaStar style={{ color: '#f59e0b' }} />{' '}
                {course.rating?.count > 0
                  ? `${Number(course.rating.average || 0).toFixed(1)} / 5 (${course.rating.count} reviews)`
                  : 'No reviews yet'}
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.86rem', marginBottom: 4 }}>Description</div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink-secondary)', lineHeight: 1.55 }}>
                {course.description || course.subtitle}
              </p>
            </div>
            {(course.objectives || []).length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.86rem', marginBottom: 8 }}>Learning Objectives</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {course.objectives.map((obj, idx) => (
                    <div key={idx} style={{ fontSize: '0.82rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <FaCheck size={10} style={{ color: 'var(--teal)', marginTop: 4, flexShrink: 0 }} />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {educator && (
            <div className="ch-card ch-card--pad">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 12px' }}>Submitted by Educator</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={educator.avatar || '/media/avatar/01.jpg'}
                  alt={educator.name}
                  style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{educator.name}</div>
                  {educator.occupation && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--teal-dark)' }}>{educator.occupation}</div>
                  )}
                  {educator.email && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{educator.email}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {reviews.length > 0 && (
            <div className="ch-card ch-card--pad">
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 10px' }}>Student Reviews ({reviews.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviews.slice(0, 4).map((rev) => (
                  <div key={rev._id} style={{ fontSize: '0.82rem', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                    <strong>{rev.user?.name || 'Student'}</strong> ({rev.rating}/5)
                    <p style={{ margin: '4px 0 0', color: 'var(--ink-secondary)' }}>{rev.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </WorkspaceLayout>
  );
}
