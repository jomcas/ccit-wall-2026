import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { postService } from '../services/api';
import { Post as PostType } from '../types';
import PostComponent from '../components/Post';
import CreatePostWidget from '../components/CreatePostWidget';
import { useSession } from '../contexts/SessionContext';
import { FiInbox } from 'react-icons/fi';
import '../styles/index.css';

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const { handleSessionExpired } = useSession();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  useEffect(() => {
    if (searchQuery) {
      handleSearch();
    } else {
      loadPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, searchQuery]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await postService.getAllPosts('', category);
      setPosts(response.data);
    } catch (error: any) {
      console.error('Failed to load posts', error);
      if (error.response?.status === 401) {
        handleSessionExpired();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadPosts();
      return;
    }

    setLoading(true);
    try {
      const response = await postService.searchPosts(searchQuery);
      // Also filter by category if selected
      let filteredPosts = response.data;
      if (category) {
        filteredPosts = response.data.filter((post: PostType) => post.category === category);
      }
      setPosts(filteredPosts);
    } catch (error) {
      console.error('Failed to search posts', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostDeleted = () => {
    if (searchQuery) {
      handleSearch();
    } else {
      loadPosts();
    }
  };

  const handlePostUpdated = (updatedPost: PostType) => {
    setPosts(posts.map(p => {
      const postId = p._id || p.id;
      const updatedId = updatedPost._id || updatedPost.id;
      return postId === updatedId ? updatedPost : p;
    }));
  };

  const handlePostCreated = () => {
    loadPosts();
  };

  return (
    <div className="feed-container">
      {/* Search indicator */}
      {searchQuery && (
        <div className="feed-search-indicator">
          Showing results for "{searchQuery}"
        </div>
      )}

      {/* Create Post Widget */}
      <CreatePostWidget onPostCreated={handlePostCreated} />

      {/* Posts List */}
      {loading ? (
        <div className="feed-loading">
          Loading posts...
        </div>
      ) : posts.length === 0 ? (
        <div className="feed-empty-state">
          <FiInbox size={48} />
          <span className="feed-empty-title">
            {searchQuery ? 'No posts found matching your search' : 'No posts available yet'}
          </span>
          <span className="feed-empty-subtitle">
            Be the first to share something with the community!
          </span>
        </div>
      ) : (
        <div className="posts-list">
          {posts.map((post) => (
            <PostComponent 
              key={post._id || post.id} 
              post={post} 
              onPostDeleted={handlePostDeleted} 
              onPostUpdated={handlePostUpdated} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed;
