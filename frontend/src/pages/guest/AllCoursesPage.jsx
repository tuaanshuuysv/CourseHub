import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaList, FaSearch, FaStar, FaThLarge } from 'react-icons/fa';
import PublicLayout from '@/layouts/PublicLayout';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import CourseCard from '@/components/CourseCard';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh danh muc tat ca khoa hoc co tim kiem, bo loc, sap xep va phan trang tu backend
export default function AllCoursesPage({ insideStudent = false }) {
  const { categories } = useCourseHub();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState('All');
  const [level, setLevel] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const basePath = insideStudent ? '/student/courses' : '/courses';

  // Dong bo tu khoa tim kiem khi nguoi dung tim tu thanh header
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setPage(1);
  }, [searchParams]);

  // Goi API /api/courses moi khi bo loc, sap xep hoac trang thay doi
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (category !== 'All') params.set('category', category);
        if (level !== 'All') params.set('level', level);
        params.set('sort', sortBy);
        params.set('page', String(page));
        params.set('limit', '9');

        const res = await api.get(`/api/courses?${params.toString()}`);
        if (!active) return;
        setItems(res.courses || []);
        setPagination(res.pagination || { page: 1, limit: 9, total: 0, totalPages: 1 });
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, category, level, sortBy, page]);

  const activeCategories = categories.filter((c) => c.isActive !== false);

  const content = (
    <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
      <aside className="ch-card ch-card--pad" style={{ position: 'sticky', top: 88 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 16 }}>Filter Catalog</h3>

        <div className="ch-field" style={{ marginBottom: 18 }}>
          <label className="ch-label">Keyword</label>
          <div style={{ position: 'relative' }}>
            <FaSearch size={13} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--ink-muted)' }} />
            <input
              className="ch-input"
              style={{ paddingLeft: 34 }}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search courses..."
            />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div className="ch-label" style={{ marginBottom: 8 }}>Category</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              onClick={() => {
                setCategory('All');
                setPage(1);
              }}
              style={{
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.86rem',
                fontWeight: category === 'All' ? 700 : 500,
                background: category === 'All' ? 'var(--teal-soft)' : 'transparent',
                color: category === 'All' ? 'var(--teal-dark)' : 'var(--ink-secondary)',
              }}
            >
              All Categories
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => {
                  setCategory(cat.slug);
                  setPage(1);
                }}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  fontWeight: category === cat.slug ? 700 : 500,
                  background: category === cat.slug ? 'var(--teal-soft)' : 'transparent',
                  color: category === cat.slug ? 'var(--teal-dark)' : 'var(--ink-secondary)',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="ch-label" style={{ marginBottom: 8 }}>Difficulty Level</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['All', 'Beginner', 'Intermediate', 'Advanced'].map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => {
                  setLevel(lv);
                  setPage(1);
                }}
                className={`ch-btn ch-btn--sm ${level === lv ? 'ch-btn--primary' : 'ch-btn--outline'}`}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div>
        <div
          className="ch-card ch-card--pad"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong style={{ fontSize: '1.05rem' }}>{pagination.total} courses available</strong>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
              {loading
                ? 'Loading catalog...'
                : `Showing page ${pagination.page} of ${pagination.totalPages}`}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              className="ch-select"
              style={{ width: 175 }}
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="rating">Highest Rated</option>
              <option value="price-asc">Lowest Price</option>
              <option value="price-desc">Highest Price</option>
            </select>

            <button
              type="button"
              className={`ch-icon-btn ${viewMode === 'grid' ? 'ch-btn--primary' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <FaThLarge size={14} />
            </button>
            <button
              type="button"
              className={`ch-icon-btn ${viewMode === 'list' ? 'ch-btn--primary' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <FaList size={14} />
            </button>
          </div>
        </div>

        {!loading && items.length === 0 ? (
          <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48 }}>
            <h3 style={{ marginBottom: 8 }}>No courses found</h3>
            <p style={{ color: 'var(--ink-muted)', marginBottom: 16 }}>
              Try clearing your search keyword or selecting another category.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('All');
                setLevel('All');
                setPage(1);
              }}
              className="ch-btn ch-btn--sm ch-btn--outline"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="ch-grid-2">
            {items.map((course) => (
              <CourseCard key={course._id} course={course} basePath={basePath} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {items.map((course) => {
              const hasDiscount =
                Boolean(course.enableDiscount) &&
                typeof course.discountPrice === 'number' &&
                course.discountPrice < course.price;
              const effectivePrice = hasDiscount ? course.discountPrice : course.price;
              const ratingLabel =
                (course.rating?.count ?? 0) > 0 ? Number(course.rating.average || 0).toFixed(1) : 'New';

              return (
                <div
                  key={course._id}
                  className="ch-card ch-card--pad ch-card--hover"
                  style={{ display: 'grid', gridTemplateColumns: '210px 1fr auto', gap: 20, alignItems: 'center' }}
                >
                  <img
                    src={course.thumbnail || course.image || '/media/courses/01.jpg'}
                    alt={course.title}
                    style={{ width: 210, height: 126, objectFit: 'cover', borderRadius: 12 }}
                  />
                  <div>
                    <span className="ch-badge ch-badge--teal">
                      {course.category?.name || 'General'} | {course.level}
                    </span>
                    <Link
                      to={`${basePath}/${course._id}`}
                      style={{ display: 'block', fontSize: '1.12rem', fontWeight: 700, marginTop: 8 }}
                    >
                      {course.title}
                    </Link>
                    <p style={{ margin: '6px 0', color: 'var(--ink-muted)', fontSize: '0.88rem' }}>{course.subtitle}</p>
                    <div style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)' }}>
                      By <strong>{course.instructor?.name || 'Instructor'}</strong> | {course.duration}{' '}
                      {course.durationUnit?.toLowerCase() || 'hrs'} |{' '}
                      <FaStar style={{ color: '#f59e0b', verticalAlign: '-2px' }} /> {ratingLabel}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 800,
                        color: 'var(--teal-dark)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {effectivePrice === 0 ? 'Free' : `$${effectivePrice}`}
                    </div>
                    <Link to={`${basePath}/${course._id}`} className="ch-btn ch-btn--sm ch-btn--primary" style={{ marginTop: 10 }}>
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24 }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="ch-btn ch-btn--sm ch-btn--outline"
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center', fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="ch-btn ch-btn--sm ch-btn--outline"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (insideStudent) {
    return (
      <WorkspaceLayout
        variant="student"
        title="Browse Courses"
        subtitle="Discover new skills and add courses to your learning workspace"
      >
        {content}
      </WorkspaceLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="ch-container" style={{ paddingTop: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <span className="ch-badge ch-badge--teal">CourseHub Catalog</span>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, marginTop: 8 }}>All Courses</h1>
        </div>
        {content}
      </div>
    </PublicLayout>
  );
}
