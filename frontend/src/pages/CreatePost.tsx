import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiSend,
  FiImage,
  FiX,
  FiUploadCloud,
  FiCheck,
  FiBookmark,
  FiEdit3,
  FiArrowLeft,
} from 'react-icons/fi';
import { postService } from '../services/api';
import { useSession } from '../contexts/SessionContext';
import {
  POST_THEMES,
  getThemeById,
  getPostDisplayMode,
  POSTER_MODE_MAX_LENGTH,
} from '../config/themes';
import { cache } from '../utils/cache';

const CreatePost: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'college-activities' | 'general' | 'extracurricular'>(
    'general'
  );
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('none');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { handleSessionExpired, user } = useSession();

  const isTeacher = user?.role === 'teacher';
  const canAnnounce = user?.role === 'teacher' || user?.role === 'admin';
  const canPostAnonymously = !isTeacher && !isAnnouncement;

  useEffect(() => {
    if (isTeacher || isAnnouncement) {
      setIsAnonymous(false);
    }
    if (!canAnnounce && isAnnouncement) {
      setIsAnnouncement(false);
    }
  }, [isTeacher, isAnnouncement, canAnnounce]);

  const currentTheme = useMemo(() => getThemeById(selectedTheme), [selectedTheme]);
  const displayMode = useMemo(
    () => getPostDisplayMode(selectedTheme, description.length, images.length > 0),
    [selectedTheme, description.length, images.length]
  );

  const remainingChars = POSTER_MODE_MAX_LENGTH - description.length;
  const showCharCounter = selectedTheme !== 'none' && images.length === 0;

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const newFiles = Array.from(files);
      const totalFiles = images.length + newFiles.length;

      if (totalFiles > 4) {
        setError('You can only upload up to 4 images');
        return;
      }

      const validFiles: File[] = [];
      const validPreviews: string[] = [];

      for (const file of newFiles) {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          setError('Only JPEG, PNG, GIF, and WebP images are allowed');
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setError('Each image must be less than 5MB');
          continue;
        }
        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      }

      if (validFiles.length > 0) {
        setImages((prev) => [...prev, ...validFiles]);
        setImagePreviews((prev) => [...prev, ...validPreviews]);
        setError('');
      }
    },
    [images.length]
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (images.length < 4) setIsDragging(true);
    },
    [images.length]
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

      if (images.length >= 4) {
        setError('You can only upload up to 4 images');
        return;
      }

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          processFiles(imageFiles);
        } else {
          setError('Please drop image files only');
        }
      }
    },
    [images.length, processFiles]
  );

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('isAnonymous', String(canPostAnonymously && isAnonymous));
      formData.append('isAnnouncement', String(canAnnounce && isAnnouncement));
      formData.append('theme', selectedTheme);

      images.forEach((image) => {
        formData.append('images', image);
      });

      await postService.createPost(formData);
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      cache.invalidateByPrefix('posts_');
      window.dispatchEvent(new CustomEvent('ccit:posts-updated'));
      navigate('/feed');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        handleSessionExpired();
        return;
      }
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create post';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="create-post-page" aria-label="Create campus post">
      <div>
        <Link to="/feed" className="btn btn--ghost shell-btn-sm">
          <FiArrowLeft size={14} aria-hidden="true" />
          <span>Back to Feed</span>
        </Link>
      </div>

      <div className={`paper create-post-card ${isAnnouncement ? 'paper--taped' : ''}`}>
        <div className="create-post-card__head">
          <div>
            <h1>{isAnnouncement ? 'New Faculty Announcement' : 'Create New Post'}</h1>
            <p className="create-post-card__sub">
              Pin an update, question, or notice to the NU Manila CCIT Wall
            </p>
          </div>
          {isAnnouncement && <span className="stamp stamp--gold">Pinned Notice</span>}
        </div>

        {error && (
          <div className="composer-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="feed-col">
          {/* Top 2-Column Row: Posting as + Category */}
          <div className="composer-grid-2">
            <div className="composer-field">
              <label htmlFor="create-post-sender">Posting as</label>
              <select
                id="create-post-sender"
                className="composer-select"
                value={canPostAnonymously && isAnonymous ? 'anonymous' : 'public'}
                onChange={(e) => setIsAnonymous(e.target.value === 'anonymous')}
                disabled={!canPostAnonymously}
              >
                <option value="public">{user?.name || 'User'} (Public)</option>
                {!isTeacher && <option value="anonymous">Anonymous</option>}
              </select>
              {isTeacher && (
                <span className="composer-hint">Faculty posts are always public.</span>
              )}
              {!isTeacher && isAnnouncement && (
                <span className="composer-hint">Pinned announcements require a public author.</span>
              )}
            </div>

            <div className="composer-field">
              <label htmlFor="create-post-category">Category</label>
              <select
                id="create-post-category"
                className="composer-select"
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as 'college-activities' | 'general' | 'extracurricular'
                  )
                }
              >
                <option value="college-activities">College Activities</option>
                <option value="general">General</option>
                <option value="extracurricular">Extracurricular</option>
              </select>
            </div>
          </div>

          {/* Post Format Toggle (Teachers & Admins only) */}
          {canAnnounce && (
            <div className="composer-field">
              <span className="composer-field__label">Post format</span>
              <div className="composer-format-selector" role="group" aria-label="Post format">
                <button
                  type="button"
                  className={`composer-format-btn ${!isAnnouncement ? 'active' : ''}`}
                  aria-pressed={!isAnnouncement}
                  onClick={() => setIsAnnouncement(false)}
                >
                  <FiEdit3 size={14} aria-hidden="true" />
                  <span>Standard Post</span>
                </button>
                <button
                  type="button"
                  className={`composer-format-btn composer-format-btn--gold ${
                    isAnnouncement ? 'active' : ''
                  }`}
                  aria-pressed={isAnnouncement}
                  onClick={() => {
                    setIsAnnouncement(true);
                    setIsAnonymous(false);
                  }}
                >
                  <FiBookmark size={14} aria-hidden="true" />
                  <span>Pinned Announcement</span>
                </button>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="composer-field">
            <label htmlFor="create-post-title">Title</label>
            <input
              id="create-post-title"
              type="text"
              className="composer-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a clear headline"
              required
              autoFocus
            />
          </div>

          {/* Description + Live Framed Preview */}
          <div className="composer-field">
            <label htmlFor="create-post-body">Description</label>
            {selectedTheme !== 'none' && (
              displayMode === 'poster' ? (
                <div
                  className="post-poster-frame"
                  style={{ background: currentTheme.gradient, color: currentTheme.textColor }}
                >
                  {title && (
                    <h3
                      className="post-poster-frame__title"
                      style={{ color: currentTheme.textColor }}
                    >
                      {title}
                    </h3>
                  )}
                  <p
                    className="post-poster-frame__body"
                    style={{ color: currentTheme.textColor }}
                  >
                    {description || 'Your framed poster message will appear here...'}
                  </p>
                </div>
              ) : (
                <div
                  className="post-banner-frame"
                  style={{ background: currentTheme.gradient, color: currentTheme.textColor }}
                >
                  <h3
                    className="post-banner-frame__title"
                    style={{ color: currentTheme.textColor }}
                  >
                    {title || 'Your framed title banner'}
                  </h3>
                </div>
              )
            )}

            <textarea
              id="create-post-body"
              className="composer-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write details, schedules, or questions for the community..."
              required
              style={{ minHeight: '140px' }}
            />

            {showCharCounter && (
              <span
                className={`composer-char-counter ${
                  remainingChars < 0
                    ? 'composer-char-counter--over'
                    : remainingChars < 50
                    ? 'composer-char-counter--warn'
                    : ''
                }`}
              >
                {remainingChars >= 0
                  ? `${remainingChars} characters left for full poster frame`
                  : 'Switched to banner header (text exceeds 280 characters)'}
              </span>
            )}
          </div>

          {/* Theme Swatches */}
          <div className="composer-field">
            <span className="composer-field__label">Post style (optional)</span>
            <div className="composer-swatches">
              {POST_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`composer-swatch ${t.id === 'none' ? 'composer-swatch--none' : ''} ${
                    selectedTheme === t.id ? 'selected' : ''
                  }`}
                  style={t.id === 'none' ? undefined : { background: t.gradient }}
                  onClick={() => setSelectedTheme(t.id)}
                  title={t.name}
                  aria-label={`Select ${t.name} theme`}
                >
                  {selectedTheme === t.id ? (
                    <FiCheck
                      size={14}
                      style={{ color: t.id === 'none' ? 'var(--ink-secondary)' : t.textColor }}
                    />
                  ) : (
                    t.id === 'none' && <FiX size={12} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
            {selectedTheme !== 'none' && (
              <span className="composer-hint">
                {displayMode === 'poster'
                  ? 'Full framed poster — great for short announcements!'
                  : 'Banner header — ideal for longer posts or posts with photos.'}
              </span>
            )}
          </div>

          {/* Drag-and-Drop Image Upload */}
          <div className="composer-field">
            <span className="composer-field__label">Photos (optional, up to 4)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleImageSelect}
              style={{ display: 'none' }}
              id="create-post-image-upload"
            />
            <div
              ref={dropZoneRef}
              className={`composer-dropzone ${isDragging ? 'is-dragging' : ''} ${
                images.length >= 4 ? 'is-disabled' : ''
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => images.length < 4 && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && images.length < 4) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className="composer-dropzone__inner">
                {isDragging ? (
                  <>
                    <FiUploadCloud size={28} aria-hidden="true" />
                    <span className="composer-dropzone__text">Drop images here</span>
                  </>
                ) : (
                  <>
                    <FiImage size={24} aria-hidden="true" />
                    <span className="composer-dropzone__text">
                      {images.length >= 4
                        ? 'Maximum 4 images reached'
                        : 'Drag & drop photos or click to browse'}
                    </span>
                    <span className="composer-dropzone__hint">
                      JPEG, PNG, GIF, WebP up to 5MB each
                    </span>
                  </>
                )}
              </div>
              {images.length > 0 && (
                <span className="composer-dropzone__count">{images.length}/4</span>
              )}
            </div>

            {imagePreviews.length > 0 && (
              <div className="composer-previews">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="composer-preview-item">
                    <img src={preview} alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="composer-preview-remove"
                      aria-label={`Remove photo ${index + 1}`}
                    >
                      <FiX size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="create-post-card__foot">
            <Link to="/feed" className="btn btn--ghost shell-btn-sm">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn--gold shell-btn-sm"
              disabled={loading || !title.trim() || !description.trim()}
            >
              <FiSend size={14} aria-hidden="true" />
              <span>
                {loading
                  ? 'Publishing…'
                  : isAnnouncement
                  ? 'Publish Announcement'
                  : 'Publish Post'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default CreatePost;
