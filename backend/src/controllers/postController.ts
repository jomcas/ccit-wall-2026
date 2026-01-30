import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';
import mongoose from 'mongoose';
import { createNotification, deleteNotification } from '../utils/notificationHelper';

export const createPost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { title, description, category, isAnonymous } = req.body;

    // Process uploaded files (if any)
    let attachments: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      // Construct URLs for uploaded files
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      attachments = (req.files as Express.Multer.File[]).map(
        (file) => `${baseUrl}/uploads/${file.filename}`
      );
    }

    // Teachers can only post public posts (announcements and reminders)
    // Enforce isAnonymous=false for teachers
    const postIsAnonymous = req.user.role === 'teacher' ? false : (isAnonymous === 'true' || isAnonymous === true || false);

    const post = new Post({
      title,
      description,
      author: req.user.userId,
      category,
      isAnonymous: postIsAnonymous,
      attachments,
    });

    await post.save();
    await post.populate('author', '-password');

    res.status(201).json({
      message: 'Post created successfully',
      post,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;
    const filter: any = {};

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    if (category) {
      filter.category = category;
    }

    const posts = await Post.find(filter)
      .populate('author', '-password')
      .populate('comments')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getPostById = async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', '-password')
      .populate('comments');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { title, description, category, isAnonymous } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    post.title = title || post.title;
    post.description = description || post.description;
    post.category = category || post.category;
    
    // Teachers can only post public posts - enforce isAnonymous=false for teachers
    if (req.user.role === 'teacher') {
      post.isAnonymous = false;
    } else if (isAnonymous !== undefined) {
      post.isAnonymous = isAnonymous;
    }

    await post.save();
    await post.populate('author', '-password');

    res.json({ message: 'Post updated successfully', post });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const likePost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userIdStr = req.user.userId.toString();
    const userObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const likeIndex = post.likes.findIndex(id => id.toString() === userIdStr);

    console.log('=== LIKE POST NOTIFICATION DEBUG ===');
    console.log('Post author ID:', post.author.toString());
    console.log('User liking (sender):', userObjectId.toString());
    console.log('Are they the same?', post.author.toString() === userObjectId.toString());

    if (likeIndex > -1) {
      // Unlike - remove the like
      post.likes.splice(likeIndex, 1);
      // Delete the notification
      await deleteNotification({
        recipientId: post.author,
        senderId: userObjectId,
        type: 'post_liked',
        postId: post._id as mongoose.Types.ObjectId,
      });
    } else {
      // Like - add the like
      post.likes.push(userObjectId);
      // Create notification for post author
      await createNotification({
        recipientId: post.author,
        senderId: userObjectId,
        type: 'post_liked',
        postId: post._id as mongoose.Types.ObjectId,
      });
    }

    await post.save();
    res.json({ message: 'Post like toggled', post });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { emoji } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userIdStr = req.user.userId.toString();
    const userObjectId = new mongoose.Types.ObjectId(req.user.userId);
    if (!post.reactions) {
      post.reactions = new Map();
    }

    if (!post.reactions.has(emoji)) {
      post.reactions.set(emoji, []);
    }

    const userReactions = post.reactions.get(emoji) || [];
    const reactionIndex = userReactions.findIndex(id => id.toString() === userIdStr);

    if (reactionIndex > -1) {
      // Remove reaction
      userReactions.splice(reactionIndex, 1);
      // Delete the notification
      await deleteNotification({
        recipientId: post.author,
        senderId: userObjectId,
        type: 'post_reaction',
        postId: post._id as mongoose.Types.ObjectId,
      });
    } else {
      // Add reaction
      userReactions.push(userObjectId);
      // Create notification for post author
      await createNotification({
        recipientId: post.author,
        senderId: userObjectId,
        type: 'post_reaction',
        postId: post._id as mongoose.Types.ObjectId,
        reactionEmoji: emoji,
      });
    }

    post.reactions.set(emoji, userReactions);
    await post.save();

    res.json({ message: 'Reaction added', post });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const sharePost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userIdStr = req.user.userId.toString();
    const userObjectId = new mongoose.Types.ObjectId(req.user.userId);
    const shareIndex = post.shares.findIndex(id => id.toString() === userIdStr);

    if (shareIndex === -1) {
      post.shares.push(userObjectId);
    }

    await post.save();
    res.json({ message: 'Post shared', post });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const searchPosts = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const posts = await Post.find({
      title: { $regex: query, $options: 'i' },
    })
      .populate('author', '-password')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
