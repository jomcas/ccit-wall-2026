import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiInbox } from 'react-icons/fi';
import { postService } from '../services/api';
import type { Post as PostType } from '../types';
import PostComponent from '../components/Post';
import CreatePostWidget from '../components/CreatePostWidget';
import { PostSkeleton } from '../components/SkeletonLoader';
import { useSession } from '../contexts/SessionContext';
import { cache, CACHE_TTL, postsCacheKey } from '../utils/cache';

type FeedTab = 'latest' | 'announcements' | 'top';

const CATEGORY_LABELS: Record<string, string> = {
  'college-activities': 'College Activities',
  general: 'General',
  extracurricular: 'Extracurricular',
};

const MOBILE_CATEGORIES = [
  { value: '', label: 'All', dotClass: 'cat-dot--all' },
  { value: 'college-activities', label: 'College Activities', dotClass: 'cat-dot--college' },
  { value: 'general', label: 'General', dotClass: 'cat-dot--general' },
  { value: 'extracurricular', label: 'Extracurricular', dotClass: 'cat-dot--extra' },
];

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedTab>('latest');
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const { user, handleSessionExpired } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const targetPostParam = searchParams.get('post') || '';
  const userId = user?._id || user?.id || '';

  const broadcastPostsUpdated = useCallback((updatedAllPosts?: PostType[]) => {
    window.dispatchEvent(
      new CustomEvent('ccit:posts-updated', {
        detail: updatedAllPosts ? { posts: updatedAllPosts } : undefined,
      })
    );
  }, []);

  const loadPosts = useCallback(async () => {
    const key = postsCacheKey(category);
    const cached = cache.get<PostType[]>(key);
    if (cached) {
      setPosts(cached);
      setLoading(false);
      if (!category) broadcastPostsUpdated(cached);
      return;
    }

    setLoading(true);
    try {
      const response = await postService.getAllPosts('', category);
      const fetched = (response.data || []) as PostType[];
      setPosts(fetched);
      cache.set(key, fetched, CACHE_TTL.POSTS);
      if (!category) broadcastPostsUpdated(fetched);
    } catch (error: unknown) {
      console.error('Failed to load posts', error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        handleSessionExpired();
      }
    } finally {
      setLoading(false);
    }
  }, [broadcastPostsUpdated, category, handleSessionExpired]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadPosts();
      return;
    }

    setLoading(true);
    try {
      const response = await postService.searchPosts(searchQuery);
      let filteredPosts = (response.data || []) as PostType[];
      if (category) {
        filteredPosts = filteredPosts.filter((post) => post.category === category);
      }
      setPosts(filteredPosts);
    } catch (error: unknown) {
      console.error('Failed to search posts', error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        handleSessionExpired();
      }
    } finally {
      setLoading(false);
    }
  }, [category, handleSessionExpired, loadPosts, searchQuery]);

  useEffect(() => {
    if (searchQuery) {
      handleSearch();
    } else {
      loadPosts();
    }
  }, [category, searchQuery, userId, handleSearch, loadPosts]);

  // Sort & filter posts based on active tab
  const displayedPosts = useMemo(() => {
    const list = [...posts];
    const getTime = (p: PostType) => new Date(p.createdAt).getTime();

    if (activeTab === 'announcements') {
      return list
        .filter((post) => post.isAnnouncement === true)
        .sort((a, b) => getTime(b) - getTime(a));
    }

    if (activeTab === 'top') {
      return list.sort((a, b) => {
        const diff = (b.likes?.length || 0) - (a.likes?.length || 0);
        return diff !== 0 ? diff : getTime(b) - getTime(a);
      });
    }

    // Latest: pinned announcements first, then newest first
    return list.sort((a, b) => {
      const aPinned = a.isAnnouncement ? 1 : 0;
      const bPinned = b.isAnnouncement ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return getTime(b) - getTime(a);
    });
  }, [posts, activeTab]);

  // Deep-link support for ?post=<id>: scroll smoothly + 3s gold highlight
  useEffect(() => {
    if (!targetPostParam || loading) return;

    const matchingPost = posts.find(
      (p) => (p._id || p.id) === targetPostParam
    );

    if (matchingPost && activeTab === 'announcements' && !matchingPost.isAnnouncement) {
      setActiveTab('latest');
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      const targetEl = document.getElementById(`post-${targetPostParam}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedPostId(targetPostParam);

        if (highlightTimerRef.current !== null) {
          window.clearTimeout(highlightTimerRef.current);
        }
        highlightTimerRef.current = window.setTimeout(() => {
          setHighlightedPostId(null);
        }, 3000);
      }
    }, 80);

    return () => window.clearTimeout(scrollTimer);
  }, [targetPostParam, loading, posts, activeTab]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  const handlePostDeleted = () => {
    cache.invalidateByPrefix('posts_');
    broadcastPostsUpdated();
    if (searchQuery) {
      handleSearch();
    } else {
      loadPosts();
    }
  };

  const handlePostUpdated = (updatedPost: PostType) => {
    const updatedId = updatedPost._id || updatedPost.id;
    setPosts((prev) => {
      const next = prev.map((p) => {
        const postId = p._id || p.id;
        return postId === updatedId ? updatedPost : p;
      });
      if (!searchQuery) {
        cache.set(postsCacheKey(category), next, CACHE_TTL.POSTS);
      }
      if (!searchQuery && !category) {
        broadcastPostsUpdated(next);
      } else {
        cache.invalidateByPrefix('posts_');
        broadcastPostsUpdated();
      }
      return next;
    });
  };

  const handlePostCreated = () => {
    cache.invalidateByPrefix('posts_');
    broadcastPostsUpdated();
    if (searchQuery) {
      handleSearch();
    } else {
      loadPosts();
    }
  };

  const handleCategoryChange = (categoryValue: string) => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (categoryValue) params.set('category', categoryValue);
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setActiveTab('latest');
    if (searchQuery || category) {
      setSearchParams(new URLSearchParams());
    }
  };

  const statusNote = useMemo(() => {
    const count = displayedPosts.length;
    if (searchQuery.trim()) {
      return `Results for "${searchQuery.trim()}" (${count})`;
    }
    if (category && CATEGORY_LABELS[category]) {
      return `${CATEGORY_LABELS[category]} (${count})`;
    }
    if (activeTab === 'announcements') {
      return `Showing ${count} faculty ${count === 1 ? 'announcement' : 'announcements'}`;
    }
    if (activeTab === 'top') {
      return `Top ${count} campus ${count === 1 ? 'post' : 'posts'}`;
    }
    return `Showing ${count} campus ${count === 1 ? 'post' : 'posts'}`;
  }, [activeTab, category, displayedPosts.length, searchQuery]);

  const hasActiveFilters = Boolean(searchQuery.trim() || category || activeTab !== 'latest');

  return (
    <section className="feed-col" aria-label="Community feed">
      {/* Top Feed Bar: Segmented Tabs + Status Note */}
      <div className="feed-topbar">
        <div className="segmented-tabs" role="tablist" aria-label="Feed view">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'latest'}
            onClick={() => setActiveTab('latest')}
          >
            Latest
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'announcements'}
            onClick={() => setActiveTab('announcements')}
          >
            Announcements
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'top'}
            onClick={() => setActiveTab('top')}
          >
            Top
          </button>
        </div>

        <span className="feed-status-note" aria-live="polite">
          {loading ? 'Loading campus board…' : statusNote}
        </span>
      </div>

      {/* Mobile / Tablet Horizontally Scrollable Category Chips (visible <= 860px) */}
      <div className="mobile-category-chips" role="group" aria-label="Filter posts by category">
        {MOBILE_CATEGORIES.map((cat) => {
          const isSelected = category === cat.value;
          return (
            <button
              key={cat.value || 'all'}
              type="button"
              className={`mobile-cat-chip ${isSelected ? 'active' : ''}`}
              aria-pressed={isSelected}
              onClick={() => handleCategoryChange(cat.value)}
            >
              <span className={`cat-dot ${cat.dotClass}`} aria-hidden="true" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Inline Composer Trigger + Native Dialog Composer */}
      <CreatePostWidget onPostCreated={handlePostCreated} />

      {/* Feed List */}
      {loading ? (
        <div className="feed-col">
          {[1, 2, 3].map((i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : displayedPosts.length === 0 ? (
        <div className="paper feed-empty">
          <FiInbox size={40} aria-hidden="true" />
          <h3>
            {searchQuery
              ? 'No matching posts'
              : activeTab === 'announcements'
              ? 'No announcements yet'
              : 'No posts available yet'}
          </h3>
          <p>
            {searchQuery || category
              ? 'Try clearing your search or switching categories.'
              : activeTab === 'announcements'
              ? 'Faculty announcements will appear pinned at the top of the wall.'
              : 'Be the first to pin a note to the CCIT Wall!'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn--ghost shell-btn-sm"
              onClick={handleClearFilters}
              style={{ marginTop: '8px' }}
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="feed-col">
          {displayedPosts.map((post) => {
            const postId = post._id || post.id || '';
            return (
              <PostComponent
                key={postId}
                post={post}
                onPostDeleted={handlePostDeleted}
                onPostUpdated={handlePostUpdated}
                isHighlighted={highlightedPostId === postId}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Feed;
