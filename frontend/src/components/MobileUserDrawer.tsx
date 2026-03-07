import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { userService } from '../services/api';
import { User as UserType } from '../types';
import { useSession } from '../contexts/SessionContext';
import UserRow from './UserRow';
import { FiUsers, FiSearch, FiX } from 'react-icons/fi';

const MobileUserDrawer: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { user: currentUser } = useSession();

  // Track window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Fetch users when drawer opens
  const loadUsers = useCallback(async () => {
    try {
      const response = await userService.getAllUsers();
      const filtered = response.data.filter(
        (user: UserType) => user.role !== 'admin' && (user._id || user.id) !== currentUser?.id
      );
      setUsers(filtered);
      setFilteredUsers(filtered);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isOpen && users.length === 0) {
      loadUsers();
    }
  }, [isOpen, loadUsers, users.length]);

  // Client-side search filter
  useEffect(() => {
    if (search.trim()) {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [search, users]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when drawer is open
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

  const handleClose = () => {
    setIsOpen(false);
    setSearch('');
  };

  const handleUserClick = () => {
    handleClose();
  };

  // Only render on mobile
  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Users Button - rendered inline in the header */}
      <button
        className="header-users-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Community members"
        title="Community"
      >
        <FiUsers size={20} />
      </button>

      {/* Backdrop + Bottom Drawer - rendered via portal */}
      {isOpen && ReactDOM.createPortal(
        <>
          <div
            className="users-drawer-backdrop"
            onClick={handleClose}
            aria-hidden="true"
          />

          <div
            className="users-drawer"
            role="dialog"
            aria-label="Community Members"
          >
            <div className="users-drawer-header">
              <h3>
                <FiUsers size={18} />
                <span>Community</span>
              </h3>
              <span className="users-drawer-count">{users.length} members</span>
            </div>

            {/* Search */}
            <div className="users-drawer-search">
              <FiSearch size={16} className="users-drawer-search-icon" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="users-drawer-search-input"
                autoFocus
              />
              {search && (
                <button
                  className="users-drawer-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>

            {/* User List */}
            <div className="users-drawer-content" onClick={handleUserClick}>
              {loading ? (
                <div className="users-drawer-loading">Loading...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="users-drawer-empty">
                  <FiUsers size={24} />
                  <p>{search ? 'No users found' : 'No users available'}</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <UserRow key={user._id || user.id} user={user} />
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default MobileUserDrawer;
