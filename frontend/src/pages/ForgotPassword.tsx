import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FiAlertCircle, FiCheckCircle, FiMail, FiArrowLeft } from 'react-icons/fi';
import { auth } from '../config/firebase';
import { useSession } from '../contexts/SessionContext';
import AuthLayout from '../components/AuthLayout';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FirebaseAuthErrorLike {
  code?: string;
}

const ForgotPassword: React.FC = () => {
  const { isMockMode } = useSession();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const trimmedEmail = email.trim();
  const isEmailValid = trimmedEmail.length > 0 && EMAIL_REGEX.test(trimmedEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) return;
    setError('');

    if (isMockMode) {
      setSuccess(true);
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSuccess(true);
    } catch (err: unknown) {
      const code = (err as FirebaseAuthErrorLike | null)?.code || '';
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
        <div className="auth-form__success-card" role="status" aria-live="polite">
          <div className="auth-form__success-icon" aria-hidden="true">
            <FiCheckCircle size={32} />
          </div>
          <p className="auth-form__success-text">
            If an account exists with <strong>{trimmedEmail}</strong>, you will receive a password
            reset link shortly.
          </p>
          <p className="auth-form__success-hint">
            The link will expire in 1 hour. Check your spam folder if you don&apos;t see it.
          </p>
          <Link to="/login" className="auth-form__submit auth-form__submit--link">
            <FiArrowLeft size={16} aria-hidden="true" /> Back to Sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" subtitle="Enter your email and we'll send you a reset link">
      {error && (
        <div
          className="auth-error-alert auth-error-alert--error auth-forgot__error"
          role="alert"
        >
          <div className="auth-error-alert__header">
            <div className="auth-error-alert__icon" aria-hidden="true">
              <FiAlertCircle size={20} />
            </div>
            <div className="auth-error-alert__content">
              <p className="auth-error-alert__message">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="forgot-email">Email</label>
          <div className="input-with-icon">
            <FiMail className="input-icon" size={18} aria-hidden="true" />
            <input
              id="forgot-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@nu-manila.edu.ph"
              autoComplete="username"
              spellCheck={false}
              enterKeyHint="send"
              autoFocus
            />
          </div>
        </div>

        <button
          type="submit"
          className="auth-form__submit"
          disabled={loading || !isEmailValid}
        >
          <FiMail size={16} aria-hidden="true" /> {loading ? 'Sending...' : 'Send Reset Link'}
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
