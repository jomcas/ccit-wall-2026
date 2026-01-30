/**
 * Notification API Tests
 * 
 * Tests for notification endpoints including:
 * - Getting notifications with pagination
 * - Getting unread count
 * - Marking notifications as read
 * - Deleting notifications
 */

import express, { Express } from 'express';
import request from 'supertest';
import mongoose from 'mongoose';

// Mock mongoose before importing controllers
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn(),
    connect: jest.fn(),
    connection: {
      close: jest.fn(),
    },
  };
});

// Mock the Notification model
const mockNotificationModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  updateMany: jest.fn(),
  create: jest.fn(),
};

jest.mock('../src/models/Notification', () => mockNotificationModel);

// Mock auth middleware
jest.mock('../src/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = { userId: 'user123', role: 'student' };
      next();
    } else if (req.headers.authorization === 'Bearer admin-token') {
      req.user = { userId: 'admin123', role: 'admin' };
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  },
}));

// Mock validation middleware
jest.mock('../src/middleware/validation', () => ({
  validateNotificationId: (req: any, res: any, next: any) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ errors: [{ msg: 'Invalid notification ID' }] });
    }
    next();
  },
  validateGetNotifications: (req: any, res: any, next: any) => next(),
}));

import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotificationById,
} from '../src/controllers/notificationController';

