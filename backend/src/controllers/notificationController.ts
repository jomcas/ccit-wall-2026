import { Request, Response } from 'express';
import Notification from '../models/Notification';

/**
 * Get notifications for the authenticated user
 * GET /api/notifications
 * Query params: page (default 1), limit (default 20), unreadOnly (default false)
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';
    const skip = (page - 1) * limit;

    const query: any = { recipient: req.user.userId };
    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name profilePicture')
        .populate('post', 'title')
        .populate('comment', 'content'),
      Notification.countDocuments(query),
    ]);

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (error) {
    console.error('Failed to get notifications', error);
    res.status(500).json({ message: 'Failed to get notifications' });
  }
};

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const count = await Notification.countDocuments({
      recipient: req.user.userId,
      read: false,
    });

    res.json({ count });
  } catch (error) {
    console.error('Failed to get unread count', error);
    res.status(500).json({ message: 'Failed to get unread count' });
  }
};

/**
 * Mark a single notification as read
 * PUT /api/notifications/:id/read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Failed to mark notification as read', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await Notification.updateMany(
      { recipient: req.user.userId, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error('Failed to mark all notifications as read', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
};

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
export const deleteNotificationById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Failed to delete notification', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
};
