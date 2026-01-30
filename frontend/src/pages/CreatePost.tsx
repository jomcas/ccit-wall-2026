import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService } from '../services/api';
import { useSession } from '../contexts/SessionContext';
import { FiLock, FiSend, FiImage, FiX } from 'react-icons/fi';
import '../styles/index.css';

const CreatePost: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { handleSessionExpired } = useSession();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

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

    setImages((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...validPreviews]);
    setError('');

    // Reset the input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

      // Append images
      images.forEach((image) => {
        formData.append('images', image);
      });

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
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="What's on your mind?"
              style={{ minHeight: '140px' }}
            />
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="image-upload-btn"
              disabled={images.length >= 4}
            >
              <FiImage size={18} />
              <span>{images.length >= 4 ? 'Max 4 images' : 'Add Images'}</span>
              {images.length > 0 && <span className="image-count">({images.length}/4)</span>}
            </button>

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
