import { Router } from 'express';
import {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
  likeComment,
} from '../controllers/commentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/posts/:postId/comments', authMiddleware, createComment);
router.get('/posts/:postId/comments', getCommentsByPost);
router.put('/comments/:id', authMiddleware, updateComment);
router.delete('/comments/:id', authMiddleware, deleteComment);
router.post('/comments/:id/like', authMiddleware, likeComment);

export default router;
