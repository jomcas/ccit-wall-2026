import { Request, Response } from 'express';
import User from '../models/User';
import Post from '../models/Post';

export const getActivityDashboard = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const studentCount = await User.countDocuments({ role: 'student' });
    const teacherCount = await User.countDocuments({ role: 'teacher' });

    const recentPosts = await Post.find()
      .populate('author', '-password')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totalUsers,
      totalPosts,
      studentCount,
      teacherCount,
      recentPosts,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getUserActivityLog = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const userPosts = await Post.find({ author: userId })
      .populate('author', '-password')
      .sort({ createdAt: -1 });

    res.json({
      userId,
      posts: userPosts,
      postCount: userPosts.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    const users = await User.find({
      name: { $regex: query, $options: 'i' },
    }).select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const searchPosts = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

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
