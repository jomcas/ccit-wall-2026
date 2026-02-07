import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService, resetSessionExpiredFlag } from '../services/api';
import { FiLogIn, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import ThemeToggle from '../components/ThemeToggle';
import AuthErrorAlert, { AuthError, parseAuthError } from '../components/AuthErrorAlert';
import '../styles/index.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authService.login(email, password);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      resetSessionExpiredFlag();
      onLoginSuccess();
      navigate('/');
    } catch (err: any) {
      setError(parseAuthError(err, 'login'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  return (
    <div className="auth-page">
      {/* Floating Theme Toggle */}
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="container" style={{ padding: '60px 20px' }}>
        <div className="card" style={{ maxWidth: '420px', margin: '0 auto', padding: '40px' }}>
          <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Welcome Back</h2>
          <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '32px' }}>Sign in to CCIT Wall</p>
          
          <AuthErrorAlert error={error} onDismiss={() => setError(null)} />
          
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
              {fieldErrors.email && (
                <span className="field-error-message">{fieldErrors.email}</span>
              )}
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
              {fieldErrors.password && (
                <span className="field-error-message">{fieldErrors.password}</span>
              )}
            </div>
            
            <div style={{ textAlign: 'right', marginBottom: '16px' }}>
              <Link 
                to="/forgot-password" 
                style={{ 
                  color: 'var(--primary-blue)', 
                  fontSize: '14px', 
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                Forgot Password?
              </Link>
            </div>
            
            <button 
              type="submit" 
              className="button button-primary" 
              disabled={loading} 
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px' 
              }}
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
