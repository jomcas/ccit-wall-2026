import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';
import { FiAlertCircle, FiCheckCircle, FiMail, FiArrowLeft } from 'react-icons/fi';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/index.css';

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
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email');
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
            <h2 className="page-title" style={{ marginBottom: '16px' }}>Check Your Email</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
              If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              The link will expire in 1 hour. Check your spam folder if you don't see it.
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
  }

  return (
    <div className="auth-page">
      {/* Floating Theme Toggle */}
      <div className="auth-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="container" style={{ padding: '60px 20px' }}>
      <div className="card" style={{ maxWidth: '420px', margin: '0 auto', padding: '40px' }}>
        <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Forgot Password?</h2>
        <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '32px' }}>
          Enter your email and we'll send you a reset link
        </p>
        
        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiAlertCircle size={18} /> {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              autoFocus
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
            <FiMail size={16} /> {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Remember your password?{' '}
          <Link to="/login" style={{ color: 'var(--primary-blue)', fontWeight: '600', textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
    </div>
  );
};

export default ForgotPassword;
