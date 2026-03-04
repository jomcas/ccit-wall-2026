import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { FiAlertCircle, FiCheckCircle, FiMail, FiArrowLeft } from 'react-icons/fi';
import AuthLayout from '../components/AuthLayout';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        // Don't reveal whether email exists -- still show success
        setSuccess(true);
      } else if (code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a moment before trying again.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Check Your Email" subtitle="Password reset link sent">
        <div className="auth-form__success-card">
          <div className="auth-form__success-icon">
            <FiCheckCircle size={32} />
          </div>
          <p className="auth-form__success-text">
            If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
          </p>
          <p className="auth-form__success-hint">
            The link will expire in 1 hour. Check your spam folder if you don't see it.
          </p>
          <Link to="/login" className="auth-form__submit" style={{ textDecoration: 'none' }}>
            <FiArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot Password?" subtitle="Enter your email and we'll send you a reset link">
      {error && (
        <div className="auth-error-alert auth-error-alert--error" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="auth-error-alert__header">
            <div className="auth-error-alert__icon">
              <FiAlertCircle size={20} />
            </div>
            <div className="auth-error-alert__content">
              <p className="auth-error-alert__message">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email Address</label>
          <div className="input-with-icon">
            <FiMail className="input-icon" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              autoFocus
            />
          </div>
        </div>

        <button
          type="submit"
          className="auth-form__submit"
          disabled={loading}
        >
          <FiMail size={16} /> {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <p className="auth-form__footer">
        Remember your password?{' '}
        <Link to="/login" className="auth-form__link">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPassword;
