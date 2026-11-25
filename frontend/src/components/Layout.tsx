import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  FiHome,
  FiMenu,
  FiX,
  FiSearch,
  FiBell,
  FiPlus,
  FiChevronDown,
  FiCheckCircle,
} from 'react-icons/fi';
import SidebarLeft from './SidebarLeft';
import SidebarRight from './SidebarRight';
import MobileUserDrawer from './MobileUserDrawer';
import { notificationService } from '../services/api';
import { useSession } from '../contexts/SessionContext';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import type { Notification } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  showRightSidebar?: boolean;
}

const POLLING_INTERVAL = 10000;
const NU_SHIELD_URL = 'https://upload.wikimedia.org/wikipedia/commons/9/90/NU_shield.svg';

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatTimeAgo(dateString: string): string {
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
}

function positionPopoverFallback(trigger: HTMLElement | null, popover: HTMLElement | null): void {
  if (!trigger || !popover) return;
  if (typeof CSS !== 'undefined' && CSS.supports('position-area: block-end')) {
    return;
  }
  const rect = trigger.getBoundingClientRect();
  const popWidth = popover.offsetWidth || 280;
  const popHeight = popover.offsetHeight || 240;
  const margin = 12;

  let top = rect.bottom + 8;
  if (top + popHeight > window.innerHeight - margin && rect.top - popHeight - 8 > margin) {
    top = rect.top - popHeight - 8;
  }
  const left = Math.max(margin, Math.min(window.innerWidth - popWidth - margin, rect.right - popWidth));

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}

function supportsInvokerCommands(): boolean {
  return typeof HTMLButtonElement !== 'undefined' && 'commandForElement' in HTMLButtonElement.prototype;
}

