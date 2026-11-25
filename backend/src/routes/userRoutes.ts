import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  syncProfile,
  getProfile,
  updateProfile,
  updateProfilePicture,
  getAllUsers,
  getUserById,
  deleteUser,
  searchUsers,
} from '../controllers/userController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { profilePictureUpload, verifyUploadedImages } from '../middleware/upload';
import {
  validateProfileUpdate,
  validateObjectId,
  validateSearchQuery,
  validateSyncProfile,
} from '../middleware/validation';

const router = Router();

/**
 * Dedicated rate limiter for the unauthenticated-by-middleware sync endpoint.
 * Limits token-verification / account-linking attempts per IP.
 */
const authSyncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_SYNC_RATE_LIMIT_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

// Firebase profile sync — called after every Firebase sign-in/sign-up
// Does NOT use authMiddleware because first-time users don't exist in Mongo yet;
// the controller verifies the Firebase token directly (with revocation checks).
router.post('/sync', authSyncLimiter, validateSyncProfile, syncProfile);

// Protected routes with input validation
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, validateProfileUpdate, updateProfile);
router.patch(
  '/profile/picture',
  authMiddleware,
  profilePictureUpload.single('profilePicture'),
  verifyUploadedImages,
  updateProfilePicture
);
router.get('/users', authMiddleware, getAllUsers);
router.get('/users/search', authMiddleware, validateSearchQuery, searchUsers);
router.get('/users/:id', authMiddleware, validateObjectId, getUserById);
router.delete('/users/:id', authMiddleware, adminMiddleware, validateObjectId, deleteUser);

export default router;
