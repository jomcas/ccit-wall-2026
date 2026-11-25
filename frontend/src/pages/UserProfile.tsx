import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiInbox,
  FiMail,
  FiPhone,
  FiUser,
  FiFileText,
  FiBookOpen,
  FiCalendar,
} from 'react-icons/fi';
import { userService, postService } from '../services/api';
import PostComponent from '../components/Post';
import { ProfileCardSkeleton, PostSkeleton } from '../components/SkeletonLoader';
import { useSession } from '../contexts/SessionContext';
import { cache, CACHE_TTL } from '../utils/cache';
import type { User, Post as PostType } from '../types';

type ProfileTab = 'posts' | 'about';

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

const getRolePillClass = (role?: User['role']): string => {
  if (role === 'teacher') return 'role-pill role-pill--teacher';
  if (role === 'admin') return 'role-pill role-pill--admin';
  return 'role-pill role-pill--student';
};

const matchesPostAuthor = (post: PostType, targetUser: User): boolean => {
  const author = post.author as Partial<User> | undefined;
  if (!author) return false;
  const authorId = author._id || author.id;
  const targetId = targetUser._id || targetUser.id;
  if (authorId && targetId && authorId === targetId) return true;
  return Boolean(author.name && targetUser.name && author.name === targetUser.name);
};

