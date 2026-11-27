import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaPlayCircle, FaShoppingBag, FaStar, FaTrash } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh danh sach khoa hoc yeu thich cua hoc vien (UC-3.2)
export default function WishlistPage() {
  const { toggleWishlist, addToCart, enrolledIds } = useCourseHub();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/student/wishlist');
        if (!active) return;
        setItems(Array.isArray(res) ? res : []);
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

  const handleRemove = async (courseId) => {
    setRemovingId(courseId);
    try {
      await toggleWishlist(courseId);
      setItems((prev) => prev.filter((c) => c._id !== courseId));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <WorkspaceLayout
      variant="student"
      title="Saved Wishlist"
      subtitle="Courses you bookmarked to review and enroll in later."
      actions={
        <Link to="/student/courses" className="ch-btn ch-btn--sm ch-btn--outline">
          Explore More
        </Link>
      }
    >
      {loading ? (
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48, color: 'var(--ink-muted)' }}>
          Loading your wishlist...
        </div>
      ) : items.length === 0 ? (
        <div className="ch-card ch-card--pad" style={{ textAlign: 'center', padding: 48 }}>
          <FaHeart size={36} style={{ color: 'var(--coral)', marginBottom: 12 }} />
          <h3>Your wishlist is empty</h3>
          <p style={{ color: 'var(--ink-muted)' }}>Browse CourseHub to bookmark courses you want to study next.</p>
          <Link to="/student/courses" className="ch-btn ch-btn--primary" style={{ marginTop: 8 }}>
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="ch-grid-3">
          {items.map((course) => {
            const hasDiscount =
              Boolean(course.enableDiscount) &&
              typeof course.discountPrice === 'number' &&
              course.discountPrice < course.price;
            const effectivePrice = hasDiscount ? course.discountPrice : course.price;
            const ratingCount = course.rating?.count ?? 0;
            const ratingLabel = ratingCount > 0 ? Number(course.rating?.average || 0).toFixed(1) : 'New';
            const isEnrolled = enrolledIds.includes(course._id);

            return (
              <div key={course._id} className="ch-course-card">
                <div className="ch-course-card__media">
                  <Link to={`/student/courses/${course._id}`}>
                    <img src={course.thumbnail || '/media/courses/01.jpg'} alt={course.title} />
                  </Link>
                  <div className="ch-course-card__top-tags">
                    <span className="ch-badge" style={{ background: 'rgba(24,24,27,0.8)', color: '#fff' }}>
                      {course.category?.name || 'General'}
                    </span>
                    <button
                      type="button"
                      disabled={removingId === course._id}
                      onClick={() => handleRemove(course._id)}
                      className="ch-icon-btn"
                      style={{ width: 32, height: 32, background: '#fff' }}
                      title="Remove from wishlist"
                    >
                      <FaTrash size={12} style={{ color: 'var(--danger)' }} />
                    </button>
                  </div>
                </div>
                <div className="ch-course-card__body">
                  <Link to={`/student/courses/${course._id}`} className="ch-course-card__title">
                    {course.title}
                  </Link>
                  <div style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
                    By {course.instructor?.name || 'Instructor'} |{' '}
                    <FaStar style={{ color: '#f59e0b', verticalAlign: '-2px' }} /> {ratingLabel}
                  </div>
                </div>
                <div className="ch-course-card__footer">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <strong style={{ fontSize: '1.15rem', color: 'var(--teal-dark)' }}>
                      {effectivePrice === 0 ? 'Free' : `$${effectivePrice}`}
                    </strong>
                    {hasDiscount && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', textDecoration: 'line-through' }}>
                        ${course.price}
                      </span>
                    )}
                  </div>
                  {isEnrolled ? (
                    <Link to={`/student/learning/${course._id}`} className="ch-btn ch-btn--sm ch-btn--outline">
                      <FaPlayCircle /> Go to Course
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCart(course._id)}
                      className="ch-btn ch-btn--sm ch-btn--primary"
                    >
                      <FaShoppingBag /> Move to Cart
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WorkspaceLayout>
  );
}
