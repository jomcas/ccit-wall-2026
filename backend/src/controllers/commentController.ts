import { Request, Response } from 'express';
import Comment from '../models/Comment';
import Post from '../models/Post';
import mongoose from 'mongoose';
import { createNotification, deleteNotification } from '../utils/notificationHelper';

export const createComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { content } = req.body;
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = new Comment({
      content,
      author: req.user.userId,
      post: postId,
    });

    await comment.save();
    await comment.populate('author', '-password');

    post.comments.push(comment._id);
    await post.save();

    // Create notification for post author (if not commenting on own post)
    const userObjectId = new mongoose.Types.ObjectId(req.user.userId);
    console.log('=== COMMENT NOTIFICATION DEBUG ===');
    console.log('Post author ID:', post.author.toString());
    console.log('Comment author ID (sender):', userObjectId.toString());
    console.log('Are they the same?', post.author.toString() === userObjectId.toString());
    
    await createNotification({
      recipientId: post.author,
      senderId: userObjectId,
      type: 'post_commented',
      postId: post._id as mongoose.Types.ObjectId,
      commentId: comment._id as mongoose.Types.ObjectId,
    });

    res.status(201).json({
      message: 'Comment created successfully',
      comment,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getCommentsByPost = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;

    const comments = await Comment.find({ post: postId })
      .populate('author', '-password')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { content } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    comment.content = content;
    await comment.save();

    res.json({ message: 'Comment updated successfully', comment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(req.params.id);
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: req.params.id },
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const likeComment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const userIdStr = req.user.userId.toString();
    const userObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const likeIndex = comment.likes.findIndex(id => id.toString() === userIdStr);

    if (likeIndex > -1) {
      // Unlike - remove the like
      comment.likes.splice(likeIndex, 1);
      // Delete the notification
      await deleteNotification({
        recipientId: comment.author,
        senderId: userObjectId,
        type: 'comment_liked',
        commentId: comment._id as mongoose.Types.ObjectId,
      });
    } else {
      // Like - add the like
      comment.likes.push(userObjectId);
      // Create notification for comment author
      await createNotification({
        recipientId: comment.author,
        senderId: userObjectId,
        type: 'comment_liked',
        postId: comment.post,
        commentId: comment._id as mongoose.Types.ObjectId,
      });
    }

    await comment.save();
    res.json({ message: 'Comment like toggled', comment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
