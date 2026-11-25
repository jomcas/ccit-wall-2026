import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiBell, FiTrash2 } from 'react-icons/fi';
import type { Notification } from '../types';

export interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
  compact?: boolean;
  onSelect?: (notification: Notification) => void;
}

const getInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => !/^(dr|prof|mr|mrs|ms|engr)\.?$/i.test(part));
  const source = parts.length > 0 ? parts : name.trim().split(/\s+/);
  if (source.length === 1) return source[0].slice(0, 2).toUpperCase();
  return `${source[0][0]}${source[1][0]}`.toUpperCase();
};

export const formatTimeAgo = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  showDelete = false,
  compact = false,
  onSelect,
}) => {
  const navigate = useNavigate();

  const senderName = notification.sender?.name || 'Someone';
  const rawPostTitle = notification.post?.title?.trim();
  const postTitle =
    rawPostTitle && compact && rawPostTitle.length > 52
      ? `${rawPostTitle.slice(0, 52)}...`
      : rawPostTitle;

  const renderTypeBadge = () => {
    switch (notification.type) {
      case 'post_liked':
      case 'comment_liked':
        return (
          <span
            className="notif-row__type-badge notif-row__type-badge--like"
            aria-hidden="true"
          >
            <FiHeart size={11} />
          </span>
        );
      case 'post_commented':
        return (
          <span
            className="notif-row__type-badge notif-row__type-badge--comment"
            aria-hidden="true"
          >
            <FiMessageCircle size={11} />
          </span>
        );
      case 'post_reaction':
        return (
          <span
            className="notif-row__type-badge notif-row__type-badge--reaction"
            aria-hidden="true"
          >
            {notification.reactionEmoji ? (
              <span className="notif-row__emoji">{notification.reactionEmoji}</span>
            ) : (
              <FiHeart size={11} />
            )}
          </span>
        );
      default:
        return (
          <span
            className="notif-row__type-badge notif-row__type-badge--default"
            aria-hidden="true"
          >
            <FiBell size={11} />
          </span>
        );
    }
  };

  const renderActionMessage = () => {
    switch (notification.type) {
      case 'post_liked':
        return (
          <>
            <strong>{senderName}</strong> liked{' '}
            {postTitle ? <strong>{postTitle}</strong> : 'your post'}
          </>
        );
      case 'post_commented':
        return (
          <>
            <strong>{senderName}</strong> commented on{' '}
            {postTitle ? <strong>{postTitle}</strong> : 'your post'}
          </>
        );
      case 'comment_liked':
        return (
          <>
            <strong>{senderName}</strong> liked your comment
            {postTitle ? (
              <>
                {' '}
                on <strong>{postTitle}</strong>
              </>
            ) : null}
          </>
        );
      case 'post_reaction':
        return (
          <>
            <strong>{senderName}</strong> reacted{' '}
            {notification.reactionEmoji ? `${notification.reactionEmoji} ` : ''}to{' '}
            {postTitle ? <strong>{postTitle}</strong> : 'your post'}
          </>
        );
      default:
        return (
          <>
            <strong>{senderName}</strong> sent a notification
          </>
        );
    }
  };

  const handleSelect = () => {
    if (!notification.read) {
      onMarkAsRead(notification._id);
    }

    if (onSelect) {
      onSelect(notification);
      return;
    }

    const postId = notification.post?._id;
    if (postId) {
      navigate(`/feed?post=${encodeURIComponent(postId)}`);
    } else {
      navigate('/feed');
    }
  };

  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification._id);
    }
  };

  const commentExcerpt = notification.comment?.content?.trim();

  return (
    <div
      className={`notif-row ${!notification.read ? 'unread' : ''} ${
        compact ? 'notif-row--compact' : ''
      }`}
    >
      <button
        type="button"
        className="notif-row__trigger"
        onClick={handleSelect}
      >
        <span className="notif-row__avatar-wrap">
          {notification.sender?.profilePicture ? (
            <img
              src={notification.sender.profilePicture}
              alt=""
              className="notif-row__avatar-img"
            />
          ) : (
            <span className="notif-row__avatar-initials" aria-hidden="true">
              {getInitials(senderName)}
            </span>
          )}
          {renderTypeBadge()}
        </span>

        <span className="notif-row__body">
          <span className="notif-row__text">{renderActionMessage()}</span>
          {commentExcerpt && (
            <span className="notif-row__excerpt">&ldquo;{commentExcerpt}&rdquo;</span>
          )}
          <time className="notif-row__time" dateTime={notification.createdAt}>
            {formatTimeAgo(notification.createdAt)}
          </time>
        </span>

        {!notification.read && (
          <span className="notif-dot" aria-label="Unread notification" />
        )}
      </button>

      {showDelete && onDelete && (
        <button
          type="button"
          className="notif-row__delete"
          onClick={handleDeleteClick}
          aria-label="Delete notification"
          title="Delete notification"
        >
          <FiTrash2 size={15} />
        </button>
      )}
    </div>
  );
};

export default NotificationItem;
