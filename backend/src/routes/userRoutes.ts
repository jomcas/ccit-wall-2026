import { Router } from 'express';
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
import { profilePictureUpload } from '../middleware/upload';
import {
  validateProfileUpdate,
  validateObjectId,
  validateSearchQuery,
} from '../middleware/validation';

const router = Router();

// Firebase profile sync — called after every Firebase sign-in/sign-up
// Does NOT use authMiddleware because first-time users don't exist in Mongo yet;
// the controller verifies the Firebase token directly.
router.post('/sync', syncProfile);

// Protected routes with input validation
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, validateProfileUpdate, updateProfile);
router.patch('/profile/picture', authMiddleware, profilePictureUpload.single('profilePicture'), updateProfilePicture);
router.get('/users', authMiddleware, getAllUsers);
router.get('/users/search', authMiddleware, validateSearchQuery, searchUsers);
router.get('/users/:id', authMiddleware, validateObjectId, getUserById);
router.delete('/users/:id', authMiddleware, adminMiddleware, validateObjectId, deleteUser);

export default router;
