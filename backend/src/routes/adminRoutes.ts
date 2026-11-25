import { Router } from 'express';
import {
  getActivityDashboard,
  getUserActivityLog,
  searchUsers,
  searchPosts,
} from '../controllers/adminController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { validateUserIdParam, validateSearchQuery } from '../middleware/validation';

const router = Router();

router.get('/dashboard', authMiddleware, adminMiddleware, getActivityDashboard);
router.get('/users/:userId/activity', authMiddleware, adminMiddleware, validateUserIdParam, getUserActivityLog);
router.get('/search/users', authMiddleware, adminMiddleware, validateSearchQuery, searchUsers);
router.get('/search/posts', authMiddleware, adminMiddleware, validateSearchQuery, searchPosts);

export default router;
