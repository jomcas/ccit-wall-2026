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
} from '../controllers/userController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.get('/users', authMiddleware, getAllUsers);
router.get('/users/search', authMiddleware, searchUsers);
router.get('/users/:id', authMiddleware, getUserById);
router.delete('/users/:id', authMiddleware, adminMiddleware, deleteUser);

export default router;
