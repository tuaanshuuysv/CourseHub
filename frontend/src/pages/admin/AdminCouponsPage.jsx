import { useCallback, useEffect, useState } from 'react';
import { FaPlus, FaSearch, FaTicketAlt, FaTrash } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh quan ly ma giam gia khuyen mai va dong bo truc tiep voi trang chu
export default function AdminCouponsPage() {
  const { notify, refreshPublicCatalog } = useCourseHub();
  const [coupons, setCoupons] = useState([]);
  const [search, setSearch] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountPercent, setDiscountPercent] = useState(20);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(() =>
    new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/coupons?q=${encodeURIComponent(search)}`);
      setCoupons(Array.isArray(res) ? res : []);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/api/admin/coupons', {
        code: code.trim().toUpperCase(),
        description: description.trim(),
        discountPercent: Number(discountPercent),
        startDate,
        expiryDate,
      });
      notify(res.message);
      setCode('');
      setDescription('');
      await Promise.all([load(), refreshPublicCatalog()]);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/api/admin/coupons/${id}/toggle`);
      notify(res.message);
      await Promise.all([load(), refreshPublicCatalog()]);
    } catch (err) {
      notify(err.message, 'danger');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/api/admin/coupons/${id}`);
      notify(res.message);
      await Promise.all([load(), refreshPublicCatalog()]);
    } catch (err) {
      notify(err.message, 'danger');
    }
  };

  return (
    <WorkspaceLayout
      variant="admin"
      title="Coupons Management"
      subtitle="Create promotional discount codes, manage active status, and monitor usage."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '350px minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
        <form onSubmit={handleCreate} className="ch-card ch-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <FaTicketAlt style={{ color: 'var(--coral)' }} /> Create Coupon
          </h2>
          <div className="ch-field">
            <label className="ch-label">Coupon Code</label>
            <input
              className="ch-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., NEWYEAR25"
              required
            />
          </div>
          <div className="ch-field">
            <label className="ch-label">Description</label>
            <input
              className="ch-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Seasonal learner promotion"
            />
          </div>
          <div className="ch-field">
            <label className="ch-label">Discount (%)</label>
            <input
              type="number"
              min={1}
              max={100}
              className="ch-input"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              required
            />
          </div>
          <div className="ch-grid-2">
            <div className="ch-field">
              <label className="ch-label">Start Date</label>
              <input type="date" className="ch-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="ch-field">
              <label className="ch-label">Expiry Date</label>
              <input type="date" className="ch-input" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
            </div>
          </div>
          <button type="submit" disabled={saving} className="ch-btn ch-btn--coral">
            <FaPlus /> {saving ? 'Creating...' : 'Create Coupon'}
          </button>
        </form>

        <div className="ch-card ch-card--pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
              <FaSearch size={13} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--ink-muted)' }} />
              <input
                className="ch-input"
                style={{ paddingLeft: 34 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search coupon code..."
              />
            </div>
            <span className="ch-badge ch-badge--teal">{coupons.filter((c) => c.isActive).length} Active</span>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-muted)' }}>Loading coupons...</div>
          ) : coupons.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-muted)' }}>No coupons found.</div>
          ) : (
            <div className="ch-table-wrap">
              <table className="ch-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Used</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((cp) => (
                    <tr key={cp._id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', fontSize: '0.95rem', color: 'var(--teal-dark)' }}>
                          {cp.code}
                        </strong>
                        {cp.description && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{cp.description}</div>
                        )}
                      </td>
                      <td>
                        <strong>{cp.discountPercent}% OFF</strong>
                      </td>
                      <td>{cp.usersUsed?.length || 0} users</td>
                      <td>{new Date(cp.expiryDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`ch-badge ${cp.isActive ? 'ch-badge--success' : 'ch-badge--neutral'}`}>
                          {cp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleToggle(cp._id)}
                            className="ch-btn ch-btn--sm ch-btn--outline"
                          >
                            {cp.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cp._id)}
                            className="ch-btn ch-btn--sm ch-btn--danger-soft"
                            title="Delete coupon"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
