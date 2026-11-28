import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBookOpen, FaEdit, FaEye, FaPlus, FaSearch, FaTrash } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

const STATUS_TABS = ['All', 'Live', 'Pending', 'Draft', 'Rejected', 'Blocked'];

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

// Man hinh quan ly danh sach khoa hoc so huu cua giang vien kem tim kiem, loc va xoa mem
export default function EducatorCoursesPage() {
  const { notify, refreshPublicCatalog } = useCourseHub();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('q', search.trim());
        if (statusFilter !== 'All') params.set('status', statusFilter);
        const queryStr = params.toString();
        const res = await api.get(`/api/instructor/courses${queryStr ? `?${queryStr}` : ''}`);
        if (!active) return;
        setCourses(Array.isArray(res) ? res : []);
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
  }, [search, statusFilter, notify]);

  const handleDelete = async (course) => {
    const confirmed = window.confirm(`Delete "${course.title}"? This will archive the course from your catalog.`);
    if (!confirmed) return;

    setDeletingId(course._id);
    try {
      await api.delete(`/api/instructor/courses/${course._id}`);
      setCourses((prev) => prev.filter((c) => c._id !== course._id));
      await refreshPublicCatalog();
      notify('Course deleted successfully', 'info');
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <WorkspaceLayout
      variant="educator"
      title="My Courses"
      subtitle="Search, monitor approval status, edit curriculum, or archive your owned courses."
      actions={
        <Link to="/instructor/create-course" className="ch-btn ch-btn--sm ch-btn--coral">
          <FaPlus /> New Course
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
          <div style={{ position: 'relative', width: 300, maxWidth: '100%' }}>
            <FaSearch size={13} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--ink-muted)' }} />
            <input
              className="ch-input"
              style={{ paddingLeft: 36 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your courses..."
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_TABS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`ch-btn ch-btn--sm ${statusFilter === st ? 'ch-btn--primary' : 'ch-btn--outline'}`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-muted)' }}>
            Loading your courses...
          </div>
        ) : courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 44 }}>
            <FaBookOpen size={34} style={{ color: 'var(--teal)', marginBottom: 12 }} />
            <h3>No courses found</h3>
            <p style={{ color: 'var(--ink-muted)', marginBottom: 16 }}>
              Try adjusting your filters or create a new course to publish on CourseHub.
            </p>
            <Link to="/instructor/create-course" className="ch-btn ch-btn--primary">
              <FaPlus /> Create New Course
            </Link>
          </div>
        ) : (
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Enrolled</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => {
                  const price = getEffectivePrice(c);
                  return (
                    <tr key={c._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img
                            src={c.thumbnail || '/media/courses/01.jpg'}
                            alt={c.title}
                            style={{ width: 70, height: 48, objectFit: 'cover', borderRadius: 10 }}
                          />
                          <div>
                            <div style={{ fontWeight: 700 }}>{c.title}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                              {c.category?.name || 'General'} | {c.lecturesCount || 0} lectures
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{(c.studentsEnrolled || 0).toLocaleString()}</td>
                      <td>
                        <strong>{price === 0 ? 'Free' : `$${price}`}</strong>
                      </td>
                      <td>
                        <span className={`ch-badge ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {c.status === 'Blocked' ? (
                            <span className="ch-badge ch-badge--danger">Locked by Admin</span>
                          ) : (
                            <>
                              <Link to={`/instructor/courses/${c._id}`} className="ch-btn ch-btn--sm ch-btn--outline">
                                <FaEye /> Details
                              </Link>
                              <Link to={`/instructor/edit-course/${c._id}`} className="ch-btn ch-btn--sm ch-btn--primary">
                                <FaEdit /> Edit
                              </Link>
                            </>
                          )}
                          <button
                            type="button"
                            disabled={deletingId === c._id}
                            onClick={() => handleDelete(c)}
                            className="ch-btn ch-btn--sm ch-btn--danger-soft"
                            title="Delete course"
                          >
                            <FaTrash />
                          </button>
                        </div>
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
