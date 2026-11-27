import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaBookOpen, FaDollarSign, FaPlus, FaStar, FaUsers } from 'react-icons/fa';
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

// Anh xa mau huy hieu trang thai khoa hoc
function getStatusBadgeClass(status) {
  if (status === 'Live') return 'ch-badge--success';
  if (status === 'Pending') return 'ch-badge--amber';
  if (status === 'Rejected' || status === 'Blocked') return 'ch-badge--danger';
  return 'ch-badge--neutral';
}

// Man hinh tong quan giang vien hien thi KPI, bieu do doanh thu 12 thang va danh sach khoa hoc so huu
export default function EducatorDashboardPage() {
  const { currentUser } = useCourseHub();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    courses: [],
    stats: {
      totalCourses: 0,
      liveCourses: 0,
      pendingCourses: 0,
      totalStudents: 0,
      totalRevenue: 0,
      averageRating: 0,
    },
    monthlyRevenue: [],
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/instructor/dashboard');
        if (!active) return;
        setData({
          courses: res.courses || [],
          stats: res.stats || {
            totalCourses: 0,
            liveCourses: 0,
            pendingCourses: 0,
            totalStudents: 0,
            totalRevenue: 0,
            averageRating: 0,
          },
          monthlyRevenue: res.monthlyRevenue || [],
        });
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

  const chartData = {
    options: {
      chart: { toolbar: { show: false }, fontFamily: 'Be Vietnam Pro, sans-serif' },
      colors: ['#0f766e'],
      stroke: { curve: 'smooth', width: 3 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.28, opacityTo: 0.03 } },
      dataLabels: { enabled: false },
      xaxis: { categories: data.monthlyRevenue.map((m) => m.month) },
      yaxis: { labels: { formatter: (val) => `$${Math.round(val)}` } },
      grid: { borderColor: '#e4e4e7', strokeDashArray: 4 },
    },
    series: [{ name: 'Net Revenue ($)', data: data.monthlyRevenue.map((m) => m.amount) }],
  };

  const educatorName = currentUser?.name || 'Educator';
  const ratingText = data.stats.averageRating > 0 ? `${data.stats.averageRating.toFixed(1)} / 5` : 'New';

  return (
    <WorkspaceLayout
      variant="educator"
      title="Educator Studio"
      subtitle={`Course performance and revenue overview | ${educatorName}`}
      actions={
        <Link to="/instructor/create-course" className="ch-btn ch-btn--sm ch-btn--coral">
          <FaPlus /> Create Course
        </Link>
      }
    >
      <div className="ch-grid-4" style={{ marginBottom: 22 }}>
        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Owned Courses</div>
            <div className="ch-kpi__val">{data.stats.totalCourses}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
            <FaBookOpen />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Total Students</div>
            <div className="ch-kpi__val">{(data.stats.totalStudents || 0).toLocaleString()}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)' }}>
            <FaUsers />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Net Revenue (80%)</div>
            <div className="ch-kpi__val">${Number(data.stats.totalRevenue || 0).toLocaleString()}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--coral-soft)', color: 'var(--coral)' }}>
            <FaDollarSign />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Average Rating</div>
            <div className="ch-kpi__val">{ratingText}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
            <FaStar />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr', gap: 20 }}>
        <div className="ch-card ch-card--pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>12-Month Net Revenue</h2>
            <Link
              to="/instructor/earnings"
              style={{ fontSize: '0.82rem', color: 'var(--teal)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              Earnings Report <FaArrowRight size={10} />
            </Link>
          </div>
          <Chart options={chartData.options} series={chartData.series} type="area" height={280} />
        </div>

        <div className="ch-card ch-card--pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>My Courses</h2>
            <Link
              to="/instructor/courses"
              style={{ fontSize: '0.82rem', color: 'var(--teal)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              Manage <FaArrowRight size={10} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.9rem' }}>
              Loading courses...
            </div>
          ) : data.courses.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-muted)', marginBottom: 12 }}>You have not created any courses yet.</p>
              <Link to="/instructor/create-course" className="ch-btn ch-btn--sm ch-btn--primary">
                Create Your First Course
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.courses.slice(0, 5).map((c) => {
                const price = getEffectivePrice(c);
                return (
                  <Link
                    key={c._id}
                    to={`/instructor/courses/${c._id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-canvas)',
                    }}
                  >
                    <img
                      src={c.thumbnail || '/media/courses/01.jpg'}
                      alt={c.title}
                      style={{ width: 64, height: 46, objectFit: 'cover', borderRadius: 8 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                        {(c.studentsEnrolled || 0).toLocaleString()} students | {price === 0 ? 'Free' : `$${price}`}
                      </div>
                    </div>
                    <span className={`ch-badge ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
