import React, { useCallback, useEffect, useState } from 'react';
import { userService } from '../services/api';
import { User as UserType } from '../types';
import { useSession } from '../contexts/SessionContext';
import UserRow from './UserRow';
import { UserRowSkeleton } from './SkeletonLoader';
import { cache, CACHE_TTL } from '../utils/cache';
import { FiSearch, FiUsers } from 'react-icons/fi';

const SidebarRight: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserType[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useSession();

  const loadUsers = useCallback(async () => {
    const cacheKey = 'users_list';
    const cached = cache.get<UserType[]>(cacheKey);
    if (cached) {
      const filtered = cached.filter(
        (user: UserType) => user.role !== 'admin' && (user._id || user.id) !== currentUser?.id
      );
      setUsers(filtered);
      setFilteredUsers(filtered);
      setLoading(false);
      return;
    }
    try {
      const response = await userService.getAllUsers();
      const filtered = response.data.filter(
        (user: UserType) => user.role !== 'admin' && (user._id || user.id) !== currentUser?.id
      );
      cache.set(cacheKey, response.data, CACHE_TTL.USERS);
      setUsers(filtered);
      setFilteredUsers(filtered);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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



  return (
    <div className="sidebar-right-content">
      <div className="sidebar-right-header">
        <h3 className="sidebar-right-title">
          <FiUsers size={18} />
          <span>Community</span>
        </h3>
        <span className="sidebar-right-count">{users.length} members</span>
      </div>

      {/* Search Input */}
      <div className="sidebar-search-wrapper">
        <FiSearch size={16} className="sidebar-search-icon" />
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sidebar-search-input"
        />
      </div>

      {/* Users List */}
      <div className="sidebar-users-list">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <UserRowSkeleton key={i} />
            ))}
          </>
        ) : filteredUsers.length === 0 ? (
          <div className="sidebar-empty">
            {search ? 'No users found' : 'No users available'}
          </div>
        ) : (
          filteredUsers.slice(0, 15).map((user) => (
            <UserRow key={user._id || user.id} user={user} />
          ))
        )}
      </div>

      {/* View All Link */}
      {filteredUsers.length > 15 && (
        <div className="sidebar-view-all">
          <span>+{filteredUsers.length - 15} more members</span>
        </div>
      )}
    </div>
  );
};

export default SidebarRight;
