import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { postService, commentService } from '../services/api';
import { Post as PostType, Comment as CommentType } from '../types';
import { FiHeart, FiMessageCircle, FiEdit2, FiTrash2, FiCheck, FiSend } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import '../styles/index.css';

interface PostProps {
  post: PostType;
  onPostDeleted?: () => void;
  onPostUpdated?: (updatedPost: PostType) => void;
}

const PostComponent: React.FC<PostProps> = ({ post, onPostDeleted, onPostUpdated }) => {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes?.length);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editDescription, setEditDescription] = useState(post.description);
  const [isSaving, setIsSaving] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    console.log('Post object:', post); // Log the post object
    setLiked(post.likes.includes(user.id));
    loadComments();
  }, [post]);

  const loadComments = async () => {
    console.log(post);
    const postId = post._id || post.id;
    if (!postId) {
      console.error('Post ID is undefined. Cannot load comments.');
      return;
    }
    try {
      const response = await commentService.getComments(postId);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments', error);
    }
  };

  const handleLike = async () => {
    try {
      const postId = post._id || post.id;
      if (!postId) throw new Error('Post ID is missing');
      await postService.likePost(postId);
      setLiked(!liked);
      setLikes(liked ? likes - 1 : likes + 1);
    } catch (error) {
      console.error('Failed to like post', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const postId = post._id || post.id;
      if (!postId) {
        throw new Error('Post ID is undefined');
      }
      await commentService.createComment(postId, newComment);
      setNewComment('');
      await loadComments();
    } catch (error) {
      console.error('Failed to add comment', error);
    }
  };

  const handleUpdatePost = async () => {
    if (!editTitle.trim() || !editDescription.trim()) {
      alert('Title and description cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const postId = post._id || post.id;
      if (!postId) throw new Error('Post ID is missing');
      
      const updatedResponse = await postService.updatePost(postId, {
        title: editTitle,
        description: editDescription,
      });
      
      // Merge the updated data with existing post to preserve all fields
      const updatedPost = {
        ...post,
        ...updatedResponse.data,
        title: editTitle,
        description: editDescription,
      };
      
      setIsEditMode(false);
      if (onPostUpdated) {
        onPostUpdated(updatedPost);
      }
    } catch (error) {
      console.error('Failed to update post', error);
      alert('Failed to update post');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        const postId = post._id || post.id;
        if (!postId) throw new Error('Post ID is missing');
        await postService.deletePost(postId);
        if (onPostDeleted) onPostDeleted();
      } catch (error) {
        console.error('Failed to delete post', error);
      }
    }
  };

  const handleViewPost = () => {
    // Logic to view the post details
  };

  return (
    <div className="card" style={{ marginBottom: '20px', transition: 'all 0.2s ease' }}>
      {isEditMode ? (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="input-modern"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="input-modern"
              style={{
                width: '100%',
                minHeight: '120px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleUpdatePost}
              disabled={isSaving}
              className="button button-primary"
            >
              <FiCheck style={{ marginRight: '6px' }} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setIsEditMode(false);
                setEditTitle(post.title);
                setEditDescription(post.description);
              }}
              className="button btn-ghost"
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
            <div>
              <h3>{post.title}</h3>
              <p style={{ fontSize: '12px', color: '#999' }}>
                By{' '}
                {post.isAnonymous ? (
                  'Anonymous'
                ) : (
                  <Link
                    to={`/user/${post.author?._id || post.author?.id}`}
                    style={{ color: '#1e40af', textDecoration: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {post.author?.name}
                  </Link>
                )}{' '}
                • {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
            {(user.id === post.author?.id || user.id === post.author?._id) && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setIsEditMode(true)} className="btn-action btn-edit">
                  <FiEdit2 size={14} style={{ marginRight: '4px' }} /> Edit
                </button>
                <button onClick={handleDeletePost} className="btn-action btn-delete">
                  <FiTrash2 size={14} style={{ marginRight: '4px' }} /> Delete
                </button>
              </div>
            )}
          </div>

          <p style={{ marginBottom: '16px', lineHeight: '1.7', color: 'var(--text-primary)' }}>{post.description}</p>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={handleLike}
              className={`btn-action btn-like ${liked ? 'active' : ''}`}
            >
              {liked ? <FaHeart size={14} style={{ marginRight: '6px', color: '#ef4444' }} /> : <FiHeart size={14} style={{ marginRight: '6px' }} />}
              {liked ? 'Liked' : 'Like'} ({likes})
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className="btn-action btn-like"
            >
              <FiMessageCircle size={14} style={{ marginRight: '6px' }} /> Comments ({comments.length})
            </button>
          </div>

          {showComments && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <form onSubmit={handleAddComment} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="input-modern"
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="button button-primary">
                    <FiSend size={14} style={{ marginRight: '6px' }} /> Post
                  </button>
                </div>
              </form>

              <div>
                {comments.map((comment) => (
                  <div key={comment._id || comment.id} className="comment-box">
                    <p style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>{comment.author?.name}</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PostComponent;
