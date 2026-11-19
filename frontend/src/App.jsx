import CourseHubBrand from '@/components/CourseHubBrand';

// Khung khoi tao ban dau cua ung dung Frontend CourseHub
export default function App() {
  return (
    <div className="ch-container" style={{ paddingTop: 48 }}>
      <div className="ch-card ch-card--pad">
        <CourseHubBrand to="/" />
        <h1 style={{ fontSize: '1.8rem', marginTop: 16 }}>
          CourseHub MERN Stack — Khung giao dien Frontend
        </h1>
        <p style={{ color: 'var(--ink-muted)', marginTop: 8 }}>
          He thong Design Tokens va HTTP Client da san sang ket noi toi Express API.
        </p>
      </div>
    </div>
  );
}
