/**
 * Firebase Storage Utility
 *
 * Backend-mediated uploads: the Express server receives files via multer
 * (memory storage), then pushes them to Firebase Cloud Storage.
 *
 * Provides:
 *   - uploadFile()   – upload a buffer to Firebase Storage and return the public URL
 *   - deleteFile()   – delete a file from Firebase Storage by its path
 *   - deleteFiles()  – delete multiple files (best-effort)
 *   - extractStoragePath() – extract the Firebase Storage path from a download URL
 */

import crypto from 'crypto';
import path from 'path';
import { adminStorage } from './firebase';
import { logger } from './logger';

// Allowed MIME types → extensions
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Upload a file buffer to Firebase Storage.
 *
 * @param buffer     - The raw file buffer (from multer memory storage)
 * @param mimetype   - The file's MIME type (e.g. "image/jpeg")
 * @param originalName - Original filename (used only for the extension fallback)
 * @returns The public download URL of the uploaded file
 */
export async function uploadFile(
  buffer: Buffer,
  mimetype: string,
  originalName: string
): Promise<string> {
  // Validate MIME type
  if (!ALLOWED_TYPES[mimetype]) {
    throw new Error(`Unsupported file type: ${mimetype}. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}`);
  }

  // Validate size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Max: 5 MB.`);
  }

  // Build a unique destination path: posts/<uuid><ext>
  const ext = ALLOWED_TYPES[mimetype] || path.extname(originalName).toLowerCase() || '.bin';
  const destination = `posts/${crypto.randomUUID()}${ext}`;

  const file = adminStorage.file(destination);

  // Upload with public-read ACL so the URL is directly accessible
  await file.save(buffer, {
    contentType: mimetype,
    public: true,
    metadata: {
      metadata: {
        originalName,
        uploadTime: new Date().toISOString(),
      },
    },
  });

  // Public URL format
  const publicUrl = `https://storage.googleapis.com/${adminStorage.name}/${destination}`;

  logger.info(`File uploaded to Firebase Storage: ${destination}`);
  return publicUrl;
}

/**
 * Upload a profile picture to Firebase Storage.
 *
 * Stores files under `profile-pictures/<userId>/<uuid><ext>` so that each
 * user's images are namespaced and old ones can optionally be cleaned up.
 *
 * @param buffer       - The raw file buffer (from multer memory storage)
 * @param mimetype     - The file's MIME type (e.g. "image/jpeg")
 * @param originalName - Original filename (used only for the extension fallback)
 * @param userId       - The MongoDB user ID (used for namespacing)
 * @returns The public download URL of the uploaded file
 */
export async function uploadProfilePicture(
  buffer: Buffer,
  mimetype: string,
  originalName: string,
  userId: string
): Promise<string> {
  // Validate MIME type
  if (!ALLOWED_TYPES[mimetype]) {
    throw new Error(`Unsupported file type: ${mimetype}. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}`);
  }

  // Validate size
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Max: 5 MB.`);
  }

  const ext = ALLOWED_TYPES[mimetype] || path.extname(originalName).toLowerCase() || '.bin';
  const destination = `profile-pictures/${userId}/${crypto.randomUUID()}${ext}`;

  const file = adminStorage.file(destination);

  await file.save(buffer, {
    contentType: mimetype,
    public: true,
    metadata: {
      metadata: {
        originalName,
        uploadTime: new Date().toISOString(),
      },
    },
  });

  const publicUrl = `https://storage.googleapis.com/${adminStorage.name}/${destination}`;

  logger.info(`Profile picture uploaded to Firebase Storage: ${destination}`);
  return publicUrl;
}

/**
 * Extract the Firebase Storage object path from a public URL.
 * Handles URLs like:
 *   https://storage.googleapis.com/<bucket>/posts/abc.jpg
 *
 * Returns null if the URL doesn't look like a Firebase Storage URL.
 */
export function extractStoragePath(url: string): string | null {
  try {
    const bucketName = adminStorage.name;
    const prefix = `https://storage.googleapis.com/${bucketName}/`;
    if (url.startsWith(prefix)) {
      return url.slice(prefix.length);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Delete a single file from Firebase Storage.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    await adminStorage.file(storagePath).delete();
    logger.info(`File deleted from Firebase Storage: ${storagePath}`);
  } catch (error: any) {
    // 404 means already deleted — treat as success
    if (error.code === 404) {
      logger.warn(`File not found in Firebase Storage (already deleted?): ${storagePath}`);
      return;
    }
    logger.error(`Failed to delete file from Firebase Storage: ${storagePath}`, error);
    throw error;
  }
}

/**
 * Delete multiple files from Firebase Storage (best-effort).
 * Logs errors but doesn't throw — useful for cleanup during post deletion.
 */
export async function deleteFiles(urls: string[]): Promise<void> {
  const deletions = urls
    .map((url) => extractStoragePath(url))
    .filter((p): p is string => p !== null)
    .map((storagePath) =>
      deleteFile(storagePath).catch((err) => {
        logger.warn(`Best-effort delete failed for ${storagePath}: ${err.message}`);
      })
    );

  await Promise.all(deletions);
}
