import React, { useState, useRef, useCallback, useMemo, useEffect, useId } from 'react';
import {
  FiImage,
  FiX,
  FiSend,
  FiLock,
  FiCheck,
  FiBookmark,
  FiUploadCloud,
  FiChevronDown,
  FiChevronUp,
  FiEdit3,
} from 'react-icons/fi';
import { postService } from '../services/api';
import { useSession } from '../contexts/SessionContext';
import {
  POST_THEMES,
  getThemeById,
  getPostDisplayMode,
  POSTER_MODE_MAX_LENGTH,
} from '../config/themes';

interface CreatePostWidgetProps {
  onPostCreated?: () => void;
}

type ComposerMode = 'standard' | 'announcement' | 'anonymous' | 'photo';

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const CreatePostWidget: React.FC<CreatePostWidgetProps> = ({ onPostCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'college-activities' | 'general' | 'extracurricular'>(
    'general'
  );
  const [selectedTheme, setSelectedTheme] = useState('none');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const dialogId = useId();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { handleSessionExpired, user } = useSession();

  const isTeacher = user?.role === 'teacher';
  const canAnnounce = user?.role === 'teacher' || user?.role === 'admin';
  const canPostAnonymously = !isTeacher && !isAnnouncement;

  // Theme logic
  const currentTheme = useMemo(() => getThemeById(selectedTheme), [selectedTheme]);
  const displayMode = useMemo(
    () => getPostDisplayMode(selectedTheme, description.length, images.length > 0),
    [selectedTheme, description.length, images.length]
  );
  const remainingChars = POSTER_MODE_MAX_LENGTH - description.length;
  const showCharCounter = selectedTheme !== 'none' && images.length === 0;

  // Ensure the HTML autofocus attribute is present on the title input so native showModal()
  // focuses it reliably on every open (React 18 strips JSX autoFocus from the DOM attribute).
  useEffect(() => {
    titleInputRef.current?.setAttribute('autofocus', '');
  }, []);

  // Ensure teacher role or announcement mode cannot stay anonymous
  useEffect(() => {
    if (isTeacher || isAnnouncement) {
      setIsAnonymous(false);
    }
    if (!canAnnounce && isAnnouncement) {
      setIsAnnouncement(false);
    }
  }, [isTeacher, isAnnouncement, canAnnounce]);

  // Native <dialog> close listener + closedby="any" pointer-rect fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      setError('');
    };

    dialog.addEventListener('close', handleClose);

    if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e: PointerEvent) => {
        const rect = dialog.getBoundingClientRect();
        return (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        );
      };

      let pressedOutside = false;
      const handlePointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const handlePointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e) && dialog.open) {
          dialog.close();
        }
        pressedOutside = false;
      };

      dialog.addEventListener('pointerdown', handlePointerDown);
      dialog.addEventListener('pointerup', handlePointerUp);

      return () => {
        dialog.removeEventListener('close', handleClose);
        dialog.removeEventListener('pointerdown', handlePointerDown);
        dialog.removeEventListener('pointerup', handlePointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, []);

  const openComposer = useCallback(
    (mode: ComposerMode = 'standard') => {
      setError('');

      if (mode === 'announcement' && canAnnounce) {
        setIsAnnouncement(true);
        setIsAnonymous(false);
        setCategory('college-activities');
      } else if (mode === 'anonymous' && !isTeacher) {
        setIsAnnouncement(false);
        setIsAnonymous(true);
      } else {
        setIsAnnouncement(false);
        setIsAnonymous(false);
      }

      const dialog = dialogRef.current;
      if (dialog && !dialog.open) {
        dialog.showModal();
      }

      if (mode === 'photo') {
        fileInputRef.current?.click();
      }
    },
    [canAnnounce, isTeacher]
  );

  // Listen to header "+ New Post" event when on /feed
  useEffect(() => {
    const handleOpenEvent = (event: Event) => {
      const custom = event as CustomEvent<{ mode?: ComposerMode }>;
      openComposer(custom.detail?.mode || 'standard');
    };
    window.addEventListener('ccit:open-composer', handleOpenEvent);
    return () => window.removeEventListener('ccit:open-composer', handleOpenEvent);
  }, [openComposer]);

  const closeComposer = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
  };

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

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('general');
    setSelectedTheme('none');
    setShowStylePicker(false);
    setIsAnonymous(false);
    setIsAnnouncement(false);
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImages([]);
    setImagePreviews([]);
    setError('');
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
      resetForm();
      closeComposer();
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        closeComposer();
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

  const avatarVariant = user?.role === 'student' ? 'shell-avatar--gold' : '';
  const visibleModesCount = 2 + (canAnnounce ? 1 : 0) + (!isTeacher ? 1 : 0);
  const isOddModes = visibleModesCount % 2 === 1;

  return (
    <>
      {/* Compact Inline Composer Trigger Bar */}
      <div className="paper composer-trigger">
        <div className="composer-trigger__row">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt="" className="shell-avatar" />
          ) : (
            <span className={`shell-avatar ${avatarVariant}`} aria-hidden="true">
              {getInitials(user?.name)}
            </span>
          )}
          <button
            type="button"
            className="composer-trigger__fake"
            onClick={() => openComposer('standard')}
          >
            Share an update, question, or announcement with CCIT...
          </button>
        </div>

        <div className={`composer-trigger__modes ${isOddModes ? 'composer-trigger__modes--odd' : ''}`}>
          <button
            type="button"
            className="btn btn--subtle shell-btn-sm"
            onClick={() => openComposer('standard')}
          >
            <FiEdit3 size={14} aria-hidden="true" />
            <span>Standard Post</span>
          </button>

          {canAnnounce && (
            <button
              type="button"
              className="btn btn--subtle shell-btn-sm"
              onClick={() => openComposer('announcement')}
            >
              <FiBookmark size={14} aria-hidden="true" />
              <span>Faculty Announcement</span>
            </button>
          )}

          {!isTeacher && (
            <button
              type="button"
              className="btn btn--subtle shell-btn-sm"
              onClick={() => openComposer('anonymous')}
            >
              <FiLock size={14} aria-hidden="true" />
              <span>Post Anonymously</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn--ghost shell-btn-sm composer-trigger__attach-btn"
            onClick={() => openComposer('photo')}
          >
            <FiImage size={14} aria-hidden="true" />
            <span>Attach Photo</span>
          </button>
        </div>
      </div>

      {/* Native <dialog> Modal Composer (no role="dialog" or aria-modal) */}
      <dialog
        id={dialogId}
        ref={dialogRef}
        className="composer-dialog"
        aria-labelledby={titleId}
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        <div className="dialog-head">
          <h1 id={titleId} className="dialog-head__title">
            {isAnnouncement ? 'New Faculty Announcement' : 'New Campus Post'}
          </h1>
          <button
            type="button"
            className="btn btn--ghost shell-btn-icon"
            onClick={closeComposer}
            aria-label="Close composer"
          >
            <FiX size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-body">
          {error && (
            <div className="composer-error" role="alert">
              {error}
            </div>
          )}

          {/* Top 2-Column Row: Posting As + Category */}
          <div className="composer-grid-2">
            <div className="composer-field">
              <label htmlFor={`${dialogId}-sender`}>Posting as</label>
              <select
                id={`${dialogId}-sender`}
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
              <label htmlFor={`${dialogId}-category`}>Category</label>
              <select
                id={`${dialogId}-category`}
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
            <label htmlFor={`${dialogId}-title`}>Title</label>
            <input
              ref={titleInputRef}
              id={`${dialogId}-title`}
              type="text"
              className="composer-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a clear headline"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="composer-field">
            <label htmlFor={`${dialogId}-body`}>Description</label>
            <textarea
              id={`${dialogId}-body`}
              className="composer-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write details, schedules, or questions for CCIT..."
              required
            />
          </div>

          {/* Collapsible Optional Post Style Swatch Picker */}
          <div className="composer-style-box">
            <button
              type="button"
              className="composer-style-toggle"
              onClick={() => setShowStylePicker((prev) => !prev)}
              aria-expanded={showStylePicker}
            >
              <span className="composer-style-toggle__left">
                <span>Post style (optional)</span>
                {selectedTheme !== 'none' && (
                  <span className="stamp stamp--neutral">{currentTheme.name}</span>
                )}
              </span>
              {showStylePicker ? (
                <FiChevronUp size={16} aria-hidden="true" />
              ) : (
                <FiChevronDown size={16} aria-hidden="true" />
              )}
            </button>

            {showStylePicker && (
              <div className="composer-style-body">
                <div className="composer-swatches">
                  {POST_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`composer-swatch ${
                        t.id === 'none' ? 'composer-swatch--none' : ''
                      } ${selectedTheme === t.id ? 'selected' : ''}`}
                      style={t.id === 'none' ? undefined : { background: t.gradient }}
                      onClick={() => setSelectedTheme(t.id)}
                      title={t.name}
                      aria-label={`Select ${t.name} theme`}
                    >
                      {selectedTheme === t.id ? (
                        <FiCheck
                          size={13}
                          style={{
                            color: t.id === 'none' ? 'var(--ink-secondary)' : t.textColor,
                          }}
                        />
                      ) : (
                        t.id === 'none' && <FiX size={11} aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>

                {selectedTheme !== 'none' && (
                  <>
                    {displayMode === 'poster' ? (
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
                    )}

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
                          ? `${remainingChars} chars left for full poster frame`
                          : 'Switched to banner header (text exceeds 280 chars)'}
                      </span>
                    )}
                  </>
                )}
              </div>
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
                    <FiUploadCloud size={26} aria-hidden="true" />
                    <span className="composer-dropzone__text">Drop images here</span>
                  </>
                ) : (
                  <>
                    <FiImage size={22} aria-hidden="true" />
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

          {/* Dialog Footer */}
          <div className="dialog-foot">
            <button
              type="button"
              className="btn btn--ghost shell-btn-sm"
              onClick={closeComposer}
              disabled={loading}
            >
              Cancel
            </button>
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
      </dialog>
    </>
  );
};

export default CreatePostWidget;
