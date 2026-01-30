import mongoose from 'mongoose';
import Notification, { NotificationType } from '../models/Notification';
import { logger } from './logger';

interface CreateNotificationParams {
  recipientId: mongoose.Types.ObjectId | string;
  senderId: mongoose.Types.ObjectId | string;
  type: NotificationType;
  postId?: mongoose.Types.ObjectId | string;
  commentId?: mongoose.Types.ObjectId | string;
  reactionEmoji?: string;
}

/**
 * Creates a notification for a user
 * Does NOT create notification if sender === recipient (no self-notifications)
 */
export const createNotification = async (params: CreateNotificationParams): Promise<void> => {
  try {
    const { recipientId, senderId, type, postId, commentId, reactionEmoji } = params;

    // Convert to string for comparison
    const recipientStr = recipientId.toString();
    const senderStr = senderId.toString();

    logger.info(`Creating notification: type=${type}, recipient=${recipientStr}, sender=${senderStr}`);

    // Don't create notification for self-actions
    if (recipientStr === senderStr) {
      logger.info('Skipping notification: self-action');
      return;
    }

    // Check for duplicate notification (same sender, recipient, type, post/comment within last minute)
    // This prevents spam from rapid toggling
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const existingNotification = await Notification.findOne({
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId,
      comment: commentId,
      createdAt: { $gte: oneMinuteAgo },
    });

    if (existingNotification) {
      logger.info('Skipping notification: duplicate within last minute');
      return; // Skip duplicate
    }

    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId,
      comment: commentId,
      reactionEmoji,
    });

    await notification.save();
    logger.info(`Notification created successfully: ${type} for user ${recipientStr}, notification ID: ${notification._id}`);
  } catch (error) {
    // Log error but don't throw - notifications should not break main functionality
    logger.error('Failed to create notification', error instanceof Error ? error : new Error('Unknown error'));
  }
};

/**
 * Deletes notifications when an action is undone (e.g., unlike)
 */
export const deleteNotification = async (params: {
  recipientId: mongoose.Types.ObjectId | string;
  senderId: mongoose.Types.ObjectId | string;
  type: NotificationType;
  postId?: mongoose.Types.ObjectId | string;
  commentId?: mongoose.Types.ObjectId | string;
}): Promise<void> => {
  try {
    const { recipientId, senderId, type, postId, commentId } = params;

    await Notification.deleteMany({
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId,
      comment: commentId,
    });
  } catch (error) {
    logger.error('Failed to delete notification', error instanceof Error ? error : new Error('Unknown error'));
  }
};
