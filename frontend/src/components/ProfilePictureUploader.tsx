import React, { useState, useRef, useCallback } from 'react';
import { FiCamera, FiUpload, FiX, FiAlertCircle } from 'react-icons/fi';
import { authService } from '../services/api';
import { useSession } from '../contexts/SessionContext';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface ProfilePictureUploaderProps {
  currentPicture?: string;
  userName: string;
  onUploadSuccess: (newPictureUrl: string, updatedUser: any) => void;
}

const ProfilePictureUploader: React.FC<ProfilePictureUploaderProps> = ({
  currentPicture,
  userName,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { handleSessionExpired } = useSession();

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        // Reset file input so the same file can be re-selected after fixing
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setSelectedFile(file);

      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [validateFile]
  );

  const handleCancelPreview = useCallback(() => {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const response = await authService.uploadProfilePicture(selectedFile);
      const updatedUser = response.data.user;

      // Reset state
      setPreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      onUploadSuccess(updatedUser.profilePicture, updatedUser);
    } catch (err: any) {
      if (err.response?.status === 401) {
        handleSessionExpired();
        return;
      }
      const message =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        'Failed to upload profile picture. Please try again.';
      setError(message);
    } finally {
      setUploading(false);
    }
  }, [selectedFile, onUploadSuccess, handleSessionExpired]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const displayImage = preview || currentPicture;
  const initial = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    <div className="pp-uploader">
      <div className="pp-uploader__avatar-wrapper">
        {displayImage ? (
          <img
            src={displayImage}
            alt={userName}
            className="profile-avatar-large"
          />
        ) : (
          <div className="profile-avatar-placeholder-large">{initial}</div>
        )}

        {/* Camera overlay button */}
        <button
          type="button"
          className="pp-uploader__camera-btn"
          onClick={triggerFileInput}
          disabled={uploading}
          aria-label="Change profile picture"
        >
          <FiCamera size={20} />
        </button>

        {/* Uploading spinner overlay */}
        {uploading && (
          <div className="pp-uploader__spinner-overlay">
            <div className="pp-uploader__spinner" />
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="pp-uploader__file-input"
        aria-label="Select profile picture"
      />

      {/* Error message */}
      {error && (
        <div className="pp-uploader__error">
          <FiAlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons when a file is selected */}
      {preview && !uploading && (
        <div className="pp-uploader__actions">
          <button
            type="button"
            className="pp-uploader__upload-btn"
            onClick={handleUpload}
          >
            <FiUpload size={14} />
            Upload
          </button>
          <button
            type="button"
            className="pp-uploader__cancel-btn"
            onClick={handleCancelPreview}
          >
            <FiX size={14} />
            Cancel
          </button>
        </div>
      )}

      <p className="pp-uploader__hint">
        JPEG, PNG, GIF, or WebP. Max 5 MB.
      </p>
    </div>
  );
};

export default ProfilePictureUploader;
