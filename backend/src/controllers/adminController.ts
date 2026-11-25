import { Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';
import { logger } from '../utils/logger';

/** Safe projection for user documents embedded in admin responses (no firebaseUid). */
const PUBLIC_USER_SELECT = '_id name email role bio profilePicture contactInformation createdAt updatedAt';

/** Admin user-search projection: admins may see verification/provider, never firebaseUid. */
const ADMIN_USER_SELECT = '-password -firebaseUid -__v';

/** Maximum accepted length for search queries (ReDoS / DoS hardening). */
const MAX_SEARCH_QUERY_LENGTH = 100;

/** Maximum number of results returned by an admin search. */
const MAX_SEARCH_RESULTS = 100;

/** Escape user input so it is matched literally inside a MongoDB $regex. */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Returns an escaped, length-capped regex source or null when the query is invalid. */
const toSafeSearchPattern = (query: unknown): string | null => {
  if (typeof query !== 'string' || query.trim().length === 0) return null;
  return escapeRegex(query.trim().slice(0, MAX_SEARCH_QUERY_LENGTH));
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error('Unknown error');

export const getActivityDashboard = async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalPosts, studentCount, teacherCount, recentPosts] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      Post.find()
        .populate('author', PUBLIC_USER_SELECT)
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    res.json({
      totalUsers,
      totalPosts,
      studentCount,
      teacherCount,
      recentPosts,
    });
  } catch (error) {
    logger.error('Admin dashboard fetch failed', toError(error), { userId: req.user?.userId });
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserActivityLog = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const userPosts = await Post.find({ author: userId })
      .populate('author', PUBLIC_USER_SELECT)
      .sort({ createdAt: -1 });

    res.json({
      userId,
      posts: userPosts,
      postCount: userPosts.length,
    });
  } catch (error) {
    logger.error('Admin user activity fetch failed', toError(error), { userId: req.user?.userId });
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const pattern = toSafeSearchPattern(req.query.query);
    if (pattern === null) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await User.find({
      name: { $regex: pattern, $options: 'i' },
    })
      .select(ADMIN_USER_SELECT)
      .limit(MAX_SEARCH_RESULTS);

    res.json(users);
  } catch (error) {
    logger.error('Admin user search failed', toError(error), { userId: req.user?.userId });
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchPosts = async (req: Request, res: Response) => {
  try {
    const pattern = toSafeSearchPattern(req.query.query);
    if (pattern === null) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const posts = await Post.find({
      title: { $regex: pattern, $options: 'i' },
    })
      .populate('author', PUBLIC_USER_SELECT)
      .sort({ createdAt: -1 })
      .limit(MAX_SEARCH_RESULTS);

    res.json(posts);
  } catch (error) {
    logger.error('Admin post search failed', toError(error), { userId: req.user?.userId });
    res.status(500).json({ message: 'Internal server error' });
  }
};
