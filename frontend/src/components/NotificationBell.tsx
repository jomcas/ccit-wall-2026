import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { notificationService } from '../services/api';
import { Notification } from '../types';
import NotificationItem from './NotificationItem';
import { useSession } from '../contexts/SessionContext';
import { FiBell } from 'react-icons/fi';
import '../styles/index.css';

const POLLING_INTERVAL = 10000; // 10 seconds

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { handleSessionExpired, isSessionExpired } = useSession();

  // Check if on notifications page (hide FAB there)
  const isOnNotificationsPage = location.pathname === '/notifications';

  // Track window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    // Don't fetch if session is expired
    if (isSessionExpired) {
      return;
    }
    
    try {
      const response = await notificationService.getUnreadCount();
      console.log('Unread count fetched:', response.data.count);
      setUnreadCount(response.data.count);
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to fetch unread count', error);
    }
  }, [handleSessionExpired, isSessionExpired]);

  const fetchNotifications = useCallback(async () => {
    // Don't fetch if session is expired
    if (isSessionExpired) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await notificationService.getNotifications(1, 10);
      setNotifications(response.data.notifications);
      // Also fetch the actual unread count from the API
      const countResponse = await notificationService.getUnreadCount();
      setUnreadCount(countResponse.data.count);
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  }, [handleSessionExpired, isSessionExpired]);

  const handleMarkAsRead = async (id: string) => {
    if (isSessionExpired) return;
    
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isSessionExpired) return;
    
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to mark all as read', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (isSessionExpired) return;
    
    try {
      await notificationService.deleteNotification(id);
      const deletedNotification = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to delete notification', error);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  // Close dropdown when clicking outside (desktop only)
  useEffect(() => {
    if (isMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  // Fetch notifications when dropdown/drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Poll for unread count (stop if session expired)
  useEffect(() => {
    // Don't poll if session is expired
    if (isSessionExpired) {
      return;
    }
    
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, isSessionExpired]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  // ============================================
  // DESKTOP: Header bell + dropdown
  // ============================================
  if (!isMobile) {
    return (
      <div className="notification-bell-container" ref={dropdownRef}>
        <button
          className="notification-bell-button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <FiBell size={20} />
          {unreadCount > 0 && (
            <span className="notification-badge" aria-hidden="true">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div
            className="notification-dropdown"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="notification-dropdown-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  className="notification-mark-all-read"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="notification-dropdown-content">
              {loading ? (
                <div className="notification-loading">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="notification-empty">No notifications yet</div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

            <div className="notification-dropdown-footer">
              <Link
                to="/notifications"
                className="notification-view-all"
                onClick={() => setIsOpen(false)}
                style={{ color: 'black' }}
              >
                View all notifications
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // MOBILE: FAB hidden on /notifications page
  // ============================================
  if (isOnNotificationsPage) {
    return null;
  }

  // ============================================
  // MOBILE: FAB + Bottom Drawer (via Portal)
  // ============================================
  return ReactDOM.createPortal(
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <div className="notification-fab">
          <button
            className="notification-fab-button"
            onClick={() => setIsOpen(true)}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-haspopup="true"
          >
            <FiBell size={24} />
            {unreadCount > 0 && (
              <span className="notification-fab-badge" aria-hidden="true">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Backdrop + Bottom Drawer */}
      {isOpen && (
        <>
          <div
            className="notification-backdrop"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            className="notification-drawer"
            role="dialog"
            aria-label="Notifications"
          >
            <div className="notification-drawer-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  className="notification-mark-all-read"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="notification-drawer-content">
              {loading ? (
                <div className="notification-loading">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="notification-empty">No notifications yet</div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

            <div className="notification-drawer-footer">
              <button
              className="notification-view-all-btn"
              onClick={handleViewAll}
              >
              View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </>,
    document.body
  );
};

export default NotificationBell;
