import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaAward, FaBookOpen, FaCheckCircle, FaFire, FaHeart, FaPlay } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import CourseCard from '@/components/CourseCard';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Tao danh sach 7 ngay gan nhat (YYYY-MM-DD) de hien thi lich hoat dong hoc tap that
function buildLastSevenDays(activeDates = []) {
  const activeSet = new Set(activeDates || []);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 86400000);
    const key = date.toISOString().slice(0, 10);
    result.push({
      key,
      label: dayNames[date.getUTCDay()],
      active: activeSet.has(key),
    });
  }
  return result;
}

// Man hinh trang tong quan hoc vien hien thi thong ke tien do, chuoi ngay hoc va goi y theo danh muc Wishlist
export default function StudentDashboardPage() {
  const { currentUser, wishlistIds, streak, setStreak } = useCourseHub();
  const [myCourses, setMyCourses] = useState([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalLessons: 0,
    completedLessons: 0,
  });
  const [recommendations, setRecommendations] = useState({
    courses: [],
    basedOnCategories: [],
    hasWishlist: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);

  const wishlistKey = useMemo(() => [...wishlistIds].sort().join(','), [wishlistIds]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/student/my-courses');
        if (!active) return;
        setMyCourses(res.courses || []);
        if (res.stats) setStats(res.stats);
        if (res.streak) setStreak(res.streak);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [setStreak]);

  // Tai danh sach khoa hoc goi y theo danh muc cua cac khoa hoc trong Wishlist cua hoc vien
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingRecs(true);
      try {
        const res = await api.get('/api/student/recommendations');
        if (!active) return;
        setRecommendations({
          courses: res?.courses || [],
          basedOnCategories: res?.basedOnCategories || [],
          hasWishlist: Boolean(res?.hasWishlist),
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingRecs(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [wishlistKey]);

  const lastSevenDays = useMemo(
    () => buildLastSevenDays(streak?.activeDates || []),
    [streak?.activeDates]
  );

  const overallPercent =
    stats.totalLessons > 0
      ? Math.min(100, Math.round(((stats.completedLessons || 0) / stats.totalLessons) * 100))
      : 0;

  const studentName = currentUser?.name || 'Student';

  return (
    <WorkspaceLayout
      variant="student"
      title={`Welcome back, ${studentName}`}
      subtitle="Track your enrolled courses, daily study streak, and personalized course recommendations."
      actions={
        <Link to="/student/courses" className="ch-btn ch-btn--sm ch-btn--primary">
          Browse New Courses
        </Link>
      }
    >
      <div className="ch-grid-4" style={{ marginBottom: 22 }}>
        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Enrolled Courses</div>
            <div className="ch-kpi__val">{myCourses.length}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
            <FaBookOpen />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Lessons Finished</div>
            <div className="ch-kpi__val">{stats.completedLessons || 0}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            <FaCheckCircle />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Learning Streak</div>
            <div className="ch-kpi__val">{streak?.currentStreak ?? 0} Days</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--coral-soft)', color: 'var(--coral)' }}>
            <FaFire />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Longest Streak</div>
            <div className="ch-kpi__val">{streak?.longestStreak ?? 0} Days</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)' }}>
            <FaAward />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.95fr', gap: 20, marginBottom: 28, alignItems: 'start' }}>
        <div className="ch-card ch-card--pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.18rem', fontWeight: 800 }}>Continue Learning</h2>
            <Link
              to="/student/my-courses"
              style={{ fontSize: '0.84rem', color: 'var(--teal)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              View all <FaArrowRight size={11} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.9rem' }}>
              Loading your courses...
            </div>
          ) : myCourses.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-muted)', marginBottom: 14 }}>
                You have not enrolled in any courses yet.
              </p>
              <Link to="/student/courses" className="ch-btn ch-btn--sm ch-btn--primary">
                Explore Catalog
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {myCourses.slice(0, 4).map((c) => {
                const percent = c.progress?.percent ?? 0;
                const completed = c.progress?.completedLecturesCount ?? 0;
                const total = c.progress?.totalLectures ?? c.lecturesCount ?? 0;
                return (
                  <div
                    key={c._id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '92px 1fr auto',
                      gap: 14,
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 14,
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <img
                      src={c.thumbnail || '/media/courses/01.jpg'}
                      alt={c.title}
                      style={{ width: 92, height: 62, objectFit: 'cover', borderRadius: 10 }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{c.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', margin: '4px 0 8px' }}>
                        {completed}/{total} lessons | {percent}% complete
                      </div>
                      <div className="ch-progress">
                        <div className="ch-progress__bar" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                    <Link to={`/student/learning/${c._id}`} className="ch-btn ch-btn--sm ch-btn--primary">
                      <FaPlay size={10} /> Resume
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="ch-card ch-card--pad">
          <h2 style={{ fontSize: '1.18rem', fontWeight: 800, marginBottom: 6 }}>Learning Streak</h2>
          <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
            Active Streak: <strong>{streak?.currentStreak ?? 0} days</strong> | Completed Courses:{' '}
            <strong>{stats.completedCourses || 0}</strong>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 18 }}>
            {lastSevenDays.map((day) => (
              <div
                key={day.key}
                title={day.key}
                style={{
                  textAlign: 'center',
                  padding: '8px 4px',
                  borderRadius: 10,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: day.active ? 'var(--teal)' : 'var(--bg-subtle)',
                  color: day.active ? '#fff' : 'var(--ink-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {day.label}
              </div>
            ))}
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 8 }}>
              <span style={{ color: 'var(--ink-muted)', fontWeight: 600 }}>Overall Lesson Completion</span>
              <strong>
                {stats.completedLessons || 0}/{stats.totalLessons || 0} ({overallPercent}%)
              </strong>
            </div>
            <div className="ch-progress">
              <div className="ch-progress__bar" style={{ width: `${overallPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Recommended for You</h2>
            {recommendations.basedOnCategories.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>Based on your Wishlist:</span>
                {recommendations.basedOnCategories.map((cat) => (
                  <span
                    key={cat._id}
                    className="ch-badge"
                    style={{
                      background: `${cat.color || '#0f766e'}18`,
                      color: cat.color || 'var(--teal)',
                      fontSize: '0.74rem',
                    }}
                  >
                    {cat.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Link
            to="/student/wishlist"
            style={{ fontSize: '0.84rem', color: 'var(--teal)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <FaHeart size={11} /> Manage Wishlist
          </Link>
        </div>

        {loadingRecs ? (
          <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 28, color: 'var(--ink-muted)' }}>
            Finding courses matching your Wishlist categories...
          </div>
        ) : recommendations.courses.length > 0 ? (
          <div className="ch-grid-3">
            {recommendations.courses.map((c) => (
              <CourseCard key={c._id} course={c} basePath="/student/courses" />
            ))}
          </div>
        ) : !recommendations.hasWishlist ? (
          <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 30 }}>
            <p style={{ color: 'var(--ink-muted)', marginBottom: 14 }}>
              Save courses to your Wishlist so CourseHub can recommend more courses in the categories you care about.
            </p>
            <Link to="/student/courses" className="ch-btn ch-btn--sm ch-btn--primary">
              Explore Courses
            </Link>
          </div>
        ) : (
          <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 30 }}>
            <p style={{ color: 'var(--ink-muted)', marginBottom: 14 }}>
              You have already enrolled in or wishlisted all available courses in your favorite categories.
            </p>
            <Link to="/student/courses" className="ch-btn ch-btn--sm ch-btn--outline">
              Browse All Categories
            </Link>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
