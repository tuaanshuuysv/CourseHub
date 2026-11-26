import { Link } from 'react-router-dom';
import { FaClock, FaHeart, FaRegHeart, FaShoppingBag, FaStar, FaUsers } from 'react-icons/fa';
import { useCourseHub } from '@/context/CourseHubContext';

// The hien thi thong tin tom tat cua mot khoa hoc trong danh muc
export default function CourseCard({ course, basePath = '/courses', showEnrollActions = true }) {
  const { wishlistIds, toggleWishlist, addToCart, enrolledIds } = useCourseHub();
  const id = course._id || course.id;
  const isWished = wishlistIds.includes(id);
  const isEnrolled = enrolledIds.includes(id);

  const catName = typeof course.category === 'object' ? course.category?.name : course.category;
  const hasDiscount =
    Boolean(course.enableDiscount) &&
    typeof course.discountPrice === 'number' &&
    course.discountPrice < course.price;
  const effectivePrice = hasDiscount ? course.discountPrice : course.price;
  const ratingCount = course.rating?.count ?? 0;
  const ratingLabel = ratingCount > 0 ? Number(course.rating?.average || 0).toFixed(1) : 'New';

  return (
    <article className="ch-course-card">
      <div className="ch-course-card__media">
        <Link to={`${basePath}/${id}`}>
          <img src={course.thumbnail || course.image || '/media/courses/01.jpg'} alt={course.title} />
        </Link>
        <div className="ch-course-card__top-tags">
          <span
            className="ch-badge"
            style={{ background: 'rgba(24,24,27,0.78)', color: '#fff', backdropFilter: 'blur(6px)' }}
          >
            {catName || 'General'}
          </span>
          {showEnrollActions && (
            <button
              type="button"
              onClick={() => toggleWishlist(id)}
              title={isWished ? 'Remove from wishlist' : 'Save to wishlist'}
              className="ch-icon-btn"
              style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.92)' }}
            >
              {isWished ? <FaHeart style={{ color: '#ea580c' }} /> : <FaRegHeart />}
            </button>
          )}
        </div>
      </div>

      <div className="ch-course-card__body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span className="ch-badge ch-badge--teal">{course.level}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 700 }}>
            <FaStar style={{ color: '#f59e0b' }} /> {ratingLabel}
            <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>({ratingCount})</span>
          </span>
        </div>

        <Link to={`${basePath}/${id}`} className="ch-course-card__title">
          {course.title}
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
          <img
            src={course.instructor?.avatar || '/media/avatar/01.jpg'}
            alt={course.instructor?.name || 'Instructor'}
            style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
          />
          <span style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', fontWeight: 500 }}>
            {course.instructor?.name || 'Instructor'}
          </span>
        </div>

        <div className="ch-course-card__meta">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <FaClock /> {course.duration} {course.durationUnit?.toLowerCase() || 'hrs'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <FaUsers /> {(course.studentsEnrolled || 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="ch-course-card__footer">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <strong style={{ fontSize: '1.15rem', fontFamily: 'var(--font-display)', color: 'var(--teal-dark)' }}>
            {effectivePrice === 0 ? 'Free' : `$${effectivePrice}`}
          </strong>
          {hasDiscount && (
            <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', textDecoration: 'line-through' }}>
              ${course.price}
            </span>
          )}
        </div>

        {showEnrollActions ? (
          isEnrolled ? (
            <Link to={`/student/learning/${id}`} className="ch-btn ch-btn--sm ch-btn--outline">
              Continue Learning
            </Link>
          ) : (
            <button type="button" onClick={() => addToCart(id)} className="ch-btn ch-btn--sm ch-btn--primary">
              <FaShoppingBag /> Add to Cart
            </button>
          )
        ) : (
          <Link to={`${basePath}/${id}`} className="ch-btn ch-btn--sm ch-btn--outline">
            View Course
          </Link>
        )}
      </div>
    </article>
  );
}
