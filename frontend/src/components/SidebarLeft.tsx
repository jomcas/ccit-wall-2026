import React from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { FiHome, FiUser, FiGrid, FiBookOpen, FiUsers, FiStar, FiInfo } from 'react-icons/fi';
import { useSession } from '../contexts/SessionContext';

interface SidebarLeftProps {
  onLogout: () => void;
  onNavigate?: () => void;
}

const categories = [
  { value: '', label: 'All Posts', icon: FiGrid },
  { value: 'college-activities', label: 'College Activities', icon: FiBookOpen },
  { value: 'general', label: 'General', icon: FiUsers },
  { value: 'extracurricular', label: 'Extracurricular', icon: FiStar },
];

const SidebarLeft: React.FC<SidebarLeftProps> = ({ onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSession();
  
  const currentCategory = searchParams.get('category') || '';
  const showFilters = location.pathname === '/feed';

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  const handleCategoryChange = (categoryValue: string) => {
    const currentSearch = searchParams.get('search') || '';
    const params = new URLSearchParams();
    
    if (currentSearch.trim()) params.set('search', currentSearch.trim());
    if (categoryValue) params.set('category', categoryValue);
    
    // Navigate to feed if not already there
    if (location.pathname !== '/feed') {
      navigate(`/feed?${params.toString()}`);
    } else {
      setSearchParams(params);
    }
    
    handleNavClick();
  };

  return (
    <div className="sidebar-left-content">
      {/* Logo Section */}
      <div className="sidebar-logo">
        <Link to="/feed" onClick={handleNavClick} className="sidebar-logo-link">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg" 
            alt="NU Logo" 
            className="sidebar-logo-img"
          />
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">CCIT Wall</span>
            <span className="sidebar-logo-subtitle">NU Manila</span>
          </div>
        </Link>
      </div>

      {/* User Profile Preview */}
      <div className="sidebar-user-preview">
        {user?.profilePicture ? (
          <img 
            src={user.profilePicture} 
            alt={user.name} 
            className="sidebar-user-avatar"
          />
        ) : (
          <div className="sidebar-user-avatar-placeholder">
            {user?.name?.charAt(0) || 'U'}
          </div>
        )}
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.name || 'User'}</span>
          <span className="sidebar-user-role">{user?.role || 'Member'}</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <Link 
          to="/feed" 
          onClick={handleNavClick}
          className={`sidebar-nav-item ${isActive('/feed') ? 'active' : ''}`}
        >
          <FiHome size={20} />
          <span>Feed</span>
        </Link>
        <Link 
          to="/profile" 
          onClick={handleNavClick}
          className={`sidebar-nav-item ${isActive('/profile') ? 'active' : ''}`}
        >
          <FiUser size={20} />
          <span>Profile</span>
        </Link>
        <Link 
          to="/about" 
          onClick={handleNavClick}
          className={`sidebar-nav-item ${isActive('/about') ? 'active' : ''}`}
        >
          <FiInfo size={20} />
          <span>About</span>
        </Link>
      </nav>

      {/* Category Filter Section */}
      {showFilters && (
        <div className="sidebar-filter-section">
          <div className="sidebar-section-title">Categories</div>
          <div className="sidebar-category-list">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = currentCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryChange(cat.value)}
                  className={`sidebar-category-item ${isSelected ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{cat.label}</span>
                  {isSelected && <span className="sidebar-category-check" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Section - Always Visible */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-brand">
          {/* <img 
            src="https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg" 
            alt="NU Logo" 
            className="sidebar-footer-logo"
          /> */}
          {/* <span className="sidebar-footer-text">CCIT Wall</span> */}
        </div>
        <p className="sidebar-footer-copyright">
          &copy; {new Date().getFullYear()} NU Manila CCIT
        </p>
        <p className="sidebar-footer-tagline">
          Building community, one post at a time.
        </p>
      </div>
    </div>
  );
};

export default SidebarLeft;
