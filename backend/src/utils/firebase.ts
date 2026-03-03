/**
 * Firebase Admin SDK Initialization
 * 
 * Singleton pattern — safe to import from multiple modules.
 * Provides:
 *   - adminAuth  – Firebase Auth admin (token verification, user management)
 *   - adminStorage – Firebase Storage bucket (file upload/delete, signed URLs)
 * 
 * Required env vars:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY       (JSON-escaped; newlines will be unescaped at runtime)
 *   FIREBASE_STORAGE_BUCKET    (e.g. "my-project.appspot.com")
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

let firebaseApp: App;

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn(
      'Firebase Admin SDK credentials missing – Firebase features will be unavailable. ' +
      'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
  }

  firebaseApp = initializeApp({
    credential:
      projectId && clientEmail && privateKey
        ? cert({ projectId, clientEmail, privateKey })
        : undefined,
    storageBucket: storageBucket || undefined,
  });
} else {
  firebaseApp = getApps()[0];
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Firebase Auth admin instance (token verification, user CRUD) */
export const adminAuth: Auth = getAuth(firebaseApp);

/** Firebase Storage bucket (file upload/delete/signed-url) */
export const adminStorage = getStorage(firebaseApp).bucket();

export default firebaseApp;