describe('Notification API', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Simulate auth middleware
    app.use((req: any, res, next) => {
      if (req.headers.authorization === 'Bearer valid-token') {
        req.user = { userId: 'user123', role: 'student' };
      } else if (req.headers.authorization === 'Bearer admin-token') {
        req.user = { userId: 'admin123', role: 'admin' };
      }
      next();
    });

    // Routes
    app.get('/api/notifications', getNotifications);
    app.get('/api/notifications/unread-count', getUnreadCount);
    app.put('/api/notifications/read-all', markAllAsRead);
    app.put('/api/notifications/:id/read', markAsRead);
    app.delete('/api/notifications/:id', deleteNotificationById);

    // Reset mocks
    jest.clearAllMocks();
  });

  // ============================================================================
  // GET NOTIFICATIONS TESTS
  // ============================================================================
  describe('GET /api/notifications', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/notifications');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return paginated notifications for authenticated user', async () => {
      const mockNotifications = [
        {
          _id: 'notif1',
          recipient: 'user123',
          sender: { _id: 'sender1', name: 'John Doe', profilePicture: null },
          type: 'post_liked',
          post: { _id: 'post1', title: 'Test Post' },
          read: false,
          createdAt: new Date(),
        },
        {
          _id: 'notif2',
          recipient: 'user123',
          sender: { _id: 'sender2', name: 'Jane Doe', profilePicture: null },
          type: 'post_commented',
          post: { _id: 'post2', title: 'Another Post' },
          comment: { _id: 'comment1', content: 'Great post!' },
          read: true,
          createdAt: new Date(),
        },
      ];

      // Chain mock methods - need to properly chain two populate calls
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockResolvedValue(mockNotifications),
          })),
        })),
      };
      mockNotificationModel.find.mockReturnValue(mockQuery);
      mockNotificationModel.countDocuments.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.notifications).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should support pagination with page and limit params', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockResolvedValue([]),
          })),
        })),
      };
      mockNotificationModel.find.mockReturnValue(mockQuery);
      mockNotificationModel.countDocuments.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/notifications?page=2&limit=10')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(mockQuery.skip).toHaveBeenCalledWith(10); // (page-1) * limit
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter unread only when unreadOnly=true', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockResolvedValue([]),
          })),
        })),
      };
      mockNotificationModel.find.mockReturnValue(mockQuery);
      mockNotificationModel.countDocuments.mockResolvedValue(0);

      await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', 'Bearer valid-token');

      expect(mockNotificationModel.find).toHaveBeenCalledWith({
        recipient: 'user123',
        read: false,
      });
    });
  });

  // ============================================================================
  // GET UNREAD COUNT TESTS
  // ============================================================================
  describe('GET /api/notifications/unread-count', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/notifications/unread-count');
      expect(response.status).toBe(401);
    });

    it('should return unread count for authenticated user', async () => {
      mockNotificationModel.countDocuments.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(5);
      expect(mockNotificationModel.countDocuments).toHaveBeenCalledWith({
        recipient: 'user123',
        read: false,
      });
    });

    it('should return 0 when no unread notifications', async () => {
      mockNotificationModel.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
    });
  });

  // ============================================================================
  // MARK AS READ TESTS
  // ============================================================================
  describe('PUT /api/notifications/:id/read', () => {
    const validNotificationId = '507f1f77bcf86cd799439011';

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).put(`/api/notifications/${validNotificationId}/read`);
      expect(response.status).toBe(401);
    });

    it('should mark notification as read', async () => {
      const mockNotification = {
        _id: validNotificationId,
        recipient: 'user123',
        read: true,
      };
      mockNotificationModel.findOneAndUpdate.mockResolvedValue(mockNotification);

      const response = await request(app)
        .put(`/api/notifications/${validNotificationId}/read`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Notification marked as read');
      expect(mockNotificationModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: validNotificationId, recipient: 'user123' },
        { read: true },
        { new: true }
      );
    });

    it('should return 404 if notification not found', async () => {
      mockNotificationModel.findOneAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/notifications/${validNotificationId}/read`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Notification not found');
    });

    it('should only allow marking own notifications as read', async () => {
      // This tests that findOneAndUpdate is called with both the notification ID AND recipient
      mockNotificationModel.findOneAndUpdate.mockResolvedValue(null);

      await request(app)
        .put(`/api/notifications/${validNotificationId}/read`)
        .set('Authorization', 'Bearer valid-token');

      // Verify recipient filter is applied
      expect(mockNotificationModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: 'user123' }),
        expect.anything(),
        expect.anything()
      );
    });
  });

  // ============================================================================
  // MARK ALL AS READ TESTS
  // ============================================================================
  describe('PUT /api/notifications/read-all', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).put('/api/notifications/read-all');
      expect(response.status).toBe(401);
    });

    it('should mark all notifications as read', async () => {
      mockNotificationModel.updateMany.mockResolvedValue({ modifiedCount: 10 });

      const response = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('All notifications marked as read');
      expect(response.body.modifiedCount).toBe(10);
      expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
        { recipient: 'user123', read: false },
        { read: true }
      );
    });

    it('should return 0 modified count when no unread notifications', async () => {
      mockNotificationModel.updateMany.mockResolvedValue({ modifiedCount: 0 });

      const response = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.modifiedCount).toBe(0);
    });
  });

  // ============================================================================
  // DELETE NOTIFICATION TESTS
  // ============================================================================
  describe('DELETE /api/notifications/:id', () => {
    const validNotificationId = '507f1f77bcf86cd799439011';

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).delete(`/api/notifications/${validNotificationId}`);
      expect(response.status).toBe(401);
    });

    it('should delete notification', async () => {
      mockNotificationModel.findOneAndDelete.mockResolvedValue({
        _id: validNotificationId,
        recipient: 'user123',
      });

      const response = await request(app)
        .delete(`/api/notifications/${validNotificationId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Notification deleted');
      expect(mockNotificationModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: validNotificationId,
        recipient: 'user123',
      });
    });

    it('should return 404 if notification not found', async () => {
      mockNotificationModel.findOneAndDelete.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/notifications/${validNotificationId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Notification not found');
    });

    it('should only allow deleting own notifications', async () => {
      mockNotificationModel.findOneAndDelete.mockResolvedValue(null);

      await request(app)
        .delete(`/api/notifications/${validNotificationId}`)
        .set('Authorization', 'Bearer valid-token');

      // Verify recipient filter is applied
      expect(mockNotificationModel.findOneAndDelete).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: 'user123' })
      );
    });
  });

  // ============================================================================
  // SECURITY TESTS
  // ============================================================================
  describe('Security', () => {
    it('should not allow access to other users notifications', async () => {
      // User trying to mark another user's notification as read
      const otherUserNotificationId = '507f1f77bcf86cd799439011';
      mockNotificationModel.findOneAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/notifications/${otherUserNotificationId}/read`)
        .set('Authorization', 'Bearer valid-token');

      // Should return 404 because the query filters by recipient
      expect(response.status).toBe(404);
    });

    it('should filter by recipient for all operations', async () => {
      const notificationId = '507f1f77bcf86cd799439011';

      // Test read operation
      mockNotificationModel.findOneAndUpdate.mockResolvedValue(null);
      await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', 'Bearer valid-token');

      expect(mockNotificationModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: 'user123' }),
        expect.anything(),
        expect.anything()
      );

      // Test delete operation
      mockNotificationModel.findOneAndDelete.mockResolvedValue(null);
      await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set('Authorization', 'Bearer valid-token');

      expect(mockNotificationModel.findOneAndDelete).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: 'user123' })
      );
    });
  });
});
