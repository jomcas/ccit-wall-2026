import React, { useEffect, useState } from "react";
import { authService, postService } from "../services/api";
import { User, Post as PostType } from "../types";
import PostComponent from "../components/Post";
import { useSession } from "../contexts/SessionContext";
import { FiAlertCircle, FiCheckCircle, FiInbox, FiEdit2, FiCamera, FiUser, FiMail, FiFileText, FiPhone } from 'react-icons/fi';
import "../styles/index.css";

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [posts, setPosts] = useState<PostType[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const { handleSessionExpired, updateUserData } = useSession();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    profilePicture: "",
    contactInformation: "",
  });

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      loadUserPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await authService.getProfile();
      setUser(response.data);
      setFormData({
        name: response.data.name || "",
        email: response.data.email || "",
        bio: response.data.bio || "",
        profilePicture: response.data.profilePicture || "",
        contactInformation: response.data.contactInformation || "",
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      setError("Failed to load profile");
      console.error("Failed to load profile", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async () => {
    setPostsLoading(true);
    try {
      const response = await postService.getAllPosts();
      
      // Filter posts to only show current user's posts
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
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      console.error("Failed to load user posts", error);
    } finally {
      setPostsLoading(false);
    }
  };

  const handlePostUpdated = (updatedPost: PostType) => {
    setPosts(posts.map(p => {
      const existingId = p._id || p.id;
      const updatedId = updatedPost._id || updatedPost.id;
      return existingId === updatedId ? updatedPost : p;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await authService.updateProfile(formData);
      const updatedUser = response.data.user;
      setUser(updatedUser);
      // Update context and localStorage to sync with sidebar and other components
      updateUserData(updatedUser);
      setSuccess("Profile updated successfully!");
      setEditing(false);
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      setError(error.response?.data?.message || "Failed to update profile");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCancel = () => {
    setEditing(false);
    setError("");
    setSuccess("");
    // Reset form data to current user data
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        bio: user.bio || "",
        profilePicture: user.profilePicture || "",
        contactInformation: user.contactInformation || "",
      });
    }
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

  if (!user) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          <FiAlertCircle size={48} />
          <p>User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header-section">
        <h1 className="profile-page-title">My Profile</h1>
        <p className="profile-page-subtitle">Manage your account and view your posts</p>
      </div>

      {error && (
        <div className="profile-alert profile-alert-error">
          <FiAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="profile-alert profile-alert-success">
          <FiCheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {!editing ? (
        /* View Mode */
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

            {/* Edit Button */}
            <button
              className="profile-edit-btn"
              onClick={() => setEditing(true)}
            >
              <FiEdit2 size={18} />
              Edit Profile
            </button>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <form onSubmit={handleSubmit} className="profile-card">
          <div className="profile-edit-form">
            {/* Avatar Section with URL input */}
            <div className="profile-edit-avatar-section">
              <div className="profile-edit-avatar-wrapper">
                {formData.profilePicture ? (
                  <img
                    src={formData.profilePicture}
                    alt={formData.name}
                    className="profile-avatar-large"
                  />
                ) : (
                  <div className="profile-avatar-placeholder-large">
                    {formData.name
                      ? formData.name.charAt(0).toUpperCase()
                      : user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="profile-avatar-overlay">
                  <FiCamera size={24} />
                </div>
              </div>
              <div className="profile-edit-avatar-input">
                <label className="profile-form-label">Profile Picture URL</label>
                <input
                  type="url"
                  name="profilePicture"
                  value={formData.profilePicture}
                  onChange={handleChange}
                  placeholder="https://example.com/your-photo.jpg"
                  className="profile-form-input"
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="profile-form-fields">
              <div className="profile-form-row">
                <div className="profile-form-group">
                  <label className="profile-form-label">
                    <FiUser size={14} />
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="profile-form-input"
                    required
                  />
                </div>
                <div className="profile-form-group">
                  <label className="profile-form-label">
                    <FiMail size={14} />
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="profile-form-input"
                    required
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">
                  <FiFileText size={14} />
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  className="profile-form-textarea"
                  rows={3}
                />
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">
                  <FiPhone size={14} />
                  Contact Information
                </label>
                <textarea
                  name="contactInformation"
                  value={formData.contactInformation}
                  onChange={handleChange}
                  placeholder="Phone number, social media handles, etc."
                  className="profile-form-textarea"
                  rows={2}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="profile-form-actions">
              <button type="submit" className="profile-save-btn">
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="profile-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* My Posts Section */}
      <div className="profile-posts-section">
        <h2 className="section-title">My Posts</h2>

        {postsLoading ? (
          <div className="profile-card">
            <p className="loading-text">Loading your posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="feed-empty-state">
            <FiInbox size={48} />
            <span className="feed-empty-title">You haven't created any posts yet</span>
            <span className="feed-empty-subtitle">Share something with the community!</span>
          </div>
        ) : (
          <div className="posts-list">
            {posts.map((post) => (
              <PostComponent
                key={post._id || post.id}
                post={post}
                onPostDeleted={loadUserPosts}
                onPostUpdated={handlePostUpdated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
