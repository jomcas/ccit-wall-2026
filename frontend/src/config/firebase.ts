/**
 * Firebase Client SDK Initialization
 * 
 * Provides the Firebase app, auth, and (future) storage singletons
 * for front-end use.
 * 
 * Required env vars (REACT_APP_ prefix for Create React App):
 *   REACT_APP_FIREBASE_API_KEY
 *   REACT_APP_FIREBASE_AUTH_DOMAIN
 *   REACT_APP_FIREBASE_PROJECT_ID
 *   REACT_APP_FIREBASE_STORAGE_BUCKET
 *   REACT_APP_FIREBASE_MESSAGING_SENDER_ID   (optional)
 *   REACT_APP_FIREBASE_APP_ID                 (optional)
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

/** Firebase Auth client instance */
export const auth = getAuth(app);

export default app;
