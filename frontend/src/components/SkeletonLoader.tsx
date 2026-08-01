import React from 'react';
import '../styles/index.css';

/* ── Shared shimmer block ───────────────────── */
const Bone: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = '',
  style,
}) => <div className={`skeleton-bone ${className}`} style={style} />;

/* ── Post card skeleton (matches .card layout) */
export const PostSkeleton: React.FC = () => (
  <div className="skeleton-post card">
    {/* Header: avatar + author + meta */}
    <div className="skeleton-post-header">
      <Bone className="skeleton-avatar-sm" />
      <div className="skeleton-post-meta">
        <Bone style={{ width: '110px', height: '13px' }} />
        <Bone style={{ width: '70px', height: '11px', marginTop: '5px' }} />
      </div>
    </div>
    {/* Title */}
    <Bone style={{ width: '75%', height: '18px', marginTop: '14px' }} />
    {/* Content lines */}
    <Bone style={{ width: '100%', height: '13px', marginTop: '12px' }} />
    <Bone style={{ width: '92%', height: '13px', marginTop: '7px' }} />
    <Bone style={{ width: '68%', height: '13px', marginTop: '7px' }} />
    {/* Engagement bar */}
    <div className="skeleton-post-actions">
      <Bone style={{ width: '72px', height: '30px', borderRadius: 'var(--radius-sm)' }} />
      <Bone style={{ width: '72px', height: '30px', borderRadius: 'var(--radius-sm)' }} />
    </div>
  </div>
);

/* ── Profile card skeleton ──────────────────── */
export const ProfileCardSkeleton: React.FC = () => (
  <div className="skeleton-profile-card profile-card">
    <div className="skeleton-profile-body">
      {/* Avatar column */}
      <div className="skeleton-profile-avatar-col">
        <Bone className="skeleton-avatar-lg" />
        <Bone style={{ width: '140px', height: '20px', marginTop: '14px' }} />
        <Bone style={{ width: '80px', height: '16px', marginTop: '8px' }} />
      </div>
      {/* Info column */}
      <div className="skeleton-profile-info-col">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-info-row">
            <Bone style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
            <div className="skeleton-info-text">
              <Bone style={{ width: '70px', height: '11px' }} />
              <Bone style={{ width: '160px', height: '13px', marginTop: '6px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Notification item skeleton ─────────────── */
export const NotificationSkeleton: React.FC = () => (
  <div className="skeleton-notification notification-item">
    <Bone className="skeleton-notif-icon" />
    <div className="skeleton-notif-body">
      <Bone style={{ width: '200px', height: '13px' }} />
      <Bone style={{ width: '140px', height: '11px', marginTop: '6px' }} />
      <Bone style={{ width: '64px', height: '10px', marginTop: '5px' }} />
    </div>
  </div>
);

/* ── User row skeleton (sidebar) ────────────── */
export const UserRowSkeleton: React.FC = () => (
  <div className="skeleton-user-row user-row" style={{ pointerEvents: 'none' }}>
    <Bone className="skeleton-avatar-xs" />
    <div className="skeleton-user-row-text">
      <Bone style={{ width: '100px', height: '12px' }} />
      <Bone style={{ width: '65px', height: '11px', marginTop: '5px' }} />
    </div>
  </div>
);
