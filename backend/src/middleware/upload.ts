import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { validateImageMagicBytes } from '../utils/storage';

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

/**
 * Verify uploaded image buffers match their declared MIME type via magic bytes.
 * Must run after multer (memory storage).
 */
export const verifyUploadedImages = (req: Request, res: Response, next: NextFunction) => {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files && typeof req.files === 'object') {
    for (const group of Object.values(req.files)) files.push(...group);
  }

  const allValid = files.every((f) => validateImageMagicBytes(f.buffer, f.mimetype));
  if (!allValid) {
    return res.status(400).json({ message: 'Unsupported file type: invalid image file signature' });
  }
  next();
};

export default upload;
