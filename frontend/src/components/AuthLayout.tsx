import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="auth-layout">
      {/* Floating Theme Toggle */}
      <div className="auth-layout__theme-toggle">
        <ThemeToggle />
      </div>

      {/* Left branded panel */}
      <div className="auth-layout__brand">
        <div className="auth-layout__brand-inner">
          <Link to="/" className="auth-layout__logo-link">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg"
              alt="NU Logo"
              className="auth-layout__logo"
            />
          </Link>
          <h1 className="auth-layout__brand-title">CCIT Wall</h1>
          <p className="auth-layout__brand-tagline">
            Your campus community,<br />all in one place.
          </p>
          <div className="auth-layout__brand-decorations">
            <div className="auth-layout__decoration auth-layout__decoration--1" />
            <div className="auth-layout__decoration auth-layout__decoration--2" />
            <div className="auth-layout__decoration auth-layout__decoration--3" />
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-layout__form-panel">
        <div className="auth-layout__form-container">
          <div className="auth-layout__form-header">
            <h2 className="auth-layout__title">{title}</h2>
            <p className="auth-layout__subtitle">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
