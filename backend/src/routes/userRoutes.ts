import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  deleteUser,
  searchUsers,
  forgotPassword,
  resetPassword,
} from '../controllers/userController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateObjectId,
  validateSearchQuery,
  validateForgotPassword,
  validateResetPassword,
} from '../middleware/validation';

const router = Router();

// Public routes with input validation
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);

// Password Reset Routes (public - no auth required)
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/reset-password/:token', validateResetPassword, resetPassword);

// Protected routes with input validation
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, validateProfileUpdate, updateProfile);
router.get('/users', authMiddleware, getAllUsers);
router.get('/users/search', authMiddleware, validateSearchQuery, searchUsers);
router.get('/users/:id', authMiddleware, validateObjectId, getUserById);
router.delete('/users/:id', authMiddleware, adminMiddleware, validateObjectId, deleteUser);

export default router;
