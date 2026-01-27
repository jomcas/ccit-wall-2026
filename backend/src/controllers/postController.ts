import { Request, Response } from 'express';
import Post from '../models/Post';
import Comment from '../models/Comment';

export const createPost = async (req: Request, res: Response) => {
  try {
    const { title, description, category, isAnonymous, attachments } = req.body;

    // Teachers can only post public posts (announcements and reminders)
    // Enforce isAnonymous=false for teachers
    const postIsAnonymous = req.user.role === 'teacher' ? false : (isAnonymous || false);

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
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userIdStr = req.user.userId.toString();
    const likeIndex = post.likes.findIndex(id => id.toString() === userIdStr);

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(req.user.userId);
    }

    await post.save();
    res.json({ message: 'Post like toggled', post });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  try {
    const { emoji } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userIdStr = req.user.userId.toString();
    if (!post.reactions) {
      post.reactions = new Map();
    }

    if (!post.reactions.has(emoji)) {
      post.reactions.set(emoji, []);
    }

    const userReactions = post.reactions.get(emoji) || [];
    const reactionIndex = userReactions.findIndex(id => id.toString() === userIdStr);

    if (reactionIndex > -1) {
      userReactions.splice(reactionIndex, 1);
    } else {
      userReactions.push(req.user.userId);
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
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userIdStr = req.user.userId.toString();
    const shareIndex = post.shares.findIndex(id => id.toString() === userIdStr);

    if (shareIndex === -1) {
      post.shares.push(req.user.userId);
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
