import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userService, postService } from "../services/api";
import { User, Post as PostType } from "../types";
import PostComponent from "../components/Post";
import { useSession } from "../contexts/SessionContext";
import { FiAlertCircle, FiArrowLeft, FiInbox } from 'react-icons/fi';
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
      <div className="container" style={{ padding: "32px 20px" }}>
        <p className="loading-text">Loading profile...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container" style={{ padding: "32px 20px" }}>
        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiAlertCircle size={18} /> {error || "User not found"}
        </div>
        <button
          onClick={() => navigate("/feed")}
          className="button button-primary"
          style={{ marginTop: "16px", display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FiArrowLeft size={16} /> Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "32px 20px" }}>
      <button
        onClick={() => navigate("/")}
        className="button btn-ghost"
        style={{ marginBottom: "24px", display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <FiArrowLeft size={16} /> Back to Feed
      </button>

      <div style={{ marginBottom: "32px" }}>
        <h1 className="page-title">{user.name}'s Profile</h1>
      </div>

      {/* User Profile Card */}
      <div className="profile-card">
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
          </div>
        </div>
      </div>

      {/* User Posts Section */}
      <div style={{ marginTop: "48px" }}>
        <div style={{ marginBottom: "24px" }}>
          <h2 className="section-title">{user.name}'s Posts</h2>
        </div>

        {postsLoading ? (
          <div className="profile-card">
            <p className="loading-text">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FiInbox size={20} /> This user hasn't shared any posts yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
