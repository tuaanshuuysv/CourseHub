import { useEffect, useState } from 'react';
import { FaEnvelope, FaEye, FaSearch, FaTimes, FaUsers } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh quan ly danh sach hoc vien ghi danh khoa hoc so huu kem loc khoa, tim kiem, sap xep va chi tiet tien do
export default function EducatorStudentsPage() {
  const { notify } = useCourseHub();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseId, setCourseId] = useState('');
  const [sort, setSort] = useState('newest');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Tai danh sach khoa hoc so huu de phuc vu bo loc hoc vien theo tung khoa
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get('/api/instructor/courses');
        if (active) setCourses(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Tai danh sach hoc vien moi khi bo loc, tim kiem hoac sap xep thay doi
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ sort });
        if (search.trim()) params.set('q', search.trim());
        if (courseId) params.set('courseId', courseId);
        const res = await api.get(`/api/instructor/students?${params.toString()}`);
        if (!active) return;
        setStudents(Array.isArray(res) ? res : []);
      } catch (err) {
        if (active) notify(err.message, 'danger');
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, courseId, sort, notify]);

  return (
    <WorkspaceLayout
      variant="educator"
      title="My Students"
      subtitle="Filter by course, search, sort, and inspect detailed learning progress for every enrolled learner."
    >
      {selectedStudent && (
        <div
          className="ch-card ch-card--pad"
          style={{ marginBottom: 20, borderColor: 'var(--teal)', background: 'var(--bg-surface)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src={selectedStudent.avatar || '/media/avatar/09.jpg'}
                alt={selectedStudent.name}
                style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0 }}>{selectedStudent.name}</h3>
                <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
                  {selectedStudent.email}
                  {selectedStudent.phonenumber ? ` | ${selectedStudent.phonenumber}` : ''}
                </div>
                {selectedStudent.address && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginTop: 2 }}>
                    Address: {selectedStudent.address}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href={`mailto:${selectedStudent.email}`} className="ch-btn ch-btn--sm ch-btn--outline">
                <FaEnvelope /> Email Student
              </a>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="ch-btn ch-btn--sm ch-btn--ghost"
                title="Close details"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.84rem', fontWeight: 700, marginBottom: 8 }}>
            Enrolled Courses Progress ({(selectedStudent.courses || []).length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(selectedStudent.courses || []).map((c) => (
              <div
                key={c.courseId}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 190px',
                  gap: 14,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.title}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>
                    Enrolled on {new Date(c.enrolledAt).toLocaleDateString()} | {c.completedLectures}/{c.totalLectures} lessons
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: 4 }}>
                    <span>Completion</span>
                    <strong>{c.percent}%</strong>
                  </div>
                  <div className="ch-progress">
                    <div className="ch-progress__bar" style={{ width: `${c.percent}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ch-card ch-card--pad">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
            <FaSearch size={13} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--ink-muted)' }} />
            <input
              className="ch-input"
              style={{ paddingLeft: 36 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student name or email..."
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="ch-select"
              style={{ width: 220 }}
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">All Owned Courses</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>

            <select
              className="ch-select"
              style={{ width: 175 }}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Sort: Newest</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="progress">Sort: Highest Progress</option>
            </select>

            <span className="ch-badge ch-badge--teal">{students.length} Learners</span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-muted)' }}>
            Loading student roster...
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 44 }}>
            <FaUsers size={34} style={{ color: 'var(--teal)', marginBottom: 10 }} />
            <h3>No students found</h3>
            <p style={{ color: 'var(--ink-muted)', margin: 0 }}>
              No learners match your current course filter or search keyword.
            </p>
          </div>
        ) : (
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Enrolled Courses</th>
                  <th>Average Progress</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={s.avatar || '/media/avatar/09.jpg'}
                          alt={s.name}
                          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700 }}>{s.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {s.enrolledCount} {s.enrolledCount === 1 ? 'course' : 'courses'}
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                        <span>Avg. progress</span>
                        <strong>{s.progress}%</strong>
                      </div>
                      <div className="ch-progress">
                        <div className="ch-progress__bar" style={{ width: `${s.progress}%` }} />
                      </div>
                    </td>
                    <td>
                      <span className={`ch-badge ${s.status === 'Active' ? 'ch-badge--success' : 'ch-badge--danger'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>{new Date(s.joinedAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(s)}
                        className="ch-btn ch-btn--sm ch-btn--outline"
                      >
                        <FaEye /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
