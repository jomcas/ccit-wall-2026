import React, { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services/api';
import { Notification, NotificationResponse } from '../types';
import NotificationItem from '../components/NotificationItem';
import { useSession } from '../contexts/SessionContext';
import { FiBell, FiCheck, FiInbox } from 'react-icons/fi';
import '../styles/index.css';

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const { handleSessionExpired } = useSession();

  const fetchNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const unreadOnly = filter === 'unread';
      const response = await notificationService.getNotifications(pageNum, 20, unreadOnly);
      const data: NotificationResponse = response.data;

      if (append) {
        setNotifications((prev) => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, handleSessionExpired]);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to mark all as read', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to delete notification', error);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNotifications(page + 1, true);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="container notifications-page" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <FiBell size={28} /> Notifications
        </h1>
        <p className="page-subtitle" style={{ marginTop: '8px' }}>Stay updated with activity on your posts and comments</p>
      </div>

      <div className="notifications-header">
        <div className="notifications-filters">
          <button
            className={`notification-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`notification-filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            className="button button-secondary"
            onClick={handleMarkAllAsRead}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FiCheck size={16} /> Mark all as read
          </button>
        )}
      </div>

      <div className="notifications-list">
        {loading ? (
          <div className="notification-loading" style={{ padding: '40px', textAlign: 'center' }}>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 20px' }}>
            <FiInbox size={48} style={{ color: 'var(--text-secondary)' }} />
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDelete={handleDelete}
                showDelete={true}
              />
            ))}

            {hasMore && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <button
                  className="button button-secondary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
