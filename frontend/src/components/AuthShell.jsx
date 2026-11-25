import CourseHubBrand from '@/components/CourseHubBrand';

// Khung bo cuc chung hai cot cho cac man hinh xac thuc (Dang nhap, Dang ky, Quen mat khau)
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="ch-auth" style={{ flex: 1 }}>
        <div className="ch-auth__aside">
          <CourseHubBrand to="/" dark />
          <div style={{ maxWidth: 460 }}>
            <span className="ch-badge" style={{ background: 'rgba(20,184,166,0.18)', color: '#5eead4', marginBottom: 18 }}>
              MERN Stack | MongoDB + Express + React + Node
            </span>
            <h1>Master practical skills inside a calm, modern workspace.</h1>
            <p style={{ color: '#a1a1aa', marginTop: 16, fontSize: '1rem' }}>
              CourseHub connects real-time MongoDB persistence, JWT authentication, and interactive learning studios under one unified architecture.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 28 }}>
              <div style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: '#5eead4' }}>28,400+</strong>
                <div style={{ fontSize: '0.82rem', color: '#a1a1aa' }}>Active Learners</div>
              </div>
              <div style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: '#fdba74' }}>JWT + OTP</strong>
                <div style={{ fontSize: '0.82rem', color: '#a1a1aa' }}>Verified Auth Flow</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#71717a' }}>
            Demo Identity: <strong style={{ color: '#e4e4e7' }}>Nguyen Tuan Huy</strong> (Student | Educator | Admin)
          </div>
        </div>

        <div className="ch-auth__panel">
          <div className="ch-auth__box">
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800 }}>{title}</h2>
            <p style={{ color: 'var(--ink-muted)', marginTop: 6, marginBottom: 22, fontSize: '0.92rem' }}>{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
