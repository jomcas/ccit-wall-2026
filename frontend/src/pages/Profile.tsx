import React, { useEffect, useState } from "react";
import { authService, postService } from "../services/api";
import { User, Post as PostType } from "../types";
import PostComponent from "../components/Post";
import { useSession } from "../contexts/SessionContext";
import { FiAlertCircle, FiCheckCircle, FiInbox } from 'react-icons/fi';
import "../styles/index.css";

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [posts, setPosts] = useState<PostType[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const { handleSessionExpired } = useSession();

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
      console.log('=== LOADING USER POSTS ===');
      console.log('All posts:', response.data);
      console.log('Current user object:', user);
      console.log('Current user keys:', user ? Object.keys(user) : 'user is null');
      
      if (response.data.length > 0) {
        console.log('First post author keys:', Object.keys((response.data[0].author as any)));
      }
      
      // Filter posts to only show current user's posts
      const userPosts = response.data.filter((post: PostType) => {
        const postAuthor = post.author as any;
        const match = postAuthor.name === user?.name;
        console.log('Post:', post.title, 'Author:', postAuthor.name, 'User:', user?.name, 'Match:', match);
        return match;
      });
      
      console.log('=== FILTERING COMPLETE ===');
      console.log('Filtered user posts count:', userPosts.length);
      
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
    // Update the post in the local state with better ID matching
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
      setUser(response.data.user);
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

  if (loading) {
    return (
      <div className="container" style={{ padding: "20px" }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: "20px" }}>
        <p>User not found</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account and view your posts</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiAlertCircle size={18} /> {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiCheckCircle size={18} /> {success}
        </div>
      )}

      {!editing ? (
        <div className="profile-card">
          <div className="profile-card-header">
            <div style={{ marginRight: "4px" }}>Edit Profile</div>
            <button
              aria-label="Edit profile"
              title="Edit profile"
              className="edit-icon"
              onClick={() => setEditing(true)}
            >
              <svg
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
              </svg>
            </button>
          </div>
          <div className="profile-grid">
            <div className="profile-left">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.name}
                  className="profile-avatar"
                />
              ) : (
                <div className="avatar-placeholder">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="profile-right">
              <div className="profile-info">
                <div className="field">
                  <strong>Name:</strong>
                  <div className="value">{user.name}</div>
                </div>
                <div className="field">
                  <strong>Email:</strong>
                  <div className="value">{user.email}</div>
                </div>
                <div className="field">
                  <strong>Role:</strong>
                  <div className="value">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </div>
                </div>
                {user.bio && (
                  <div className="field">
                    <strong>Bio:</strong>
                    <div className="value" style={{ marginTop: 2 }}>
                      {user.bio}
                    </div>
                  </div>
                )}
                {user.contactInformation && (
                  <div className="field">
                    <strong>Contact Information:</strong>
                    <div className="value" style={{ marginTop: 2 }}>
                      {user.contactInformation}
                    </div>
                  </div>
                )}
              </div>

              {/* <div className="profile-actions">
                <button onClick={() => setEditing(true)} className="button button-secondary">Edit Profile</button>
              </div> */}
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="profile-card">
          <div className="profile-grid">
            <div className="profile-left">
              {formData.profilePicture ? (
                <img
                  src={formData.profilePicture}
                  alt={formData.name}
                  className="profile-avatar"
                />
              ) : (
                <div className="avatar-placeholder">
                  {formData.name
                    ? formData.name.charAt(0).toUpperCase()
                    : user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ marginTop: 16, width: "100%" }}>
                <label
                  style={{
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 600,
                  }}
                >
                  Profile Picture URL
                </label>
                <input
                  type="text"
                  name="profilePicture"
                  value={formData.profilePicture}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                  className="input-modern"
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div className="profile-right">
              <div className="profile-form-grid two-col">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 8 }}>
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Contact Information</label>
                <textarea
                  name="contactInformation"
                  value={formData.contactInformation}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Phone number, social media, etc."
                />
              </div>

              <div className="profile-actions">
                <button type="submit" className="button button-secondary">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError("");
                    setSuccess("");
                    loadProfile();
                  }}
                  className="button btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* My Posts Section */}
      <div style={{ marginTop: "48px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h2 className="section-title">My Posts</h2>
        </div>

        {postsLoading ? (
          <div className="profile-card">
            <p className="loading-text">Loading your posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FiInbox size={20} /> You haven't created any posts yet. Share something with the community!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {posts.map((post) => (
              <PostComponent
                key={post.id}
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
