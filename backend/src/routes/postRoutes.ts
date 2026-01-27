import { Router } from 'express';
import {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  addReaction,
  sharePost,
  searchPosts,
} from '../controllers/postController';
import { authMiddleware } from '../middleware/auth';
import {
  validateCreatePost,
  validateUpdatePost,
  validatePostId,
  validateReaction,
  validateSearchQuery,
} from '../middleware/validation';

const router = Router();

// Create post with validation
router.post('/posts', authMiddleware, validateCreatePost, createPost);

// Get all posts (public)
router.get('/posts', getAllPosts);

// Search posts with query validation
router.get('/posts/search', authMiddleware, validateSearchQuery, searchPosts);

// Get single post with ID validation
router.get('/posts/:id', validatePostId, getPostById);

// Update post with validation
router.put('/posts/:id', authMiddleware, validatePostId, validateUpdatePost, updatePost);

// Delete post with ID validation
router.delete('/posts/:id', authMiddleware, validatePostId, deletePost);

// Like post with ID validation
router.post('/posts/:id/like', authMiddleware, validatePostId, likePost);

// Add reaction with validation
router.post('/posts/:id/reaction', authMiddleware, validateReaction, addReaction);

// Share post with ID validation
router.post('/posts/:id/share', authMiddleware, validatePostId, sharePost);

export default router;
