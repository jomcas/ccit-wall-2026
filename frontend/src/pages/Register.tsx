import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { FiAlertCircle, FiUserPlus } from 'react-icons/fi';
import '../styles/index.css';

interface RegisterProps {
  onRegisterSuccess: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegisterSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.register(name, email, password, role);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onRegisterSuccess();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '60px 20px' }}>
      <div className="card" style={{ maxWidth: '420px', margin: '0 auto', padding: '40px' }}>
        <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Join CCIT Wall</h2>
        <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '32px' }}>Create your account</p>
        {error && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FiAlertCircle size={18} /> {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Enter your full name"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Create a password"
            />
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
          <button type="submit" className="button button-primary" disabled={loading} style={{ width: '100%', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FiUserPlus size={16} /> {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Already have an account? <a href="/login" style={{ color: 'var(--primary-blue)', fontWeight: '600', textDecoration: 'none' }}>Login here</a>
        </p>
      </div>
    </div>
  );
};

export default Register;
