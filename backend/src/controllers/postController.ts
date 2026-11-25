import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';
import mongoose from 'mongoose';
import { createNotification, deleteNotification } from '../utils/notificationHelper';
import { uploadFile, deleteFiles } from '../utils/storage';
import { logger } from '../utils/logger';

const ALLOWED_CATEGORIES = ['college-activities', 'general', 'extracurricular'];
const MAX_SEARCH_LENGTH = 100;
const SENSITIVE_AUTHOR_FIELDS = ['firebaseUid', 'authProvider', 'emailVerified', 'password'];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type Viewer = { userId: string; role: string };

/**
 * Convert a post (Mongoose document or plain object) to a safe plain object for the viewer.
 * - Strips sensitive fields from populated authors.
 * - Hides real author identity on anonymous posts unless viewer is the author or an admin.
 */
export const sanitizePostForViewer = (post: any, viewer?: Viewer): any => {
  if (!post) return post;
  const plain: any =
    typeof post.toObject === 'function' ? post.toObject({ flattenMaps: true }) : { ...post };

  const author = plain.author;
  if (author && typeof author === 'object' && !(typeof author.toHexString === 'function')) {
    for (const field of SENSITIVE_AUTHOR_FIELDS) {
      delete author[field];
    }
  }

  if (plain.isAnonymous === true) {
    const authorId =
      typeof author === 'object' && author !== null
        ? String(author._id ?? author.id ?? '')
        : String(author ?? '');
    if (viewer?.role !== 'admin' && viewer?.userId !== authorId) {
      plain.author = { _id: null, name: 'Anonymous', role: 'student' };
    }
  }

  return plain;
};

const handleControllerError = (res: Response, error: unknown, context: string) => {
  const err = error instanceof Error ? error : new Error(String(error));
  if (err.message.startsWith('Unsupported file type') || err.message.startsWith('File too large')) {
    return res.status(400).json({ message: err.message });
  }
  logger.error(context, err);
  return res.status(500).json({ message: 'Internal server error' });
};

export const createPost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { title, description, category, isAnonymous, isAnnouncement, theme } = req.body;

    // Upload files to Firebase Storage (if any)
    let attachments: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      const uploads = await Promise.all(
        (req.files as Express.Multer.File[]).map((file) =>
          uploadFile(file.buffer, file.mimetype, file.originalname)
        )
      );
      attachments = uploads;
    }

    // Teachers can only post public posts (announcements and reminders)
    const postIsAnonymous = req.user.role === 'teacher' ? false : (isAnonymous === 'true' || isAnonymous === true || false);
    const postIsAnnouncement =
      req.user.role === 'teacher' || req.user.role === 'admin'
        ? (isAnnouncement === 'true' || isAnnouncement === true)
        : false;

    const post = new Post({
      title,
      description,
      author: req.user.userId,
      category,
      isAnonymous: postIsAnonymous,
      isAnnouncement: postIsAnnouncement,
      attachments,
      theme: theme || 'none',
    });

    await post.save();
    await post.populate('author', '-password');

    res.status(201).json({
      message: 'Post created successfully',
      post: sanitizePostForViewer(post, req.user),
    });
  } catch (error) {
    handleControllerError(res, error, 'Failed in createPost');
  }
};

export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const { search, category } = req.query;
    const filter: any = {};

    if (category !== undefined && category !== '') {
      if (typeof category !== 'string' || !ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      filter.category = category;
    }

    if (search !== undefined) {
      if (typeof search !== 'string') {
        return res.status(400).json({ message: 'Invalid search query' });
      }
      const term = search.trim().slice(0, MAX_SEARCH_LENGTH);
      if (term.length > 0) {
        filter.title = { $regex: escapeRegex(term), $options: 'i' };
      }
    }

    const posts = await Post.find(filter)
      .populate('author', '-password')
      .populate('comments')
      .sort({ createdAt: -1 });

    res.json(posts.map((p) => sanitizePostForViewer(p, req.user)));
  } catch (error) {
    handleControllerError(res, error, 'Failed in getAllPosts');
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

    res.json(sanitizePostForViewer(post, req.user));
  } catch (error) {
    handleControllerError(res, error, 'Failed in getPostById');
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { title, description, category, isAnonymous, isAnnouncement, existingImages, theme } = req.body;

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
    
    if (theme !== undefined) {
      post.theme = theme;
    }
    
    // Teachers can only post public posts
    if (req.user.role === 'teacher') {
      post.isAnonymous = false;
    } else if (isAnonymous !== undefined) {
      post.isAnonymous = isAnonymous === 'true' || isAnonymous === true;
    }

    if ((req.user.role === 'teacher' || req.user.role === 'admin') && isAnnouncement !== undefined) {
      post.isAnnouncement = isAnnouncement === 'true' || isAnnouncement === true;
    }

    // Handle image updates
    let updatedAttachments: string[] = [];

    // Parse existing images to keep (sent as JSON string or array)
    if (existingImages) {
      try {
        const parsed = typeof existingImages === 'string' 
          ? JSON.parse(existingImages) 
          : existingImages;
        if (Array.isArray(parsed)) {
          // Only allow URLs that are already attached to this post
          const existingSet = new Set<string>(post.attachments || []);
          updatedAttachments = parsed.filter(
            (url: unknown): url is string => typeof url === 'string' && existingSet.has(url)
          );
        }
      } catch {
        // If parsing fails, ignore existingImages
      }
    }

    // Upload new images to Firebase Storage
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const newUrls = await Promise.all(
        (req.files as Express.Multer.File[]).map((file) =>
          uploadFile(file.buffer, file.mimetype, file.originalname)
        )
      );
      updatedAttachments = [...updatedAttachments, ...newUrls];
    }

    // Only update attachments if images were modified
    if (existingImages !== undefined || (req.files && Array.isArray(req.files) && req.files.length > 0)) {
      // Determine which old images were removed and delete from Firebase Storage
      const oldUrls = post.attachments || [];
      const removedUrls = oldUrls.filter((url) => !updatedAttachments.includes(url));
      if (removedUrls.length > 0) {
        await deleteFiles(removedUrls);
      }

      // Limit to 4 images
      post.attachments = updatedAttachments.slice(0, 4);
    }

    await post.save();
    await post.populate('author', '-password');

    res.json({ message: 'Post updated successfully', post: sanitizePostForViewer(post, req.user) });
  } catch (error) {
    handleControllerError(res, error, 'Failed in updatePost');
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

    // Delete attachments from Firebase Storage (best-effort)
    if (post.attachments && post.attachments.length > 0) {
      await deleteFiles(post.attachments);
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    handleControllerError(res, error, 'Failed in deletePost');
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
    res.json({ message: 'Post like toggled', post: sanitizePostForViewer(post, req.user) });
  } catch (error) {
    handleControllerError(res, error, 'Failed in likePost');
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

    res.json({ message: 'Reaction added', post: sanitizePostForViewer(post, req.user) });
  } catch (error) {
    handleControllerError(res, error, 'Failed in addReaction');
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
    res.json({ message: 'Post shared', post: sanitizePostForViewer(post, req.user) });
  } catch (error) {
    handleControllerError(res, error, 'Failed in sharePost');
  }
};

export const searchPosts = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const term = query.trim().slice(0, MAX_SEARCH_LENGTH);

    const posts = await Post.find({
      title: { $regex: escapeRegex(term), $options: 'i' },
    })
      .populate('author', '-password')
      .sort({ createdAt: -1 });

    res.json(posts.map((p) => sanitizePostForViewer(p, req.user)));
  } catch (error) {
    handleControllerError(res, error, 'Failed in searchPosts');
  }
};
