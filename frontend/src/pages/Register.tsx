import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  FiUserPlus,
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiCheck,
  FiCircle,
  FiBookOpen,
  FiUsers,
} from 'react-icons/fi';
import { auth } from '../config/firebase';
import { useSession } from '../contexts/SessionContext';
import AuthLayout from '../components/AuthLayout';
import AuthErrorAlert, { AuthError } from '../components/AuthErrorAlert';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

interface PasswordRequirement {
  id: string;
  label: string;
  fullWidth?: boolean;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'len', label: '8+ characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'num', label: 'Number (0-9)', test: (p) => /\d/.test(p) },
  {
    id: 'special',
    label: 'Special character (@$!%*?&)',
    fullWidth: true,
    test: (p) => /[@$!%*?&]/.test(p),
  },
];

interface FirebaseAuthErrorLike {
  code?: string;
  message?: string;
}

/** Map Firebase error codes to user-friendly AuthError objects */
const firebaseErrorToAuthError = (err: unknown): AuthError => {
  const authErr = err as FirebaseAuthErrorLike | null;
  const code = authErr?.code || '';
  if (code === 'auth/email-already-in-use') {
    return {
      type: 'error',
      title: 'Registration Failed',
      message: 'This email is already registered.',
      suggestion: 'Try signing in instead, or use a different email.',
    };
  }
  if (code === 'auth/weak-password') {
    return {
      type: 'error',
      title: 'Weak Password',
      message: 'Password must be at least 6 characters.',
      suggestion: 'Choose a stronger password.',
    };
  }
  if (code === 'auth/invalid-email') {
    return {
      type: 'error',
      title: 'Invalid Email',
      message: 'Please enter a valid email address.',
    };
  }
  if (code === 'auth/too-many-requests') {
    return {
      type: 'warning',
      title: 'Too Many Attempts',
      message: 'Please wait a moment before trying again.',
    };
  }
  if (code === 'auth/popup-closed-by-user') {
    return {
      type: 'info',
      title: 'Sign-up Cancelled',
      message: 'The sign-in popup was closed.',
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      type: 'error',
      title: 'Connection Error',
      message: 'Unable to connect. Check your internet connection.',
    };
  }
  return {
    type: 'error',
    title: 'Registration Failed',
    message: authErr?.message || 'An unexpected error occurred.',
  };
};

