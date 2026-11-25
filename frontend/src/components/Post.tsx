import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiSend,
  FiX,
  FiImage,
  FiUploadCloud,
  FiBookmark,
  FiDownload,
} from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import { postService, commentService } from '../services/api';
import type { Post as PostType, Comment as CommentType } from '../types';
import ConfirmDialog from './ConfirmDialog';
import ImageLightbox from './ImageLightbox';
import {
  getThemeById,
  getPostDisplayMode,
  POST_THEMES,
  POSTER_MODE_MAX_LENGTH,
} from '../config/themes';
import { useSession } from '../contexts/SessionContext';

interface PostProps {
  post: PostType;
  onPostDeleted?: () => void;
  onPostUpdated?: (updatedPost: PostType) => void;
  isHighlighted?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  'college-activities': 'College Activities',
  general: 'General',
  extracurricular: 'Extracurricular',
};

const QUICK_REACTIONS = ['🔥', '👏', '💡'] as const;

const NON_IMAGE_EXTENSIONS = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar|7z|md)(\?.*)?$/i;

function isImageAttachment(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('blob:') || url.startsWith('data:image/')) return true;
  if (NON_IMAGE_EXTENSIONS.test(url)) return false;
  return true;
}

function getFileAttachmentMeta(url: string, index: number): { name: string; ext: string } {
  try {
    const parsed = new URL(url, window.location.origin);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const rawName = decodeURIComponent(segments[segments.length - 1] || `Attachment-${index + 1}`);
    const cleanName = rawName.includes('?') ? rawName.split('?')[0] : rawName;
    const extMatch = cleanName.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1].toUpperCase().slice(0, 4) : 'FILE';
    return { name: cleanName, ext };
  } catch {
    return { name: `Attachment-${index + 1}`, ext: 'FILE' };
  }
}

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function normalizeReactions(
  reactions: PostType['reactions'] | undefined
): Record<string, string[]> {
  const normalized: Record<string, string[]> = {};
  if (!reactions) return normalized;

  if (reactions instanceof Map) {
    reactions.forEach((userIds, emoji) => {
      if (Array.isArray(userIds) && userIds.length > 0) {
        normalized[emoji] = userIds.map((id) => String(id));
      }
    });
    return normalized;
  }

  Object.entries(reactions).forEach(([emoji, userIds]) => {
    if (Array.isArray(userIds) && userIds.length > 0) {
      normalized[emoji] = userIds.map((id) => String(id));
    }
  });
  return normalized;
}

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const parsed = new Date(date);
  const seconds = Math.floor((now.getTime() - parsed.getTime()) / 1000);

  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return parsed.toLocaleDateString();
}

