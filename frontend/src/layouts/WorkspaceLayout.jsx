import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  FaBookOpen,
  FaChartLine,
  FaCog,
  FaCompass,
  FaFolderOpen,
  FaGraduationCap,
  FaHeart,
  FaHome,
  FaLayerGroup,
  FaPlusCircle,
  FaShoppingBag,
  FaSignOutAlt,
  FaTicketAlt,
  FaUser,
  FaUserCheck,
  FaUserGraduate,
  FaUsers,
} from 'react-icons/fa';
import CourseHubBrand from '@/components/CourseHubBrand';
import { useCourseHub } from '@/context/CourseHubContext';

// Cau hinh danh muc dieu huong sidebar cho 3 khong gian lam viec (Student, Educator, Admin)
const MENUS = {
  student: [
    {
      group: 'Learning Space',
      items: [
        { label: 'Student Home', to: '/student/dashboard', icon: <FaHome /> },
        { label: 'Browse Courses', to: '/student/courses', icon: <FaCompass /> },
        { label: 'My Courses', to: '/student/my-courses', icon: <FaBookOpen /> },
        { label: 'Learning Studio', to: '/student/learning', icon: <FaGraduationCap /> },
      ],
    },
    {
      group: 'Shopping & Account',
      items: [
        { label: 'Wishlist', to: '/student/wishlist', icon: <FaHeart /> },
        { label: 'My Cart', to: '/student/cart', icon: <FaShoppingBag /> },
        { label: 'My Profile', to: '/student/profile', icon: <FaUser /> },
      ],
    },
  ],
  educator: [
    {
      group: 'Educator Studio',
      items: [
        { label: 'Dashboard', to: '/instructor/dashboard', icon: <FaHome /> },
        { label: 'My Courses', to: '/instructor/courses', icon: <FaBookOpen /> },
        { label: 'Create Course', to: '/instructor/create-course', icon: <FaPlusCircle /> },
        { label: 'Edit Course', to: '/instructor/edit-course', icon: <FaLayerGroup /> },
      ],
    },
    {
      group: 'Audience & Finance',
      items: [
        { label: 'My Students', to: '/instructor/students', icon: <FaUsers /> },
        { label: 'Earnings Report', to: '/instructor/earnings', icon: <FaChartLine /> },
        { label: 'My Profile', to: '/instructor/profile', icon: <FaUser /> },
        { label: 'Settings', to: '/instructor/settings', icon: <FaCog /> },
      ],
    },
  ],
  admin: [
    {
      group: 'Overview',
      items: [{ label: 'Dashboard', to: '/admin/dashboard', icon: <FaHome /> }],
    },
    {
      group: 'Catalog & Promos',
      items: [
        { label: 'Courses Mgmt', to: '/admin/courses', icon: <FaBookOpen /> },
        { label: 'Categories Mgmt', to: '/admin/categories', icon: <FaFolderOpen /> },
        { label: 'Coupons Mgmt', to: '/admin/coupons', icon: <FaTicketAlt /> },
      ],
    },
    {
      group: 'People',
      items: [
        { label: 'Students Mgmt', to: '/admin/students', icon: <FaUserGraduate /> },
        { label: 'Instructors Mgmt', to: '/admin/instructors', icon: <FaUsers /> },
        { label: 'Instructor Requests', to: '/admin/instructor-requests', icon: <FaUserCheck /> },
      ],
    },
    {
      group: 'Finance & System',
      items: [
        { label: 'Earnings Report', to: '/admin/earnings', icon: <FaChartLine /> },
        { label: 'Settings', to: '/admin/settings', icon: <FaCog /> },
      ],
    },
  ],
};

// Khung giao dien bang dieu khien chung cho 3 vai tro Hoc vien, Giang vien va Quan tri vien
export default function WorkspaceLayout({ variant = 'student', title, subtitle, actions, children }) {
  const { cartIds, wishlistIds, currentUser, signOut } = useCourseHub();
  const navigate = useNavigate();
  const isDarkSidebar = variant === 'educator' || variant === 'admin';
  const roleLabel = variant === 'educator' ? 'Educator' : variant === 'admin' ? 'Admin' : 'Student';
  const groups = MENUS[variant] || MENUS.student;

  const avatar =
    currentUser?.pfpImg ||
    (variant === 'educator' ? '/media/avatar/01.jpg' : variant === 'admin' ? '/media/avatar/02.jpg' : '/media/avatar/09.jpg');
  const displayName = currentUser?.name || 'Account';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="ch-shell" style={{ flex: 1 }}>
        <aside className={`ch-sidebar ch-sidebar--${variant}`}>
          <div style={{ padding: '4px 10px 18px', borderBottom: `1px solid ${isDarkSidebar ? 'rgba(255,255,255,0.1)' : 'var(--border)'}` }}>
            <CourseHubBrand to="/" dark={isDarkSidebar} />
          </div>

          <div
            style={{
              margin: '16px 6px 8px',
              padding: '12px',
              borderRadius: '14px',
              background: isDarkSidebar ? 'rgba(255,255,255,0.06)' : 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <img
              src={avatar}
              alt={displayName}
              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.73rem', opacity: 0.78 }}>{roleLabel} Workspace</div>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {groups.map((grp) => (
              <div key={grp.group}>
                <div className="ch-sidebar__group">{grp.group}</div>
                <nav className="ch-sidebar__nav">
                  {grp.items.map((item) => (
                    <NavLink key={item.to} to={item.to} className="ch-sidebar__link">
                      <span style={{ fontSize: '0.95rem', display: 'inline-flex' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          <div style={{ paddingTop: 14, borderTop: `1px solid ${isDarkSidebar ? 'rgba(255,255,255,0.1)' : 'var(--border)'}` }}>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/auth/sign-in');
              }}
              className="ch-sidebar__link"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isDarkSidebar ? '#fca5a5' : 'var(--danger)',
              }}
            >
              <FaSignOutAlt />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <div className="ch-main">
          <header className="ch-topbar">
            <div>
              <h1 style={{ fontSize: '1.28rem', fontWeight: 800 }}>{title}</h1>
              {subtitle && <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink-muted)' }}>{subtitle}</p>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {actions}
              {variant === 'student' && (
                <>
                  <Link to="/student/wishlist" className="ch-icon-btn" title="Wishlist">
                    <FaHeart size={14} />
                    {wishlistIds.length > 0 && <span className="ch-icon-btn__count">{wishlistIds.length}</span>}
                  </Link>
                  <Link to="/student/cart" className="ch-icon-btn" title="My Cart">
                    <FaShoppingBag size={14} />
                    {cartIds.length > 0 && <span className="ch-icon-btn__count">{cartIds.length}</span>}
                  </Link>
                </>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '5px 12px 5px 6px',
                  borderRadius: 999,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <img src={avatar} alt={displayName} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ lineHeight: 1.15 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{displayName}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--teal)', fontWeight: 700 }}>{roleLabel}</div>
                </div>
              </div>
            </div>
          </header>

          <main className="ch-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
