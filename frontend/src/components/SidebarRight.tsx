import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { postService, userService } from '../services/api';
import { useSession } from '../contexts/SessionContext';
import UserRow from './UserRow';
import { UserRowSkeleton } from './SkeletonLoader';
import { cache, CACHE_TTL, postsCacheKey } from '../utils/cache';
import type { Post as PostType, User as UserType } from '../types';

const SidebarRight: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [postsSnapshot, setPostsSnapshot] = useState<PostType[]>([]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { user: currentUser } = useSession();

  const currentUserId = currentUser?._id || currentUser?.id || '';

  // Load community directory members
  const loadUsers = useCallback(async () => {
    const cacheKey = 'users_list';
    const cached = cache.get<UserType[]>(cacheKey);
    if (cached) {
      const filtered = cached.filter(
        (member) => member.role !== 'admin' && (member._id || member.id) !== currentUserId
      );
      setUsers(filtered);
      setLoadingUsers(false);
      return;
    }

    try {
      const response = await userService.getAllUsers();
      cache.set(cacheKey, response.data, CACHE_TTL.USERS);
      const filtered = (response.data as UserType[]).filter(
        (member) => member.role !== 'admin' && (member._id || member.id) !== currentUserId
      );
      setUsers(filtered);
    } catch (error) {
      console.error('Failed to load community members', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [currentUserId]);

  // Load posts snapshot for live stats strip (My Posts / Likes / Notices)
  const loadStatsPosts = useCallback(async (preferCache = true) => {
    const allKey = postsCacheKey();
    if (preferCache) {
      const cached = cache.get<PostType[]>(allKey);
      if (cached) {
        setPostsSnapshot(cached);
        return;
      }
    }

    try {
      const response = await postService.getAllPosts();
      const fetched = (response.data || []) as PostType[];
      cache.set(allKey, fetched, CACHE_TTL.POSTS);
      setPostsSnapshot(fetched);
    } catch (error) {
      console.error('Failed to load post stats', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadStatsPosts(true);
  }, [loadStatsPosts, currentUserId]);

  // Keep stats strip synced when posts are created, liked, updated, or deleted
  useEffect(() => {
    const handlePostsUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ posts?: PostType[] }>;
      if (custom.detail?.posts) {
        setPostsSnapshot(custom.detail.posts);
      } else {
        loadStatsPosts(false);
      }
    };

    window.addEventListener('ccit:posts-updated', handlePostsUpdated);
    return () => window.removeEventListener('ccit:posts-updated', handlePostsUpdated);
  }, [loadStatsPosts]);

  // Compute live user + campus stats
  const stats = useMemo(() => {
    const myPosts = postsSnapshot.filter((post) => {
      const authorId = post.author?._id || post.author?.id || '';
      return currentUserId !== '' && authorId === currentUserId && !post.isAnonymous;
    });
    const totalLikes = myPosts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
    const noticesCount = postsSnapshot.filter((post) => post.isAnnouncement === true).length;

    return {
      myPostsCount: myPosts.length,
      likesCount: totalLikes,
      noticesCount,
    };
  }, [postsSnapshot, currentUserId]);

  // Filter community directory
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (member) =>
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q)
    );
  }, [search, users]);

  return (
    <>
      {/* Live Stats Strip */}
      <div className="paper stats-strip" aria-label="Your campus activity summary">
        <div className="stats-strip__item">
          <span className="stats-strip__val">{stats.myPostsCount}</span>
          <span className="stats-strip__lbl">My Posts</span>
        </div>
        <div className="stats-strip__item">
          <span className="stats-strip__val">{stats.likesCount}</span>
          <span className="stats-strip__lbl">Likes</span>
        </div>
        <div className="stats-strip__item">
          <span className="stats-strip__val">{stats.noticesCount}</span>
          <span className="stats-strip__lbl">Notices</span>
        </div>
      </div>

      {/* Community Directory Card */}
      <div className="paper community-card">
        <div className="community-card__head">
          <h3>Community</h3>
          <span className="community-card__count">
            {users.length} {users.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        <div className="community-search">
          <FiSearch size={14} className="community-search__icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Filter members..."
            aria-label="Filter community members"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input community-search__input"
          />
        </div>

        <div className="community-list">
          {loadingUsers ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <UserRowSkeleton key={i} />
              ))}
            </>
          ) : filteredUsers.length === 0 ? (
            <div className="community-empty">
              {search ? 'No matching members' : 'No community members yet'}
            </div>
          ) : (
            filteredUsers.slice(0, 15).map((member) => (
              <UserRow key={member._id || member.id} user={member} />
            ))
          )}
        </div>

        {filteredUsers.length > 15 && (
          <div className="community-more">
            +{filteredUsers.length - 15} more {filteredUsers.length - 15 === 1 ? 'member' : 'members'}
          </div>
        )}
      </div>
    </>
  );
};

export default SidebarRight;
