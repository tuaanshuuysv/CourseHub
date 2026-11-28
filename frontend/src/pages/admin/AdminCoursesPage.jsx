import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBan, FaCheck, FaEye, FaSearch, FaTimes, FaUnlock } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Tinh gia ban thuc te cua khoa hoc khi co giam gia hop le
function getEffectivePrice(course) {
  const hasDiscount =
    Boolean(course.enableDiscount) &&
    typeof course.discountPrice === 'number' &&
    course.discountPrice < course.price;
  return hasDiscount ? course.discountPrice : course.price;
}

// Anh xa kieu huy hieu theo trang thai kiem duyet cua khoa hoc
function getStatusBadge(status) {
  if (status === 'Live') return 'ch-badge--success';
  if (status === 'Pending') return 'ch-badge--amber';
  if (status === 'Draft') return 'ch-badge--neutral';
  return 'ch-badge--danger';
}

// Man hinh kiem duyet va quan ly trang thai khoa hoc toan san
export default function AdminCoursesPage() {
  const { notify, refreshPublicCatalog } = useCourseHub();
  const [courses, setCourses] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: search,
        status: statusFilter,
        page: String(page),
        limit: '10',
      });
      const res = await api.get(`/api/admin/courses?${params.toString()}`);
      setCourses(res.courses || []);
      setStatusCounts(res.statusCounts || {});
      setPagination(res.pagination || { page: 1, totalPages: 1, total: res.total || 0 });
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, notify]);

  useEffect(() => {
    const timer = setTimeout(load, 220);
    return () => clearTimeout(timer);
  }, [load]);

  const setCourseStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await api.patch(`/api/admin/courses/${id}/status`, { status: newStatus });
      notify(res.message);
      await Promise.all([load(), refreshPublicCatalog()]);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <WorkspaceLayout
      variant="admin"
      title="Courses Management"
      subtitle="Review submitted courses, approve for publication, reject, or block policy violations."
    >
      <div className="ch-grid-4" style={{ marginBottom: 20 }}>
        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>Live Courses</div>
            <div className="ch-kpi__val">{statusCounts.Live || 0}</div>
          </div>
          <span className="ch-badge ch-badge--success">Live</span>
        </div>
        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>Pending Approval</div>
            <div className="ch-kpi__val">{statusCounts.Pending || 0}</div>
          </div>
          <span className="ch-badge ch-badge--amber">Pending</span>
        </div>
        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>Rejected</div>
            <div className="ch-kpi__val">{statusCounts.Rejected || 0}</div>
          </div>
          <span className="ch-badge ch-badge--danger">Rejected</span>
        </div>
        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>Blocked</div>
            <div className="ch-kpi__val">{statusCounts.Blocked || 0}</div>
          </div>
          <span className="ch-badge ch-badge--neutral">Blocked</span>
        </div>
      </div>

      <div className="ch-card ch-card--pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
            <FaSearch size={13} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--ink-muted)' }} />
            <input
              className="ch-input"
              style={{ paddingLeft: 36 }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search course title or educator..."
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All', 'Pending', 'Live', 'Draft', 'Rejected', 'Blocked'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`ch-btn ch-btn--sm ${statusFilter === st ? 'ch-btn--dark' : 'ch-btn--outline'}`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--ink-muted)' }}>Loading courses...</div>
        ) : courses.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--ink-muted)' }}>
            No courses match the current filter.
          </div>
        ) : (
          <>
            <div className="ch-table-wrap">
              <table className="ch-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Educator</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Students</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => {
                    const price = getEffectivePrice(c);
                    const busy = updatingId === c._id;
                    return (
                      <tr key={c._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img
                              src={c.thumbnail || '/media/courses/01.jpg'}
                              alt={c.title}
                              style={{ width: 62, height: 42, objectFit: 'cover', borderRadius: 8 }}
                            />
                            <div>
                              <strong>{c.title}</strong>
                              <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>
                                {c.lecturesCount || 0} lessons | {c.level}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{c.instructor?.name || 'Educator'}</td>
                        <td>
                          <span className="ch-badge ch-badge--neutral">{c.category?.name || 'Uncategorized'}</span>
                        </td>
                        <td>
                          <strong>{price === 0 ? 'Free' : `$${price}`}</strong>
                        </td>
                        <td>{c.studentsEnrolled || 0}</td>
                        <td>
                          <span className={`ch-badge ${getStatusBadge(c.status)}`}>{c.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <Link
                              to={`/courses/${c._id}`}
                              className="ch-btn ch-btn--sm ch-btn--outline"
                              title="Inspect course syllabus"
                            >
                              <FaEye />
                            </Link>
                            {c.status === 'Pending' && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setCourseStatus(c._id, 'Live')}
                                  className="ch-btn ch-btn--sm ch-btn--primary"
                                >
                                  <FaCheck /> Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setCourseStatus(c._id, 'Rejected')}
                                  className="ch-btn ch-btn--sm ch-btn--danger-soft"
                                >
                                  <FaTimes /> Reject
                                </button>
                              </>
                            )}
                            {c.status === 'Live' && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setCourseStatus(c._id, 'Blocked')}
                                className="ch-btn ch-btn--sm ch-btn--danger-soft"
                              >
                                <FaBan /> Block
                              </button>
                            )}
                            {(c.status === 'Rejected' || c.status === 'Blocked') && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setCourseStatus(c._id, 'Live')}
                                className="ch-btn ch-btn--sm ch-btn--outline"
                              >
                                <FaUnlock /> Restore Live
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <span style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} courses)
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="ch-btn ch-btn--sm ch-btn--outline"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    className="ch-btn ch-btn--sm ch-btn--outline"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
