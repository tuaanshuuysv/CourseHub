import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaBookOpen,
  FaClock,
  FaDollarSign,
  FaTicketAlt,
  FaUserCheck,
  FaUserGraduate,
} from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh tong quan he thong danh cho Quan tri vien voi KPI thuc te va bieu do doanh thu
export default function AdminDashboardPage() {
  const { currentUser, notify } = useCourseHub();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: {
      studentsCount: 0,
      instructorsCount: 0,
      coursesCount: 0,
      liveCoursesCount: 0,
      pendingCoursesCount: 0,
      pendingRequestsCount: 0,
      totalRevenue: 0,
      grossSales: 0,
    },
    revenueSeries: [],
    categoryBreakdown: [],
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/admin/dashboard');
        if (!active) return;
        setData({
          stats: res?.stats || data.stats,
          revenueSeries: res?.revenueSeries || [],
          categoryBreakdown: res?.categoryBreakdown || [],
        });
      } catch (err) {
        if (active) notify(err.message, 'danger');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [notify]);

  const revenueChart = {
    options: {
      chart: { toolbar: { show: false }, fontFamily: 'Be Vietnam Pro, sans-serif' },
      colors: ['#0f766e'],
      stroke: { curve: 'smooth', width: 3 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
      dataLabels: { enabled: false },
      xaxis: { categories: data.revenueSeries.map((r) => r.month) },
      yaxis: { labels: { formatter: (val) => `$${Math.round(val)}` } },
      grid: { borderColor: '#e4e4e7', strokeDashArray: 4 },
    },
    series: [{ name: 'Net Collected ($)', data: data.revenueSeries.map((r) => r.amount) }],
  };

  // Chi ve cac danh muc co so luong khoa hoc thuc te (> 0) de khong lam sai lech ty le bieu do
  const populatedCategories = data.categoryBreakdown.filter((c) => (c.count || 0) > 0);
  const categoryDonut = {
    options: {
      labels: populatedCategories.map((c) => c.name),
      colors: populatedCategories.map((c) => c.color || '#0f766e'),
      legend: { position: 'bottom' },
    },
    series: populatedCategories.map((c) => c.count),
  };

  const adminName = currentUser?.name || 'Administrator';

  return (
    <WorkspaceLayout
      variant="admin"
      title="Admin Control Center"
      subtitle={`Platform governance, moderation queue, and revenue analytics | ${adminName}`}
      actions={
        <Link to="/admin/coupons" className="ch-btn ch-btn--sm ch-btn--coral">
          <FaTicketAlt /> Manage Coupons
        </Link>
      }
    >
      <div className="ch-grid-4" style={{ marginBottom: 20 }}>
        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Total Students</div>
            <div className="ch-kpi__val">{data.stats.studentsCount}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)' }}>
            <FaUserGraduate />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Verified Educators</div>
            <div className="ch-kpi__val">{data.stats.instructorsCount}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--coral-soft)', color: 'var(--coral)' }}>
            <FaUserCheck />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Total Courses</div>
            <div className="ch-kpi__val">{data.stats.coursesCount}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
            <FaBookOpen />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Net Collected Revenue</div>
            <div className="ch-kpi__val">${Number(data.stats.totalRevenue || 0).toLocaleString()}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            <FaDollarSign />
          </div>
        </div>
      </div>

      {/* Hang doi cong viec can duyet nhanh danh cho Quan tri vien */}
      <div className="ch-grid-2" style={{ marginBottom: 22 }}>
        <Link
          to="/admin/instructor-requests"
          className="ch-card ch-card--pad"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ch-kpi__icon" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
              <FaClock />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.96rem' }}>
                {data.stats.pendingRequestsCount} Pending Instructor Applications
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                Review work experience, references, and certificates
              </div>
            </div>
          </div>
          <span style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Review <FaArrowRight size={11} />
          </span>
        </Link>

        <Link
          to="/admin/courses?status=Pending"
          className="ch-card ch-card--pad"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="ch-kpi__icon" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
              <FaBookOpen />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.96rem' }}>
                {data.stats.pendingCoursesCount} Courses Awaiting Moderation
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                {data.stats.liveCoursesCount} Live courses currently published on catalog
              </div>
            </div>
          </div>
          <span style={{ color: 'var(--teal)', fontWeight: 700, fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Moderate <FaArrowRight size={11} />
          </span>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 0.85fr', gap: 20 }}>
        <div className="ch-card ch-card--pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>12-Month Platform Revenue</h2>
            <Link
              to="/admin/earnings"
              style={{ fontSize: '0.82rem', color: 'var(--teal)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              Full Ledger <FaArrowRight size={10} />
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-muted)' }}>Loading revenue chart...</div>
          ) : (
            <Chart options={revenueChart.options} series={revenueChart.series} type="area" height={280} />
          )}
        </div>

        <div className="ch-card ch-card--pad">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 8 }}>Courses by Category</h2>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-muted)' }}>Loading categories...</div>
          ) : populatedCategories.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-muted)' }}>No courses categorized yet.</div>
          ) : (
            <Chart options={categoryDonut.options} series={categoryDonut.series} type="donut" height={280} />
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
}
