import React, { useState, useRef, useCallback, useMemo } from 'react';
import { postService } from '../services/api';
import { useSession } from '../contexts/SessionContext';
import { FiImage, FiX, FiSend, FiLock, FiChevronUp, FiCheck } from 'react-icons/fi';
import { POST_THEMES, getThemeById, getPostDisplayMode, POSTER_MODE_MAX_LENGTH } from '../config/themes';

interface CreatePostWidgetProps {
  onPostCreated?: () => void;
}

const CreatePostWidget: React.FC<CreatePostWidgetProps> = ({ onPostCreated }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [selectedTheme, setSelectedTheme] = useState('none');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { handleSessionExpired, user } = useSession();

  // Theme logic
  const currentTheme = useMemo(() => getThemeById(selectedTheme), [selectedTheme]);
  const displayMode = useMemo(
    () => getPostDisplayMode(selectedTheme, description.length, images.length > 0),
    [selectedTheme, description.length, images.length]
  );
  const remainingChars = POSTER_MODE_MAX_LENGTH - description.length;
  const showCharCounter = selectedTheme !== 'none' && images.length === 0;

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    if (!title && !description && images.length === 0) {
      setIsExpanded(false);
    }
  };

  const processFiles = useCallback((files: FileList | File[]) => {
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
  }, [images.length]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    setIsAnonymous(false);
    setImages([]);
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImagePreviews([]);
    setError('');
    setIsExpanded(false);
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
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('isAnonymous', String(isAnonymous));
      formData.append('theme', selectedTheme);

      images.forEach((image) => {
        formData.append('images', image);
      });

      await postService.createPost(formData);
      resetForm();
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`create-post-widget ${isExpanded ? 'expanded' : ''}`}>
      {/* Collapsed View */}
      {!isExpanded && (
        <div className="create-post-collapsed" onClick={handleFocus}>
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt={user.name || 'User'} className="create-post-avatar" />
          ) : (
            <div className="create-post-avatar-placeholder">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="create-post-input-fake">
            What's on your mind, {user?.name?.split(' ')[0] || 'there'}?
          </div>
          <button 
            type="button" 
            className="create-post-image-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
              setTimeout(() => fileInputRef.current?.click(), 100);
            }}
          >
            <FiImage size={20} />
          </button>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <form onSubmit={handleSubmit} className="create-post-expanded">
          <div className="create-post-header">
            <div className="create-post-user">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user.name || 'User'} className="create-post-avatar" />
              ) : (
                <div className="create-post-avatar-placeholder">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="create-post-user-info">
                <span className="create-post-user-name">{user?.name || 'User'}</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="create-post-category-select"
                >
                  <option value="general">General</option>
                  <option value="college-activities">College Activities</option>
                  <option value="extracurricular">Extracurricular</option>
                </select>
              </div>
            </div>
            <button 
              type="button" 
              className="create-post-collapse-btn"
              onClick={handleCollapse}
            >
              <FiChevronUp size={20} />
            </button>
          </div>

          {error && <div className="create-post-error">{error}</div>}

          {/* Theme Preview (Poster Mode) */}
          {selectedTheme !== 'none' && displayMode === 'poster' && (
            <div 
              className="create-post-theme-preview poster"
              style={{ background: currentTheme.gradient }}
            >
              <p style={{ color: currentTheme.textColor }}>
                {description || 'Your message will appear here...'}
              </p>
            </div>
          )}

          {/* Theme Preview (Banner Mode) */}
          {selectedTheme !== 'none' && displayMode === 'banner' && (
            <div 
              className="create-post-theme-preview banner"
              style={{ background: currentTheme.gradient }}
            >
              <h4 style={{ color: currentTheme.textColor, margin: 0 }}>
                {title || 'Your Title'}
              </h4>
            </div>
          )}

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="create-post-title-input"
            autoFocus
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`What's on your mind, ${user?.name?.split(' ')[0] || 'there'}?`}
            className="create-post-textarea"
            rows={3}
          />

          {/* Character counter for poster mode */}
          {showCharCounter && (
            <div className={`create-post-char-counter ${remainingChars < 0 ? 'over-limit' : remainingChars < 50 ? 'near-limit' : ''}`}>
              {remainingChars >= 0 ? (
                <span>{remainingChars} chars left for full background</span>
              ) : (
                <span>Banner style (text too long)</span>
              )}
            </div>
          )}

          {/* Theme Selector */}
          <div className="create-post-theme-selector">
            <span className="create-post-theme-label">Style:</span>
            <div className="create-post-theme-swatches">
              {POST_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`create-post-theme-swatch ${selectedTheme === theme.id ? 'selected' : ''}`}
                  style={{ 
                    background: theme.id === 'none' ? '#f1f5f9' : theme.gradient,
                    border: theme.id === 'none' ? '2px dashed #cbd5e1' : 'none',
                  }}
                  onClick={() => setSelectedTheme(theme.id)}
                  title={theme.name}
                  aria-label={`Select ${theme.name} theme`}
                >
                  {selectedTheme === theme.id && (
                    <FiCheck 
                      size={12} 
                      style={{ color: theme.id === 'none' ? '#64748b' : theme.textColor }} 
                    />
                  )}
                  {theme.id === 'none' && selectedTheme !== 'none' && (
                    <FiX size={10} style={{ color: '#64748b' }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="create-post-images">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="create-post-image-item">
                  <img src={preview} alt={`Preview ${index + 1}`} />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="create-post-image-remove"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="create-post-actions">
            <div className="create-post-action-buttons">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="create-post-action-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 4}
              >
                <FiImage size={18} />
                <span>Photo</span>
              </button>
              <label className="create-post-action-btn create-post-anonymous-toggle">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <FiLock size={18} />
                <span>Anonymous</span>
              </label>
            </div>
            <button
              type="submit"
              className="create-post-submit-btn"
              disabled={loading || !title.trim() || !description.trim()}
            >
              {loading ? 'Posting...' : 'Post'}
              <FiSend size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreatePostWidget;
