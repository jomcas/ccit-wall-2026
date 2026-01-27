import axios, { AxiosRequestConfig } from 'axios';
import {
  mockUsers,
  mockPosts,
  mockComments,
  mockAuthResponse,
} from './mockData';
import { User, Post, Comment, AuthResponse } from '../types';

// Use mock data if environment variable is set
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true';

// Simulated delay for mock responses
const MOCK_DELAY = 300;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock API Service
export const mockApiService = {
  register: async (
    name: string,
    email: string,
    password: string,
    role: string
  ) => {
    await delay(MOCK_DELAY);
    const newUser: User = {
      id: Math.random().toString(),
      name,
      email,
      role: role as any,
      profilePicture: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
    };
    const response: AuthResponse = {
      message: 'User registered successfully',
      token: 'mock_token_' + Math.random().toString(36).substr(2, 9),
      user: newUser,
    };
    return { data: response };
  },

  login: async (email: string, password: string) => {
    await delay(MOCK_DELAY);
    const user = mockUsers.find((u) => u.email === email);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return {
      data: {
        message: 'Login successful',
        token: 'mock_token_' + Math.random().toString(36).substr(2, 9),
        user,
      },
    };
  },

  getProfile: async () => {
    await delay(MOCK_DELAY);
    return { data: mockUsers[0] };
  },

  updateProfile: async (data: any) => {
    await delay(MOCK_DELAY);
    const updated = { ...mockUsers[0], ...data };
    return { data: { message: 'Profile updated successfully', user: updated } };
  },

  getAllPosts: async (search?: string, category?: string) => {
    await delay(MOCK_DELAY);
    let posts = [...mockPosts];

    if (search) {
      posts = posts.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      posts = posts.filter((p) => p.category === category);
    }

    return { data: posts };
  },

  getPostById: async (id: string) => {
    await delay(MOCK_DELAY);
    const post = mockPosts.find((p) => p.id === id);
    return { data: post };
  },

  createPost: async (data: any) => {
    await delay(MOCK_DELAY);
    const newPost: Post = {
      id: Math.random().toString(),
      ...data,
      author: mockUsers[0],
      likes: [],
      reactions: new Map(),
      comments: [],
      shares: [],
      createdAt: new Date(),
    };
    mockPosts.unshift(newPost);
    return { data: { message: 'Post created successfully', post: newPost } };
  },

  updatePost: async (id: string, data: any) => {
    await delay(MOCK_DELAY);
    const post = mockPosts.find((p) => p.id === id);
    if (!post) throw new Error('Post not found');
    Object.assign(post, data);
    return { data: { message: 'Post updated successfully', post } };
  },

  deletePost: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = mockPosts.findIndex((p) => p.id === id);
    if (index > -1) {
      mockPosts.splice(index, 1);
    }
    return { data: { message: 'Post deleted successfully' } };
  },

  likePost: async (id: string) => {
    await delay(MOCK_DELAY);
    const post = mockPosts.find((p) => p.id === id);
    if (!post) throw new Error('Post not found');

    const userId = mockUsers[0].id || '1';
    const likeIndex = post.likes.indexOf(userId);

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(userId);
    }

    return { data: { message: 'Post like toggled', post } };
  },

  addReaction: async (id: string, emoji: string) => {
    await delay(MOCK_DELAY);
    const post = mockPosts.find((p) => p.id === id);
    if (!post) throw new Error('Post not found');

    const userId = mockUsers[0].id || '1';
    if (!post.reactions.has(emoji)) {
      post.reactions.set(emoji, []);
    }

    const reactions = post.reactions.get(emoji) || [];
    const reactionIndex = reactions.indexOf(userId);

    if (reactionIndex > -1) {
      reactions.splice(reactionIndex, 1);
    } else {
      reactions.push(userId);
    }

    post.reactions.set(emoji, reactions);
    return { data: { message: 'Reaction added', post } };
  },

  sharePost: async (id: string) => {
    await delay(MOCK_DELAY);
    const post = mockPosts.find((p) => p.id === id);
    if (!post) throw new Error('Post not found');

    const userId = mockUsers[0].id || '1';
    if (!post.shares.includes(userId)) {
      post.shares.push(userId);
    }

    return { data: { message: 'Post shared', post } };
  },

  createComment: async (postId: string, content: string) => {
    await delay(MOCK_DELAY);
    const comment: Comment = {
      id: Math.random().toString(),
      content,
      author: mockUsers[0],
      post: postId,
      likes: [],
      createdAt: new Date(),
    };
    mockComments.push(comment);

    const post = mockPosts.find((p) => p.id === postId);
    if (post) {
      post.comments.push(comment);
    }

    return { data: { message: 'Comment created successfully', comment } };
  },

  getComments: async (postId: string) => {
    await delay(MOCK_DELAY);
    const comments = mockComments.filter((c) => c.post === postId);
    return { data: comments };
  },

  updateComment: async (id: string, content: string) => {
    await delay(MOCK_DELAY);
    const comment = mockComments.find((c) => c.id === id);
    if (!comment) throw new Error('Comment not found');
    comment.content = content;
    return { data: { message: 'Comment updated successfully', comment } };
  },

  deleteComment: async (id: string) => {
    await delay(MOCK_DELAY);
    const index = mockComments.findIndex((c) => c.id === id);
    if (index > -1) {
      mockComments.splice(index, 1);
    }
    return { data: { message: 'Comment deleted successfully' } };
  },

  likeComment: async (id: string) => {
    await delay(MOCK_DELAY);
    const comment = mockComments.find((c) => c.id === id);
    if (!comment) throw new Error('Comment not found');

    const userId = mockUsers[0].id || '1';
    const likeIndex = comment.likes.indexOf(userId);

    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(userId);
    }

    return { data: { message: 'Comment like toggled', comment } };
  },

  getAllUsers: async () => {
    await delay(MOCK_DELAY);
    return { data: mockUsers };
  },

  getUserById: async (id: string) => {
    await delay(MOCK_DELAY);
    const user = mockUsers.find((u) => u.id === id);
    return { data: user };
  },

  getDashboard: async () => {
    await delay(MOCK_DELAY);
    return {
      data: {
        totalUsers: mockUsers.length,
        totalPosts: mockPosts.length,
        studentCount: mockUsers.filter((u) => u.role === 'student').length,
        teacherCount: mockUsers.filter((u) => u.role === 'teacher').length,
        recentPosts: mockPosts.slice(0, 10),
      },
    };
  },

  getUserActivity: async (userId: string) => {
    await delay(MOCK_DELAY);
    const userPosts = mockPosts.filter((p) => p.author.id === userId);
    return {
      data: {
        userId,
        posts: userPosts,
        postCount: userPosts.length,
      },
    };
  },

  searchUsers: async (query: string) => {
    await delay(MOCK_DELAY);
    const users = mockUsers.filter((u) =>
      u.name.toLowerCase().includes(query.toLowerCase())
    );
    return { data: users };
  },

  searchPosts: async (query: string) => {
    await delay(MOCK_DELAY);
    const posts = mockPosts.filter((p) =>
      p.title.toLowerCase().includes(query.toLowerCase())
    );
    return { data: posts };
  },
 
  adminSearchUsers: async (query: string) => {
    await delay(MOCK_DELAY);
    const users = mockUsers.filter((u) =>
      u.name.toLowerCase().includes(query.toLowerCase())
    );
    return { data: users };
  },

  adminSearchPosts: async (query: string) => {
    await delay(MOCK_DELAY);
    const posts = mockPosts.filter((p) =>
      p.title.toLowerCase().includes(query.toLowerCase())
    );
    return { data: posts };
  },
};
