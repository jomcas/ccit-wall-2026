import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';

const NU_SHIELD_URL = 'https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="auth-layout">
      {/* Left NU Navy Brand Panel */}
      <aside className="auth-layout__brand" aria-label="CCIT Wall overview">
        <Link to="/" className="auth-brand__back">
          <FiArrowLeft size={15} aria-hidden="true" />
          <span>Back to Home</span>
        </Link>

        <div className="auth-brand__center">
          <Link to="/" className="auth-brand__crest">
            <img
              src={NU_SHIELD_URL}
              alt="National University Shield"
              width={52}
              height={52}
              className="auth-brand__logo"
            />
            <span className="auth-brand__name">CCIT Wall</span>
          </Link>

          <p className="auth-brand__tagline">
            Your NU Manila CCIT bulletin board for announcements, project showcases, and study
            groups.
          </p>

          <div className="auth-sample-notice" aria-label="Sample pinned campus notice">
            <div className="auth-sample-notice__meta">
              <strong className="auth-sample-notice__label">PINNED NOTICE</strong>
              <span>College Activities</span>
            </div>
            <p className="auth-sample-notice__title">Capstone Proposal Defense Schedule</p>
            <p className="auth-sample-notice__body">
              Updated room assignments for CS and IT panels are now posted inside the feed.
            </p>
          </div>
        </div>

        <p className="auth-brand__copyright">
          &copy; {new Date().getFullYear()} National University Manila &middot; CCIT
        </p>
      </aside>

      {/* Right Form Panel */}
      <main className="auth-layout__form-panel">
        <div className="auth-panel__topbar">
          <Link to="/" className="auth-panel__mobile-back">
            <FiArrowLeft size={15} aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
          <div className="auth-panel__theme-toggle">
            <ThemeToggle />
          </div>
        </div>

        <div className="auth-layout__form-container">
          <div className="auth-layout__form-header">
            <h1 className="auth-layout__title">{title}</h1>
            <p className="auth-layout__subtitle">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
