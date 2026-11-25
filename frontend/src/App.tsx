import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './config/firebase';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import LandingPage from './pages/LandingPage';
import Feed from './pages/Feed';
import CreatePost from './pages/CreatePost';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Notifications from './pages/Notifications';
import About from './pages/About';
import AdminDashboard from './pages/AdminDashboard';
import Layout from './components/Layout';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/tokens.css';
import './styles/index.css';
import './styles/theme.css';
import './styles/redesign-public.css';
import './styles/redesign-shell.css';
import './styles/redesign-pages.css';

const NU_SHIELD_URL = 'https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg';

/** Inner component that reads session context */
const AppRoutes: React.FC = () => {
  const { user, firebaseReady, isMockMode, logoutMockUser } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (isMockMode) {
      logoutMockUser();
      navigate('/', { replace: true });
      return;
    }
    await signOut(auth);
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // Wait for Firebase to determine auth state before rendering routes
  if (!firebaseReady) {
    return (
      <div className="branded-loader" role="status" aria-live="polite">
        <div className="paper paper--taped branded-loader__card">
          <img
            src={NU_SHIELD_URL}
            alt="National University Shield"
            className="branded-loader__logo"
          />
          <p className="branded-loader__label">Loading CCIT Wall...</p>
          <div className="branded-loader__bar" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/about" element={<About />} />
          <Route
            path="/admin"
            element={user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/feed" replace />}
          />
          <Route path="/login" element={<Navigate to="/feed" replace />} />
          <Route path="/register" element={<Navigate to="/feed" replace />} />
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </Layout>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
