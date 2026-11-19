import { Link } from 'react-router-dom';

// Thanh phan hien thi logo va ten thuong hieu CourseHub
export default function CourseHubBrand({ to = '/', dark = false, compact = false }) {
  return (
    <Link to={to} className={`ch-brand ${dark ? 'ch-brand--dark' : ''}`}>
      <span className="ch-brand__mark" aria-hidden="true">
        <svg viewBox="0 0 36 36" width="34" height="34" fill="none">
          <rect width="36" height="36" rx="10" fill="#0f766e" />
          <path d="M9.5 12.5C9.5 11.4 10.4 10.5 11.5 10.5H17.2V25.5H11.5C10.4 25.5 9.5 24.6 9.5 23.5V12.5Z" fill="#ffffff" />
          <path d="M18.8 10.5H24.5C25.6 10.5 26.5 11.4 26.5 12.5V23.5C26.5 24.6 25.6 25.5 24.5 25.5H18.8V10.5Z" fill="#99f6e4" />
          <circle cx="29.5" cy="7.5" r="4.2" fill="#f97316" stroke={dark ? '#18181b' : '#ffffff'} strokeWidth="1.8" />
        </svg>
      </span>
      {!compact && (
        <span className="ch-brand__text">
          Course<span>Hub</span>
        </span>
      )}
    </Link>
  );
}
