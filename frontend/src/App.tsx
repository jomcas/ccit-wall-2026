import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LandingPage from './pages/LandingPage';
import Feed from './pages/Feed';
import CreatePost from './pages/CreatePost';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import { FiHome, FiPlusCircle, FiLogOut, FiLogIn, FiUserPlus, FiUser } from 'react-icons/fi';
import './styles/index.css';

// Header component that hides on landing page
const Header: React.FC<{
  isAuthenticated: boolean;
  onLogout: () => void;
}> = ({ isAuthenticated, onLogout }) => {
  const location = useLocation();
  
  // Hide header on landing page for unauthenticated users
  if (!isAuthenticated && location.pathname === '/') {
    return null;
  }

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
            <Link to={isAuthenticated ? "/feed" : "/"} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img rel="icon" style={{width: "50px", height: "50px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg" alt="NU Logo" />
            <h1>NU Manila - CCIT Wall</h1>
            </Link>
          {isAuthenticated ? (
            <div className="nav">
              <Link to="/feed" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiHome size={16} /> Feed</Link>
              <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiUser size={16} /> Profile </Link>
              <Link to="/create"><span className="user-name-badge"><FiPlusCircle size={16} style={{ marginRight: '6px' }} /> Create Post</span></Link>
              <button
                onClick={onLogout}
                className="button button-secondary"
                style={{
                  padding: '10px 18px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FiLogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <div className="nav">
              <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiLogIn size={16} /> Login</Link>
              <Link to="/register" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiUserPlus size={16} /> Register</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleLoginSuccess = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  };

  return (
    <Router>
      <div>
        <Header isAuthenticated={isAuthenticated} onLogout={handleLogout} />

        <Routes>
          {isAuthenticated ? (
            <>
              <Route path="/" element={<Navigate to="/feed" replace />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/create" element={<CreatePost />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/login" element={<Navigate to="/feed" replace />} />
              <Route path="/register" element={<Navigate to="/feed" replace />} />
              <Route path="*" element={<Navigate to="/feed" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
              <Route path="/register" element={<Register onRegisterSuccess={handleLoginSuccess} />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
};

export default App;
