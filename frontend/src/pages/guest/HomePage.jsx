import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaCheckCircle, FaPlayCircle, FaSearch, FaStar } from 'react-icons/fa';
import PublicLayout from '@/layouts/PublicLayout';
import CourseCard from '@/components/CourseCard';
import { useCourseHub } from '@/context/CourseHubContext';

// Man hinh trang chu gioi thieu nen tang va danh muc khoa hoc noi bat
export default function HomePage() {
  const { courses, categories } = useCourseHub();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const liveCourses = courses.filter((c) => c.status === 'Live');
  const filtered =
    selectedCategory === 'All'
      ? liveCourses
      : liveCourses.filter(
          (c) => (typeof c.category === 'object' ? c.category?.name : c.category) === selectedCategory
        );
  const heroCourse = liveCourses[0];
  const heroRating =
    heroCourse?.rating?.count > 0 ? Number(heroCourse.rating.average || 0).toFixed(1) : 'New';

  return (
    <PublicLayout>
      <section className="ch-hero">
        <div className="ch-container">
          <div className="ch-hero-grid">
            <div className="ch-hero-main">
              <div>
                <span className="ch-badge ch-badge--teal" style={{ marginBottom: 16 }}>
                  <FaCheckCircle /> MERN Stack Online Learning Platform
                </span>
                <h1 className="ch-hero-title">
                  Learn faster inside a <span>focused</span> course workspace.
                </h1>
                <p className="ch-hero-sub" style={{ marginTop: 16 }}>
                  Discover curated courses with structured video lessons, real-time progress tracking,
                  interactive lecture quizzes, and daily learning streaks.
                </p>

                <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
                  <Link to="/courses" className="ch-btn ch-btn--primary ch-btn--lg">
                    Explore All Courses <FaArrowRight />
                  </Link>
                  <Link to="/student/dashboard" className="ch-btn ch-btn--outline ch-btn--lg">
                    <FaPlayCircle /> Open Student Workspace
                  </Link>
                </div>
              </div>

              <div className="ch-hero-stats">
                <div className="ch-hero-stat">
                  <strong>{liveCourses.length}+</strong>
                  <span>Live Courses</span>
                </div>
                <div className="ch-hero-stat">
                  <strong>{categories.length}</strong>
                  <span>Disciplines</span>
                </div>
                <div className="ch-hero-stat">
                  <strong>96%</strong>
                  <span>Completion Rate</span>
                </div>
              </div>
            </div>

            <div className="ch-hero-bento">
              {heroCourse && (
                <div className="ch-bento-feature">
                  <img src={heroCourse.thumbnail || heroCourse.image} alt={heroCourse.title} />
                  <div>
                    <span className="ch-badge" style={{ background: 'rgba(20,184,166,0.2)', color: '#5eead4' }}>
                      Featured Course
                    </span>
                    <h3 style={{ color: '#fff', fontSize: '1.08rem', marginTop: 8 }}>{heroCourse.title}</h3>
                    <div style={{ fontSize: '0.82rem', color: '#a1a1aa', marginTop: 6 }}>
                      By {heroCourse.instructor?.name} |{' '}
                      <FaStar style={{ color: '#f59e0b', verticalAlign: '-2px' }} /> {heroRating}
                    </div>
                    <Link
                      to={`/courses/${heroCourse._id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#5eead4',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        marginTop: 10,
                      }}
                    >
                      Inspect syllabus <FaArrowRight />
                    </Link>
                  </div>
                </div>
              )}

              <div className="ch-bento-tile ch-bento-tile--teal">
                <div style={{ fontSize: '0.78rem', opacity: 0.85, fontWeight: 700 }}>EDUCATOR STUDIO</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800 }}>
                  Publish &amp; Track Revenue
                </div>
                <Link
                  to="/instructor/dashboard"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 700, color: '#ccfbf1' }}
                >
                  Go to Educator Portal <FaArrowRight size={12} />
                </Link>
              </div>

              <div className="ch-bento-tile ch-bento-tile--coral">
                <div style={{ fontSize: '0.78rem', color: 'var(--coral)', fontWeight: 700 }}>LAUNCH PROMO</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800 }}>
                  Code: COURSEHUB20
                </div>
                <Link
                  to="/student/cart"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 700, color: 'var(--coral)' }}
                >
                  Apply 20% off in Cart <FaArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '18px 0 10px' }}>
        <div className="ch-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Explore by Discipline</h2>
              <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: '0.9rem' }}>
                Browse approved courses across key technology tracks
              </p>
            </div>
            <Link to="/courses" className="ch-btn ch-btn--sm ch-btn--outline">
              Browse Full Catalog <FaArrowRight />
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => setSelectedCategory('All')}
              className={`ch-btn ch-btn--sm ${selectedCategory === 'All' ? 'ch-btn--dark' : 'ch-btn--outline'}`}
            >
              All Tracks ({liveCourses.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat._id}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`ch-btn ch-btn--sm ${selectedCategory === cat.name ? 'ch-btn--primary' : 'ch-btn--outline'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="ch-grid-3">
            {filtered.slice(0, 6).map((course) => (
              <CourseCard key={course._id} course={course} basePath="/courses" />
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '44px 0 10px' }}>
        <div className="ch-container">
          <div
            className="ch-card ch-card--pad"
            style={{
              background: 'linear-gradient(120deg, #18181b 0%, #134e4a 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
              padding: '34px 38px',
            }}
          >
            <div style={{ maxWidth: 620 }}>
              <span className="ch-badge" style={{ background: 'rgba(249,115,22,0.2)', color: '#fdba74' }}>
                Become an Instructor (UC-3.1)
              </span>
              <h2 style={{ color: '#fff', fontSize: '1.7rem', marginTop: 10 }}>
                Share your expertise with thousands of CourseHub learners
              </h2>
              <p style={{ color: '#cbd5e1', margin: '8px 0 0', fontSize: '0.94rem' }}>
                Apply directly from your Student Profile or open the Educator Studio to build courses and quizzes.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/student/profile" className="ch-btn ch-btn--coral">
                <FaSearch /> Apply as Instructor
              </Link>
              <Link
                to="/courses"
                className="ch-btn ch-btn--outline"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
              >
                Explore Catalog
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
