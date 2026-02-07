import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { FiUserPlus, FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiCheck, FiX } from 'react-icons/fi';
import ThemeToggle from '../components/ThemeToggle';
import AuthErrorAlert, { AuthError, parseAuthError } from '../components/AuthErrorAlert';
import '../styles/index.css';

interface RegisterProps {
  onRegisterSuccess: () => void;
}

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

const Register: React.FC<RegisterProps> = ({ onRegisterSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('student');
  const [error, setError] = useState<AuthError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const navigate = useNavigate();

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    
    if (!name.trim()) {
      errors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (name.trim().length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else {
      const failedRequirements = passwordRequirements.filter(req => !req.test(password));
      if (failedRequirements.length > 0) {
        errors.password = 'Password does not meet all requirements';
      }
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
      const response = await authService.register(name, email, password, role);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onRegisterSuccess();
      navigate('/');
    } catch (err: any) {
      setError(parseAuthError(err, 'register'));
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof FieldErrors, value: string) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
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

  const allPasswordRequirementsMet = passwordRequirements.every(req => req.test(password));

  return (
    <div className="auth-page">
      {/* Floating Theme Toggle */}
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="container" style={{ padding: '60px 20px' }}>
        <div className="card" style={{ maxWidth: '420px', margin: '0 auto', padding: '40px' }}>
          <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Join CCIT Wall</h2>
          <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '32px' }}>Create your account</p>
          
          <AuthErrorAlert error={error} onDismiss={() => setError(null)} />
          
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
              {fieldErrors.name && (
                <span className="field-error-message">{fieldErrors.name}</span>
              )}
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
              {fieldErrors.password && (
                <span className="field-error-message">{fieldErrors.password}</span>
              )}
              
              {/* Password Requirements Checklist */}
              {(showPasswordRequirements || password.length > 0) && (
                <div className="password-requirements">
                  <p className="password-requirements__title">Password must contain:</p>
                  <ul className="password-requirements__list">
                    {passwordRequirements.map((req, index) => {
                      const isMet = req.test(password);
                      return (
                        <li 
                          key={index} 
                          className={`password-requirements__item ${isMet ? 'password-requirements__item--met' : ''}`}
                        >
                          {isMet ? (
                            <FiCheck className="password-requirements__icon password-requirements__icon--met" size={14} />
                          ) : (
                            <FiX className="password-requirements__icon" size={14} />
                          )}
                          <span>{req.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            
            <button 
              type="submit" 
              className="button button-primary" 
              disabled={loading || !allPasswordRequirementsMet} 
              style={{ 
                width: '100%', 
                marginTop: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px' 
              }}
            >
              <FiUserPlus size={16} /> {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