const formatMemberDate = (value?: Date | string): string | null => {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, handleSessionExpired } = useSession();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [posts, setPosts] = useState<PostType[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadUserProfile = useCallback(async () => {
    if (!userId) {
      setError('User ID not provided.');
      setLoading(false);
      return;
    }

    const currentUserId = currentUser?._id || currentUser?.id;
    const cacheKey = `user_profile_${userId}`;
    const cached = cache.get<User>(cacheKey);

    if (cached) {
      const cachedId = cached._id || cached.id;
      if (
        currentUser &&
        (cachedId === currentUserId || cached.email === currentUser.email)
      ) {
        navigate('/profile', { replace: true });
        return;
      }
      setUser(cached);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await userService.getUserById(userId);
      const fetchedUser: User = response.data;
      const fetchedUserId = fetchedUser._id || fetchedUser.id;

      if (
        currentUser &&
        (fetchedUserId === currentUserId || fetchedUser.email === currentUser.email)
      ) {
        navigate('/profile', { replace: true });
        return;
      }

      setUser(fetchedUser);
      cache.set(cacheKey, fetchedUser, CACHE_TTL.PROFILE);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      setError('Failed to load user profile.');
      console.error('Failed to load user profile', err);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser, navigate, handleSessionExpired]);

  const loadUserPosts = useCallback(
    async (targetUser: User) => {
      setPostsLoading(true);
      try {
        const response = await postService.getAllPosts();
        const allPosts: PostType[] = Array.isArray(response.data) ? response.data : [];

        // Exclude anonymous posts on public user profile views
        const publicUserPosts = allPosts
          .filter((post) => !post.isAnonymous && matchesPostAuthor(post, targetUser))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

        setPosts(publicUserPosts);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 401) {
          handleSessionExpired();
          return;
        }
        console.error('Failed to load user posts', err);
      } finally {
        setPostsLoading(false);
      }
    },
    [handleSessionExpired]
  );

  useEffect(() => {
    setActiveTab('posts');
    loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    if (user) {
      loadUserPosts(user);
    }
  }, [user, loadUserPosts]);

  const handlePostUpdated = (updatedPost: PostType) => {
    setPosts((prev) =>
      prev.map((p) => {
        const existingId = p._id || p.id;
        const updatedId = updatedPost._id || updatedPost.id;
        return existingId === updatedId ? updatedPost : p;
      })
    );
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveTab((prev) => (prev === 'posts' ? 'about' : 'posts'));
    }
  };

  const totalLikes = useMemo(
    () => posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0),
    [posts]
  );

  const memberSince = useMemo(() => formatMemberDate(user?.createdAt), [user?.createdAt]);

  if (loading) {
    return (
      <section className="profile-page" aria-label="Loading member profile">
        <ProfileCardSkeleton />
        <div className="profile-posts-list">
          <PostSkeleton />
        </div>
      </section>
    );
  }

  if (error || !user) {
    return (
      <section className="profile-page" aria-label="Member not found">
        <div className="paper page-empty-state">
          <FiAlertCircle size={40} aria-hidden="true" />
          <p className="page-empty-state__title">{error || 'User not found'}</p>
          <p className="page-empty-state__sub">
            The member profile you requested may no longer be available.
          </p>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => navigate('/feed')}
          >
            <FiArrowLeft size={14} aria-hidden="true" />
            Back to Feed
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="profile-page" aria-label={`${user.name}'s profile`}>
      {/* Horizontal Identity Header Card */}
      <article className="paper profile-header-card">
        <div className="profile-banner" aria-hidden="true" />

        <div className="profile-header-body">
          <div className="profile-top-row">
            <div className="profile-avatar-wrap">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="profile-avatar-img"
                />
              ) : (
                <div
                  className={`profile-avatar-initials ${
                    user.role === 'student' ? 'profile-avatar-initials--gold' : ''
                  }`}
                  aria-hidden="true"
                >
                  {getInitials(user.name)}
                </div>
              )}
            </div>

            <div className="profile-header-actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => navigate('/feed')}
              >
                <FiArrowLeft size={14} aria-hidden="true" />
                Back to Feed
              </button>
            </div>
          </div>

          <div className="profile-identity">
            <h1 className="profile-name">{user.name}</h1>
            <span className={getRolePillClass(user.role)}>{user.role}</span>
          </div>

          {user.bio && <p className="profile-bio">{user.bio}</p>}

          <div className="profile-meta-row">
            <span className="profile-meta-item">
              <strong>{posts.length}</strong> {posts.length === 1 ? 'Post' : 'Posts'}
            </span>
            <span className="profile-meta-item">
              <strong>{totalLikes}</strong>{' '}
              {totalLikes === 1 ? 'Like received' : 'Likes received'}
            </span>
            <span className="profile-meta-item">
              <FiMail size={14} aria-hidden="true" />
              <span>{user.email}</span>
            </span>
            {user.contactInformation && (
              <span className="profile-meta-item">
                <FiPhone size={14} aria-hidden="true" />
                <span>{user.contactInformation}</span>
              </span>
            )}
          </div>
        </div>
      </article>

      {/* Horizontal Segmented Tabs */}
      <div className="profile-tabs-row">
        <div
          className="segmented-tabs"
          role="tablist"
          aria-label="Profile sections"
          onKeyDown={handleTabKeyDown}
        >
          <button
            id="user-profile-tab-posts"
            type="button"
            role="tab"
            aria-selected={activeTab === 'posts'}
            aria-controls="user-profile-panel-posts"
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            id="user-profile-tab-about"
            type="button"
            role="tab"
            aria-selected={activeTab === 'about'}
            aria-controls="user-profile-panel-about"
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'posts' ? (
        <div
          id="user-profile-panel-posts"
          role="tabpanel"
          aria-labelledby="user-profile-tab-posts"
          className="profile-posts-list"
        >
          {postsLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : posts.length === 0 ? (
            <div className="paper page-empty-state">
              <FiInbox size={40} aria-hidden="true" />
              <p className="page-empty-state__title">No public posts yet</p>
              <p className="page-empty-state__sub">
                {user.name} has not shared any public posts on CCIT Wall yet.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostComponent
                key={post._id || post.id}
                post={post}
                onPostDeleted={() => loadUserPosts(user)}
                onPostUpdated={handlePostUpdated}
              />
            ))
          )}
        </div>
      ) : (
        <div
          id="user-profile-panel-about"
          role="tabpanel"
          aria-labelledby="user-profile-tab-about"
          className="paper profile-about-card"
        >
          <h2 className="profile-about-title">Academic &amp; Contact Details</h2>
          <dl className="profile-about-grid">
            <div className="profile-about-row">
              <dt className="profile-about-label">
                <FiUser size={15} aria-hidden="true" />
                Role
              </dt>
              <dd className="profile-about-value">
                <span className={getRolePillClass(user.role)}>{user.role}</span>
              </dd>
            </div>

            <div className="profile-about-row">
              <dt className="profile-about-label">
                <FiMail size={15} aria-hidden="true" />
                Email
              </dt>
              <dd className="profile-about-value">
                <a href={`mailto:${user.email}`} className="profile-about-link">
                  {user.email}
                </a>
              </dd>
            </div>

            {user.contactInformation && (
              <div className="profile-about-row">
                <dt className="profile-about-label">
                  <FiPhone size={15} aria-hidden="true" />
                  Contact
                </dt>
                <dd className="profile-about-value">{user.contactInformation}</dd>
              </div>
            )}

            <div className="profile-about-row">
              <dt className="profile-about-label">
                <FiBookOpen size={15} aria-hidden="true" />
                Department
              </dt>
              <dd className="profile-about-value">
                College of Computing and Information Technologies, National University Manila
              </dd>
            </div>

            {user.bio && (
              <div className="profile-about-row">
                <dt className="profile-about-label">
                  <FiFileText size={15} aria-hidden="true" />
                  Bio
                </dt>
                <dd className="profile-about-value">{user.bio}</dd>
              </div>
            )}

            {memberSince && (
              <div className="profile-about-row">
                <dt className="profile-about-label">
                  <FiCalendar size={15} aria-hidden="true" />
                  Member Since
                </dt>
                <dd className="profile-about-value">{memberSince}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </section>
  );
};

export default UserProfile;
