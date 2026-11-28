import { useCallback, useEffect, useState } from 'react';
import { FaEdit, FaPlus, FaSearch, FaTrash } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh quan ly danh muc khoa hoc CRUD kem kiem tra rang buoc truoc khi xoa
export default function AdminCategoriesPage() {
  const { notify, refreshPublicCatalog } = useCourseHub();
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0f766e');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/categories?q=${encodeURIComponent(search)}`);
      setCategories(Array.isArray(res) ? res : []);
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

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setColor('#0f766e');
    setIsActive(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      notify('Category name is required', 'danger');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const res = await api.put(`/api/admin/categories/${editingId}`, {
          name: name.trim(),
          description: description.trim(),
          color,
          isActive,
        });
        notify(res.message);
      } else {
        const res = await api.post('/api/admin/categories', {
          name: name.trim(),
          description: description.trim(),
          color,
        });
        notify(res.message);
      }
      resetForm();
      await Promise.all([load(), refreshPublicCatalog()]);
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    try {
      const res = await api.delete(`/api/admin/categories/${cat._id}`);
      notify(res.message);
      if (editingId === cat._id) resetForm();
      await Promise.all([load(), refreshPublicCatalog()]);
    } catch (err) {
      notify(err.message, 'danger');
    }
  };

  return (
    <WorkspaceLayout
      variant="admin"
      title="Categories Management"
      subtitle="Create, update, organize, and safely remove course disciplines across CourseHub."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
        <form onSubmit={handleSubmit} className="ch-card ch-card--pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
            {editingId ? 'Edit Category' : 'Add New Category'}
          </h2>
          <div className="ch-field">
            <label className="ch-label">Category Name</label>
            <input
              className="ch-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Product Management"
              required
            />
          </div>
          <div className="ch-field">
            <label className="ch-label">Description</label>
            <textarea
              className="ch-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary of courses in this track..."
            />
          </div>
          <div className="ch-field">
            <label className="ch-label">Accent Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 54, height: 36, border: 'none', background: 'none', cursor: 'pointer' }}
              />
              <code style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>{color}</code>
            </div>
          </div>
          {editingId && (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.88rem', fontWeight: 600 }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Visible on public catalog
            </label>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} className="ch-btn ch-btn--primary" style={{ flex: 1 }}>
              <FaPlus /> {saving ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="ch-btn ch-btn--outline">
                Cancel
              </button>
            )}
          </div>
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
                placeholder="Search categories..."
              />
            </div>
            <span className="ch-badge ch-badge--teal">{categories.length} Categories</span>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-muted)' }}>Loading categories...</div>
          ) : (
            <div className="ch-table-wrap">
              <table className="ch-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Slug</th>
                    <th>Courses</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 12, height: 12, borderRadius: 4, background: cat.color || '#0f766e', flexShrink: 0 }} />
                          <div>
                            <strong>{cat.name}</strong>
                            {cat.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{cat.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>{cat.slug}</code>
                      </td>
                      <td>{cat.coursesCount || 0}</td>
                      <td>
                        <span className={`ch-badge ${cat.isActive !== false ? 'ch-badge--success' : 'ch-badge--neutral'}`}>
                          {cat.isActive !== false ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(cat._id);
                              setName(cat.name);
                              setDescription(cat.description || '');
                              setColor(cat.color || '#0f766e');
                              setIsActive(cat.isActive !== false);
                            }}
                            className="ch-btn ch-btn--sm ch-btn--outline"
                            title="Edit category"
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat)}
                            className="ch-btn ch-btn--sm ch-btn--danger-soft"
                            title="Delete category"
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
