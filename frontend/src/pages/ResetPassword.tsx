import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authService } from '../services/api';
import { FiAlertCircle, FiCheckCircle, FiLock, FiArrowLeft } from 'react-icons/fi';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/index.css';

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        {/* Floating Theme Toggle */}
        <div className="auth-theme-toggle">
          <ThemeToggle />
        </div>

        <div className="container" style={{ padding: '60px 20px' }}>
          <div className="card" style={{ maxWidth: '420px', margin: '0 auto', padding: '40px', textAlign: 'center' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--success-green)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <FiCheckCircle size={32} color="white" />
            </div>
            <h2 className="page-title" style={{ marginBottom: '16px' }}>Password Reset Successful</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Link 
              to="/login" 
              className="button button-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <FiLock size={16} /> Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Floating Theme Toggle */}
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="container" style={{ padding: '60px 20px' }}>
      <div className="card" style={{ maxWidth: '420px', margin: '0 auto', padding: '40px' }}>
        <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Reset Your Password</h2>
        <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '32px' }}>
          Enter your new password below
        </p>
        
        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiAlertCircle size={18} /> {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter new password"
              autoFocus
            />
            <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              At least 8 characters with uppercase, lowercase, and a number
            </small>
          </div>
          
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
            />
          </div>
          
          <button 
            type="submit" 
            className="button button-primary" 
            disabled={loading} 
            style={{ 
              width: '100%', 
              marginTop: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px' 
            }}
          >
            <FiLock size={16} /> {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        
        <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Link to="/login" style={{ color: 'var(--primary-blue)', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <FiArrowLeft size={14} /> Back to Login
          </Link>
        </p>
      </div>
    </div>
    </div>
  );
};

export default ResetPassword;
