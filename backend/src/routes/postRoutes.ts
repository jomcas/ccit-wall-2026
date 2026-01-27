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

const router = Router();

router.post('/posts', authMiddleware, createPost);
router.get('/posts', getAllPosts);
router.get('/posts/search', authMiddleware, searchPosts);
router.get('/posts/:id', getPostById);
router.put('/posts/:id', authMiddleware, updatePost);
router.delete('/posts/:id', authMiddleware, deletePost);
router.post('/posts/:id/like', authMiddleware, likePost);
router.post('/posts/:id/reaction', authMiddleware, addReaction);
router.post('/posts/:id/share', authMiddleware, sharePost);

export default router;
