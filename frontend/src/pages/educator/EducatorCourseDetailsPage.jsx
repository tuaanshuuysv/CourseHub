import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCheck,
  FaCheckCircle,
  FaEdit,
  FaPlayCircle,
  FaQuestionCircle,
  FaStar,
  FaUsers,
} from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { api } from '@/api/client';

// Tinh gia ban thuc te cua khoa hoc khi co giam gia hop le
function getEffectivePrice(course) {
  const hasDiscount =
    Boolean(course.enableDiscount) &&
    typeof course.discountPrice === 'number' &&
    course.discountPrice < course.price;
  return hasDiscount ? course.discountPrice : course.price;
}

// Anh xa mau huy hieu trang thai khoa hoc
function getStatusBadgeClass(status) {
  if (status === 'Live') return 'ch-badge--success';
  if (status === 'Pending') return 'ch-badge--amber';
  if (status === 'Rejected' || status === 'Blocked') return 'ch-badge--danger';
  return 'ch-badge--neutral';
}

// Man hinh xem chi tiet khoa hoc so huu cua giang vien kem video xem truoc, cau hoi quiz va danh gia
export default function EducatorCourseDetailsPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [previewLecture, setPreviewLecture] = useState(null);
  const [openQuizLectureId, setOpenQuizLectureId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError('');
      setPreviewLecture(null);
      setOpenQuizLectureId(null);
      try {
        let targetId = id;
        if (!targetId) {
          const list = await api.get('/api/instructor/courses');
          targetId = list?.[0]?._id;
        }
        if (!targetId) {
          if (active) {
            setCourse(null);
            setLoadError('You have not created any courses yet');
          }
          return;
        }
        const res = await api.get(`/api/instructor/courses/${targetId}`);
        if (!active) return;
        setCourse(res);
      } catch (err) {
        if (!active) return;
        setCourse(null);
        setLoadError(err.message || 'Course not found');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <WorkspaceLayout variant="educator" title="Course Details" subtitle="Loading course content...">
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48, color: 'var(--ink-muted)' }}>
          Loading course details...
        </div>
      </WorkspaceLayout>
    );
  }

  if (!course) {
    return (
      <WorkspaceLayout variant="educator" title="Course Details" subtitle="Course unavailable">
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48 }}>
          <h3 style={{ marginBottom: 8 }}>{loadError || 'Course not found'}</h3>
          <p style={{ color: 'var(--ink-muted)', marginBottom: 16 }}>
            This course does not exist or does not belong to your instructor account.
          </p>
          <Link to="/instructor/courses" className="ch-btn ch-btn--primary">
            <FaArrowLeft /> Back to My Courses
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

  const effectivePrice = getEffectivePrice(course);
  const ratingCount = course.rating?.count ?? 0;
  const ratingText = ratingCount > 0 ? `${Number(course.rating?.average || 0).toFixed(1)} / 5` : 'New';
  const reviews = course.reviews || [];
  const totalQuizCount = (course.curriculum || []).reduce(
    (sum, sec) => sum + (sec.lectures || []).reduce((ls, l) => ls + (l.questions?.length || 0), 0),
    0
  );

  return (
    <WorkspaceLayout
      variant="educator"
      title="Educator Course Details"
      subtitle={course.title}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/instructor/courses" className="ch-btn ch-btn--sm ch-btn--outline">
            <FaArrowLeft /> All Courses
          </Link>
          <Link to={`/instructor/edit-course/${course._id}`} className="ch-btn ch-btn--sm ch-btn--coral">
            <FaEdit /> Edit Course
          </Link>
        </div>
      }
    >
      <div className="ch-grid-3" style={{ marginBottom: 22 }}>
        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Enrolled Learners</div>
            <div className="ch-kpi__val">{(course.studentsEnrolled || 0).toLocaleString()}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
            <FaUsers />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Course Price</div>
            <div className="ch-kpi__val">{effectivePrice === 0 ? 'Free' : `$${effectivePrice}`}</div>
          </div>
          <span className={`ch-badge ${getStatusBadgeClass(course.status)}`}>{course.status}</span>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>
              Average Rating ({ratingCount})
            </div>
            <div className="ch-kpi__val">{ratingText}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
            <FaStar />
          </div>
        </div>
      </div>

      {previewLecture && (
        <div className="ch-card ch-card--pad" style={{ marginBottom: 22, background: '#09090b', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong>Previewing: {previewLecture.title}</strong>
            <button type="button" onClick={() => setPreviewLecture(null)} className="ch-btn ch-btn--sm ch-btn--outline">
              Close Player
            </button>
          </div>
          <video key={previewLecture._id} controls autoPlay style={{ width: '100%', maxHeight: 400, borderRadius: 12 }}>
            <source src={previewLecture.videoUrl || '/media/videos/720p.mp4'} type="video/mp4" />
          </video>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.75fr', gap: 22, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="ch-card ch-card--pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Curriculum & Quizzes</h2>
              <span className="ch-badge ch-badge--teal">
                {course.lecturesCount || 0} lectures | {totalQuizCount} quiz questions
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(course.curriculum || []).map((mod, sIdx) => (
                <div key={mod._id || sIdx} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>{mod.section}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(mod.lectures || []).map((lec) => {
                      const qList = lec.questions || [];
                      const isQuizOpen = openQuizLectureId === lec._id;
                      return (
                        <div
                          key={lec._id}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: 'var(--bg-canvas)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: 600 }}>
                              <FaPlayCircle style={{ color: 'var(--teal)' }} /> {lec.title}
                              {lec.isFree && <span className="ch-badge ch-badge--teal">Free Preview</span>}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
                                {Math.round((lec.duration || 600) / 60)} min
                              </span>
                              <button
                                type="button"
                                onClick={() => setPreviewLecture(lec)}
                                className="ch-btn ch-btn--sm ch-btn--outline"
                              >
                                Play
                              </button>
                              {qList.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setOpenQuizLectureId(isQuizOpen ? null : lec._id)}
                                  className={`ch-btn ch-btn--sm ${isQuizOpen ? 'ch-btn--primary' : 'ch-btn--outline'}`}
                                >
                                  <FaQuestionCircle size={11} /> Quiz ({qList.length})
                                </button>
                              )}
                            </div>
                          </div>

                          {isQuizOpen && qList.length > 0 && (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {qList.map((q, qi) => (
                                <div key={q._id || qi} style={{ fontSize: '0.84rem', background: 'var(--bg-surface)', padding: 10, borderRadius: 8 }}>
                                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                    {qi + 1}. {q.question}
                                  </div>
                                  <div style={{ color: 'var(--teal-dark)', fontWeight: 600 }}>
                                    <FaCheckCircle style={{ verticalAlign: '-2px', marginRight: 5 }} />
                                    Answer: {q.correctAnswer}
                                  </div>
                                  {q.explanation && (
                                    <div style={{ color: 'var(--ink-muted)', marginTop: 2 }}>{q.explanation}</div>
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

          <div className="ch-card ch-card--pad">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>
              Student Reviews ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p style={{ color: 'var(--ink-muted)', margin: 0 }}>No student reviews yet for this course.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map((rev) => (
                  <div key={rev._id} style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img
                        src={rev.user?.pfpImg || '/media/avatar/03.jpg'}
                        alt={rev.user?.name || 'Student'}
                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{rev.user?.name || 'Student'}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                          <FaStar style={{ color: '#f59e0b', verticalAlign: '-2px' }} /> {rev.rating}.0 / 5
                        </div>
                      </div>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'var(--ink-secondary)' }}>
                      {rev.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="ch-card ch-card--pad" style={{ position: 'sticky', top: 84 }}>
          <img
            src={course.thumbnail || '/media/courses/01.jpg'}
            alt={course.title}
            style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 12, marginBottom: 14 }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <span className="ch-badge ch-badge--teal">{course.category?.name || 'General'}</span>
            <span className="ch-badge ch-badge--neutral">{course.level}</span>
            <span className="ch-badge ch-badge--neutral">{course.language}</span>
          </div>
          <h3 style={{ fontSize: '1.08rem', fontWeight: 800, margin: '0 0 6px' }}>{course.title}</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', margin: '0 0 14px' }}>{course.subtitle}</p>

          {(course.objectives || []).length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 14 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, marginBottom: 8 }}>Learning Objectives</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {course.objectives.map((obj, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, fontSize: '0.84rem', color: 'var(--ink-secondary)' }}>
                    <FaCheck size={10} style={{ color: 'var(--teal)', marginTop: 4, flexShrink: 0 }} />
                    <span>{obj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to={`/instructor/edit-course/${course._id}`} className="ch-btn ch-btn--coral">
              <FaEdit /> Edit Curriculum & Quizzes
            </Link>
            <Link to={`/student/learning/${course._id}`} className="ch-btn ch-btn--outline">
              <FaPlayCircle /> Open Learning Studio Preview
            </Link>
          </div>
        </aside>
      </div>
    </WorkspaceLayout>
  );
}