const Register: React.FC = () => {
  const { isMockMode, loginMockUser } = useSession();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState<AuthError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    if (!name.trim()) {
      errors.name = 'Full name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (name.trim().length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else {
      const failedRequirements = PASSWORD_REQUIREMENTS.filter((req) => !req.test(password));
      if (failedRequirements.length > 0) {
        errors.password = 'Password does not meet all requirements below';
      }
    }

    setFieldErrors(errors);

    if (errors.name) {
      nameRef.current?.focus();
    } else if (errors.email) {
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
    if (!validateForm()) return;

    if (isMockMode) {
      loginMockUser(email.trim(), role, name.trim());
      navigate('/feed');
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await sendEmailVerification(credential.user);
      localStorage.setItem('pendingRole', role);
    } catch (err: unknown) {
      setError(firebaseErrorToAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    if (isMockMode) {
      loginMockUser(email.trim() || undefined, role, name.trim() || undefined);
      navigate('/feed');
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('pendingRole', role);
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      setError(firebaseErrorToAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof FieldErrors, value: string) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    switch (field) {
      case 'name':
        setName(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
    }
  };

  const allPasswordRequirementsMet = PASSWORD_REQUIREMENTS.every((req) => req.test(password));
  const passwordDescribedBy = fieldErrors.password
    ? 'register-pw-rules register-password-error'
    : 'register-pw-rules';

  return (
    <AuthLayout title="Join CCIT Wall" subtitle="Create your campus account to get started">
      <AuthErrorAlert error={error} onDismiss={() => setError(null)} />

      {/* Account role segmented toggle */}
      <fieldset className="auth-role-fieldset">
        <legend className="auth-role-legend">Account role</legend>
        <div className="auth-form__role-selector">
          <button
            type="button"
            className={`auth-form__role-option ${role === 'student' ? 'auth-form__role-option--active' : ''}`}
            onClick={() => setRole('student')}
            aria-pressed={role === 'student'}
          >
            <FiBookOpen size={16} aria-hidden="true" /> Student
          </button>
          <button
            type="button"
            className={`auth-form__role-option ${role === 'teacher' ? 'auth-form__role-option--active' : ''}`}
            onClick={() => setRole('teacher')}
            aria-pressed={role === 'teacher'}
          >
            <FiUsers size={16} aria-hidden="true" /> Teacher
          </button>
        </div>
        <p className="auth-field__hint">Applies to both Google sign-up and email registration.</p>
      </fieldset>

      {/* Google SSO */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
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
        Sign up with Google
      </button>

      {/* Divider */}
      <div className="auth-form__divider">
        <div className="auth-form__divider-line" />
        <span className="auth-form__divider-text">or</span>
        <div className="auth-form__divider-line" />
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className={`form-group ${fieldErrors.name ? 'form-group--error' : ''}`}>
          <label htmlFor="register-name">Full name</label>
          <div className="input-with-icon">
            <FiUser className="input-icon" size={18} aria-hidden="true" />
            <input
              ref={nameRef}
              id="register-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Juan Dela Cruz"
              className={fieldErrors.name ? 'input-error' : ''}
              autoComplete="name"
              enterKeyHint="next"
              required
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
            />
          </div>
          {fieldErrors.name && (
            <span id="register-name-error" className="field-error-message" role="alert">
              {fieldErrors.name}
            </span>
          )}
        </div>

        <div className={`form-group ${fieldErrors.email ? 'form-group--error' : ''}`}>
          <label htmlFor="register-email">Email</label>
          <div className="input-with-icon">
            <FiMail className="input-icon" size={18} aria-hidden="true" />
            <input
              ref={emailRef}
              id="register-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="juan@nu-manila.edu.ph"
              className={fieldErrors.email ? 'input-error' : ''}
              autoComplete="username"
              spellCheck={false}
              enterKeyHint="next"
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
            />
          </div>
          {fieldErrors.email && (
            <span id="register-email-error" className="field-error-message" role="alert">
              {fieldErrors.email}
            </span>
          )}
        </div>

        <div className={`form-group ${fieldErrors.password ? 'form-group--error' : ''}`}>
          <label htmlFor="register-password">Password</label>
          <div className="input-with-icon">
            <FiLock className="input-icon" size={18} aria-hidden="true" />
            <input
              ref={passwordRef}
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              placeholder="Create a password"
              className={fieldErrors.password ? 'input-error' : ''}
              autoComplete="new-password"
              enterKeyHint="done"
              required
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={passwordDescribedBy}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <FiEyeOff size={18} aria-hidden="true" />
              ) : (
                <FiEye size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <span id="register-password-error" className="field-error-message" role="alert">
              {fieldErrors.password}
            </span>
          )}

          {/* Statically rendered 2-column password requirements (zero layout shift on focus) */}
          <ul id="register-pw-rules" className="pw-rules" aria-label="Password requirements">
            {PASSWORD_REQUIREMENTS.map((req) => {
              const isMet = req.test(password);
              return (
                <li
                  key={req.id}
                  className={`pw-rule ${isMet ? 'pw-rule--met' : ''} ${req.fullWidth ? 'pw-rule--full' : ''}`}
                >
                  {isMet ? (
                    <FiCheck size={13} className="pw-rule__icon" aria-hidden="true" />
                  ) : (
                    <FiCircle size={12} className="pw-rule__icon" aria-hidden="true" />
                  )}
                  <span>{req.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <button
          type="submit"
          className="auth-form__submit"
          disabled={loading || !allPasswordRequirementsMet}
        >
          <FiUserPlus size={16} aria-hidden="true" />{' '}
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      {!isMockMode && (
        <p className="auth-form__note">
          A verification email will be sent to confirm your address.
        </p>
      )}

      <p className="auth-form__footer">
        Already have an account?{' '}
        <Link to="/login" className="auth-form__link">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
