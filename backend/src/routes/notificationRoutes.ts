import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotificationById,
} from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';
import {
  validateNotificationId,
  validateGetNotifications,
} from '../middleware/validation';

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// Get notifications with pagination
router.get('/', validateGetNotifications, getNotifications);

// Get unread count (for polling)
router.get('/unread-count', getUnreadCount);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Mark single notification as read
router.put('/:id/read', validateNotificationId, markAsRead);

// Delete a notification
router.delete('/:id', validateNotificationId, deleteNotificationById);

export default router;
