import { useCallback, useEffect, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh quan ly tai khoan hoc vien, khoa/mo khoa va xoa tai khoan chua xac thuc
export default function AdminStudentsPage() {
  const { notify } = useCourseHub();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/students?q=${encodeURIComponent(search)}`);
      setStudents(Array.isArray(res) ? res : []);
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

  const updateStatus = async (id, action) => {
    setBusyId(id);
    try {
      const res = await api.patch(`/api/admin/students/${id}/status`, { action });
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
      title="Students Management"
      subtitle="Monitor learner activity, block or unblock accounts, and remove unverified sign-ups."
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
              placeholder="Search student name or email..."
            />
          </div>
          <span className="ch-badge ch-badge--teal">{students.length} Students</span>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-muted)' }}>Loading students...</div>
        ) : students.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-muted)' }}>No students found.</div>
        ) : (
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Enrolled</th>
                  <th>Completed</th>
                  <th>Total Spent</th>
                  <th>Verified</th>
                  <th>Status</th>
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
                          <strong>{s.name}</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{s.enrolledCourses} courses</td>
                    <td>{s.completedCourses}</td>
                    <td>
                      <strong>${Number(s.totalSpent || 0).toLocaleString()}</strong>
                    </td>
                    <td>
                      <span className={`ch-badge ${s.isVerified ? 'ch-badge--teal' : 'ch-badge--amber'}`}>
                        {s.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td>
                      <span className={`ch-badge ${s.isActivated ? 'ch-badge--success' : 'ch-badge--danger'}`}>
                        {s.isActivated ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          disabled={busyId === s.id}
                          onClick={() => updateStatus(s.id, s.isActivated ? 'block' : 'unblock')}
                          className={`ch-btn ch-btn--sm ${s.isActivated ? 'ch-btn--danger-soft' : 'ch-btn--primary'}`}
                        >
                          {s.isActivated ? 'Block' : 'Unblock'}
                        </button>
                        {!s.isVerified && (
                          <button
                            type="button"
                            disabled={busyId === s.id}
                            onClick={() => updateStatus(s.id, 'remove')}
                            className="ch-btn ch-btn--sm ch-btn--outline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
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
