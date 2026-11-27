import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FaBookOpen,
  FaCheck,
  FaCheckCircle,
  FaPlayCircle,
  FaQuestionCircle,
  FaRegCircle,
  FaStar,
} from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh phong hoc truc tuyen gom trinh phat video, tien do bai giang, trac nghiem va danh gia (UC-3.6 -> UC-3.10)
export default function LearningCoursePage() {
  const { id } = useParams();
  const { enrolledIds, setStreak, notify } = useCourseHub();
  const targetId = id || enrolledIds[0] || '';

  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [note, setNote] = useState('');

  // Trang thai bai trac nghiem gan theo tung bai giang (UC-3.8)
  const [quizOpen, setQuizOpen] = useState(false);
  const [answers, setAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [checkingQuiz, setCheckingQuiz] = useState(false);

  // Trang thai gui danh gia khoa hoc (UC-3.9)
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const videoRef = useRef(null);
  const lastSavedTimeRef = useRef(0);

  // Tai du lieu phong hoc cua khoa hoc da ghi danh
  useEffect(() => {
    if (!targetId) {
      setCourse(null);
      setActiveLesson(null);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError('');
      setQuizOpen(false);
      setAnswers({});
      setQuizResult(null);
      try {
        const res = await api.get(`/api/student/learning/${targetId}`);
        if (!active) return;
        setCourse(res.course);
        setProgress(res.progress);
        if (res.streak) setStreak(res.streak);
        const all = (res.course?.curriculum || []).flatMap((m) => m.lectures || []);
        const resumed =
          all.find((l) => String(l._id) === String(res.progress?.lastLectureId)) || all[0] || null;
        setActiveLesson(resumed);
      } catch (err) {
        if (!active) return;
        setCourse(null);
        setActiveLesson(null);
        setLoadError(err.message || 'Unable to load learning studio');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [targetId, setStreak]);

  // Khoi phuc ghi chu cuc bo theo tung bai giang
  useEffect(() => {
    if (!course?._id || !activeLesson?._id) return;
    const saved = localStorage.getItem(`coursehub_note_${course._id}_${activeLesson._id}`);
    setNote(saved || '');
    lastSavedTimeRef.current = 0;
  }, [course?._id, activeLesson?._id]);

  const allLessons = useMemo(
    () => (course?.curriculum || []).flatMap((m) => m.lectures || []),
    [course]
  );

  const completedIds = useMemo(
    () =>
      (progress?.lectures || [])
        .filter((l) => l.status === 'Completed')
        .map((l) => String(l.lectureId)),
    [progress]
  );

  const activeLectureProgress = useMemo(() => {
    if (!activeLesson) return null;
    return (progress?.lectures || []).find((l) => String(l.lectureId) === String(activeLesson._id)) || null;
  }, [progress, activeLesson]);

  if (loading) {
    return (
      <WorkspaceLayout variant="student" title="Learning Studio" subtitle="Loading your classroom...">
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48, color: 'var(--ink-muted)' }}>
          Loading video studio...
        </div>
      </WorkspaceLayout>
    );
  }

  if (!targetId) {
    return (
      <WorkspaceLayout variant="student" title="Learning Studio" subtitle="Select an enrolled course to start watching">
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48 }}>
          <FaBookOpen size={36} style={{ color: 'var(--teal)', marginBottom: 12 }} />
          <h3>No enrolled courses yet</h3>
          <p style={{ color: 'var(--ink-muted)', marginBottom: 16 }}>
            Enroll in a course from the catalog to unlock videos, quizzes, and progress tracking.
          </p>
          <Link to="/student/courses" className="ch-btn ch-btn--primary">
            Browse Courses
          </Link>
        </div>
      </WorkspaceLayout>
    );
  }

  if (!course || !activeLesson) {
    return (
      <WorkspaceLayout variant="student" title="Learning Studio" subtitle="Course access required">
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48 }}>
          <h3 style={{ marginBottom: 8 }}>{loadError || 'Course content is unavailable'}</h3>
          <p style={{ color: 'var(--ink-muted)', marginBottom: 18 }}>
            Please select one of your enrolled courses or enroll in this course first.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <Link to="/student/my-courses" className="ch-btn ch-btn--primary">
              Go to My Courses
            </Link>
            <Link to={`/student/courses/${targetId}`} className="ch-btn ch-btn--outline">
              View Course Details
            </Link>
          </div>
        </div>
      </WorkspaceLayout>
    );
  }

  const pct = allLessons.length ? Math.round((completedIds.length / allLessons.length) * 100) : 0;
  const activeQuestions = activeLesson.questions || [];
  const isCurrentDone = completedIds.includes(String(activeLesson._id));

  // Chuyen sang bai giang khac va reset trang thai trac nghiem
  const selectLesson = (lecture, openQuizAfter = false) => {
    setActiveLesson(lecture);
    setAnswers({});
    setQuizResult(null);
    setQuizOpen(openQuizAfter && (lecture.questions || []).length > 0);
  };

  // Luu tien do xem video hoac danh dau hoan thanh bai giang
  const saveProgress = async (lectureId, status, lastPositionSec = 0, timeDeltaSec = 0, silent = false) => {
    try {
      const res = await api.post(`/api/student/learning/${course._id}/progress`, {
        lectureId,
        status,
        lastPositionSec: Math.max(0, Math.floor(lastPositionSec)),
        timeDeltaSec: Math.max(0, Math.floor(timeDeltaSec)),
      });
      setProgress(res.progress);
      if (res.streak) setStreak(res.streak);
      if (!silent && status === 'Completed') {
        notify('Lecture completed and Learning Streak updated!');
        if (String(lectureId) === String(activeLesson._id) && activeQuestions.length > 0) {
          setQuizOpen(true);
        }
      }
    } catch (err) {
      if (!silent) notify(err.message, 'danger');
    }
  };

  const handleVideoLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el || !activeLectureProgress?.lastPositionSec) return;
    if (activeLectureProgress.lastPositionSec > 2 && activeLectureProgress.lastPositionSec < el.duration - 3) {
      el.currentTime = activeLectureProgress.lastPositionSec;
      lastSavedTimeRef.current = activeLectureProgress.lastPositionSec;
    }
  };

  const handleVideoPause = () => {
    const el = videoRef.current;
    if (!el || isCurrentDone) return;
    const currentSec = Math.floor(el.currentTime || 0);
    const deltaSec = Math.max(0, currentSec - lastSavedTimeRef.current);
    lastSavedTimeRef.current = currentSec;
    if (currentSec > 0) {
      saveProgress(activeLesson._id, 'In_Progress', currentSec, deltaSec, true);
    }
  };

  const handleVideoEnded = () => {
    const el = videoRef.current;
    const durationSec = Math.floor(el?.duration || activeLesson.duration || 0);
    const deltaSec = Math.max(0, durationSec - lastSavedTimeRef.current);
    lastSavedTimeRef.current = durationSec;
    saveProgress(activeLesson._id, 'Completed', durationSec, deltaSec, false);
  };

  // Gui dap an trac nghiem len may chu de cham diem (UC-3.8)
  const handleCheckQuiz = async () => {
    setCheckingQuiz(true);
    try {
      const res = await api.post(`/api/student/learning/${course._id}/quiz/check`, {
        lectureId: activeLesson._id,
        answers,
      });
      setQuizResult(res);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setCheckingQuiz(false);
    }
  };

  // Luu ghi chu bai giang vao trinh duyet
  const handleSaveNote = () => {
    localStorage.setItem(`coursehub_note_${course._id}_${activeLesson._id}`, note);
    notify('Saved lesson note');
  };

  // Gui danh gia khoa hoc ngay trong phong hoc (UC-3.9)
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      notify('Please write a review comment', 'danger');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await api.post(`/api/student/courses/${course._id}/reviews`, {
        rating: ratingInput,
        description: reviewText.trim(),
      });
      setReviewText('');
      setReviewSubmitted(true);
      notify(res.message);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <WorkspaceLayout
      variant="student"
      title={course.title}
      subtitle={`Learning Studio | ${completedIds.length}/${allLessons.length} lessons completed (${pct}%)`}
    >
      <div className="ch-learning-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="ch-video-theater">
            <video
              ref={videoRef}
              key={activeLesson._id}
              controls
              poster="/media/videos/poster.jpg"
              onLoadedMetadata={handleVideoLoadedMetadata}
              onPause={handleVideoPause}
              onEnded={handleVideoEnded}
            >
              <source src={activeLesson.videoUrl || '/media/videos/720p.mp4'} type="video/mp4" />
            </video>
            <div
              style={{
                padding: '16px 20px',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#5eead4', fontWeight: 700 }}>NOW PLAYING</div>
                <strong style={{ fontSize: '1.08rem' }}>{activeLesson.title}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {activeQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuizResult(null);
                      setQuizOpen((v) => !v);
                    }}
                    className="ch-btn ch-btn--sm ch-btn--outline"
                  >
                    <FaQuestionCircle /> Lecture Quiz ({activeQuestions.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    saveProgress(
                      activeLesson._id,
                      isCurrentDone ? 'Not_Started' : 'Completed',
                      Math.floor(videoRef.current?.currentTime || 0),
                      isCurrentDone ? 0 : 60,
                      false
                    )
                  }
                  className={`ch-btn ch-btn--sm ${isCurrentDone ? 'ch-btn--primary' : 'ch-btn--coral'}`}
                >
                  {isCurrentDone ? <FaCheckCircle /> : <FaRegCircle />}
                  {isCurrentDone ? 'Completed' : 'Mark as Complete'}
                </button>
              </div>
            </div>
          </div>

          {quizOpen && activeQuestions.length > 0 && (
            <div className="ch-card ch-card--pad" style={{ borderColor: 'var(--teal)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                    Quiz: {activeLesson.title}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: 2 }}>
                    {activeQuestions.length} multiple-choice questions attached to this lecture
                  </div>
                </div>
                <button type="button" onClick={() => setQuizOpen(false)} className="ch-btn ch-btn--sm ch-btn--ghost">
                  Close
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {activeQuestions.map((q, qi) => {
                  const resItem = quizResult?.results?.find((r) => String(r.questionId) === String(q._id));
                  return (
                    <div key={q._id} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-canvas)' }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>
                        {qi + 1}. {q.question}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(q.options || []).map((opt) => (
                          <label
                            key={opt}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer' }}
                          >
                            <input
                              type="radio"
                              name={`q-${q._id}`}
                              checked={answers[String(q._id)] === opt}
                              onChange={() => setAnswers((prev) => ({ ...prev, [String(q._id)]: opt }))}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                      {resItem && (
                        <div
                          className={`ch-badge ${resItem.isCorrect ? 'ch-badge--success' : 'ch-badge--danger'}`}
                          style={{ marginTop: 10, display: 'inline-block', whiteSpace: 'normal', lineHeight: 1.45 }}
                        >
                          {resItem.isCorrect ? 'Correct!' : `Correct answer: ${resItem.correctAnswer}`}
                          {resItem.explanation ? ` - ${resItem.explanation}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button type="button" disabled={checkingQuiz} onClick={handleCheckQuiz} className="ch-btn ch-btn--primary">
                    {checkingQuiz ? 'Checking...' : 'Check Answers'}
                  </button>
                  {quizResult && (
                    <span style={{ fontWeight: 700, color: 'var(--teal-dark)' }}>
                      Score: {quizResult.score}/{quizResult.total} ({quizResult.percentage}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="ch-card ch-card--pad">
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              {[
                { key: 'overview', label: 'Lesson Overview' },
                { key: 'notes', label: 'My Notes' },
                { key: 'review', label: 'Course Review' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`ch-btn ch-btn--sm ${activeTab === t.key ? 'ch-btn--dark' : 'ch-btn--ghost'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div>
                <h3 style={{ fontSize: '1.08rem', marginBottom: 8 }}>{activeLesson.title}</h3>
                <p style={{ color: 'var(--ink-secondary)', marginBottom: 14 }}>{course.subtitle}</p>
                {(course.objectives || []).length > 0 && (
                  <div className="ch-grid-2">
                    {course.objectives.map((obj, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.88rem' }}>
                        <span className="ch-badge ch-badge--teal" style={{ padding: 5, marginTop: 2 }}>
                          <FaCheck size={9} />
                        </span>
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  className="ch-textarea"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write your personal notes for this lecture..."
                />
                <div>
                  <button type="button" onClick={handleSaveNote} className="ch-btn ch-btn--sm ch-btn--primary">
                    Save Note
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'review' && (
              <div>
                {reviewSubmitted ? (
                  <div className="ch-badge ch-badge--teal" style={{ padding: '10px 14px' }}>
                    <FaCheckCircle /> Thank you! Your review has been published on the course page.
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.94rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <FaStar style={{ color: '#f59e0b' }} /> Rate this course
                      </strong>
                      <select
                        className="ch-select"
                        style={{ width: 160 }}
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
                      rows={3}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your feedback about the lessons and instructor..."
                      required
                    />
                    <div>
                      <button type="submit" disabled={submittingReview} className="ch-btn ch-btn--sm ch-btn--primary">
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="ch-card ch-card--pad" style={{ position: 'sticky', top: 82 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Course Content</h3>
            <span className="ch-badge ch-badge--teal">{pct}%</span>
          </div>
          <div className="ch-progress" style={{ marginBottom: 16 }}>
            <div className="ch-progress__bar" style={{ width: `${pct}%` }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(course.curriculum || []).map((mod) => (
              <div key={mod._id}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--ink-secondary)', marginBottom: 8 }}>
                  {mod.section}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(mod.lectures || []).map((les) => {
                    const isDone = completedIds.includes(String(les._id));
                    const isPlaying = String(activeLesson._id) === String(les._id);
                    const qCount = (les.questions || []).length;
                    return (
                      <div key={les._id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div
                          style={{
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: `1px solid ${isPlaying ? 'var(--teal)' : 'var(--border)'}`,
                            background: isPlaying ? 'var(--teal-soft)' : 'var(--bg-surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => selectLesson(les, false)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: '0.85rem',
                              fontWeight: isPlaying ? 700 : 500,
                              color: 'var(--ink)',
                              flex: 1,
                            }}
                          >
                            <FaPlayCircle style={{ color: 'var(--teal)', flexShrink: 0 }} />
                            <span>{les.title}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => saveProgress(les._id, isDone ? 'Not_Started' : 'Completed', 0, isDone ? 0 : 60, false)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: isDone ? 'var(--success)' : 'var(--ink-muted)',
                            }}
                            title="Toggle complete"
                          >
                            {isDone ? <FaCheckCircle /> : <FaRegCircle />}
                          </button>
                        </div>

                        {qCount > 0 && (
                          <button
                            type="button"
                            onClick={() => selectLesson(les, true)}
                            style={{
                              marginLeft: 18,
                              padding: '7px 10px',
                              borderRadius: 10,
                              border: `1px dashed ${isPlaying && quizOpen ? 'var(--teal)' : 'var(--border)'}`,
                              background: isPlaying && quizOpen ? 'var(--teal-soft)' : 'var(--bg-canvas)',
                              color: 'var(--teal-dark)',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 7,
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <FaQuestionCircle size={12} />
                            <span>
                              Quiz ({qCount} {qCount === 1 ? 'question' : 'questions'})
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </WorkspaceLayout>
  );
}
