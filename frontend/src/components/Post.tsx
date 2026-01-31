import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { postService, commentService } from '../services/api';
import { Post as PostType, Comment as CommentType } from '../types';
import { FiHeart, FiMessageCircle, FiEdit2, FiTrash2, FiCheck, FiSend, FiX, FiImage, FiUploadCloud } from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import ConfirmDialog from './ConfirmDialog';
import ImageLightbox from './ImageLightbox';
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

  // Comment-specific state
  const [commentLikes, setCommentLikes] = useState<{ [key: string]: boolean }>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const editCommentRef = useRef<HTMLInputElement>(null);

  // Delete confirmation dialog state
  const [deletePostDialogOpen, setDeletePostDialogOpen] = useState(false);
  const [deleteCommentDialogOpen, setDeleteCommentDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Image lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Image editing state
  const [editExistingImages, setEditExistingImages] = useState<string[]>([]);
  const [editNewImages, setEditNewImages] = useState<File[]>([]);
  const [editNewImagePreviews, setEditNewImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Format time ago helper
  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const seconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return commentDate.toLocaleDateString();
  };

  // Get total image count for edit mode
  const getTotalEditImageCount = useCallback(() => {
    return editExistingImages.length + editNewImages.length;
  }, [editExistingImages.length, editNewImages.length]);

  // Process files for edit mode (shared validation logic)
  const processEditFiles = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files);
    const totalFiles = getTotalEditImageCount() + newFiles.length;

    if (totalFiles > 4) {
      alert('You can only have up to 4 images');
      return;
    }

    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const file of newFiles) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Only JPEG, PNG, GIF, and WebP images are allowed');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Each image must be less than 5MB');
        continue;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      setEditNewImages((prev) => [...prev, ...validFiles]);
      setEditNewImagePreviews((prev) => [...prev, ...validPreviews]);
    }
  }, [getTotalEditImageCount]);

  // Handle file input change in edit mode
  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processEditFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove existing image in edit mode
  const removeExistingImage = (index: number) => {
    setEditExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove new image in edit mode
  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(editNewImagePreviews[index]);
    setEditNewImages((prev) => prev.filter((_, i) => i !== index));
    setEditNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers for edit mode
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (getTotalEditImageCount() < 4) {
      setIsDragging(true);
    }
  }, [getTotalEditImageCount]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (getTotalEditImageCount() >= 4) {
      alert('You can only have up to 4 images');
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        processEditFiles(imageFiles);
      } else {
        alert('Please drop image files only');
      }
    }
  }, [getTotalEditImageCount, processEditFiles]);

  // Initialize edit mode with current images
  const enterEditMode = () => {
    setIsEditMode(true);
    setEditTitle(post.title);
    setEditDescription(post.description);
    setEditExistingImages(post.attachments || []);
    setEditNewImages([]);
    setEditNewImagePreviews([]);
  };

  // Cancel edit mode and cleanup
  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditTitle(post.title);
    setEditDescription(post.description);
    // Cleanup preview URLs
    editNewImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setEditExistingImages([]);
    setEditNewImages([]);
    setEditNewImagePreviews([]);
  };

  useEffect(() => {
    setLiked(post.likes.includes(user.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post]);

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post._id, post.id]);

  // Click outside detection to cancel comment edit
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editingCommentId &&
        editCommentRef.current &&
        !editCommentRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.comment-edit-actions')
      ) {
        // Cancel edit mode inline
        setEditingCommentId(null);
        setEditCommentContent('');
      }
    };

    if (editingCommentId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingCommentId]);

  const loadComments = async () => {
    const postId = post._id || post.id;
    if (!postId) {
      console.error('Post ID is undefined. Cannot load comments.');
      return;
    }
    try {
      const response = await commentService.getComments(postId);
      setComments(response.data);

      // Initialize comment likes state
      const likedState: { [key: string]: boolean } = {};
      response.data.forEach((comment: CommentType) => {
        const commentId = comment._id || comment.id;
        if (commentId) {
          likedState[commentId] = comment.likes?.includes(user.id) || false;
        }
      });
      setCommentLikes(likedState);
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

      // Use FormData to handle image updates
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('description', editDescription);
      
      // Send existing images that should be kept
      formData.append('existingImages', JSON.stringify(editExistingImages));
      
      // Append new images
      editNewImages.forEach((image) => {
        formData.append('images', image);
      });

      const updatedResponse = await postService.updatePost(postId, formData);

      // Cleanup preview URLs
      editNewImagePreviews.forEach((url) => URL.revokeObjectURL(url));

      // Merge the updated data with existing post to preserve all fields
      const updatedPost = {
        ...post,
        ...updatedResponse.data.post,
        title: editTitle,
        description: editDescription,
      };

      setIsEditMode(false);
      setEditNewImages([]);
      setEditNewImagePreviews([]);
      setEditExistingImages([]);
      
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
    try {
      const postId = post._id || post.id;
      if (!postId) throw new Error('Post ID is missing');
      await postService.deletePost(postId);
      setDeletePostDialogOpen(false);
      if (onPostDeleted) onPostDeleted();
    } catch (error) {
      console.error('Failed to delete post', error);
    }
  };

  // ============================================
  // COMMENT HANDLERS
  // ============================================

  const handleLikeComment = useCallback(async (commentId: string) => {
    try {
      await commentService.likeComment(commentId);

      // Toggle liked state
      const wasLiked = commentLikes[commentId];
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: !prev[commentId],
      }));

      // Update likes array in comments
      setComments((prev) =>
        prev.map((comment) => {
          const id = comment._id || comment.id;
          if (id === commentId) {
            const newLikes = wasLiked
              ? comment.likes.filter((likeId) => likeId !== user.id)
              : [...comment.likes, user.id];
            return { ...comment, likes: newLikes };
          }
          return comment;
        })
      );
    } catch (error) {
      console.error('Failed to like comment', error);
    }
  }, [commentLikes, user.id]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => (c._id || c.id) !== commentId));
      setDeleteCommentDialogOpen(false);
      setCommentToDelete(null);
    } catch (error) {
      console.error('Failed to delete comment', error);
    }
  }, []);

  const openDeleteCommentDialog = useCallback((commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteCommentDialogOpen(true);
  }, []);

  const handleEditComment = useCallback((comment: CommentType) => {
    const commentId = comment._id || comment.id;
    if (commentId) {
      setEditingCommentId(commentId);
      setEditCommentContent(comment.content);
    }
  }, []);

  const handleSaveCommentEdit = useCallback(async (commentId: string) => {
    if (!editCommentContent.trim()) {
      alert('Comment cannot be empty');
      return;
    }

    try {
      await commentService.updateComment(commentId, editCommentContent);

      // Update local state
      setComments((prev) =>
        prev.map((comment) => {
          const id = comment._id || comment.id;
          if (id === commentId) {
            return {
              ...comment,
              content: editCommentContent,
              updatedAt: new Date(),
            };
          }
          return comment;
        })
      );

      setEditingCommentId(null);
      setEditCommentContent('');
    } catch (error) {
      console.error('Failed to update comment', error);
      alert('Failed to update comment');
    }
  }, [editCommentContent]);

  const handleCancelCommentEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditCommentContent('');
  }, []);

  // Handle Enter key to save comment edit
  const handleEditKeyDown = (e: React.KeyboardEvent, commentId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveCommentEdit(commentId);
    } else if (e.key === 'Escape') {
      handleCancelCommentEdit();
    }
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

          {/* Image Editing Section */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Images</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleEditImageSelect}
              style={{ display: 'none' }}
            />
            
            {/* Drag and Drop Zone */}
            <div
              ref={dropZoneRef}
              className={`image-drop-zone ${isDragging ? 'dragging' : ''} ${getTotalEditImageCount() >= 4 ? 'disabled' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => getTotalEditImageCount() < 4 && fileInputRef.current?.click()}
            >
              <div className="drop-zone-content">
                {isDragging ? (
                  <>
                    <FiUploadCloud size={32} className="drop-zone-icon active" />
                    <span className="drop-zone-text">Drop images here</span>
                  </>
                ) : (
                  <>
                    <FiImage size={24} className="drop-zone-icon" />
                    <span className="drop-zone-text">
                      {getTotalEditImageCount() >= 4 ? 'Maximum 4 images reached' : 'Drag & drop images or click to browse'}
                    </span>
                    <span className="drop-zone-hint">
                      JPEG, PNG, GIF, WebP up to 5MB each
                    </span>
                  </>
                )}
              </div>
              {getTotalEditImageCount() > 0 && getTotalEditImageCount() < 4 && (
                <span className="image-count-badge">{getTotalEditImageCount()}/4</span>
              )}
            </div>

            {/* Existing Images Preview */}
            {(editExistingImages.length > 0 || editNewImagePreviews.length > 0) && (
              <div className="image-preview-grid" style={{ marginTop: '12px' }}>
                {/* Show existing images */}
                {editExistingImages.map((imageUrl, index) => (
                  <div key={`existing-${index}`} className="image-preview-item">
                    <img src={imageUrl} alt={`Existing ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="image-remove-btn"
                      aria-label="Remove image"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
                {/* Show new images */}
                {editNewImagePreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="image-preview-item">
                    <img src={preview} alt={`New ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="image-remove-btn"
                      aria-label="Remove image"
                    >
                      <FiX size={14} />
                    </button>
                    <span className="image-new-badge">New</span>
                  </div>
                ))}
              </div>
            )}
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
              onClick={cancelEditMode}
              className="button btn-ghost"
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="post-header">
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
              <div className="post-actions">
                <button
                  onClick={enterEditMode}
                  className="btn-post-action"
                  title="Edit post"
                >
                  <FiEdit2 size={16} />
                </button>
                <button
                  onClick={() => setDeletePostDialogOpen(true)}
                  className="btn-post-action btn-post-delete"
                  title="Delete post"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            )}
          </div>

          <p style={{ marginBottom: '16px', lineHeight: '1.7', color: 'var(--text-primary)' }}>{post.description}</p>

          {/* Image Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div className={`post-images post-images-${Math.min(post.attachments.length, 4)}`}>
              {post.attachments.slice(0, 4).map((imageUrl, index) => (
                <div key={index} className="post-image-item">
                  <img
                    src={imageUrl}
                    alt={`Attachment ${index + 1}`}
                    loading="lazy"
                    onClick={() => {
                      setLightboxIndex(index);
                      setLightboxOpen(true);
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="post-engagement">
            <button
              onClick={handleLike}
              className={`btn-post-like ${liked ? 'active' : ''}`}
            >
              {liked ? <FaHeart size={16} /> : <FiHeart size={16} />}
              {likes > 0 && <span>{likes}</span>}
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className={`btn-post-comment ${showComments ? 'active' : ''}`}
            >
              <FiMessageCircle size={16} />
              {comments.length > 0 && <span>{comments.length}</span>}
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

              <div className="comments-list">
                {comments.map((comment) => {
                  const commentId = comment._id || comment.id;
                  const isLiked = commentId ? commentLikes[commentId] : false;
                  const likeCount = comment.likes?.length || 0;
                  const isAuthor = user.id === (comment.author?._id || comment.author?.id);
                  const isEditing = editingCommentId === commentId;

                  // Check if comment was edited (updatedAt > createdAt by more than 1 second)
                  const isEdited =
                    comment.updatedAt &&
                    comment.createdAt &&
                    new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;

                  return (
                    <div key={commentId} className="comment-box">
                      {/* Header row: author, timestamp, actions */}
                      <div className="comment-header">
                        <div className="comment-meta">
                          <span className="comment-author">{comment.author?.name}</span>
                          <span className="comment-time">• {formatTimeAgo(comment.createdAt)}</span>
                          {isEdited && <span className="comment-edited">(edited)</span>}
                        </div>
                        <div className="comment-actions">
                          {isAuthor && !isEditing && (
                            <>
                              <button
                                onClick={() => handleEditComment(comment)}
                                className="btn-comment-action"
                                title="Edit comment"
                              >
                                <FiEdit2 size={12} />
                              </button>
                              <button
                                onClick={() => commentId && openDeleteCommentDialog(commentId)}
                                className="btn-comment-action btn-comment-delete"
                                title="Delete comment"
                              >
                                <FiTrash2 size={12} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => commentId && handleLikeComment(commentId)}
                            className={`btn-comment-like ${isLiked ? 'active' : ''}`}
                            title={isLiked ? 'Unlike' : 'Like'}
                          >
                            {isLiked ? <FaHeart size={12} /> : <FiHeart size={12} />}
                            {likeCount > 0 && <span>{likeCount}</span>}
                          </button>
                        </div>
                      </div>

                      {/* Content row: text or edit input */}
                      {isEditing ? (
                        <div className="comment-edit-form">
                          <input
                            ref={editCommentRef}
                            type="text"
                            value={editCommentContent}
                            onChange={(e) => setEditCommentContent(e.target.value)}
                            onKeyDown={(e) => commentId && handleEditKeyDown(e, commentId)}
                            className="input-modern comment-edit-input"
                            autoFocus
                          />
                          <div className="comment-edit-actions">
                            <button
                              onClick={() => commentId && handleSaveCommentEdit(commentId)}
                              className="btn-comment-save"
                            >
                              <FiCheck size={12} style={{ marginRight: '4px' }} />
                              Save
                            </button>
                            <button
                              onClick={handleCancelCommentEdit}
                              className="btn-comment-cancel"
                            >
                              <FiX size={12} style={{ marginRight: '4px' }} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="comment-content">{comment.content}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Post Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deletePostDialogOpen}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeletePost}
        onCancel={() => setDeletePostDialogOpen(false)}
      />

      {/* Delete Comment Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteCommentDialogOpen}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => commentToDelete && handleDeleteComment(commentToDelete)}
        onCancel={() => {
          setDeleteCommentDialogOpen(false);
          setCommentToDelete(null);
        }}
      />

      {/* Image Lightbox */}
      {post.attachments && post.attachments.length > 0 && (
        <ImageLightbox
          images={post.attachments}
          currentIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
};

export default PostComponent;
