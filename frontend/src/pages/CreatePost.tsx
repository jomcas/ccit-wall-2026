import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService } from '../services/api';
import { useSession } from '../contexts/SessionContext';
import { FiLock, FiSend, FiImage, FiX, FiUploadCloud, FiCheck } from 'react-icons/fi';
import { POST_THEMES, getThemeById, getPostDisplayMode, POSTER_MODE_MAX_LENGTH } from '../config/themes';
import '../styles/index.css';

const CreatePost: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('none');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { handleSessionExpired } = useSession();

  // Get current theme and display mode
  const currentTheme = useMemo(() => getThemeById(selectedTheme), [selectedTheme]);
  const displayMode = useMemo(
    () => getPostDisplayMode(selectedTheme, description.length, images.length > 0),
    [selectedTheme, description.length, images.length]
  );

  // Calculate remaining characters for poster mode
  const remainingChars = POSTER_MODE_MAX_LENGTH - description.length;
  const showCharCounter = selectedTheme !== 'none' && images.length === 0;

  // Shared file validation logic
  const processFiles = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files);
    const totalFiles = images.length + newFiles.length;

    if (totalFiles > 4) {
      setError('You can only upload up to 4 images');
      return;
    }

    // Validate file types and sizes
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

    // Reset the input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length < 4) {
      setIsDragging(true);
    }
  }, [images.length]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
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

    if (images.length >= 4) {
      setError('You can only upload up to 4 images');
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Filter only image files
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );
      if (imageFiles.length > 0) {
        processFiles(imageFiles);
      } else {
        setError('Please drop image files only');
      }
    }
  }, [images.length, processFiles]);

  const removeImage = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('isAnonymous', String(isAnonymous));
      formData.append('theme', selectedTheme);

      // Append images
      images.forEach((image, index) => {
        console.log(`Appending image ${index}:`, image.name, image.size, image.type);
        formData.append('images', image);
      });

      // Debug: Log FormData contents
      console.log('=== CreatePost FormData Debug ===');
      console.log('Total images to upload:', images.length);
      for (const [key, value] of formData.entries()) {
        console.log(`FormData entry: ${key} =`, value);
      }

      await postService.createPost(formData);
      
      // Clean up image previews
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      
      navigate('/');
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
    <div className="container" style={{ padding: '40px 20px', maxWidth: '640px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '40px' }}>
        <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Create New Post</h2>
        <p className="page-subtitle" style={{ textAlign: 'center', marginBottom: '32px' }}>Share something with the community</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Give your post a catchy title"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            {/* Live Preview Area for Themed Posts */}
            {selectedTheme !== 'none' && (
              <div 
                className={`theme-preview ${displayMode}`}
                style={{ 
                  background: currentTheme.gradient,
                  color: currentTheme.textColor,
                }}
              >
                {displayMode === 'poster' ? (
                  <div className="theme-preview-poster">
                    <p className="theme-preview-text">
                      {description || 'Your message will appear here...'}
                    </p>
                  </div>
                ) : (
                  <div className="theme-preview-banner">
                    <h3 className="theme-preview-title">{title || 'Your Title'}</h3>
                  </div>
                )}
              </div>
            )}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="What's on your mind?"
              style={{ minHeight: '140px' }}
            />
            {/* Character counter for poster mode */}
            {showCharCounter && (
              <div className={`char-counter ${remainingChars < 0 ? 'over-limit' : remainingChars < 50 ? 'near-limit' : ''}`}>
                {remainingChars >= 0 ? (
                  <span>{remainingChars} characters left for full background</span>
                ) : (
                  <span>Post will use banner style (text too long for full background)</span>
                )}
              </div>
            )}
          </div>

          {/* Theme Selector */}
          <div className="form-group">
            <label>Post Style</label>
            <div className="theme-selector">
              {POST_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-swatch ${selectedTheme === theme.id ? 'selected' : ''}`}
                  style={{ 
                    background: theme.id === 'none' ? '#ffffff' : theme.gradient,
                    border: theme.id === 'none' ? '2px dashed var(--border-color)' : 'none',
                  }}
                  onClick={() => setSelectedTheme(theme.id)}
                  title={theme.name}
                  aria-label={`Select ${theme.name} theme`}
                >
                  {selectedTheme === theme.id && (
                    <FiCheck 
                      size={16} 
                      style={{ color: theme.id === 'none' ? 'var(--text-secondary)' : theme.textColor }} 
                    />
                  )}
                  {theme.id === 'none' && selectedTheme !== 'none' && (
                    <FiX size={14} style={{ color: 'var(--text-secondary)' }} />
                  )}
                </button>
              ))}
            </div>
            {selectedTheme !== 'none' && (
              <p className="theme-hint">
                {displayMode === 'poster' 
                  ? 'Full background - great for short announcements!' 
                  : 'Banner header - perfect for detailed posts'}
              </p>
            )}
          </div>

          {/* Image Upload Section */}
          <div className="form-group">
            <label>Images (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={handleImageSelect}
              style={{ display: 'none' }}
              id="image-upload"
            />
            
            {/* Drag and Drop Zone */}
            <div
              ref={dropZoneRef}
              className={`image-drop-zone ${isDragging ? 'dragging' : ''} ${images.length >= 4 ? 'disabled' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => images.length < 4 && fileInputRef.current?.click()}
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
                      {images.length >= 4 ? 'Maximum 4 images reached' : 'Drag & drop images or click to browse'}
                    </span>
                    <span className="drop-zone-hint">
                      JPEG, PNG, GIF, WebP up to 5MB each
                    </span>
                  </>
                )}
              </div>
              {images.length > 0 && images.length < 4 && (
                <span className="image-count-badge">{images.length}/4</span>
              )}
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="image-preview-grid">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={preview} alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="image-remove-btn"
                      aria-label="Remove image"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="college-activities">College Activities</option>
              <option value="general">General</option>
              <option value="extracurricular">Extracurricular</option>
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--light-gray)', borderRadius: 'var(--radius-md)', marginTop: '8px' }}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              id="anonymous"
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label htmlFor="anonymous" style={{ margin: 0, fontWeight: '500', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiLock size={16} /> Post anonymously
            </label>
          </div>
          <button
            type="submit"
            className="button button-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <FiSend size={16} /> {loading ? 'Publishing...' : 'Publish Post'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;
