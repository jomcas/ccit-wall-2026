import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';
import { FiUserPlus, FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiCheck, FiX } from 'react-icons/fi';
import ThemeToggle from '../components/ThemeToggle';
import AuthErrorAlert, { AuthError } from '../components/AuthErrorAlert';
import '../styles/index.css';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character (@$!%*?&)', test: (p) => /[@$!%*?&]/.test(p) },
];

/** Map Firebase error codes to user-friendly AuthError objects */
const firebaseErrorToAuthError = (err: any): AuthError => {
  const code = err?.code || '';
  if (code === 'auth/email-already-in-use') {
    return { type: 'error', title: 'Registration Failed', message: 'This email is already registered.', suggestion: 'Try signing in instead, or use a different email.' };
  }
  if (code === 'auth/weak-password') {
    return { type: 'error', title: 'Weak Password', message: 'Password must be at least 6 characters.', suggestion: 'Choose a stronger password.' };
  }
  if (code === 'auth/invalid-email') {
    return { type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address.' };
  }
  if (code === 'auth/too-many-requests') {
    return { type: 'warning', title: 'Too Many Attempts', message: 'Please wait a moment before trying again.' };
  }
  if (code === 'auth/popup-closed-by-user') {
    return { type: 'info', title: 'Sign-up Cancelled', message: 'The sign-in popup was closed.' };
  }
  if (code === 'auth/network-request-failed') {
    return { type: 'error', title: 'Connection Error', message: 'Unable to connect. Check your internet connection.' };
  }
  return { type: 'error', title: 'Registration Failed', message: err?.message || 'An unexpected error occurred.' };
};

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student');
  const [error, setError] = useState<AuthError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Name is required';
    else if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
    else if (name.trim().length > 100) errors.name = 'Name must be less than 100 characters';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else {
      const failedRequirements = passwordRequirements.filter(req => !req.test(password));
      if (failedRequirements.length > 0) errors.password = 'Password does not meet all requirements';
    }
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
      // Create Firebase user
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name
      await updateProfile(credential.user, { displayName: name });
      // Send email verification
      await sendEmailVerification(credential.user);
      // The role is sent via a custom claim request — for now, the backend syncProfile
      // will read the role from localStorage
      localStorage.setItem('pendingRole', role);
      // onAuthStateChanged in SessionContext will handle sync
    } catch (err: any) {
      setError(firebaseErrorToAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setLoading(true);
    try {
      localStorage.setItem('pendingRole', role);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(firebaseErrorToAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof FieldErrors, value: string) => {
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    switch (field) {
      case 'name': setName(value); break;
      case 'email': setEmail(value); break;
      case 'password': setPassword(value); break;
    }
  };

  const allPasswordRequirementsMet = passwordRequirements.every(req => req.test(password));

  return (
    <div className="auth-page">
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="container" style={{ padding: '60px 20px' }}>
        <div className="card" style={{ maxWidth: '420px', margin: '0 auto', padding: '40px' }}>
          <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Join CCIT Wall</h2>
          <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '32px' }}>Create your account</p>
          
          <AuthErrorAlert error={error} onDismiss={() => setError(null)} />

          {/* Role select (shown before SSO so the role is captured) */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          {/* Google SSO */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="button button-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Sign up with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0' }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>or</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className={`form-group ${fieldErrors.name ? 'form-group--error' : ''}`}>
              <label>Full Name</label>
              <div className="input-with-icon">
                <FiUser className="input-icon" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  className={fieldErrors.name ? 'input-error' : ''}
                  autoComplete="name"
                />
              </div>
              {fieldErrors.name && <span className="field-error-message">{fieldErrors.name}</span>}
            </div>

            <div className={`form-group ${fieldErrors.email ? 'form-group--error' : ''}`}>
              <label>Email</label>
              <div className="input-with-icon">
                <FiMail className="input-icon" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
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
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  onFocus={() => setShowPasswordRequirements(true)}
                  placeholder="Create a password"
                  className={fieldErrors.password ? 'input-error' : ''}
                  autoComplete="new-password"
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

              {(showPasswordRequirements || password.length > 0) && (
                <div className="password-requirements">
                  <p className="password-requirements__title">Password must contain:</p>
                  <ul className="password-requirements__list">
                    {passwordRequirements.map((req, index) => {
                      const isMet = req.test(password);
                      return (
                        <li key={index} className={`password-requirements__item ${isMet ? 'password-requirements__item--met' : ''}`}>
                          {isMet ? <FiCheck className="password-requirements__icon password-requirements__icon--met" size={14} /> : <FiX className="password-requirements__icon" size={14} />}
                          <span>{req.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="button button-primary"
              disabled={loading || !allPasswordRequirementsMet}
              style={{ width: '100%', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <FiUserPlus size={16} /> {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ marginTop: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            A verification email will be sent to confirm your address.
          </p>

          <p style={{ marginTop: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary-blue)', fontWeight: '600', textDecoration: 'none' }}>
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
