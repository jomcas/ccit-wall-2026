import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService } from '../services/api';
import { FiLock, FiSend } from 'react-icons/fi';
import '../styles/index.css';

const CreatePost: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await postService.createPost({
        title,
        description,
        category,
        isAnonymous,
      });
      navigate('/');
    } catch (err: any) {
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
        {error && <div className="alert alert-error">⚠️ {error}</div>}
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