const PostComponent: React.FC<PostProps> = ({
  post,
  onPostDeleted,
  onPostUpdated,
  isHighlighted = false,
}) => {
  const [comments, setComments] = useState<CommentType[]>(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes?.length || 0);
  const [reactions, setReactions] = useState<Record<string, string[]>>(() =>
    normalizeReactions(post.reactions)
  );
  const [copiedShare, setCopiedShare] = useState(false);
  const shareTimerRef = useRef<number | null>(null);

  // Post edit state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editDescription, setEditDescription] = useState(post.description);
  const [editTheme, setEditTheme] = useState(post.theme || 'none');
  const [isSaving, setIsSaving] = useState(false);

  // Comment-specific state
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const editCommentRef = useRef<HTMLInputElement>(null);
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(3);

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

  const { user } = useSession();
  const userId = user?._id || user?.id || '';
  const postId = post._id || post.id || '';

  const authorId = post.author?._id || post.author?.id || '';
  const isPostOwner = Boolean(userId && authorId && userId === authorId);
  const canDeletePost = isPostOwner || user?.role === 'admin';

  // Separate image attachments from non-image file attachments
  const { imageAttachments, fileAttachments } = useMemo(() => {
    const imgs: string[] = [];
    const files: string[] = [];
    (post.attachments || []).forEach((url) => {
      if (isImageAttachment(url)) {
        imgs.push(url);
      } else {
        files.push(url);
      }
    });
    return { imageAttachments: imgs, fileAttachments: files };
  }, [post.attachments]);

  // Theme-related computed values
  const theme = useMemo(() => getThemeById(post.theme), [post.theme]);
  const displayMode = useMemo(
    () =>
      getPostDisplayMode(
        post.theme,
        post.description?.length || 0,
        (post.attachments?.length || 0) > 0
      ),
    [post.theme, post.description, post.attachments]
  );

  // Keep likes and reactions in sync with incoming post props / user role switches
  useEffect(() => {
    const likesArr = (post.likes || []).map((id) => String(id));
    setLikes(likesArr.length);
    setLiked(Boolean(userId && likesArr.includes(userId)));
    setReactions(normalizeReactions(post.reactions));
  }, [post, userId]);

  useEffect(() => {
    return () => {
      if (shareTimerRef.current !== null) {
        window.clearTimeout(shareTimerRef.current);
      }
    };
  }, []);

  const loadComments = useCallback(async () => {
    if (!postId) return;
    try {
      const response = await commentService.getComments(postId);
      const fetched = (response.data || []) as CommentType[];
      setComments(fetched);

      const likedState: Record<string, boolean> = {};
      fetched.forEach((comment) => {
        const commentId = comment._id || comment.id;
        if (commentId && userId) {
          likedState[commentId] = (comment.likes || []).map(String).includes(userId);
        }
      });
      setCommentLikes(likedState);
    } catch (error) {
      console.error('Failed to load comments', error);
    }
  }, [postId, userId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Click outside detection to cancel inline comment edit
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editingCommentId &&
        editCommentRef.current &&
        !editCommentRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.comment-item__edit-actions')
      ) {
        setEditingCommentId(null);
        setEditCommentContent('');
      }
    };

    if (editingCommentId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingCommentId]);

  // Image edit helpers
  const getTotalEditImageCount = useCallback(
    () => editExistingImages.length + editNewImages.length,
    [editExistingImages.length, editNewImages.length]
  );

  const processEditFiles = useCallback(
    (files: FileList | File[]) => {
      const newFiles = Array.from(files);
      const totalFiles = editExistingImages.length + editNewImages.length + newFiles.length;

      if (totalFiles > 4) {
        alert(
          `You can only have up to 4 images. Currently have ${
            editExistingImages.length + editNewImages.length
          }, trying to add ${newFiles.length}.`
        );
        return;
      }

      const validFiles: File[] = [];
      const validPreviews: string[] = [];

      for (const file of newFiles) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          alert(`File "${file.name}" is not a valid image type.`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          alert(`File "${file.name}" is too large (max 5MB).`);
          continue;
        }
        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      }

      if (validFiles.length > 0) {
        setEditNewImages((prev) => [...prev, ...validFiles]);
        setEditNewImagePreviews((prev) => [...prev, ...validPreviews]);
      }
    },
    [editExistingImages.length, editNewImages.length]
  );

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processEditFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeExistingImage = (index: number) => {
    setEditExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(editNewImagePreviews[index]);
    setEditNewImages((prev) => prev.filter((_, i) => i !== index));
    setEditNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (getTotalEditImageCount() < 4) setIsDragging(true);
    },
    [getTotalEditImageCount]
  );

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (getTotalEditImageCount() >= 4) {
        alert('You can only have up to 4 images');
        return;
      }

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          processEditFiles(imageFiles);
        } else {
          alert('Please drop image files only');
        }
      }
    },
    [getTotalEditImageCount, processEditFiles]
  );

  const enterEditMode = () => {
    setIsEditMode(true);
    setEditTitle(post.title);
    setEditDescription(post.description);
    setEditExistingImages(post.attachments || []);
    setEditNewImages([]);
    setEditNewImagePreviews([]);
    setEditTheme(post.theme || 'none');
  };

  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditTitle(post.title);
    setEditDescription(post.description);
    editNewImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setEditExistingImages([]);
    setEditNewImages([]);
    setEditNewImagePreviews([]);
    setEditTheme(post.theme || 'none');
  };

  // Engagement handlers
  const handleLike = async () => {
    if (!postId || !userId) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikes((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));

    try {
      const response = await postService.likePost(postId);
      const serverPost = response.data?.post;
      const nextLikesList = Array.isArray(serverPost?.likes)
        ? serverPost.likes.map(String)
        : nextLiked
        ? [...(post.likes || []).map(String), userId]
        : (post.likes || []).map(String).filter((id) => id !== userId);

      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          likes: nextLikesList,
        });
      } else {
        window.dispatchEvent(new CustomEvent('ccit:posts-updated'));
      }
    } catch (error) {
      // Roll back optimistic state
      setLiked(!nextLiked);
      setLikes((prev) => Math.max(0, prev + (nextLiked ? -1 : 1)));
      console.error('Failed to like post', error);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!postId || !userId) return;

    const previousReactions = reactions;
    const optimistic: Record<string, string[]> = {};
    Object.entries(reactions).forEach(([key, ids]) => {
      optimistic[key] = [...ids];
    });
    const currentList = optimistic[emoji] || [];
    if (currentList.includes(userId)) {
      const remaining = currentList.filter((id) => id !== userId);
      if (remaining.length > 0) {
        optimistic[emoji] = remaining;
      } else {
        delete optimistic[emoji];
      }
    } else {
      optimistic[emoji] = [...currentList, userId];
    }

    setReactions(optimistic);

    try {
      const response = await postService.addReaction(postId, emoji);
      const serverReactions = response.data?.post?.reactions;
      const resolved = serverReactions ? normalizeReactions(serverReactions) : optimistic;
      setReactions(resolved);
      if (onPostUpdated) {
        onPostUpdated({
          ...post,
          reactions: resolved,
        });
      }
    } catch (error) {
      setReactions(previousReactions);
      console.error('Failed to toggle reaction', error);
    }
  };

  const handleShare = async () => {
    if (!postId) return;
    const shareUrl = `${window.location.origin}/feed?post=${encodeURIComponent(postId)}`;

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const tempInput = document.createElement('textarea');
        tempInput.value = shareUrl;
        tempInput.style.position = 'fixed';
        tempInput.style.opacity = '0';
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }

      setCopiedShare(true);
      if (shareTimerRef.current !== null) {
        window.clearTimeout(shareTimerRef.current);
      }
      shareTimerRef.current = window.setTimeout(() => setCopiedShare(false), 2200);
    } catch (error) {
      console.error('Failed to copy post link', error);
    }

    try {
      const response = await postService.sharePost(postId);
      const serverShares = response.data?.post?.shares;
      if (onPostUpdated && Array.isArray(serverShares)) {
        onPostUpdated({
          ...post,
          shares: serverShares.map(String),
        });
      }
    } catch (error) {
      console.error('Failed to record post share', error);
    }
  };

  const handleUpdatePost = async () => {
    if (!editTitle.trim() || !editDescription.trim()) {
      alert('Title and description cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      if (!postId) throw new Error('Post ID is missing');

      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('description', editDescription.trim());
      formData.append('theme', editTheme);
      formData.append('existingImages', JSON.stringify(editExistingImages));
      if (post.isAnnouncement !== undefined) {
        formData.append('isAnnouncement', String(post.isAnnouncement));
      }

      for (let i = 0; i < editNewImages.length; i++) {
        const image = editNewImages[i];
        if (image instanceof File) {
          formData.append('images', image, image.name);
        }
      }

      const updatedResponse = await postService.updatePost(postId, formData);
      editNewImagePreviews.forEach((url) => URL.revokeObjectURL(url));

      const serverPost = updatedResponse.data?.post || {};
      const updatedPost: PostType = {
        ...post,
        ...serverPost,
        author: post.author,
        title: editTitle.trim(),
        description: editDescription.trim(),
        theme: editTheme,
        attachments: Array.isArray(serverPost.attachments)
          ? serverPost.attachments
          : editExistingImages,
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
      if (!postId) throw new Error('Post ID is missing');
      await postService.deletePost(postId);
      setDeletePostDialogOpen(false);
      if (onPostDeleted) onPostDeleted();
    } catch (error) {
      console.error('Failed to delete post', error);
    }
  };

  // Comment handlers
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !postId) return;

    try {
      await commentService.createComment(postId, newComment.trim());
      setNewComment('');
      await loadComments();
      setVisibleCommentsCount((prev) => Math.max(prev, 3));
    } catch (error) {
      console.error('Failed to add comment', error);
    }
  };

  const handleLikeComment = useCallback(
    async (commentId: string) => {
      if (!userId) return;

      try {
        await commentService.likeComment(commentId);
        const wasLiked = commentLikes[commentId];
        setCommentLikes((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
        setComments((prev) =>
          prev.map((comment) => {
            const id = comment._id || comment.id;
            if (id === commentId) {
              const nextLikes = wasLiked
                ? comment.likes.filter((likeId) => String(likeId) !== userId)
                : [...comment.likes, userId];
              return { ...comment, likes: nextLikes };
            }
            return comment;
          })
        );
      } catch (error) {
        console.error('Failed to like comment', error);
      }
    },
    [commentLikes, userId]
  );

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

  const handleSaveCommentEdit = useCallback(
    async (commentId: string) => {
      if (!editCommentContent.trim()) {
        alert('Comment cannot be empty');
        return;
      }

      try {
        await commentService.updateComment(commentId, editCommentContent.trim());
        setComments((prev) =>
          prev.map((comment) => {
            const id = comment._id || comment.id;
            if (id === commentId) {
              return {
                ...comment,
                content: editCommentContent.trim(),
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
    },
    [editCommentContent]
  );

  const handleCancelCommentEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditCommentContent('');
  }, []);

  const handleEditKeyDown = (e: React.KeyboardEvent, commentId: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveCommentEdit(commentId);
    } else if (e.key === 'Escape') {
      handleCancelCommentEdit();
    }
  };

  // Presentation helpers
  const categoryLabel = CATEGORY_LABELS[post.category] || 'General';
  const authorRole = post.author?.role || 'student';
  const rolePillClass =
    authorRole === 'teacher'
      ? 'role-pill--teacher'
      : authorRole === 'admin'
      ? 'role-pill--admin'
      : 'role-pill--student';
  const authorAvatarClass = authorRole === 'student' ? 'shell-avatar--gold' : '';
  const createdIso = post.createdAt ? new Date(post.createdAt).toISOString() : undefined;

  const existingReactionEntries = Object.entries(reactions).filter(
    ([, userIds]) => userIds.length > 0
  );
  const availableQuickReactions = QUICK_REACTIONS.filter((emoji) => !reactions[emoji]?.length);

  return (
    <article
      id={postId ? `post-${postId}` : undefined}
      className={`paper post-card ${
        post.isAnnouncement ? 'paper--taped post-card--announcement' : ''
      } ${isHighlighted ? 'post-card--highlighted' : ''}`}
    >
      {isEditMode ? (
        <div className="post-edit-form">
          <div className="composer-field">
            <label htmlFor={`edit-title-${postId}`}>Title</label>
            <input
              id={`edit-title-${postId}`}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="composer-input"
            />
          </div>

          <div className="composer-field">
            <label htmlFor={`edit-desc-${postId}`}>Description</label>
            <textarea
              id={`edit-desc-${postId}`}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="composer-textarea"
            />
          </div>

          {/* Image Editing Section */}
          <div className="composer-field">
            <span className="composer-field__label">Images (up to 4)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleEditImageSelect}
              style={{ display: 'none' }}
            />
            <div
              ref={dropZoneRef}
              className={`composer-dropzone ${isDragging ? 'is-dragging' : ''} ${
                getTotalEditImageCount() >= 4 ? 'is-disabled' : ''
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => getTotalEditImageCount() < 4 && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && getTotalEditImageCount() < 4) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="composer-dropzone__inner">
                {isDragging ? (
                  <>
                    <FiUploadCloud size={26} aria-hidden="true" />
                    <span className="composer-dropzone__text">Drop images here</span>
                  </>
                ) : (
                  <>
                    <FiImage size={22} aria-hidden="true" />
                    <span className="composer-dropzone__text">
                      {getTotalEditImageCount() >= 4
                        ? 'Maximum 4 images reached'
                        : 'Drag & drop images or click to browse'}
                    </span>
                    <span className="composer-dropzone__hint">
                      JPEG, PNG, GIF, WebP up to 5MB each
                    </span>
                  </>
                )}
              </div>
              {getTotalEditImageCount() > 0 && (
                <span className="composer-dropzone__count">{getTotalEditImageCount()}/4</span>
              )}
            </div>

            {(editExistingImages.length > 0 || editNewImagePreviews.length > 0) && (
              <div className="composer-previews">
                {editExistingImages.map((attachmentUrl, index) => {
                  const isImg = isImageAttachment(attachmentUrl);
                  const meta = isImg ? null : getFileAttachmentMeta(attachmentUrl, index);
                  return (
                    <div key={`existing-${index}`} className="composer-preview-item">
                      {isImg ? (
                        <img src={attachmentUrl} alt={`Existing ${index + 1}`} />
                      ) : (
                        <div className="composer-preview-file">
                          <span>{meta?.ext}</span>
                          <span className="composer-preview-file__name">{meta?.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="composer-preview-remove"
                        aria-label="Remove existing attachment"
                      >
                        <FiX size={13} />
                      </button>
                    </div>
                  );
                })}
                {editNewImagePreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="composer-preview-item">
                    <img src={preview} alt={`New ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="composer-preview-remove"
                      aria-label="Remove new image"
                    >
                      <FiX size={13} />
                    </button>
                    <span className="composer-preview-new">New</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Theme Swatch Picker */}
          <div className="composer-field">
            <span className="composer-field__label">Post style</span>
            <div className="composer-swatches">
              {POST_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`composer-swatch ${t.id === 'none' ? 'composer-swatch--none' : ''} ${
                    editTheme === t.id ? 'selected' : ''
                  }`}
                  style={t.id === 'none' ? undefined : { background: t.gradient }}
                  onClick={() => setEditTheme(t.id)}
                  title={t.name}
                  aria-label={`Select ${t.name} theme`}
                >
                  {editTheme === t.id && (
                    <FiCheck
                      size={13}
                      style={{ color: t.id === 'none' ? 'var(--ink-secondary)' : t.textColor }}
                    />
                  )}
                </button>
              ))}
            </div>
            {editTheme !== 'none' && (
              <span className="composer-hint">
                {editDescription.length <= POSTER_MODE_MAX_LENGTH && getTotalEditImageCount() === 0
                  ? 'Framed poster card inside paper'
                  : 'Framed gradient title banner inside paper'}
              </span>
            )}
          </div>

          <div className="post-edit-form__foot">
            <button
              type="button"
              onClick={cancelEditMode}
              className="btn btn--ghost shell-btn-sm"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdatePost}
              disabled={isSaving}
              className="btn btn--gold shell-btn-sm"
            >
              <FiCheck size={14} aria-hidden="true" />
              <span>{isSaving ? 'Saving…' : 'Save changes'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Pinned Faculty Announcement Top Banner */}
          {post.isAnnouncement && (
            <div className="post-pinned-banner">
              <span className="post-pinned-banner__label">
                <FiBookmark size={13} aria-hidden="true" />
                <span>Pinned Faculty Announcement</span>
              </span>
              <span className="post-pinned-banner__cat">{categoryLabel}</span>
            </div>
          )}

          {/* Unified Paper Card Header */}
          <div className="post-head">
            {post.isAnonymous ? (
              <span className="shell-avatar shell-avatar--anon" aria-hidden="true">
                ?
              </span>
            ) : post.author?.profilePicture ? (
              <img
                src={post.author.profilePicture}
                alt={post.author.name}
                className="shell-avatar"
              />
            ) : (
              <span className={`shell-avatar ${authorAvatarClass}`} aria-hidden="true">
                {getInitials(post.author?.name)}
              </span>
            )}

            <div className="post-head__meta">
              <div className="post-head__author-line">
                {post.isAnonymous ? (
                  <span className="post-author-anon">Anonymous Student</span>
                ) : (
                  <>
                    <Link
                      to={`/user/${post.author?._id || post.author?.id}`}
                      className="post-author-link"
                    >
                      {post.author?.name || 'Campus Member'}
                    </Link>
                    <span className={`role-pill ${rolePillClass}`}>{authorRole}</span>
                  </>
                )}
              </div>
              <time className="post-time" dateTime={createdIso}>
                {formatTimeAgo(post.createdAt)}
              </time>
            </div>

            <div className="post-head__right">
              {!post.isAnnouncement && (
                <span className="stamp stamp--neutral">{categoryLabel}</span>
              )}

              {(isPostOwner || canDeletePost) && (
                <div className="post-owner-actions">
                  {isPostOwner && (
                    <button
                      type="button"
                      onClick={enterEditMode}
                      className="post-icon-btn"
                      title="Edit post"
                      aria-label="Edit post"
                    >
                      <FiEdit2 size={15} />
                    </button>
                  )}
                  {canDeletePost && (
                    <button
                      type="button"
                      onClick={() => setDeletePostDialogOpen(true)}
                      className="post-icon-btn post-icon-btn--danger"
                      title="Delete post"
                      aria-label="Delete post"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content: Paper-Framed Poster, Paper-Framed Banner, or Standard */}
          {displayMode === 'poster' ? (
            <div
              className="post-poster-frame"
              style={{ background: theme.gradient, color: theme.textColor }}
            >
              {post.title && post.title !== post.description && (
                <h3 className="post-poster-frame__title" style={{ color: theme.textColor }}>
                  {post.title}
                </h3>
              )}
              <p className="post-poster-frame__body" style={{ color: theme.textColor }}>
                {post.description}
              </p>
            </div>
          ) : displayMode === 'banner' ? (
            <>
              <div
                className="post-banner-frame"
                style={{ background: theme.gradient, color: theme.textColor }}
              >
                <h3 className="post-banner-frame__title" style={{ color: theme.textColor }}>
                  {post.title}
                </h3>
              </div>
              <p className="post-card__body">{post.description}</p>
            </>
          ) : (
            <>
              {post.title && <h3 className="post-card__title">{post.title}</h3>}
              <p className="post-card__body">{post.description}</p>
            </>
          )}

          {/* Image Attachments Grid (opens ImageLightbox) */}
          {imageAttachments.length > 0 && (
            <div className={`post-images post-images-${Math.min(imageAttachments.length, 4)}`}>
              {imageAttachments.slice(0, 4).map((imageUrl, index) => (
                <div key={index} className="post-image-item">
                  <img
                    src={imageUrl}
                    alt={`Post attachment ${index + 1}`}
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

          {/* Non-Image File Attachments (PDF, DOC, etc.) */}
          {fileAttachments.length > 0 && (
            <div className="post-file-attachments">
              {fileAttachments.map((fileUrl, index) => {
                const { name, ext } = getFileAttachmentMeta(fileUrl, index);
                return (
                  <a
                    key={index}
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="post-attachment-file"
                  >
                    <span className="post-attachment-file__icon" aria-hidden="true">
                      {ext}
                    </span>
                    <span className="post-attachment-file__meta">
                      <span className="post-attachment-file__name">{name}</span>
                      <span className="post-attachment-file__type">{ext} Attachment</span>
                    </span>
                    <span className="post-attachment-file__dl">
                      <FiDownload size={13} aria-hidden="true" />
                      <span>Download</span>
                    </span>
                  </a>
                );
              })}
            </div>
          )}

          {/* Reactions Row */}
          <div className="post-reactions-row" aria-label="Post reactions">
            {existingReactionEntries.map(([emoji, userIds]) => {
              const hasReacted = Boolean(userId && userIds.includes(userId));
              return (
                <button
                  key={emoji}
                  type="button"
                  className={`reaction-chip ${hasReacted ? 'active' : ''}`}
                  onClick={() => handleReaction(emoji)}
                  aria-pressed={hasReacted}
                  title={hasReacted ? `Remove ${emoji} reaction` : `React with ${emoji}`}
                >
                  <span>{emoji}</span>
                  <span>{userIds.length}</span>
                </button>
              );
            })}

            {availableQuickReactions.map((emoji) => (
              <button
                key={`quick-${emoji}`}
                type="button"
                className="reaction-chip reaction-chip--add"
                onClick={() => handleReaction(emoji)}
                aria-label={`React with ${emoji}`}
                title={`React with ${emoji}`}
              >
                <span>+ {emoji}</span>
              </button>
            ))}
          </div>

          {/* Action Bar: Like, Comments (collapsed by default), Share */}
          <div className="post-card__actions">
            <button
              type="button"
              onClick={handleLike}
              className={`post-action-btn ${liked ? 'liked' : ''}`}
              aria-pressed={liked}
            >
              {liked ? (
                <FaHeart size={15} aria-hidden="true" />
              ) : (
                <FiHeart size={15} aria-hidden="true" />
              )}
              <span>
                {likes} {likes === 1 ? 'Like' : 'Likes'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowComments((prev) => !prev)}
              className={`post-action-btn ${showComments ? 'active' : ''}`}
              aria-expanded={showComments}
              aria-controls={postId ? `comments-${postId}` : undefined}
            >
              <FiMessageCircle size={15} aria-hidden="true" />
              <span>Comments ({comments.length})</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className={`post-action-btn post-action-btn--share ${
                copiedShare ? 'post-action-btn--copied' : ''
              }`}
              aria-live="polite"
            >
              {copiedShare ? (
                <>
                  <FiCheck size={15} aria-hidden="true" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <FiShare2 size={15} aria-hidden="true" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>

          {/* Collapsible Comments Drawer */}
          {showComments && (
            <div id={postId ? `comments-${postId}` : undefined} className="post-comments">
              <form onSubmit={handleAddComment} className="comment-form">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt=""
                    className="shell-avatar shell-avatar--sm"
                  />
                ) : (
                  <span
                    className={`shell-avatar shell-avatar--sm ${
                      user?.role === 'student' ? 'shell-avatar--gold' : ''
                    }`}
                    aria-hidden="true"
                  >
                    {getInitials(user?.name)}
                  </span>
                )}
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a reply..."
                  aria-label="Write a reply"
                  className="comment-form__input"
                />
                <button
                  type="submit"
                  className="btn btn--navy shell-btn-sm"
                  disabled={!newComment.trim()}
                >
                  <FiSend size={13} aria-hidden="true" />
                  <span>Reply</span>
                </button>
              </form>

              {comments.length === 0 ? (
                <p className="post-comments__empty">
                  No comments yet. Start the discussion.
                </p>
              ) : (
                <div className="post-comments__list">
                  {[...comments]
                    .reverse()
                    .slice(0, visibleCommentsCount)
                    .map((comment) => {
                      const commentId = comment._id || comment.id || '';
                      const isLiked = commentId ? commentLikes[commentId] : false;
                      const likeCount = comment.likes?.length || 0;
                      const commentAuthorId = comment.author?._id || comment.author?.id || '';
                      const isCommentAuthor = Boolean(userId && userId === commentAuthorId);
                      const isEditing = editingCommentId === commentId;
                      const isEdited =
                        comment.updatedAt &&
                        comment.createdAt &&
                        new Date(comment.updatedAt).getTime() -
                          new Date(comment.createdAt).getTime() >
                          1000;

                      return (
                        <div key={commentId} className="comment-item">
                          {comment.author?.profilePicture ? (
                            <img
                              src={comment.author.profilePicture}
                              alt=""
                              className="shell-avatar shell-avatar--xs"
                            />
                          ) : (
                            <span
                              className={`shell-avatar shell-avatar--xs ${
                                comment.author?.role === 'student' ? 'shell-avatar--gold' : ''
                              }`}
                              aria-hidden="true"
                            >
                              {getInitials(comment.author?.name)}
                            </span>
                          )}

                          <div className="comment-item__body">
                            <div className="comment-item__top">
                              <div className="comment-item__meta">
                                {commentAuthorId ? (
                                  <Link
                                    to={`/user/${commentAuthorId}`}
                                    className="comment-item__author"
                                  >
                                    {comment.author?.name || 'Member'}
                                  </Link>
                                ) : (
                                  <strong className="comment-item__author">
                                    {comment.author?.name || 'Member'}
                                  </strong>
                                )}
                                <span className="post-time">
                                  {formatTimeAgo(comment.createdAt)}
                                </span>
                                {isEdited && (
                                  <span className="comment-item__edited">(edited)</span>
                                )}
                              </div>

                              <div className="comment-item__actions">
                                {isCommentAuthor && !isEditing && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEditComment(comment)}
                                      className="comment-item__icon-btn"
                                      title="Edit comment"
                                      aria-label="Edit comment"
                                    >
                                      <FiEdit2 size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => commentId && openDeleteCommentDialog(commentId)}
                                      className="comment-item__icon-btn comment-item__icon-btn--danger"
                                      title="Delete comment"
                                      aria-label="Delete comment"
                                    >
                                      <FiTrash2 size={12} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => commentId && handleLikeComment(commentId)}
                                  className={`comment-item__icon-btn ${isLiked ? 'liked' : ''}`}
                                  title={isLiked ? 'Unlike comment' : 'Like comment'}
                                  aria-pressed={isLiked}
                                >
                                  {isLiked ? <FaHeart size={12} /> : <FiHeart size={12} />}
                                  {likeCount > 0 && <span>{likeCount}</span>}
                                </button>
                              </div>
                            </div>

                            {isEditing ? (
                              <div className="comment-item__edit">
                                <input
                                  ref={editCommentRef}
                                  type="text"
                                  value={editCommentContent}
                                  onChange={(e) => setEditCommentContent(e.target.value)}
                                  onKeyDown={(e) => commentId && handleEditKeyDown(e, commentId)}
                                  className="comment-form__input"
                                  autoFocus
                                />
                                <div className="comment-item__edit-actions">
                                  <button
                                    type="button"
                                    onClick={() => commentId && handleSaveCommentEdit(commentId)}
                                    className="btn btn--gold shell-btn-sm"
                                  >
                                    <FiCheck size={12} aria-hidden="true" />
                                    <span>Save</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelCommentEdit}
                                    className="btn btn--ghost shell-btn-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="comment-item__text">{comment.content}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {comments.length > visibleCommentsCount && (
                    <button
                      type="button"
                      className="btn btn--ghost shell-btn-sm post-comments__more"
                      onClick={() =>
                        setVisibleCommentsCount((prev) => Math.min(prev + 3, comments.length))
                      }
                    >
                      View previous comments ({comments.length - visibleCommentsCount} more)
                    </button>
                  )}
                </div>
              )}
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
      {imageAttachments.length > 0 && (
        <ImageLightbox
          images={imageAttachments}
          currentIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setLightboxIndex}
        />
      )}
    </article>
  );
};

export default PostComponent;