function supportsPopoverApi(el: HTMLElement | null): el is HTMLElement & {
  togglePopover: (options?: boolean | { force?: boolean; source?: HTMLElement }) => boolean;
  hidePopover: () => void;
  showPopover: (options?: { source?: HTMLElement }) => void;
} {
  return Boolean(el && typeof (el as HTMLElement & { togglePopover?: unknown }).togglePopover === 'function');
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout, showRightSidebar = true }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const location = useLocation();
  const navigate = useNavigate();

  const { user, handleSessionExpired, isSessionExpired, isMockMode, switchMockRole } = useSession();
  const { themeMode, setThemeMode } = useTheme();

  // Notification popover state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Account menu popover state
  const [accountOpen, setAccountOpen] = useState(false);
  const lastAccountInputRef = useRef<'pointer' | 'keyboard' | null>(null);
  const themeCloseTimerRef = useRef<number | null>(null);

  // Refs & unique IDs for popovers & mobile search
  const notifTriggerId = useId();
  const notifPopoverId = useId();
  const accountTriggerId = useId();
  const accountMenuId = useId();
  const mobileSearchBarId = useId();

  const notifTriggerRef = useRef<HTMLButtonElement>(null);
  const notifPopoverRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountFocusGroupRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const userId = user?._id || user?.id || '';

  // Sync search & category from URL params
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setCategory(searchParams.get('category') || '');
  }, [searchParams]);

  // Close mobile drawer on route change or Escape
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Auto-focus mobile search input when expanded
  useEffect(() => {
    if (!mobileSearchOpen) return;
    const focusTimer = window.setTimeout(() => {
      mobileSearchInputRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(focusTimer);
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    return () => {
      if (themeCloseTimerRef.current !== null) {
        window.clearTimeout(themeCloseTimerRef.current);
      }
    };
  }, []);

  // Fetch unread notification count
  const fetchUnreadCount = useCallback(async () => {
    if (isSessionExpired) return;
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.data.count || 0);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        handleSessionExpired();
      }
    }
  }, [handleSessionExpired, isSessionExpired]);

  // Fetch last 5 notifications for popover
  const fetchNotifications = useCallback(async () => {
    if (isSessionExpired) return;
    setLoadingNotifications(true);
    try {
      const response = await notificationService.getNotifications(1, 5);
      setNotifications(response.data.notifications || []);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        handleSessionExpired();
      }
    } finally {
      setLoadingNotifications(false);
    }
  }, [handleSessionExpired, isSessionExpired]);

  // Poll unread count (re-runs on role switch too)
  useEffect(() => {
    if (isSessionExpired) return;
    fetchUnreadCount();
    const interval = window.setInterval(fetchUnreadCount, POLLING_INTERVAL);
    return () => window.clearInterval(interval);
  }, [fetchUnreadCount, isSessionExpired, userId]);

  const hidePopoverSafe = (el: HTMLElement | null) => {
    if (supportsPopoverApi(el)) {
      try {
        if (el.matches(':popover-open')) {
          el.hidePopover();
        }
      } catch {
        // Ignore if already closed
      }
    }
  };

  // Sync notifications popover native toggle event + anchor positioning fallback
  useEffect(() => {
    const pop = notifPopoverRef.current;
    if (!pop) return;

    const handleToggle = (event: Event) => {
      const toggleEvent = event as Event & { newState?: string };
      const isOpen = toggleEvent.newState === 'open';
      setNotifOpen(isOpen);
      if (isOpen) {
        fetchNotifications();
        requestAnimationFrame(() => positionPopoverFallback(notifTriggerRef.current, pop));
      }
    };

    pop.addEventListener('toggle', handleToggle);
    return () => pop.removeEventListener('toggle', handleToggle);
  }, [fetchNotifications]);

  // Sync account menu native toggle event + anchor positioning fallback + keyboard entry
  useEffect(() => {
    const pop = accountMenuRef.current;
    if (!pop) return;

    const handleToggle = (event: Event) => {
      const toggleEvent = event as Event & { newState?: string };
      const isOpen = toggleEvent.newState === 'open';
      setAccountOpen(isOpen);
      if (isOpen) {
        requestAnimationFrame(() => {
          positionPopoverFallback(accountTriggerRef.current, pop);
          const openedViaKeyboard = lastAccountInputRef.current === 'keyboard';
          lastAccountInputRef.current = null;
          if (openedViaKeyboard) {
            const firstItem = accountFocusGroupRef.current?.querySelector<HTMLButtonElement>(
              'button:not(:disabled)'
            );
            firstItem?.focus({ preventScroll: true });
          } else {
            // Ensure ArrowDown works after a pointer open on browsers where pointerdown doesn't focus buttons
            accountTriggerRef.current?.focus({ preventScroll: true });
          }
        });
      } else {
        lastAccountInputRef.current = null;
      }
    };

    pop.addEventListener('toggle', handleToggle);
    return () => pop.removeEventListener('toggle', handleToggle);
  }, []);

  // Re-clamp fallback position on viewport resize while open
  useEffect(() => {
    if (!notifOpen && !accountOpen) return;
    const handleResize = () => {
      if (notifOpen) positionPopoverFallback(notifTriggerRef.current, notifPopoverRef.current);
      if (accountOpen) positionPopoverFallback(accountTriggerRef.current, accountMenuRef.current);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [notifOpen, accountOpen]);

  // Focusgroup fallback for browsers without native focusgroup support
  useEffect(() => {
    const group = accountFocusGroupRef.current;
    if (!group) return;

    const hasNativeFocusGroup =
      typeof HTMLElement !== 'undefined' && 'focusGroup' in HTMLElement.prototype;

    if (!hasNativeFocusGroup) {
      group.setAttribute('role', 'menu');
      group.querySelectorAll<HTMLButtonElement>('button:not([role])').forEach((item) => {
        item.setAttribute('role', 'menuitem');
      });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        hidePopoverSafe(accountMenuRef.current);
        return;
      }

      if (hasNativeFocusGroup) {
        if (event.key !== 'Home' && event.key !== 'End') return;
      } else if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        return;
      }

      const items = Array.from(group.querySelectorAll<HTMLButtonElement>('button')).filter(
        (item) => !item.disabled && item.getAttribute('aria-disabled') !== 'true'
      );
      if (items.length === 0) return;

      const current = items.indexOf(document.activeElement as HTMLButtonElement);
      let nextIndex = 0;

      if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = items.length - 1;
      } else if (current < 0) {
        nextIndex = event.key === 'ArrowUp' ? items.length - 1 : 0;
      } else {
        nextIndex = (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
      }

      event.preventDefault();
      items[nextIndex].focus({ preventScroll: true });
    };

    group.addEventListener('keydown', handleKeyDown, true);
    return () => group.removeEventListener('keydown', handleKeyDown, true);
  }, [isMockMode]);

  const handleNotifTriggerClick = () => {
    if (supportsInvokerCommands()) return;
    const pop = notifPopoverRef.current;
    if (supportsPopoverApi(pop)) {
      pop.togglePopover();
    }
  };

  const handleAccountTriggerPointerDown = () => {
    lastAccountInputRef.current = 'pointer';
  };

  const handleAccountTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) {
      lastAccountInputRef.current = 'keyboard';
    }
    if (supportsInvokerCommands()) return;
    const pop = accountMenuRef.current;
    if (supportsPopoverApi(pop)) {
      pop.togglePopover();
    }
  };

  const handleAccountTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      lastAccountInputRef.current = 'keyboard';
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const pop = accountMenuRef.current;
      if (pop && pop.matches(':popover-open')) {
        const firstItem = accountFocusGroupRef.current?.querySelector<HTMLButtonElement>(
          'button:not(:disabled)'
        );
        firstItem?.focus({ preventScroll: true });
      } else {
        lastAccountInputRef.current = 'keyboard';
        accountTriggerRef.current?.click();
      }
    }
  };

  // Search param syncing
  const updateSearchParams = (newSearch: string, newCategory: string) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set('search', newSearch.trim());
    if (newCategory) params.set('category', newCategory);

    if (location.pathname !== '/feed') {
      const qs = params.toString();
      navigate(qs ? `/feed?${qs}` : '/feed');
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

  const handleNewPostClick = () => {
    if (location.pathname === '/feed') {
      window.dispatchEvent(new CustomEvent('ccit:open-composer', { detail: { mode: 'standard' } }));
    } else {
      navigate('/create');
    }
  };

  // Notifications actions
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await notificationService.markAsRead(notification._id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    hidePopoverSafe(notifPopoverRef.current);
    if (notification.post?._id) {
      navigate(`/feed?post=${notification.post._id}`);
    } else {
      navigate('/feed');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationText = (notification: Notification) => {
    const senderName = notification.sender?.name || 'Someone';
    const rawTitle = notification.post?.title || '';
    const postTitle = rawTitle
      ? `"${rawTitle.length > 42 ? `${rawTitle.slice(0, 42)}…` : rawTitle}"`
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
            <strong>{senderName}</strong> reacted{' '}
            {notification.reactionEmoji ? `${notification.reactionEmoji} ` : ''}to {postTitle}
          </>
        );
      default:
        return (
          <>
            <strong>{senderName}</strong> interacted with {postTitle}
          </>
        );
    }
  };

  // Account menu actions
  const handleAccountNav = (path: string) => {
    hidePopoverSafe(accountMenuRef.current);
    navigate(path);
  };

  const handleThemeChoice = (mode: ThemeMode) => {
    setThemeMode(mode);
    if (themeCloseTimerRef.current !== null) {
      window.clearTimeout(themeCloseTimerRef.current);
    }
    themeCloseTimerRef.current = window.setTimeout(() => {
      hidePopoverSafe(accountMenuRef.current);
    }, 240);
  };

  const handleRoleSwitch = (role: 'student' | 'teacher' | 'admin') => {
    switchMockRole(role);
    window.dispatchEvent(new CustomEvent('ccit:posts-updated'));
    if (themeCloseTimerRef.current !== null) {
      window.clearTimeout(themeCloseTimerRef.current);
    }
    themeCloseTimerRef.current = window.setTimeout(() => {
      hidePopoverSafe(accountMenuRef.current);
    }, 220);
  };

  const handleSignOut = () => {
    hidePopoverSafe(accountMenuRef.current);
    onLogout();
  };

  const userInitials = getInitials(user?.name);
  const avatarVariant = user?.role === 'student' ? 'shell-avatar--gold' : '';
  const rolePillClass =
    user?.role === 'teacher'
      ? 'role-pill--teacher'
      : user?.role === 'admin'
      ? 'role-pill--admin'
      : 'role-pill--student';

  return (
    <div className="shell-root">
      {/* Top Sticky Header */}
      <header className="app-header">
        {/* Left: NU Shield Brand */}
        <Link to="/feed" className="app-header__brand">
          <img src={NU_SHIELD_URL} alt="NU Shield Logo" className="app-header__logo" />
          <span className="app-header__brand-text">
            <span className="app-header__title">CCIT Wall</span>
            <span className="app-header__sub">National University Manila</span>
          </span>
        </Link>

        {/* Center: Global Search Pill */}
        <div className="app-header__search">
          <FiSearch size={16} className="app-header__search-icon" aria-hidden="true" />
          <input
            type="search"
            className="app-header__search-input"
            placeholder="Search posts, announcements, or members..."
            aria-label="Search posts, announcements, or members"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {searchQuery && (
            <button
              type="button"
              className="app-header__search-clear"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <FiX size={14} />
            </button>
          )}
        </div>

        {/* Right: + New Post, Mobile Drawer, Notifications Popover, Account Menu, Mobile Nav */}
        <div className="app-header__actions">
          <button
            type="button"
            className="btn btn--gold shell-btn-sm app-header__new-post"
            onClick={handleNewPostClick}
            aria-label="Create new post"
          >
            <FiPlus size={15} aria-hidden="true" />
            <span>New Post</span>
          </button>

          {/* Mobile-only Search Toggle Button */}
          <button
            type="button"
            className="btn btn--ghost btn--icon mobile-search-toggle-btn"
            onClick={() => setMobileSearchOpen((prev) => !prev)}
            aria-label="Search"
            aria-expanded={mobileSearchOpen}
            aria-controls={mobileSearchBarId}
          >
            <FiSearch size={19} aria-hidden="true" />
          </button>

          {/* Mobile Community Users Drawer */}
          <MobileUserDrawer />

          {/* Notifications Trigger + Native Popover (adjacent siblings, no aria-details) */}
          <button
            id={notifTriggerId}
            ref={notifTriggerRef}
            type="button"
            className="btn btn--ghost shell-btn-icon notif-trigger"
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
            aria-expanded={notifOpen}
            {...({ command: 'toggle-popover', commandfor: notifPopoverId } as Record<string, string>)}
            onClick={handleNotifTriggerClick}
          >
            <FiBell size={18} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="notif-badge" aria-hidden="true">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <div
            id={notifPopoverId}
            ref={notifPopoverRef}
            className="shell-popover notif-popover anchored-end menu-pop"
            {...({ popover: 'auto' } as Record<string, string>)}
            aria-label="Recent notifications"
          >
            <div className="notif-popover__head">
              <h3>Notifications</h3>
              <button
                type="button"
                className="btn btn--ghost shell-btn-sm"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                <FiCheckCircle size={13} aria-hidden="true" />
                <span>Mark all read</span>
              </button>
            </div>

            <div className="notif-popover__list">
              {loadingNotifications ? (
                <div className="notif-popover__state">Loading notifications…</div>
              ) : notifications.length === 0 ? (
                <div className="notif-popover__state">
                  <FiBell size={22} aria-hidden="true" />
                  <span>No notifications yet</span>
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <button
                    key={notification._id}
                    type="button"
                    className={`notif-row ${!notification.read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {notification.sender?.profilePicture ? (
                      <img
                        src={notification.sender.profilePicture}
                        alt=""
                        className="shell-avatar shell-avatar--sm"
                      />
                    ) : (
                      <span className="shell-avatar shell-avatar--sm" aria-hidden="true">
                        {getInitials(notification.sender?.name)}
                      </span>
                    )}
                    <div className="notif-row__body">
                      <p className="notif-row__text">{getNotificationText(notification)}</p>
                      <span className="notif-row__time">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    {!notification.read && (
                      <span className="notif-dot" aria-label="Unread notification" />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="notif-popover__foot">
              <Link
                to="/notifications"
                className="btn btn--ghost shell-btn-sm notif-popover__view-all"
                onClick={() => hidePopoverSafe(notifPopoverRef.current)}
              >
                View all notifications
              </Link>
            </div>
          </div>

          {/* Account Menu Trigger + Native Menu Popover */}
          <button
            id={accountTriggerId}
            ref={accountTriggerRef}
            type="button"
            className="account-trigger"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-label={`Account menu for ${user?.name || 'User'}`}
            {...({ command: 'toggle-popover', commandfor: accountMenuId } as Record<string, string>)}
            onPointerDown={handleAccountTriggerPointerDown}
            onClick={handleAccountTriggerClick}
            onKeyDown={handleAccountTriggerKeyDown}
          >
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt=""
                className="shell-avatar shell-avatar--sm"
              />
            ) : (
              <span className={`shell-avatar shell-avatar--sm ${avatarVariant}`} aria-hidden="true">
                {userInitials}
              </span>
            )}
            <span className="account-trigger__name">{user?.name || 'User'}</span>
            <FiChevronDown size={14} className="account-trigger__chevron" aria-hidden="true" />
          </button>

          <div
            id={accountMenuId}
            ref={accountMenuRef}
            className="shell-popover account-menu anchored-end menu-pop"
            {...({ popover: 'auto' } as Record<string, string>)}
          >
            <div className="account-menu__inner">
              <div className="account-menu__head">
                <div className="account-menu__head-row">
                  <strong>{user?.name || 'User'}</strong>
                  {user?.role && (
                    <span className={`role-pill ${rolePillClass}`}>{user.role}</span>
                  )}
                </div>
                <span className="account-menu__head-email">{user?.email || ''}</span>
              </div>

              <div
                ref={accountFocusGroupRef}
                {...({ focusgroup: 'menu nomemory' } as Record<string, string>)}
                aria-labelledby={accountTriggerId}
              >
                <button type="button" onClick={() => handleAccountNav('/profile')}>
                  View profile
                </button>
                <button type="button" onClick={() => handleAccountNav('/profile?edit=true')}>
                  Edit profile
                </button>
                <button type="button" onClick={() => handleAccountNav('/notifications')}>
                  Notifications
                </button>

                <hr />
                <div className="menu-section-label">Appearance</div>
                <div role="group" aria-label="Color scheme">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={themeMode === 'system'}
                    onClick={() => handleThemeChoice('system')}
                  >
                    System default
                  </button>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={themeMode === 'light'}
                    onClick={() => handleThemeChoice('light')}
                  >
                    Light (Cork board)
                  </button>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={themeMode === 'dark'}
                    onClick={() => handleThemeChoice('dark')}
                  >
                    Dark (Charcoal)
                  </button>
                </div>

                {isMockMode && (
                  <>
                    <hr />
                    <div className="menu-section-label">Switch demo role</div>
                    <div role="group" aria-label="Switch demo role">
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={user?.role === 'teacher'}
                        onClick={() => handleRoleSwitch('teacher')}
                      >
                        Teacher
                      </button>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={user?.role === 'student'}
                        onClick={() => handleRoleSwitch('student')}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={user?.role === 'admin'}
                        onClick={() => handleRoleSwitch('admin')}
                      >
                        Admin
                      </button>
                    </div>
                  </>
                )}

                <hr />
                <button
                  type="button"
                  className="account-menu__danger"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Hamburger Button for Left Rail Drawer */}
          <button
            type="button"
            className="btn btn--ghost shell-btn-icon shell-mobile-menu-btn"
            onClick={() => {
              setMobileSearchOpen(false);
              setMobileMenuOpen(true);
            }}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <FiMenu size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Expandable Full-Width Mobile Search Row (<= 768px) */}
      <div
        id={mobileSearchBarId}
        className={`mobile-search-bar ${mobileSearchOpen ? 'is-open' : ''}`}
        role="search"
        aria-label="Mobile search"
      >
        <div className="mobile-search-bar__field">
          <FiSearch size={16} className="mobile-search-bar__icon" aria-hidden="true" />
          <input
            ref={mobileSearchInputRef}
            type="search"
            className="mobile-search-bar__input"
            placeholder="Search posts, announcements, or members..."
            aria-label="Search posts, announcements, or members"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setMobileSearchOpen(false);
              }
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="mobile-search-bar__clear"
              onClick={() => {
                handleClearSearch();
                mobileSearchInputRef.current?.focus();
              }}
              aria-label="Clear search"
            >
              <FiX size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          className="btn btn--ghost shell-btn-sm mobile-search-bar__cancel"
          onClick={() => {
            handleClearSearch();
            setMobileSearchOpen(false);
          }}
        >
          Cancel
        </button>
      </div>

      {/* Mobile Navigation Backdrop */}
      {mobileMenuOpen && (
        <div
          className="shell-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 3-Column Bulletin Shell Grid */}
      <div className={`shell-grid ${!showRightSidebar ? 'shell-grid--no-right' : ''}`}>
        {/* Left Navigation Rail */}
        <aside
          className={`shell-rail shell-rail--left ${mobileMenuOpen ? 'is-mobile-open' : ''}`}
          aria-label="Primary navigation"
        >
          <button
            type="button"
            className="btn btn--ghost shell-btn-icon shell-mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          >
            <FiX size={18} aria-hidden="true" />
          </button>
          <SidebarLeft
            onLogout={onLogout}
            onNavigate={() => setMobileMenuOpen(false)}
            unreadCount={unreadCount}
          />
        </aside>

        {/* Center Main Content */}
        <main className="shell-main">{children}</main>

        {/* Right Community & Stats Rail */}
        {showRightSidebar && (
          <aside className="shell-rail shell-rail--right" aria-label="Community directory">
            <SidebarRight />
          </aside>
        )}
      </div>

      {/* Fixed 4-Column Mobile Bottom Navigation Bar (visible <= 768px) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <Link
          to="/feed"
          className={`mobile-bottom-nav__tab ${location.pathname === '/feed' ? 'active' : ''}`}
          aria-current={location.pathname === '/feed' ? 'page' : undefined}
        >
          <span className="mobile-bottom-nav__icon" aria-hidden="true">
            <FiHome size={20} />
          </span>
          <span>Feed</span>
        </Link>

        <button
          type="button"
          className="mobile-bottom-nav__post"
          onClick={handleNewPostClick}
          aria-label="Create new post"
        >
          <FiPlus size={16} aria-hidden="true" />
          <span>Post</span>
        </button>

        <Link
          to="/notifications"
          className={`mobile-bottom-nav__tab ${
            location.pathname === '/notifications' ? 'active' : ''
          }`}
          aria-current={location.pathname === '/notifications' ? 'page' : undefined}
          aria-label={unreadCount > 0 ? `Alerts (${unreadCount} unread)` : 'Alerts'}
        >
          <span className="mobile-bottom-nav__icon" aria-hidden="true">
            <FiBell size={20} />
            {unreadCount > 0 && (
              <span className="notif-badge mobile-bottom-nav__badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
          <span>Alerts</span>
        </Link>

        <Link
          to="/profile"
          className={`mobile-bottom-nav__tab ${location.pathname === '/profile' ? 'active' : ''}`}
          aria-current={location.pathname === '/profile' ? 'page' : undefined}
        >
          <span className="mobile-bottom-nav__icon" aria-hidden="true">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt=""
                className="shell-avatar shell-avatar--xs mobile-bottom-nav__avatar"
              />
            ) : (
              <span
                className={`shell-avatar shell-avatar--xs mobile-bottom-nav__avatar ${avatarVariant}`}
              >
                {userInitials}
              </span>
            )}
          </span>
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
};

export default Layout;
