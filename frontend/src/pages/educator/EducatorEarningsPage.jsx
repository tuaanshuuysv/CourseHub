import { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { FaCalendarAlt, FaChartLine, FaDollarSign, FaReceipt } from 'react-icons/fa';
import WorkspaceLayout from '@/layouts/WorkspaceLayout';
import { api } from '@/api/client';

// Man hinh bao cao doanh thu, thu nhap thang/tron doi, doanh thu theo tung khoa va so giao dich
export default function EducatorEarningsPage() {
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({
    thisMonthNet: 0,
    lifetimeNet: 0,
    lifetimeGross: 0,
    platformFees: 0,
    byCourse: [],
    ledger: [],
  });
  const [monthly, setMonthly] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [eRes, dRes] = await Promise.all([
          api.get('/api/instructor/earnings'),
          api.get('/api/instructor/dashboard'),
        ]);
        if (!active) return;
        setEarnings({
          thisMonthNet: eRes.thisMonthNet || 0,
          lifetimeNet: eRes.lifetimeNet || 0,
          lifetimeGross: eRes.lifetimeGross || 0,
          platformFees: eRes.platformFees || 0,
          byCourse: eRes.byCourse || [],
          ledger: eRes.ledger || [],
        });
        setMonthly(dRes.monthlyRevenue || []);
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

  const barChart = {
    options: {
      chart: { toolbar: { show: false }, fontFamily: 'Be Vietnam Pro, sans-serif' },
      colors: ['#0f766e'],
      plotOptions: { bar: { borderRadius: 8, columnWidth: '48%' } },
      dataLabels: { enabled: false },
      xaxis: { categories: monthly.map((m) => m.month) },
      yaxis: { labels: { formatter: (val) => `$${Math.round(val)}` } },
      grid: { borderColor: '#e4e4e7', strokeDashArray: 4 },
    },
    series: [{ name: 'Net Earnings ($)', data: monthly.map((m) => m.amount) }],
  };

  return (
    <WorkspaceLayout
      variant="educator"
      title="Earnings Report"
      subtitle="Monthly and lifetime instructor earnings, per-course revenue breakdown, and completed order ledger."
    >
      <div className="ch-grid-4" style={{ marginBottom: 22 }}>
        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>This Month Net</div>
            <div className="ch-kpi__val" style={{ color: 'var(--teal-dark)' }}>
              ${Number(earnings.thisMonthNet).toFixed(2)}
            </div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--teal-soft)', color: 'var(--teal)' }}>
            <FaCalendarAlt />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Lifetime Net (80%)</div>
            <div className="ch-kpi__val">${Number(earnings.lifetimeNet).toFixed(2)}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
            <FaDollarSign />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Gross Sales</div>
            <div className="ch-kpi__val">${Number(earnings.lifetimeGross).toFixed(2)}</div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--indigo-soft)', color: 'var(--indigo)' }}>
            <FaChartLine />
          </div>
        </div>

        <div className="ch-kpi">
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', fontWeight: 600 }}>Platform Fees (20%)</div>
            <div className="ch-kpi__val" style={{ color: 'var(--coral)' }}>
              ${Number(earnings.platformFees).toFixed(2)}
            </div>
          </div>
          <div className="ch-kpi__icon" style={{ background: 'var(--coral-soft)', color: 'var(--coral)' }}>
            <FaReceipt />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.85fr', gap: 20, marginBottom: 22 }}>
        <div className="ch-card ch-card--pad">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 8 }}>Monthly Net Earnings</h2>
          <Chart options={barChart.options} series={barChart.series} type="bar" height={255} />
        </div>

        <div className="ch-card ch-card--pad">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>Revenue by Course</h2>
          {loading ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-muted)' }}>Loading...</div>
          ) : earnings.byCourse.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-muted)' }}>
              No completed course sales yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {earnings.byCourse.map((row) => (
                <div
                  key={row.courseId}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {row.title}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>
                      {row.salesCount} {row.salesCount === 1 ? 'sale' : 'sales'} | Gross ${Number(row.gross).toFixed(2)}
                    </div>
                  </div>
                  <strong style={{ color: 'var(--teal-dark)', whiteSpace: 'nowrap' }}>
                    ${Number(row.net).toFixed(2)}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ch-card ch-card--pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Course Sales Ledger</h2>
          <span className="ch-badge ch-badge--teal">{earnings.ledger.length} Transactions</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 36, color: 'var(--ink-muted)' }}>Loading transactions...</div>
        ) : earnings.ledger.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36, color: 'var(--ink-muted)' }}>
            No completed orders recorded yet.
          </div>
        ) : (
          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Course</th>
                  <th>Student</th>
                  <th>Gross</th>
                  <th>Platform Fee</th>
                  <th>Net Earned</th>
                  <th>Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {earnings.ledger.map((t, idx) => (
                  <tr key={`${t.id}_${idx}`}>
                    <td>
                      <strong>{t.id}</strong>
                    </td>
                    <td>{t.course}</td>
                    <td>{t.student}</td>
                    <td>${Number(t.gross).toFixed(2)}</td>
                    <td style={{ color: 'var(--ink-muted)' }}>-${Number(t.fee).toFixed(2)}</td>
                    <td>
                      <strong style={{ color: 'var(--teal-dark)' }}>${Number(t.net).toFixed(2)}</strong>
                    </td>
                    <td>
                      <span className="ch-badge ch-badge--neutral">{String(t.method || '').toUpperCase()}</span>
                    </td>
                    <td>{new Date(t.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
