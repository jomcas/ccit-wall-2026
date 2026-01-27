import { Router } from 'express';
import {
  getActivityDashboard,
  getUserActivityLog,
  searchUsers,
  searchPosts,
} from '../controllers/adminController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authMiddleware, adminMiddleware, getActivityDashboard);
router.get('/users/:userId/activity', authMiddleware, adminMiddleware, getUserActivityLog);
router.get('/search/users', authMiddleware, adminMiddleware, searchUsers);
router.get('/search/posts', authMiddleware, adminMiddleware, searchPosts);

export default router;
