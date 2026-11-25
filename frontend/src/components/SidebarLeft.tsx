import React from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { FiHome, FiUser, FiBell, FiInfo, FiShield, FiLogOut } from 'react-icons/fi';
import { useSession } from '../contexts/SessionContext';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

interface SidebarLeftProps {
  onLogout: () => void;
  onNavigate?: () => void;
  unreadCount?: number;
}

const NU_SHIELD_URL = 'https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg';

const CATEGORIES = [
  { value: '', label: 'All Posts', dotClass: 'cat-dot--all' },
  { value: 'college-activities', label: 'College Activities', dotClass: 'cat-dot--college' },
  { value: 'general', label: 'General', dotClass: 'cat-dot--general' },
  { value: 'extracurricular', label: 'Extracurricular', dotClass: 'cat-dot--extra' },
];

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

const DEMO_ROLES: { role: 'teacher' | 'student' | 'admin'; label: string }[] = [
  { role: 'teacher', label: 'Teacher' },
  { role: 'student', label: 'Student' },
  { role: 'admin', label: 'Admin' },
];

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const SidebarLeft: React.FC<SidebarLeftProps> = ({ onLogout, onNavigate, unreadCount = 0 }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isMockMode, switchMockRole } = useSession();
  const { themeMode, setThemeMode } = useTheme();

  const currentCategory = searchParams.get('category') || '';
  const isFeedRoute = location.pathname === '/feed';

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  const handleCategoryChange = (categoryValue: string) => {
    const currentSearch = searchParams.get('search') || '';
    const params = new URLSearchParams();

    if (currentSearch.trim()) params.set('search', currentSearch.trim());
    if (categoryValue) params.set('category', categoryValue);

    if (location.pathname !== '/feed') {
      const qs = params.toString();
      navigate(qs ? `/feed?${qs}` : '/feed');
    } else {
      setSearchParams(params);
    }

    handleNavClick();
  };

  const handleRoleSwitch = (role: 'teacher' | 'student' | 'admin') => {
    switchMockRole(role);
    window.dispatchEvent(new CustomEvent('ccit:posts-updated'));
  };

  const handleMobileSignOut = () => {
    onLogout();
    if (onNavigate) onNavigate();
  };

  const avatarVariant = user?.role === 'student' ? 'shell-avatar--gold' : '';
  const rolePillClass =
    user?.role === 'teacher'
      ? 'role-pill--teacher'
      : user?.role === 'admin'
      ? 'role-pill--admin'
      : 'role-pill--student';

  return (
    <div className="paper rail-card">
      {/* Mobile Drawer Brand Header (hidden on desktop) */}
      <div className="rail-mobile-brand">
        <img src={NU_SHIELD_URL} alt="NU Shield" />
        <div className="app-header__brand-text">
          <span className="app-header__title">CCIT Wall</span>
          <span className="app-header__sub">National University Manila</span>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="rail-nav" aria-label="Main pages">
        <Link
          to="/feed"
          onClick={handleNavClick}
          className={`rail-nav__item ${isActive('/feed') ? 'active' : ''}`}
          aria-current={isActive('/feed') ? 'page' : undefined}
        >
          <FiHome size={16} aria-hidden="true" />
          <span>Feed</span>
        </Link>

        <Link
          to="/profile"
          onClick={handleNavClick}
          className={`rail-nav__item ${isActive('/profile') ? 'active' : ''}`}
          aria-current={isActive('/profile') ? 'page' : undefined}
        >
          <FiUser size={16} aria-hidden="true" />
          <span>My Profile</span>
        </Link>

        <Link
          to="/notifications"
          onClick={handleNavClick}
          className={`rail-nav__item ${isActive('/notifications') ? 'active' : ''}`}
          aria-current={isActive('/notifications') ? 'page' : undefined}
        >
          <FiBell size={16} aria-hidden="true" />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="rail-nav__badge rail-nav__badge--alert">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        <Link
          to="/about"
          onClick={handleNavClick}
          className={`rail-nav__item ${isActive('/about') ? 'active' : ''}`}
          aria-current={isActive('/about') ? 'page' : undefined}
        >
          <FiInfo size={16} aria-hidden="true" />
          <span>About CCIT</span>
        </Link>

        {user?.role === 'admin' && (
          <Link
            to="/admin"
            onClick={handleNavClick}
            className={`rail-nav__item ${isActive('/admin') ? 'active' : ''}`}
            aria-current={isActive('/admin') ? 'page' : undefined}
          >
            <FiShield size={16} aria-hidden="true" />
            <span>Admin Activity</span>
            <span className="role-pill role-pill--admin rail-nav__pill">Admin</span>
          </Link>
        )}
      </nav>

      <hr className="rail-divider" />

      {/* Category Filters */}
      <div className="rail-heading">Categories</div>
      <div className="rail-nav" role="group" aria-label="Filter posts by category">
        {CATEGORIES.map((cat) => {
          const isSelected = isFeedRoute && currentCategory === cat.value;
          return (
            <button
              key={cat.value || 'all'}
              type="button"
              onClick={() => handleCategoryChange(cat.value)}
              className={`rail-nav__item ${isSelected ? 'active' : ''}`}
              aria-pressed={isSelected}
            >
              <span className={`cat-dot ${cat.dotClass}`} aria-hidden="true" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile-Only Drawer Controls (visible <= 860px inside slide-in drawer) */}
      <div className="sidebar-mobile-controls">
        <hr className="rail-divider" />

        <div className="sidebar-mobile-user">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt="" className="shell-avatar" />
          ) : (
            <span className={`shell-avatar ${avatarVariant}`} aria-hidden="true">
              {getInitials(user?.name)}
            </span>
          )}
          <div className="sidebar-mobile-user__meta">
            <div className="sidebar-mobile-user__row">
              <strong>{user?.name || 'User'}</strong>
              {user?.role && <span className={`role-pill ${rolePillClass}`}>{user.role}</span>}
            </div>
            <span className="sidebar-mobile-user__email">{user?.email || ''}</span>
          </div>
        </div>

        <div className="rail-heading">Appearance</div>
        <div className="sidebar-mobile-pills" role="group" aria-label="Appearance">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              className="sidebar-mobile-pill"
              aria-pressed={themeMode === opt.mode}
              onClick={() => setThemeMode(opt.mode)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isMockMode && (
          <>
            <div className="rail-heading">Switch demo role</div>
            <div className="sidebar-mobile-pills" role="group" aria-label="Switch demo role">
              {DEMO_ROLES.map((opt) => (
                <button
                  key={opt.role}
                  type="button"
                  className="sidebar-mobile-pill"
                  aria-pressed={user?.role === opt.role}
                  onClick={() => handleRoleSwitch(opt.role)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        <hr className="rail-divider" />
        <button
          type="button"
          className="rail-nav__item sidebar-mobile-signout"
          onClick={handleMobileSignOut}
        >
          <FiLogOut size={16} aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>

      <div className="rail-foot">
        &copy; {new Date().getFullYear()} NU Manila CCIT
      </div>
    </div>
  );
};

export default SidebarLeft;
