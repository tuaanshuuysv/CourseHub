import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FaBookOpen,
  FaBriefcase,
  FaCertificate,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaGlobe,
  FaGraduationCap,
  FaHeart,
  FaLock,
  FaMapMarkerAlt,
  FaPlayCircle,
  FaRegHeart,
  FaShoppingBag,
  FaStar,
  FaUsers,
} from 'react-icons/fa';
import PublicLayout from '@/layouts/PublicLayout';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh chi tiet khoa hoc kem giao trinh, xem truoc bai giang mien phi va danh gia (UC-1.4)
export default function CourseDetailsPage({ insideStudent = false }) {
  const { id } = useParams();
  const { courses, wishlistIds, toggleWishlist, addToCart, notify } = useCourseHub();

  const targetId = id || courses[0]?._id;
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [instructorProfile, setInstructorProfile] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [openSections, setOpenSections] = useState([0]);
  const [previewUrl, setPreviewUrl] = useState('');
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Tai thong tin chi tiet khoa hoc va danh gia tu API /api/courses/:id
  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError('');
      setPreviewUrl('');
      try {
        const res = await api.get(`/api/courses/${targetId}`);
        if (!active) return;
        setCourse(res.course);
        setReviews(res.reviews || []);
        setInstructorProfile(res.instructorProfile || null);
        setIsEnrolled(Boolean(res.isEnrolled));
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
  }, [targetId]);

  const wrapPage = (node, subtitleText = '') => {
    if (insideStudent) {
      return (
        <WorkspaceLayout variant="student" title="Course Details" subtitle={subtitleText}>
          {node}
        </WorkspaceLayout>
      );
    }
    return (
      <PublicLayout>
        <div className="ch-container" style={{ paddingTop: 28 }}>
          {node}
        </div>
      </PublicLayout>
    );
  };

  if (loading) {
    return wrapPage(
      <div className="ch-card ch-card--pad" style={{ padding: 48, textAlign: 'center', color: 'var(--ink-muted)' }}>
        Loading course details...
      </div>
    );
  }

  if (!course) {
    return wrapPage(
      <div className="ch-card ch-card--pad" style={{ padding: 48, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 8 }}>{loadError || 'Course not found'}</h2>
        <p style={{ color: 'var(--ink-muted)', marginBottom: 18 }}>
          The course you requested does not exist or is currently unavailable.
        </p>
        <Link to={insideStudent ? '/student/courses' : '/courses'} className="ch-btn ch-btn--primary">
          Back to Courses Catalog
        </Link>
      </div>
    );
  }

  const isWished = wishlistIds.includes(course._id);
  const hasDiscount =
    Boolean(course.enableDiscount) &&
    typeof course.discountPrice === 'number' &&
    course.discountPrice < course.price;
  const effectivePrice = hasDiscount ? course.discountPrice : course.price;
  const ratingCount = course.rating?.count ?? 0;
  const ratingLabel = ratingCount > 0 ? Number(course.rating?.average || 0).toFixed(1) : 'New';

  // Gui danh gia khoa hoc cua hoc vien da ghi danh (UC-3.9)
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    setSubmittingReview(true);
    try {
      const res = await api.post(`/api/student/courses/${course._id}/reviews`, {
        rating: ratingInput,
        description: reviewText.trim(),
      });
      setReviews((prev) => [res.review, ...prev]);
      setReviewText('');
      notify(res.message);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSubmittingReview(false);
    }
  };

  const inner = (
    <div>
      <div
        className="ch-card"
        style={{
          background: 'linear-gradient(125deg, #18181b 0%, #115e59 100%)',
          color: '#fff',
          padding: '34px 36px',
          marginBottom: 26,
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <span className="ch-badge" style={{ background: 'rgba(20,184,166,0.22)', color: '#99f6e4' }}>
            {course.category?.name || 'General'}
          </span>
          <span className="ch-badge" style={{ background: 'rgba(249,115,22,0.22)', color: '#fdba74' }}>
            {course.level}
          </span>
        </div>
        <h1 style={{ color: '#fff', fontSize: 'clamp(1.6rem, 2.8vw, 2.25rem)', maxWidth: 820 }}>{course.title}</h1>
        <p style={{ color: '#d4d4d8', maxWidth: 740, marginTop: 10 }}>{course.subtitle}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 18, flexWrap: 'wrap', fontSize: '0.88rem' }}>
          <a
            href="#instructor-info"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#fff' }}
          >
            <img
              src={instructorProfile?.avatar || course.instructor?.avatar || '/media/avatar/01.jpg'}
              alt={instructorProfile?.name || course.instructor?.name || 'Instructor'}
              style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
            />
            <strong>{instructorProfile?.name || course.instructor?.name || 'Instructor'}</strong>
          </a>
          <span>
            <FaStar style={{ color: '#fbbf24', verticalAlign: '-2px' }} /> {ratingLabel} ({ratingCount} reviews)
          </span>
          <span>
            <FaUsers style={{ verticalAlign: '-2px' }} /> {(course.studentsEnrolled || 0).toLocaleString()} students
          </span>
          <span>
            <FaClock style={{ verticalAlign: '-2px' }} /> {course.duration} {course.durationUnit?.toLowerCase()} |{' '}
            {course.lecturesCount} lectures
          </span>
        </div>
      </div>

      {previewUrl && (
        <div className="ch-card ch-card--pad" style={{ marginBottom: 22, background: '#09090b', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong>Free Preview Player</strong>
            <button type="button" onClick={() => setPreviewUrl('')} className="ch-btn ch-btn--sm ch-btn--outline">
              Close Preview
            </button>
          </div>
          <video key={previewUrl} controls autoPlay style={{ width: '100%', maxHeight: 420, borderRadius: 12 }}>
            <source src={previewUrl} type="video/mp4" />
          </video>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.75fr', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div className="ch-card ch-card--pad">
            <h2 style={{ fontSize: '1.25rem', marginBottom: 14 }}>What you will master</h2>
            <div className="ch-grid-2">
              {(course.objectives || []).map((obj, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.92rem' }}>
                  <span className="ch-badge ch-badge--teal" style={{ padding: 6, marginTop: 2 }}>
                    <FaCheck size={10} />
                  </span>
                  <span>{obj}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ch-card ch-card--pad">
            <h2 style={{ fontSize: '1.25rem', marginBottom: 14 }}>Course Curriculum</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(course.curriculum || []).map((sec, idx) => {
                const open = openSections.includes(idx);
                return (
                  <div key={sec._id || idx} style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSections((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]))
                      }
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        background: 'var(--bg-subtle)',
                        border: 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      <span>{sec.section}</span>
                      <FaChevronDown style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    {open && (
                      <div>
                        {(sec.lectures || []).map((lec) => (
                          <div
                            key={lec._id}
                            style={{
                              padding: '12px 16px',
                              borderTop: '1px solid var(--border)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.9rem',
                            }}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                              {lec.isFree || isEnrolled ? (
                                <FaPlayCircle style={{ color: 'var(--teal)' }} />
                              ) : (
                                <FaLock style={{ color: 'var(--ink-muted)' }} />
                              )}
                              {lec.title}
                              {lec.isFree && lec.videoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewUrl(lec.videoUrl)}
                                  className="ch-badge ch-badge--teal"
                                  style={{ border: 'none', cursor: 'pointer' }}
                                >
                                  Preview Free
                                </button>
                              )}
                            </span>
                            <span style={{ color: 'var(--ink-muted)', fontSize: '0.82rem' }}>
                              {Math.round((lec.duration || 600) / 60)} min
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {instructorProfile && (
            <div id="instructor-info" className="ch-card ch-card--pad">
              <h2 style={{ fontSize: '1.25rem', marginBottom: 16 }}>About the Instructor</h2>

              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
                <img
                  src={instructorProfile.avatar || '/media/avatar/01.jpg'}
                  alt={instructorProfile.name}
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid var(--teal-soft)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800 }}>{instructorProfile.name}</h3>
                    {instructorProfile.isApproved && (
                      <span className="ch-badge ch-badge--teal">
                        <FaCheckCircle size={11} /> Verified Educator
                      </span>
                    )}
                  </div>
                  {instructorProfile.occupation && (
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--teal-dark)', marginTop: 4 }}>
                      {instructorProfile.occupation}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 14,
                      fontSize: '0.82rem',
                      color: 'var(--ink-muted)',
                      marginTop: 8,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <FaBookOpen style={{ color: 'var(--teal)' }} />{' '}
                      <strong>{instructorProfile.stats?.liveCoursesCount ?? 0}</strong> Live Courses
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <FaUsers style={{ color: 'var(--indigo)' }} />{' '}
                      <strong>{(instructorProfile.stats?.studentsCount ?? 0).toLocaleString()}</strong> Students
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <FaStar style={{ color: '#f59e0b' }} />{' '}
                      <strong>
                        {instructorProfile.stats?.averageRating > 0
                          ? `${Number(instructorProfile.stats.averageRating).toFixed(1)} / 5`
                          : 'New'}
                      </strong>
                      {instructorProfile.stats?.reviewsCount > 0 && ` (${instructorProfile.stats.reviewsCount} reviews)`}
                    </span>
                    {instructorProfile.address && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <FaMapMarkerAlt /> {instructorProfile.address}
                      </span>
                    )}
                    {instructorProfile.website && (
                      <a
                        href={instructorProfile.website}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--teal)', fontWeight: 600 }}
                      >
                        <FaGlobe /> Website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {(instructorProfile.introduction || instructorProfile.bio) && (
                <p style={{ margin: '0 0 16px', fontSize: '0.92rem', color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
                  {instructorProfile.introduction || instructorProfile.bio}
                </p>
              )}

              {(instructorProfile.skills || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {instructorProfile.skills.map((sk, idx) => (
                    <span key={idx} className="ch-badge ch-badge--neutral">
                      {sk.name}
                    </span>
                  ))}
                </div>
              )}

              {((instructorProfile.education || []).length > 0 ||
                (instructorProfile.workExperience || []).length > 0) && (
                <div className="ch-grid-2" style={{ gap: 14, marginBottom: (instructorProfile.certificates || []).length > 0 ? 16 : 0 }}>
                  {(instructorProfile.workExperience || []).length > 0 && (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <FaBriefcase style={{ color: 'var(--teal)' }} /> Experience
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {instructorProfile.workExperience.slice(0, 3).map((exp, idx) => (
                          <div key={idx} style={{ fontSize: '0.82rem' }}>
                            <div style={{ fontWeight: 700 }}>{exp.position}</div>
                            <div style={{ color: 'var(--ink-muted)' }}>
                              {exp.organization} | {exp.startDate} - {exp.endDate || 'Present'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(instructorProfile.education || []).length > 0 && (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <FaGraduationCap style={{ color: 'var(--indigo)' }} /> Education
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {instructorProfile.education.map((ed, idx) => (
                          <div key={idx} style={{ fontSize: '0.82rem' }}>
                            <div style={{ fontWeight: 700 }}>
                              {[ed.degree, ed.fieldOfStudy].filter(Boolean).join(' - ')}
                            </div>
                            <div style={{ color: 'var(--ink-muted)' }}>{ed.institution}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(instructorProfile.certificates || []).length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <FaCertificate style={{ color: 'var(--coral)' }} /> Verified Certificates
                  </div>
                  <div className="ch-grid-2" style={{ gap: 10 }}>
                    {instructorProfile.certificates.map((cert, idx) => (
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
                          style={{ width: 54, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{cert.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="ch-card ch-card--pad">
            <h2 style={{ fontSize: '1.25rem', marginBottom: 14 }}>Student Reviews ({reviews.length})</h2>
            <form
              onSubmit={handleReviewSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 18,
                padding: 14,
                borderRadius: 12,
                background: 'var(--bg-canvas)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <strong style={{ fontSize: '0.9rem' }}>Rate this course</strong>
                <select
                  className="ch-select"
                  style={{ width: 155 }}
                  value={ratingInput}
                  onChange={(e) => setRatingInput(Number(e.target.value))}
                >
                  <option value={5}>5 Stars (5/5)</option>
                  <option value={4}>4 Stars (4/5)</option>
                  <option value={3}>3 Stars (3/5)</option>
                  <option value={2}>2 Stars (2/5)</option>
                  <option value={1}>1 Star (1/5)</option>
                </select>
              </div>
              <textarea
                className="ch-textarea"
                rows={2}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your learning experience (requires enrollment)..."
              />
              <div>
                <button type="submit" disabled={submittingReview} className="ch-btn ch-btn--sm ch-btn--primary">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>

            {reviews.length === 0 ? (
              <p style={{ color: 'var(--ink-muted)', margin: 0 }}>No reviews yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reviews.map((rev) => (
                  <div key={rev._id} style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img
                        src={rev.user?.pfpImg || '/media/avatar/03.jpg'}
                        alt={rev.user?.name || 'Student'}
                        style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <strong style={{ fontSize: '0.92rem' }}>{rev.user?.name || 'Student'}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FaStar style={{ color: '#f59e0b' }} /> {rev.rating}.0 / 5
                        </div>
                      </div>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '0.92rem', color: 'var(--ink-secondary)' }}>{rev.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="ch-card ch-card--pad" style={{ position: 'sticky', top: 88 }}>
          <img
            src={course.thumbnail || course.image || '/media/courses/01.jpg'}
            alt={course.title}
            style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 14, marginBottom: 18 }}
          />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
            <strong style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', color: 'var(--teal-dark)' }}>
              {effectivePrice === 0 ? 'Free' : `$${effectivePrice}`}
            </strong>
            {hasDiscount && (
              <span style={{ textDecoration: 'line-through', color: 'var(--ink-muted)' }}>${course.price}</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isEnrolled ? (
              <Link to={`/student/learning/${course._id}`} className="ch-btn ch-btn--primary ch-btn--lg">
                <FaPlayCircle /> Go to Learning Studio
              </Link>
            ) : (
              <>
                <button type="button" onClick={() => addToCart(course._id)} className="ch-btn ch-btn--primary ch-btn--lg">
                  <FaShoppingBag /> Add to Cart
                </button>
                <Link to="/student/cart" onClick={() => addToCart(course._id)} className="ch-btn ch-btn--coral">
                  Buy Now
                </Link>
              </>
            )}
            <button type="button" onClick={() => toggleWishlist(course._id)} className="ch-btn ch-btn--outline">
              {isWished ? <FaHeart style={{ color: 'var(--coral)' }} /> : <FaRegHeart />}
              {isWished ? 'Saved in Wishlist' : 'Save to Wishlist'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );

  return wrapPage(inner, course.title);
}
