import { Router } from 'express';
import {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
  likeComment,
} from '../controllers/commentController';
import { authMiddleware } from '../middleware/auth';
import {
  validateCreateComment,
  validateUpdateComment,
  validateCommentId,
  validatePostIdParam,
} from '../middleware/validation';

const router = Router();

// Create comment with validation
router.post('/posts/:postId/comments', authMiddleware, validateCreateComment, createComment);

// Get comments by post with validation
router.get('/posts/:postId/comments', validatePostIdParam, getCommentsByPost);

// Update comment with validation
router.put('/comments/:id', authMiddleware, validateUpdateComment, updateComment);

// Delete comment with ID validation
router.delete('/comments/:id', authMiddleware, validateCommentId, deleteComment);

// Like comment with ID validation
router.post('/comments/:id/like', authMiddleware, validateCommentId, likeComment);

export default router;
