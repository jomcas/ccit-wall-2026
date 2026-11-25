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
  validateGetPostsQuery,
} from '../middleware/validation';
import upload, { verifyUploadedImages } from '../middleware/upload';

const router = Router();

// Create post with image upload support (up to 4 images)
// Note: upload.array() must come before validateCreatePost since it parses multipart/form-data
router.post('/posts', authMiddleware, upload.array('images', 4), verifyUploadedImages, validateCreatePost, createPost);

// Get all posts 
router.get('/posts', authMiddleware, validateGetPostsQuery, getAllPosts);

// Search posts with query validation
router.get('/posts/search', authMiddleware, validateSearchQuery, searchPosts);

// Get single post with ID validation
router.get('/posts/:id', authMiddleware, validatePostId, getPostById);

// Update post with validation and image upload support
router.put('/posts/:id', authMiddleware, upload.array('images', 4), verifyUploadedImages, validatePostId, validateUpdatePost, updatePost);

// Delete post with ID validation
router.delete('/posts/:id', authMiddleware, validatePostId, deletePost);

// Like post with ID validation
router.post('/posts/:id/like', authMiddleware, validatePostId, likePost);

// Add reaction with validation
router.post('/posts/:id/reaction', authMiddleware, validateReaction, addReaction);

// Share post with ID validation
router.post('/posts/:id/share', authMiddleware, validatePostId, sharePost);

export default router;
