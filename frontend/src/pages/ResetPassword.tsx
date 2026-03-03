import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/index.css';

/**
 * Password reset is now handled entirely by Firebase's email action flow.
 * This page exists only as a fallback redirect.
 */
const ResetPassword: React.FC = () => {
  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="container" style={{ padding: '60px 20px' }}>
        <div className="card" style={{ maxWidth: '420px', margin: '0 auto', padding: '40px', textAlign: 'center' }}>
          <h2 className="page-title" style={{ marginBottom: '16px' }}>Password Reset</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
            Password resets are handled via the link sent to your email. 
            If you need to reset your password, please use the{' '}
            <Link to="/forgot-password" style={{ color: 'var(--primary-blue)', fontWeight: '600', textDecoration: 'none' }}>
              Forgot Password
            </Link>{' '}
            page.
          </p>
          <Link
            to="/login"
            className="button button-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <FiArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
