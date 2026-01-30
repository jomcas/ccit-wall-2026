import React from 'react';
import { Link } from 'react-router-dom';
import { Notification } from '../types';
import { FiHeart, FiMessageCircle, FiSmile, FiTrash2 } from 'react-icons/fi';
import '../styles/index.css';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  showDelete?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  showDelete = false,
}) => {
  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'post_liked':
        return <FiHeart size={16} style={{ color: '#ef4444' }} />;
      case 'post_commented':
        return <FiMessageCircle size={16} style={{ color: '#3b82f6' }} />;
      case 'comment_liked':
        return <FiHeart size={16} style={{ color: '#ef4444' }} />;
      case 'post_reaction':
        return notification.reactionEmoji ? (
          <span style={{ fontSize: '16px' }}>{notification.reactionEmoji}</span>
        ) : (
          <FiSmile size={16} style={{ color: '#f59e0b' }} />
        );
      default:
        return null;
    }
  };

  const getNotificationText = () => {
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
            <strong>{senderName}</strong> reacted {notification.reactionEmoji} to {postTitle}
          </>
        );
      default:
        return 'New notification';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification._id);
    }
  };

  const postId = notification.post?._id;

  return (
    <div
      className={`notification-item ${!notification.read ? 'unread' : ''}`}
      onClick={handleClick}
    >
      <div className="notification-icon">{getNotificationIcon()}</div>

      <div className="notification-content">
        {postId ? (
          <Link to={`/feed`} className="notification-link">
            <p className="notification-text">{getNotificationText()}</p>
          </Link>
        ) : (
          <p className="notification-text">{getNotificationText()}</p>
        )}
        <span className="notification-time">{getTimeAgo(notification.createdAt)}</span>
      </div>

      <div className="notification-avatar">
        {notification.sender?.profilePicture ? (
          <img
            src={notification.sender.profilePicture}
            alt={notification.sender.name}
            className="notification-avatar-img"
          />
        ) : (
          <div className="notification-avatar-placeholder">
            {notification.sender?.name?.charAt(0).toUpperCase() || '?'}
          </div>
        )}
      </div>

      {showDelete && (
        <button
          className="notification-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification._id);
          }}
          title="Delete notification"
        >
          <FiTrash2 size={14} />
        </button>
      )}
    </div>
  );
};

export default NotificationItem;
