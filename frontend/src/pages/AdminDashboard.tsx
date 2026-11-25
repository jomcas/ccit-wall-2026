import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiUsers,
  FiFileText,
  FiBookOpen,
  FiAward,
  FiSearch,
  FiX,
  FiHeart,
  FiMessageCircle,
  FiAlertCircle,
  FiInbox,
  FiRefreshCw,
} from 'react-icons/fi';
import { adminService } from '../services/api';
import { formatTimeAgo } from '../components/NotificationItem';
import { useSession } from '../contexts/SessionContext';
import type { AdminDashboardData, Post as PostType, User } from '../types';

type RoleFilter = 'all' | 'student' | 'teacher';

const CATEGORY_LABELS: Record<PostType['category'], string> = {
  'college-activities': 'College Activities',
  general: 'General',
  extracurricular: 'Extracurricular',
};

const getRolePillClass = (role?: User['role']): string => {
  if (role === 'teacher') return 'role-pill role-pill--teacher';
  if (role === 'admin') return 'role-pill role-pill--admin';
  return 'role-pill role-pill--student';
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { handleSessionExpired } = useSession();

  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminService.getDashboard();
      setDashboard(response.data);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (axiosErr.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      setError(
        axiosErr.response?.data?.message ||
          'Failed to load campus activity dashboard. Please try again.'
      );
      console.error('Failed to load admin dashboard', err);
    } finally {
      setLoading(false);
    }
  }, [handleSessionExpired]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredPosts = useMemo(() => {
    const posts = dashboard?.recentPosts || [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return posts.filter((post) => {
      const authorRole = post.author?.role || 'student';
      if (roleFilter !== 'all' && authorRole !== roleFilter) {
        return false;
      }

      if (!normalizedQuery) return true;

      const authorName = (post.author?.name || '').toLowerCase();
      const title = (post.title || '').toLowerCase();
      const categoryLabel = (CATEGORY_LABELS[post.category] || post.category || '').toLowerCase();

      return (
        authorName.includes(normalizedQuery) ||
        title.includes(normalizedQuery) ||
        categoryLabel.includes(normalizedQuery)
      );
    });
  }, [dashboard, roleFilter, searchQuery]);

  const handleRoleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const order: RoleFilter[] = ['all', 'student', 'teacher'];
    const currentIdx = order.indexOf(roleFilter);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setRoleFilter(order[(currentIdx + 1) % order.length]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setRoleFilter(order[(currentIdx - 1 + order.length) % order.length]);
    }
  };

  const handleResetFilters = () => {
    setRoleFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = roleFilter !== 'all' || searchQuery.trim().length > 0;

  return (
    <section className="admin-page" aria-label="Admin activity dashboard">
      {/* Header Card */}
      <header className="paper admin-header-card">
        <div className="admin-header-copy">
          <span className="stamp stamp--gold">Admin Monitor</span>
          <h1 className="admin-header-title">Campus Activity Dashboard</h1>
          <p className="admin-header-sub">
            Monitor posts, announcements, engagement, and member roles across students and teachers.
          </p>
        </div>

        <div
          className="segmented-tabs"
          role="tablist"
          aria-label="Filter activity by member role"
          onKeyDown={handleRoleTabKeyDown}
        >
          <button
            type="button"
            role="tab"
            aria-selected={roleFilter === 'all'}
            onClick={() => setRoleFilter('all')}
          >
            All Roles
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={roleFilter === 'student'}
            onClick={() => setRoleFilter('student')}
          >
            Students
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={roleFilter === 'teacher'}
            onClick={() => setRoleFilter('teacher')}
          >
            Teachers
          </button>
        </div>
      </header>

      {/* Error State */}
      {error && (
        <div className="paper page-empty-state admin-error-state" role="alert">
          <FiAlertCircle size={36} aria-hidden="true" />
          <p className="page-empty-state__title">Could not load activity data</p>
          <p className="page-empty-state__sub">{error}</p>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={loadDashboard}
          >
            <FiRefreshCw size={14} aria-hidden="true" />
            Try Again
          </button>
        </div>
      )}

      {/* KPI Strip */}
      {!error && (
        <div className="admin-kpis" aria-label="Campus summary metrics">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="paper kpi-card" aria-hidden="true">
                <div className="skeleton-bone" style={{ width: '92px', height: '12px' }} />
                <div
                  className="skeleton-bone"
                  style={{ width: '60px', height: '28px', marginTop: '10px' }}
                />
              </div>
            ))
          ) : (
            <>
              <div className="paper kpi-card">
                <div className="kpi-card__top">
                  <span className="kpi-card__label">Active Members</span>
                  <FiUsers size={16} className="kpi-card__icon" aria-hidden="true" />
                </div>
                <span className="kpi-card__num">{dashboard?.totalUsers ?? 0}</span>
              </div>

              <div className="paper kpi-card">
                <div className="kpi-card__top">
                  <span className="kpi-card__label">Total Posts</span>
                  <FiFileText size={16} className="kpi-card__icon" aria-hidden="true" />
                </div>
                <span className="kpi-card__num">{dashboard?.totalPosts ?? 0}</span>
              </div>

              <div className="paper kpi-card">
                <div className="kpi-card__top">
                  <span className="kpi-card__label">Students</span>
                  <FiBookOpen size={16} className="kpi-card__icon" aria-hidden="true" />
                </div>
                <span className="kpi-card__num">{dashboard?.studentCount ?? 0}</span>
              </div>

              <div className="paper kpi-card">
                <div className="kpi-card__top">
                  <span className="kpi-card__label">Teachers</span>
                  <FiAward size={16} className="kpi-card__icon" aria-hidden="true" />
                </div>
                <span className="kpi-card__num">{dashboard?.teacherCount ?? 0}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Activity Log Table Card */}
      {!error && (
        <div className="paper admin-activity-card">
          <div className="admin-toolbar">
            <div className="admin-search-wrap">
              <FiSearch size={16} className="admin-search-icon" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter activity by member or post title..."
                aria-label="Filter activity by member or post title"
                className="input admin-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="admin-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search filter"
                >
                  <FiX size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            <span className="admin-result-count">
              {loading
                ? 'Loading...'
                : `${filteredPosts.length} ${filteredPosts.length === 1 ? 'post' : 'posts'}`}
            </span>
          </div>

          {loading ? (
            <div className="admin-table-skeleton" aria-label="Loading activity log">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="admin-table-skeleton__row">
                  <div className="skeleton-bone" style={{ width: '130px', height: '14px' }} />
                  <div className="skeleton-bone" style={{ width: '68px', height: '20px' }} />
                  <div className="skeleton-bone" style={{ width: '110px', height: '14px' }} />
                  <div className="skeleton-bone" style={{ flex: 1, height: '14px' }} />
                  <div className="skeleton-bone" style={{ width: '56px', height: '14px' }} />
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="page-empty-state">
              <FiInbox size={36} aria-hidden="true" />
              <p className="page-empty-state__title">No matching activity</p>
              <p className="page-empty-state__sub">
                {hasActiveFilters
                  ? 'Try clearing your search term or switching the role filter.'
                  : 'Recent student and faculty posts will appear here as members publish.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={handleResetFilters}
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <div
              className="admin-table-wrap"
              tabIndex={0}
              role="region"
              aria-labelledby="admin-activity-caption"
            >
              <table className="admin-table">
                <caption id="admin-activity-caption" className="sr-only">
                  Campus activity log of student and teacher posts
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Role</th>
                    <th scope="col">Category</th>
                    <th scope="col">Target Post</th>
                    <th scope="col">Engagement</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((post) => {
                    const postId = post._id || post.id || '';
                    const authorId = post.author?._id || post.author?.id || '';
                    const authorName = post.author?.name || 'Unknown Member';
                    const authorRole = post.author?.role || 'student';
                    const categoryLabel =
                      CATEGORY_LABELS[post.category] || post.category || 'General';
                    const likesCount = post.likes?.length || 0;
                    const commentsCount = post.comments?.length || 0;
                    const createdIso = new Date(post.createdAt).toISOString();

                    return (
                      <tr key={postId}>
                        <th scope="row" className="admin-member-cell">
                          {authorId ? (
                            <Link
                              to={`/user/${encodeURIComponent(authorId)}`}
                              className="admin-member-link"
                            >
                              {authorName}
                            </Link>
                          ) : (
                            <span className="admin-member-name">{authorName}</span>
                          )}
                          {post.isAnonymous && (
                            <span className="admin-anon-tag">Anonymous</span>
                          )}
                        </th>

                        <td>
                          <span className={getRolePillClass(authorRole)}>
                            {authorRole}
                          </span>
                        </td>

                        <td className="admin-category-cell">
                          <span>{categoryLabel}</span>
                          {post.isAnnouncement && (
                            <span className="admin-announcement-pill">Announcement</span>
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="admin-post-link"
                            onClick={() =>
                              navigate(`/feed?post=${encodeURIComponent(postId)}`)
                            }
                          >
                            {post.title}
                          </button>
                        </td>

                        <td>
                          <span className="admin-engagement">
                            <span
                              className="admin-engagement__stat"
                              title={`${likesCount} likes`}
                            >
                              <FiHeart size={13} aria-hidden="true" />
                              {likesCount}
                            </span>
                            <span
                              className="admin-engagement__stat"
                              title={`${commentsCount} comments`}
                            >
                              <FiMessageCircle size={13} aria-hidden="true" />
                              {commentsCount}
                            </span>
                          </span>
                        </td>

                        <td>
                          <time className="admin-time" dateTime={createdIso}>
                            {formatTimeAgo(post.createdAt)}
                          </time>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default AdminDashboard;
