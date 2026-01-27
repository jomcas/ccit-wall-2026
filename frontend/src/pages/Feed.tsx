import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { postService, userService } from '../services/api';
import { Post as PostType, User as UserType } from '../types';
import PostComponent from '../components/Post';
import { FiFileText, FiUsers, FiSearch, FiInbox } from 'react-icons/fi';
import '../styles/index.css';

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [role, setRole] = useState('');
  const [searchType, setSearchType] = useState<'posts' | 'users'>('posts');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchType === 'posts') {
      loadPosts();
    } else {
      loadUsers();
    }
  }, [category, role, searchType]);

  useEffect(() => {
    if (search) {
      handleSearch();
    } else {
      if (searchType === 'posts') {
        loadPosts();
      } else {
        setUsers([]);
      }
      setIsSearching(false);
    }
  }, [search, searchType]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await postService.getAllPosts('', category);
      console.log('Posts fetched:', response.data); // Log backend response
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to load posts', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getAllUsers();
      let filteredUsers = response.data.filter((user: UserType) => user.role !== 'admin');
      
      // Filter by role if selected
      if (role) {
        filteredUsers = filteredUsers.filter((user: UserType) => user.role === role);
      }
      
      const sortedUsers = filteredUsers.sort((a: UserType, b: UserType) => {
        if (a.role === b.role) {
          return a.name.localeCompare(b.name);
        }
        return a.role.localeCompare(b.role);
      });
      setUsers(sortedUsers);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) {
      if (searchType === 'posts') {
        loadPosts();
      }
      return;
    }

    setIsSearching(true);
    setLoading(true);
    try {
      if (searchType === 'posts') {
        const response = await postService.searchPosts(search);
        setPosts(response.data);
      } else {
        const response = await userService.searchUsers(search);
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to search', error);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handlePostDeleted = () => {
    loadPosts();
  };

  const handlePostUpdated = (updatedPost: any) => {
    // Update the post in the posts list
    setPosts(posts.map(p => {
      const postId = p._id || p.id;
      const updatedId = updatedPost._id || updatedPost.id;
      return postId === updatedId ? updatedPost : p;
    }));
  };

  const handleSearchTypeChange = (type: 'posts' | 'users') => {
    setSearchType(type);
    setSearch('');
    setCategory('');
    setRole('');
    if (type === 'posts') {
      loadPosts();
    } else {
      loadUsers();
    }
  };

  return (
    <div className="container" style={{ padding: '20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="page-title">CCIT Wall Feed</h1>
        <p className="page-subtitle">Discover and share with the community</p>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', marginRight: '8px' }}>
          <button
            onClick={() => handleSearchTypeChange('posts')}
            className={`btn-tab ${searchType === 'posts' ? 'active' : ''}`}
          >
            <FiFileText size={16} style={{ marginRight: '6px' }} /> Search Posts
          </button>
          <button
            onClick={() => handleSearchTypeChange('users')}
            className={`btn-tab ${searchType === 'users' ? 'active' : ''}`}
          >
            <FiUsers size={16} style={{ marginRight: '6px' }} /> Search Users
          </button>
        </div>

        <input
          type="text"
          placeholder={searchType === 'posts' ? 'Search posts by title...' : 'Search users by name...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-modern"
          style={{ flex: 1, minWidth: '200px' }}
        />

        {searchType === 'posts' && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="select-modern"
          >
            <option value="">All Categories</option>
            <option value="college-activities">College Activities</option>
            <option value="general">General</option>
            <option value="extracurricular">Extracurricular</option>
          </select>
        )}

        {searchType === 'users' && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="select-modern"
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
          </select>
        )}
      </div>

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : searchType === 'posts' ? (
        posts.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FiInbox size={20} /> {search ? 'No posts found' : 'No posts available yet'}
          </div>
        ) : (
          posts.map((post) => (
            <PostComponent key={post.id} post={post} onPostDeleted={handlePostDeleted} onPostUpdated={handlePostUpdated} />
          ))
        )
      ) : (
        users.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FiUsers size={20} /> {search ? 'No users found' : 'Start typing to search for users'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {users.map((user) => (
              <Link
                key={user.id}
                to={`/user/${user._id || user.id}`}
                className="user-card"
              >
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ffca28 0%, #ffc107 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#fff',
                      boxShadow: '0 4px 6px -1px rgba(255, 193, 7, 0.3)',
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ margin: 0, marginBottom: '4px', fontWeight: '600' }}>{user.name}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>{user.email}</p>
                  <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '12px', textTransform: 'capitalize', fontWeight: '500' }}>
                    {user.role}
                  </p>
                  {user.bio && (
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>{user.bio}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default Feed;
