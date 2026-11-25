import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FaHeart, FaSearch, FaShoppingBag } from 'react-icons/fa';
import CourseHubBrand from '@/components/CourseHubBrand';
import { useCourseHub } from '@/context/CourseHubContext';

// Khung giao dien cong khai gom thanh dieu huong dau trang, tim kiem va chan trang
export default function PublicLayout({ children }) {
  const { cartIds, wishlistIds, currentUser, switchRole } = useCourseHub();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Xu ly tim kiem khoa hoc tu thanh search tren header
  const handleSearch = (e) => {
    e.preventDefault();
    navigate(query.trim() ? `/courses?q=${encodeURIComponent(query.trim())}` : '/courses');
  };

  // Xac dinh duong dan trang ca nhan tuong ung voi vai tro hien tai
  const profileTarget = !currentUser
    ? '/auth/sign-up'
    : currentUser.role === 'admin'
      ? '/admin/dashboard'
      : currentUser.role === 'instructor'
        ? '/instructor/profile'
        : '/student/profile';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="ch-pub-header">
        <div className="ch-pub-header__inner">
          <CourseHubBrand to="/" />

          <nav className="ch-pub-nav">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/courses">All Courses</NavLink>
            <a
              href="/student/dashboard"
              onClick={async (e) => {
                e.preventDefault();
                await switchRole('Student');
                navigate('/student/dashboard');
              }}
            >
              Student
            </a>
            <a
              href="/instructor/dashboard"
              onClick={async (e) => {
                e.preventDefault();
                await switchRole('Educator');
                navigate('/instructor/dashboard');
              }}
            >
              Educator
            </a>
            <a
              href="/admin/dashboard"
              onClick={async (e) => {
                e.preventDefault();
                await switchRole('Admin');
                navigate('/admin/dashboard');
              }}
            >
              Admin
            </a>
          </nav>

          <form className="ch-pub-search" onSubmit={handleSearch}>
            <FaSearch size={14} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search React, Figma, Python..."
            />
          </form>

          <div className="ch-pub-actions">
            <Link to="/student/wishlist" className="ch-icon-btn" title="Wishlist">
              <FaHeart size={15} />
              {wishlistIds.length > 0 && <span className="ch-icon-btn__count">{wishlistIds.length}</span>}
            </Link>
            <Link to="/student/cart" className="ch-icon-btn" title="My Cart">
              <FaShoppingBag size={15} />
              {cartIds.length > 0 && <span className="ch-icon-btn__count">{cartIds.length}</span>}
            </Link>
            <Link to="/auth/sign-in" className="ch-btn ch-btn--sm ch-btn--outline">
              Sign In
            </Link>
            <Link to={profileTarget} className="ch-btn ch-btn--sm ch-btn--primary">
              {currentUser ? `${currentUser.name.split(' ').slice(-1)[0]} | ${currentUser.role}` : 'Sign Up'}
            </Link>
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      <footer className="ch-footer">
        <div className="ch-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 32 }}>
            <div>
              <CourseHubBrand to="/" />
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.9rem', marginTop: 12, maxWidth: 320 }}>
                CourseHub MERN Stack Platform - MongoDB, Express.js, React, and Node.js.
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-secondary)', fontWeight: 600 }}>
                Nguyen Tuan Huy (22110334) | HCMUTE
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: 12 }}>Explore</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                <Link to="/">Home Page</Link>
                <Link to="/courses">All Courses</Link>
                <Link to="/auth/sign-in">Sign In / OTP Sign Up</Link>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: 12 }}>Workspaces</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                <Link to="/student/dashboard">Student Portal</Link>
                <Link to="/student/my-courses">My Courses &amp; Learning</Link>
                <Link to="/instructor/dashboard">Educator Studio</Link>
                <Link to="/admin/dashboard">Admin Control Center</Link>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: 12 }}>Contact</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem', color: 'var(--ink-muted)' }}>
                <span>hello@coursehub.io</span>
                <span>Ho Chi Minh City, Vietnam</span>
                <span>&copy; {new Date().getFullYear()} CourseHub MERN</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
