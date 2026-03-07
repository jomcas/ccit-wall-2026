import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';

/**
 * Multer middleware — memory storage
 *
 * Files are held in memory buffers (req.files[].buffer) so the
 * post controller can forward them directly to Firebase Storage.
 * No local disk writes occur.
 */

// File filter - only allow images
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  const ext = path.extname(file.originalname).toLowerCase();
  const isValidMime = allowedMimeTypes.includes(file.mimetype);
  const isValidExt = allowedExtensions.includes(ext);

  if (isValidMime && isValidExt) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
  }
};

// Create multer instance with memory storage (for post images — up to 4 files)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 4, // Maximum 4 files per upload
  },
});

/**
 * Multer instance for profile picture uploads.
 * Single file, 5 MB limit, images only.
 */
export const profilePictureUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1,
  },
});

export default upload;
