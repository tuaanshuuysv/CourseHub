import { useCallback, useEffect, useState } from 'react';
import { FaCheckCircle, FaSearch } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh quan ly doi ngu giang vien da duyet va quyen truy cap he thong
export default function AdminInstructorsPage() {
  const { notify } = useCourseHub();
  const [instructors, setInstructors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/instructors?q=${encodeURIComponent(search)}`);
      setInstructors(Array.isArray(res) ? res : []);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [search, notify]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const toggleAccess = async (userId, currentActive) => {
    setBusyId(userId);
    try {
      const res = await api.patch(`/api/admin/instructors/${userId}/status`, {
        isActivated: !currentActive,
      });
      notify(res.message);
      await load();
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <WorkspaceLayout
      variant="admin"
      title="Instructors Management"
      subtitle="Manage verified educators, monitor owned courses and unique learners, and control account access."
    >
      <div className="ch-card ch-card--pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
            <FaSearch size={13} style={{ position: 'absolute', left: 13, top: 13, color: 'var(--ink-muted)' }} />
            <input
              className="ch-input"
              style={{ paddingLeft: 36 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search educator name, email, specialty..."
            />
          </div>
          <span className="ch-badge ch-badge--teal">{instructors.length} Verified Educators</span>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-muted)' }}>Loading educators...</div>
        ) : instructors.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-muted)' }}>No verified educators found.</div>
        ) : (
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Educator</th>
                  <th>Specialty</th>
                  <th>Courses</th>
                  <th>Unique Students</th>
                  <th>Status</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {instructors.map((ins) => (
                  <tr key={ins.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={ins.avatar || '/media/avatar/01.jpg'}
                          alt={ins.name}
                          style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            {ins.name} <FaCheckCircle style={{ color: 'var(--teal)' }} size={13} />
                          </strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{ins.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{ins.occupation || '-'}</td>
                    <td>
                      <strong>{ins.coursesCount}</strong>{' '}
                      <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                        ({ins.liveCoursesCount || 0} Live)
                      </span>
                    </td>
                    <td>{(ins.studentsCount || 0).toLocaleString()}</td>
                    <td>
                      <span className={`ch-badge ${ins.isActivated ? 'ch-badge--success' : 'ch-badge--danger'}`}>
                        {ins.isActivated ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={busyId === ins.id}
                        onClick={() => toggleAccess(ins.id, ins.isActivated)}
                        className={`ch-btn ch-btn--sm ${ins.isActivated ? 'ch-btn--danger-soft' : 'ch-btn--primary'}`}
                      >
                        {ins.isActivated ? 'Block' : 'Unblock'}
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
