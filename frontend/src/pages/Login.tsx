import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { FiLogIn, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { auth } from '../config/firebase';
import { useSession } from '../contexts/SessionContext';
import AuthLayout from '../components/AuthLayout';
import AuthErrorAlert, { AuthError } from '../components/AuthErrorAlert';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FirebaseAuthErrorLike {
  code?: string;
  message?: string;
}

/** Map Firebase error codes to user-friendly AuthError objects */
const firebaseErrorToAuthError = (err: unknown): AuthError => {
  const authErr = err as FirebaseAuthErrorLike | null;
  const code = authErr?.code || '';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password'
  ) {
    return {
      type: 'error',
      title: 'Invalid Credentials',
      message: 'The email or password you entered is incorrect.',
      suggestion: 'Check your credentials and try again, or use "Forgot password?".',
    };
  }
  if (code === 'auth/user-disabled') {
    return {
      type: 'error',
      title: 'Account Disabled',
      message: 'Your account has been disabled. Contact an administrator.',
    };
  }
  if (code === 'auth/too-many-requests') {
    return {
      type: 'warning',
      title: 'Too Many Attempts',
      message: 'Too many failed login attempts. Please wait a moment before trying again.',
    };
  }
  if (code === 'auth/popup-closed-by-user') {
    return {
      type: 'info',
      title: 'Sign-in Cancelled',
      message: 'The sign-in popup was closed.',
    };
  }
  if (code === 'auth/popup-blocked') {
    return {
      type: 'warning',
      title: 'Popup Blocked',
      message: 'Your browser blocked the sign-in popup. Please allow popups and try again.',
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      type: 'error',
      title: 'Connection Error',
      message: 'Unable to connect. Please check your internet connection.',
    };
  }
  return {
    type: 'error',
    title: 'Sign-in Failed',
    message: authErr?.message || 'An unexpected error occurred.',
  };
};

const Login: React.FC = () => {
  const { isMockMode, loginMockUser } = useSession();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    setFieldErrors(errors);

    if (errors.email) {
      emailRef.current?.focus();
    } else if (errors.password) {
      passwordRef.current?.focus();
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (isMockMode) {
      const trimmedEmail = email.trim();
      if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
        setFieldErrors({ email: 'Please enter a valid email address' });
        emailRef.current?.focus();
        return;
      }
      loginMockUser(trimmedEmail || 'maria.santos@nu.edu.ph');
      navigate('/feed');
      return;
    }

    if (!validateForm()) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      setError(firebaseErrorToAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    if (isMockMode) {
      loginMockUser(email.trim() || 'maria.santos@nu.edu.ph');
      navigate('/feed');
      return;
    }

    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      setError(firebaseErrorToAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMockRoleSignIn = (
    demoEmail: string,
    role: 'teacher' | 'student' | 'admin'
  ) => {
    loginMockUser(demoEmail, role);
    navigate('/feed');
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your CCIT Wall account">
      <AuthErrorAlert error={error} onDismiss={() => setError(null)} />

      {/* Google SSO */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="auth-form__google-btn"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="auth-form__divider">
        <div className="auth-form__divider-line" />
        <span className="auth-form__divider-text">or</span>
        <div className="auth-form__divider-line" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className={`form-group ${fieldErrors.email ? 'form-group--error' : ''}`}>
          <label htmlFor="login-email">Email</label>
          <div className="input-with-icon">
            <FiMail className="input-icon" size={18} aria-hidden="true" />
            <input
              ref={emailRef}
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="name@nu-manila.edu.ph"
              className={fieldErrors.email ? 'input-error' : ''}
              autoComplete="username"
              spellCheck={false}
              enterKeyHint="next"
              required={!isMockMode}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            />
          </div>
          {fieldErrors.email && (
            <span id="login-email-error" className="field-error-message" role="alert">
              {fieldErrors.email}
            </span>
          )}
        </div>

        <div className={`form-group ${fieldErrors.password ? 'form-group--error' : ''}`}>
          <div className="auth-field__label-row">
            <label htmlFor="login-password">Password</label>
            <Link to="/forgot-password" className="auth-form__forgot-link">
              Forgot password?
            </Link>
          </div>
          <div className="input-with-icon">
            <FiLock className="input-icon" size={18} aria-hidden="true" />
            <input
              ref={passwordRef}
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter your password"
              className={fieldErrors.password ? 'input-error' : ''}
              autoComplete="current-password"
              enterKeyHint="done"
              required={!isMockMode}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FiEyeOff size={18} aria-hidden="true" /> : <FiEye size={18} aria-hidden="true" />}
            </button>
          </div>
          {fieldErrors.password && (
            <span id="login-password-error" className="field-error-message" role="alert">
              {fieldErrors.password}
            </span>
          )}
        </div>

        <button type="submit" className="auth-form__submit" disabled={loading}>
          <FiLogIn size={16} aria-hidden="true" /> {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      {isMockMode && (
        <div className="auth-mock-roles" aria-label="Quick demo sign-in roles">
          <p className="auth-mock-roles__label">Quick demo sign-in (Mock Mode)</p>
          <div className="auth-mock-roles__buttons">
            <button
              type="button"
              className="auth-mock-roles__btn"
              onClick={() => handleMockRoleSignIn('maria.santos@nu.edu.ph', 'teacher')}
            >
              Teacher
            </button>
            <button
              type="button"
              className="auth-mock-roles__btn"
              onClick={() => handleMockRoleSignIn('juan@nu.edu.ph', 'student')}
            >
              Student
            </button>
            <button
              type="button"
              className="auth-mock-roles__btn"
              onClick={() => handleMockRoleSignIn('admin@nu.edu.ph', 'admin')}
            >
              Admin
            </button>
          </div>
        </div>
      )}

      <p className="auth-form__footer">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="auth-form__link">
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
