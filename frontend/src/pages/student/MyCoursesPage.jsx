import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBookOpen, FaCheckCircle, FaPlay, FaSearch } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { api } from '@/api/client';

// Man hinh danh sach cac khoa hoc da ghi danh va theo doi tien do hoc tap (UC-3.5, UC-3.7)
export default function MyCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/student/my-courses');
        if (!active) return;
        setCourses(res.courses || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      const percent = c.progress?.percent ?? 0;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && percent >= 100) ||
        (statusFilter === 'in_progress' && percent < 100);
      const matchesSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.instructor?.name || '').toLowerCase().includes(q) ||
        (c.category?.name || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [courses, search, statusFilter]);

  return (
    <WorkspaceLayout
      variant="student"
      title="My Courses"
      subtitle="Track every enrolled course and resume learning right where you left off."
      actions={
        <Link to="/student/courses" className="ch-btn ch-btn--sm ch-btn--primary">
          + Enroll More
        </Link>
      }
    >
      <div className="ch-card ch-card--pad">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 18,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 300, maxWidth: '100%' }}>
              <FaSearch size={13} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--ink-muted)' }} />
              <input
                className="ch-input"
                style={{ paddingLeft: 36 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by title, category, or educator..."
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'all', label: 'All' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'completed', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`ch-btn ch-btn--sm ${statusFilter === tab.key ? 'ch-btn--primary' : 'ch-btn--outline'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <span className="ch-badge ch-badge--teal">{filtered.length} Enrolled</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-muted)' }}>
            Loading your enrolled courses...
          </div>
        ) : courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 44 }}>
            <FaBookOpen size={34} style={{ color: 'var(--teal)', marginBottom: 12 }} />
            <h3>You have not enrolled in any courses yet</h3>
            <p style={{ color: 'var(--ink-muted)', marginBottom: 16 }}>
              Explore the course catalog to start building new skills.
            </p>
            <Link to="/student/courses" className="ch-btn ch-btn--primary">
              Browse Courses
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36, color: 'var(--ink-muted)' }}>
            No enrolled courses match your current search or filter.
          </div>
        ) : (
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Educator</th>
                  <th>Progress</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const completed = c.progress?.completedLecturesCount ?? 0;
                  const total = c.progress?.totalLectures ?? c.lecturesCount ?? 0;
                  const percent = c.progress?.percent ?? 0;
                  const isCompleted = percent >= 100;
                  return (
                    <tr key={c._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img
                            src={c.thumbnail || '/media/courses/01.jpg'}
                            alt={c.title}
                            style={{ width: 72, height: 48, objectFit: 'cover', borderRadius: 10 }}
                          />
                          <div>
                            <div style={{ fontWeight: 700 }}>{c.title}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                              {c.category?.name || 'General'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{c.instructor?.name || 'Instructor'}</td>
                      <td style={{ minWidth: 185 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 5 }}>
                          <span>
                            {completed}/{total} lessons
                          </span>
                          <strong style={{ color: isCompleted ? 'var(--success)' : 'inherit' }}>
                            {isCompleted ? <FaCheckCircle style={{ verticalAlign: '-2px', marginRight: 4 }} /> : null}
                            {percent}%
                          </strong>
                        </div>
                        <div className="ch-progress">
                          <div className="ch-progress__bar" style={{ width: `${percent}%` }} />
                        </div>
                      </td>
                      <td>
                        <Link to={`/student/learning/${c._id}`} className="ch-btn ch-btn--sm ch-btn--primary">
                          <FaPlay size={10} /> {isCompleted ? 'Review' : 'Continue'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
