import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import SidebarLeft from './SidebarLeft';
import SidebarRight from './SidebarRight';
import { FiMenu, FiX, FiSearch, FiBell, FiLogOut, FiHeart, FiMessageCircle, FiCheckCircle } from 'react-icons/fi';
import { notificationService } from '../services/api';
import { useSession } from '../contexts/SessionContext';
import { Notification } from '../types';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  showRightSidebar?: boolean;
}

const POLLING_INTERVAL = 10000; // 10 seconds

const Layout: React.FC<LayoutProps> = ({ children, onLogout, showRightSidebar = true }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const location = useLocation();
  const navigate = useNavigate();
  
  // Notification state
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { handleSessionExpired, isSessionExpired } = useSession();

  // Sync search query from URL on location change
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setCategory(searchParams.get('category') || '');
  }, [searchParams]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (isSessionExpired) return;
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
    }
  }, [handleSessionExpired, isSessionExpired]);

  // Fetch recent notifications for popover
  const fetchNotifications = useCallback(async () => {
    if (isSessionExpired) return;
    setLoadingNotifications(true);
    try {
      const response = await notificationService.getNotifications(1, 5);
      setNotifications(response.data.notifications || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
    } finally {
      setLoadingNotifications(false);
    }
  }, [handleSessionExpired, isSessionExpired]);

  // Poll for unread count
  useEffect(() => {
    if (isSessionExpired) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, isSessionExpired]);

  // Fetch notifications when popover opens
  useEffect(() => {
    if (notificationOpen) {
      fetchNotifications();
    }
  }, [notificationOpen, fetchNotifications]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateSearchParams = (newSearch: string, newCategory: string) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set('search', newSearch.trim());
    if (newCategory) params.set('category', newCategory);
    
    // Navigate to feed if not already there
    if (location.pathname !== '/feed') {
      navigate(`/feed?${params.toString()}`);
    } else {
      setSearchParams(params);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    updateSearchParams(value, category);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    updateSearchParams('', category);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await notificationService.markAsRead(notification._id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    // Navigate to post
    setNotificationOpen(false);
    if (notification.post?._id) {
      navigate(`/feed?post=${notification.post._id}`);
    } else {
      navigate('/feed');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'post_liked':
      case 'comment_liked':
        return <FiHeart size={14} className="notification-type-icon notification-type-like" />;
      case 'post_commented':
        return <FiMessageCircle size={14} className="notification-type-icon notification-type-comment" />;
      case 'post_reaction':
        return <FiHeart size={14} className="notification-type-icon notification-type-like" />;
      default:
        return <FiBell size={14} className="notification-type-icon" />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const senderName = notification.sender?.name || 'Someone';
    const postTitle = notification.post?.title
      ? `"${notification.post.title.substring(0, 30)}${notification.post.title.length > 30 ? '...' : ''}"`
      : 'your post';

    switch (notification.type) {
      case 'post_liked':
        return (
          <>
            <strong>{senderName}</strong> liked {postTitle}
          </>
        );
      case 'post_commented':
        return (
          <>
            <strong>{senderName}</strong> commented on {postTitle}
          </>
        );
      case 'comment_liked':
        return (
          <>
            <strong>{senderName}</strong> liked your comment
          </>
        );
      case 'post_reaction':
        return (
          <>
            <strong>{senderName}</strong> reacted to {postTitle}
          </>
        );
      default:
        return 'New notification';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="app-layout">
      {/* Top Header Bar */}
      <header className="top-header">
        <div className="top-header-content">
          {/* Left: Brand with subtitle */}
          <Link to="/feed" className="top-header-brand">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg" 
              alt="NU Logo" 
              className="top-header-logo"
            />
            <div className="top-header-brand-text">
              <span className="top-header-title">CCIT Wall</span>
              <span className="top-header-subtitle">National University Manila</span>
            </div>
          </Link>

          {/* Center: Search Bar only */}
          <div className="top-header-center">
            <div className="top-header-search">
              <FiSearch size={18} className="top-header-search-icon" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="top-header-search-input"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={handleClearSearch}
                  className="top-header-search-clear"
                  aria-label="Clear search"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Right: Theme Toggle + Notification Bell + Logout */}
          <div className="top-header-right">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notification Bell with Popover */}
            <div className="header-notification-container" ref={notificationRef}>
              <button 
                className="header-notification-btn"
                onClick={() => setNotificationOpen(!notificationOpen)}
                aria-label="Notifications"
              >
                <FiBell size={22} />
                {unreadCount > 0 && (
                  <span className="header-notification-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notification Popover */}
              {notificationOpen && (
                <div className="header-notification-popover">
                  <div className="header-notification-popover-header">
                    <h4>Notifications</h4>
                    {unreadCount > 0 && (
                      <button 
                        className="header-mark-all-read"
                        onClick={handleMarkAllAsRead}
                      >
                        <FiCheckCircle size={14} />
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="header-notification-popover-content">
                    {loadingNotifications ? (
                      <div className="header-notification-loading">Loading...</div>
                    ) : notifications.length === 0 ? (
                      <div className="header-notification-empty">
                        <FiBell size={24} />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification._id}
                          className={`header-notification-item ${!notification.read ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="header-notification-avatar">
                            {notification.sender?.profilePicture ? (
                              <img src={notification.sender.profilePicture} alt="" />
                            ) : (
                              <div className="header-notification-avatar-placeholder">
                                {notification.sender?.name?.charAt(0) || '?'}
                              </div>
                            )}
                            <span className="header-notification-type-badge">
                              {getNotificationIcon(notification.type)}
                            </span>
                          </div>
                          <div className="header-notification-body">
                            <p className="header-notification-text">{getNotificationText(notification)}</p>
                            <span className="header-notification-time">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                          {!notification.read && <span className="header-notification-dot" />}
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="header-notification-popover-footer">
                    <Link 
                      to="/notifications" 
                      className="header-view-all-link"
                      onClick={() => setNotificationOpen(false)}
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button 
              className="header-logout-btn"
              onClick={onLogout}
              aria-label="Logout"
              title="Logout"
            >
              <FiLogOut size={20} />
            </button>
            
            {/* Mobile menu button */}
            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <FiMenu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`sidebar-left ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <button 
          className="mobile-close-btn"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          <FiX size={24} />
        </button>
        <SidebarLeft onLogout={onLogout} onNavigate={() => setMobileMenuOpen(false)} />
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Right Sidebar */}
      {showRightSidebar && (
        <aside className="sidebar-right">
          <SidebarRight />
        </aside>
      )}
    </div>
  );
};

export default Layout;
