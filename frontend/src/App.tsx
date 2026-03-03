import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Layout from './components/Layout';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/tokens.css';
import './styles/index.css';
import './styles/theme.css';

/** Inner component that reads session context */
const AppRoutes: React.FC = () => {
  const { user, firebaseReady } = useSession();

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // Wait for Firebase to determine auth state before rendering routes
  if (!firebaseReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
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
