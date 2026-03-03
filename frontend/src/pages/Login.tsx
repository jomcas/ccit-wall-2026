import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';
import { FiLogIn, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import ThemeToggle from '../components/ThemeToggle';
import AuthErrorAlert, { AuthError } from '../components/AuthErrorAlert';
import '../styles/index.css';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

/** Map Firebase error codes to user-friendly AuthError objects */
const firebaseErrorToAuthError = (err: any): AuthError => {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return { type: 'error', title: 'Invalid Credentials', message: 'The email or password you entered is incorrect.', suggestion: 'Check your credentials and try again, or use "Forgot Password".' };
  }
  if (code === 'auth/user-disabled') {
    return { type: 'error', title: 'Account Disabled', message: 'Your account has been disabled. Contact an administrator.' };
  }
  if (code === 'auth/too-many-requests') {
    return { type: 'warning', title: 'Too Many Attempts', message: 'Too many failed login attempts. Please wait a moment before trying again.' };
  }
  if (code === 'auth/popup-closed-by-user') {
    return { type: 'info', title: 'Sign-in Cancelled', message: 'The sign-in popup was closed.' };
  }
  if (code === 'auth/popup-blocked') {
    return { type: 'warning', title: 'Popup Blocked', message: 'Your browser blocked the sign-in popup. Please allow popups and try again.' };
  }
  if (code === 'auth/network-request-failed') {
    return { type: 'error', title: 'Connection Error', message: 'Unable to connect. Please check your internet connection.' };
  }
  return { type: 'error', title: 'Login Failed', message: err?.message || 'An unexpected error occurred.' };
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address';
    if (!password) errors.password = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!validateForm()) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged in SessionContext will handle the rest
    } catch (err: any) {
      setError(firebaseErrorToAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(firebaseErrorToAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
  };

  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="container" style={{ padding: '60px 20px' }}>
        <div className="card" style={{ maxWidth: '420px', margin: '0 auto', padding: '40px' }}>
          <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Welcome Back</h2>
          <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '32px' }}>Sign in to CCIT Wall</p>

          <AuthErrorAlert error={error} onDismiss={() => setError(null)} />

          {/* Google SSO */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="button button-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>or</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className={`form-group ${fieldErrors.email ? 'form-group--error' : ''}`}>
              <label>Email</label>
              <div className="input-with-icon">
                <FiMail className="input-icon" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email"
                  className={fieldErrors.email ? 'input-error' : ''}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && <span className="field-error-message">{fieldErrors.email}</span>}
            </div>

            <div className={`form-group ${fieldErrors.password ? 'form-group--error' : ''}`}>
              <label>Password</label>
              <div className="input-with-icon">
                <FiLock className="input-icon" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                  className={fieldErrors.password ? 'input-error' : ''}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {fieldErrors.password && <span className="field-error-message">{fieldErrors.password}</span>}
            </div>

            <div style={{ textAlign: 'right', marginBottom: '16px' }}>
              <Link to="/forgot-password" style={{ color: 'var(--primary-blue)', fontSize: '14px', textDecoration: 'none', fontWeight: '500' }}>
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="button button-primary"
              disabled={loading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <FiLogIn size={16} /> {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary-blue)', fontWeight: '600', textDecoration: 'none' }}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
