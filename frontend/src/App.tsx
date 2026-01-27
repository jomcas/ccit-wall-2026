import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import CreatePost from './pages/CreatePost';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import { FiHome, FiPlusCircle, FiLogOut, FiLogIn, FiUserPlus, FiUser } from 'react-icons/fi';
import './styles/index.css';

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
        <header className="header">
          <div className="container">
            <div className="header-content">
              <h1>NU Manila - CCIT Wall</h1>
              {isAuthenticated ? (
                <div className="nav">
                  <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiHome size={16} /> Feed</Link>
                  <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FiUser size={16} /> Profile </Link>
                  <Link to="/create"><span className="user-name-badge"><FiPlusCircle size={16} style={{ marginRight: '6px' }} /> Create Post</span></Link>
                  <button
                    onClick={handleLogout}
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

        <Routes>
          {isAuthenticated ? (
            <>
              <Route path="/" element={<Feed />} />
              <Route path="/create" element={<CreatePost />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
              <Route path="/register" element={<Register onRegisterSuccess={handleLoginSuccess} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
};

export default App;
