import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiAlertCircle, FiCheck, FiInbox } from 'react-icons/fi';
import { notificationService } from '../services/api';
import NotificationItem from '../components/NotificationItem';
import { NotificationSkeleton } from '../components/SkeletonLoader';
import { useSession } from '../contexts/SessionContext';
import type { Notification, NotificationResponse } from '../types';

type NotificationFilter = 'all' | 'unread';
type DateGroup = 'Today' | 'This Week' | 'Earlier';

const GROUP_ORDER: DateGroup[] = ['Today', 'This Week', 'Earlier'];
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const getDateGroup = (dateString: string): DateGroup => {
  const now = new Date();
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Earlier';

  const diffMs = now.getTime() - date.getTime();
  const isSameCalendarDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameCalendarDay || diffMs < DAY_MS) {
    return 'Today';
  }
  if (diffMs < WEEK_MS) {
    return 'This Week';
  }
  return 'Earlier';
};

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const { handleSessionExpired } = useSession();

  const fetchNotifications = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError('');
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

        setHasMore(Boolean(data.pagination?.hasMore));
        setPage(pageNum);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 401) {
          handleSessionExpired();
          return;
        }
        setError('Unable to load notifications right now. Please try again.');
        console.error('Failed to fetch notifications', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, handleSessionExpired]
  );

  useEffect(() => {
    fetchNotifications(1, false);
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      if (filter === 'unread') {
        setNotifications([]);
        setHasMore(false);
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to mark all as read', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        handleSessionExpired();
      }
      console.error('Failed to delete notification', err);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNotifications(page + 1, true);
    }
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setFilter((prev) => (prev === 'all' ? 'unread' : 'all'));
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const groupedNotifications = useMemo(() => {
    const groups: Record<DateGroup, Notification[]> = {
      Today: [],
      'This Week': [],
      Earlier: [],
    };

    for (const item of notifications) {
      const bucket = getDateGroup(item.createdAt);
      groups[bucket].push(item);
    }

    return GROUP_ORDER.map((label) => ({
      label,
      items: groups[label],
    })).filter((section) => section.items.length > 0);
  }, [notifications]);

  return (
    <section className="notif-page" aria-label="Notifications">
      <div className="paper notif-sheet">
        <header className="notif-sheet__top">
          <div className="notif-sheet__heading">
            <h1>Notifications</h1>
            <p className="notif-sheet__subtitle">
              Activity on your posts, announcements, and comments
            </p>
          </div>

          <div className="notif-sheet__controls">
            <div
              className="segmented-tabs"
              role="tablist"
              aria-label="Notification filter"
              onKeyDown={handleFilterKeyDown}
            >
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'unread'}
                onClick={() => setFilter('unread')}
              >
                Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
              >
                <FiCheck size={14} aria-hidden="true" />
                {markingAll ? 'Marking...' : 'Mark all as read'}
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="notif-sheet__error" role="alert">
            <FiAlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => fetchNotifications(1, false)}
            >
              Retry
            </button>
          </div>
        )}

        <div className="notif-sheet__list">
          {loading ? (
            <div className="notif-sheet__skeletons" aria-label="Loading notifications">
              {[1, 2, 3, 4, 5].map((i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : groupedNotifications.length === 0 ? (
            <div className="page-empty-state">
              <FiInbox size={40} aria-hidden="true" />
              <p className="page-empty-state__title">
                {filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}
              </p>
              <p className="page-empty-state__sub">
                {filter === 'unread'
                  ? 'No unread notifications right now.'
                  : 'Likes, reactions, and comments on your posts will appear here.'}
              </p>
            </div>
          ) : (
            <>
              {groupedNotifications.map((section) => (
                <div key={section.label} className="notif-group">
                  <div className="notif-group-label">{section.label}</div>
                  {section.items.map((notification) => (
                    <NotificationItem
                      key={notification._id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDelete}
                      showDelete={true}
                    />
                  ))}
                </div>
              ))}

              {hasMore && (
                <div className="notif-load-more">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading more...' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default Notifications;
