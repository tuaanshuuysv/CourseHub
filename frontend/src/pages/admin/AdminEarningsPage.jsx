import { useCallback, useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { useCourseHub } from '@/context/CourseHubContext';
import { api } from '@/api/client';

// Man hinh doi soat doanh thu toan san, tro gia coupon, chi tra giang vien 80% va so don hang phan trang
export default function AdminEarningsPage() {
  const { notify } = useCourseHub();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: {
      grossSales: 0,
      couponDiscounts: 0,
      netCollected: 0,
      educatorPayouts: 0,
      platformNetCommission: 0,
      completedOrdersCount: 0,
    },
    monthlyRevenue: [],
    orders: [],
    pagination: { page: 1, totalPages: 1, total: 0 },
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/earnings?page=${page}&limit=10`);
      setData({
        stats: res?.stats || data.stats,
        monthlyRevenue: res?.monthlyRevenue || [],
        orders: res?.orders || [],
        pagination: res?.pagination || { page: 1, totalPages: 1, total: 0 },
      });
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setLoading(false);
    }
  }, [page, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const chart = {
    options: {
      chart: { toolbar: { show: false }, fontFamily: 'Be Vietnam Pro, sans-serif' },
      colors: ['#0f766e'],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '48%' } },
      dataLabels: { enabled: false },
      xaxis: { categories: data.monthlyRevenue.map((s) => s.month) },
      yaxis: { labels: { formatter: (val) => `$${Math.round(val)}` } },
      grid: { borderColor: '#e4e4e7', strokeDashArray: 4 },
    },
    series: [{ name: 'Net Collected ($)', data: data.monthlyRevenue.map((s) => s.amount) }],
  };

  return (
    <WorkspaceLayout
      variant="admin"
      title="Earnings & Revenue Ledger"
      subtitle="Platform-wide financial reconciliation across gross course sales, coupon subsidies, educator payouts, and order history."
    >
      <div className="ch-grid-4" style={{ marginBottom: 22 }}>
        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Gross Course Sales</div>
            <div className="ch-kpi__val">${Number(data.stats.grossSales || 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--coral)', marginTop: 2 }}>
              Coupon Subsidy: -${Number(data.stats.couponDiscounts || 0).toLocaleString()}
            </div>
          </div>
          <span className="ch-badge ch-badge--neutral">{data.stats.completedOrdersCount || 0} Orders</span>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Net Collected</div>
            <div className="ch-kpi__val">${Number(data.stats.netCollected || 0).toLocaleString()}</div>
          </div>
          <span className="ch-badge ch-badge--success">Paid</span>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Educator Payouts</div>
            <div className="ch-kpi__val">${Number(data.stats.educatorPayouts || 0).toLocaleString()}</div>
          </div>
          <span className="ch-badge ch-badge--coral">80% Sales</span>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Platform Net Margin</div>
            <div className="ch-kpi__val" style={{ color: 'var(--teal-dark)' }}>
              ${Number(data.stats.platformNetCommission || 0).toLocaleString()}
            </div>
          </div>
          <span className="ch-badge ch-badge--teal">After Promos</span>
        </div>
      </div>

      <div className="ch-card ch-card--pad" style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 8 }}>Monthly Net Collected Revenue</h2>
        <Chart options={chart.options} series={chart.series} type="bar" height={250} />
      </div>

      <div className="ch-card ch-card--pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Order Transaction History</h2>
          <span className="ch-badge ch-badge--neutral">{data.pagination.total} Total Orders</span>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-muted)' }}>Loading order ledger...</div>
        ) : data.orders.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-muted)' }}>No orders recorded yet.</div>
        ) : (
          <>
            <div className="ch-table-wrap">
              <table className="ch-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Student</th>
                    <th>Courses</th>
                    <th>Subtotal</th>
                    <th>Coupon</th>
                    <th>Total Paid</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((ord) => (
                    <tr key={ord._id}>
                      <td>
                        <strong>#{String(ord._id).slice(-6).toUpperCase()}</strong>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div>
                          <strong>{ord.user?.name || 'Student'}</strong>
                          {ord.user?.email && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>{ord.user.email}</div>
                          )}
                        </div>
                      </td>
                      <td style={{ maxWidth: 260, fontSize: '0.84rem' }}>
                        {(ord.courses || [])
                          .map((c) => c.course?.title)
                          .filter(Boolean)
                          .join(', ') || '-'}
                      </td>
                      <td>${Number(ord.subTotal ?? ord.totalAmount ?? 0).toFixed(2)}</td>
                      <td>
                        {ord.coupon?.code ? (
                          <span className="ch-badge ch-badge--coral">
                            {ord.coupon.code} (-${Number(ord.discountAmount || 0).toFixed(2)})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--ink-muted)', fontSize: '0.82rem' }}>None</span>
                        )}
                      </td>
                      <td>
                        <strong>${Number(ord.totalAmount || 0).toFixed(2)}</strong>
                      </td>
                      <td>
                        <span className="ch-badge ch-badge--neutral">
                          {String(ord.paymentMethod || '').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`ch-badge ${ord.status === 'completed' ? 'ch-badge--success' : 'ch-badge--amber'}`}>
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.pagination.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <span style={{ fontSize: '0.84rem', color: 'var(--ink-muted)' }}>
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="ch-btn ch-btn--sm ch-btn--outline"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    className="ch-btn ch-btn--sm ch-btn--outline"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
