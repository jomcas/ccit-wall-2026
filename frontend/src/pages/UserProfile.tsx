import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userService, postService } from "../services/api";
import { User, Post as PostType } from "../types";
import PostComponent from "../components/Post";
import { useSession } from "../contexts/SessionContext";
import { FiAlertCircle, FiArrowLeft, FiInbox, FiMail, FiFileText, FiPhone } from 'react-icons/fi';
import "../styles/index.css";

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setError("User ID not provided");
      setLoading(false);
      return;
    }
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (user) {
      loadUserPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const response = await userService.getUserById(userId!);
      const fetchedUser = response.data;
      
      // Check if this is the current user's profile
      const fetchedUserId = fetchedUser._id || fetchedUser.id;
      const currentUserId = currentUser?._id || currentUser?.id;
      
      if (currentUser && (fetchedUserId === currentUserId || fetchedUser.email === currentUser.email)) {
        navigate('/profile', { replace: true });
        return;
      }
      
      setUser(fetchedUser);
    } catch (error) {
      setError("Failed to load user profile");
      console.error("Failed to load user profile", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async () => {
    setPostsLoading(true);
    try {
      const response = await postService.getAllPosts();
      
      // Filter posts to show only this user's posts
      const userPosts = response.data.filter((post: PostType) => {
        const postAuthor = post.author as any;
        return postAuthor.name === user?.name;
      });
      
      // Sort by latest created date
      const sortedPosts = userPosts.sort((a: PostType, b: PostType) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      setPosts(sortedPosts);
    } catch (error) {
      console.error("Failed to load user posts", error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handlePostDeleted = () => {
    loadUserPosts();
  };

  const handlePostUpdated = (updatedPost: PostType) => {
    // Update the post in the local state with better ID matching
    setPosts(posts.map(p => {
      const existingId = p._id || p.id;
      const updatedId = updatedPost._id || updatedPost.id;
      return existingId === updatedId ? updatedPost : p;
    }));
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="profile-loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          <FiAlertCircle size={48} />
          <p>{error || "User not found"}</p>
          <button
            onClick={() => navigate("/feed")}
            className="profile-edit-btn"
            style={{ marginTop: "var(--space-4)" }}
          >
            <FiArrowLeft size={16} /> Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header-section">
        <button
          onClick={() => navigate("/")}
          className="button btn-ghost"
          style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FiArrowLeft size={16} /> Back to Feed
        </button>
        <h1 className="profile-page-title">{user.name}'s Profile</h1>
      </div>

      {/* User Profile Card */}
      <div className="profile-card">
        <div className="profile-view">
          {/* Avatar Section */}
          <div className="profile-avatar-section">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="profile-avatar-large"
              />
            ) : (
              <div className="profile-avatar-placeholder-large">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <h2 className="profile-display-name">{user.name}</h2>
            <span className="profile-role-badge">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
          </div>

          {/* Info Grid */}
          <div className="profile-info-grid">
            <div className="profile-info-item">
              <div className="profile-info-icon">
                <FiMail size={18} />
              </div>
              <div className="profile-info-content">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-value">{user.email}</span>
              </div>
            </div>

            {user.bio && (
              <div className="profile-info-item profile-info-full">
                <div className="profile-info-icon">
                  <FiFileText size={18} />
                </div>
                <div className="profile-info-content">
                  <span className="profile-info-label">Bio</span>
                  <span className="profile-info-value">{user.bio}</span>
                </div>
              </div>
            )}

            {user.contactInformation && (
              <div className="profile-info-item profile-info-full">
                <div className="profile-info-icon">
                  <FiPhone size={18} />
                </div>
                <div className="profile-info-content">
                  <span className="profile-info-label">Contact Information</span>
                  <span className="profile-info-value">{user.contactInformation}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Posts Section */}
      <div className="profile-posts-section">
        <h2 className="section-title">{user.name}'s Posts</h2>

        {postsLoading ? (
          <div className="profile-card">
            <p className="loading-text">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="feed-empty-state">
            <FiInbox size={48} />
            <span className="feed-empty-title">This user hasn't shared any posts yet</span>
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
    </div>
  );
};

export default UserProfile;
