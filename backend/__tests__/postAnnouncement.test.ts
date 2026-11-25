/**
 * Post Announcement Role Authorization Tests
 *
 * Tests createPost and updatePost in postController.ts for isAnnouncement handling:
 * - Teacher creating a post with isAnnouncement: true succeeds with isAnnouncement: true and isAnonymous: false
 * - Admin creating a post with isAnnouncement: 'true' (multipart string) succeeds with isAnnouncement: true
 * - Student creating a post with isAnnouncement: true has isAnnouncement coerced to false
 * - Student updating their post with isAnnouncement: true cannot escalate isAnnouncement to true
 * - Teacher updating their own post can toggle isAnnouncement on and off
 */

import express, { Express } from 'express';
import request from 'supertest';
import multer from 'multer';

// Mock mongoose before importing controllers
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn(),
    connect: jest.fn(),
    connection: {
      close: jest.fn(),
    },
  };
});

// Mock Post model (constructor + static methods)
const mockPostSave = jest.fn();
const mockPostPopulate = jest.fn();
const mockPostFindById = jest.fn();

const mockPostModel: any = jest.fn().mockImplementation((data: Record<string, any>) => {
  const instance: Record<string, any> = {
    _id: '507f1f77bcf86cd799439099',
    ...data,
    save: mockPostSave,
    populate: mockPostPopulate,
  };
  mockPostSave.mockResolvedValue(instance);
  mockPostPopulate.mockResolvedValue(instance);
  return instance;
});

mockPostModel.findById = mockPostFindById;

jest.mock('../src/models/Post', () => ({
  __esModule: true,
  default: mockPostModel,
}));

// Mock Comment model
jest.mock('../src/models/Comment', () => ({
  __esModule: true,
  default: {},
}));

// Mock notification helper
jest.mock('../src/utils/notificationHelper', () => ({
  createNotification: jest.fn().mockResolvedValue(null),
  deleteNotification: jest.fn().mockResolvedValue(null),
}));

// Mock storage utilities
jest.mock('../src/utils/storage', () => ({
  uploadFile: jest.fn().mockResolvedValue('https://storage.example.com/mock-file.png'),
  deleteFiles: jest.fn().mockResolvedValue(undefined),
}));

// Mock firebase
jest.mock('../src/utils/firebase', () => ({
  adminAuth: { verifyIdToken: jest.fn() },
  adminStorage: { name: 'test-bucket', file: jest.fn() },
}));

import { createPost, updatePost } from '../src/controllers/postController';

const testUpload = multer({ storage: multer.memoryStorage() });

describe('Post Announcement Authorization API', () => {
  let app: Express;

  const STUDENT_ID = '507f1f77bcf86cd799439001';
  const TEACHER_ID = '507f1f77bcf86cd799439002';
  const ADMIN_ID = '507f1f77bcf86cd799439003';
  const POST_ID = '507f1f77bcf86cd799439011';

  const createMockPostDoc = (overrides: Record<string, any> = {}) => {
    const doc: Record<string, any> = {
      _id: POST_ID,
      title: 'Original Post Title',
      description: 'Original post description content.',
      author: STUDENT_ID,
      category: 'general',
      isAnonymous: false,
      isAnnouncement: false,
      attachments: [],
      theme: 'none',
      ...overrides,
    };
    doc.save = jest.fn().mockResolvedValue(doc);
    doc.populate = jest.fn().mockResolvedValue(doc);
    return doc;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Simulate auth middleware with student, teacher, and admin tokens
    app.use((req: any, _res, next) => {
      if (req.headers.authorization === 'Bearer student-token') {
        req.user = { userId: STUDENT_ID, role: 'student' };
      } else if (req.headers.authorization === 'Bearer teacher-token') {
        req.user = { userId: TEACHER_ID, role: 'teacher' };
      } else if (req.headers.authorization === 'Bearer admin-token') {
        req.user = { userId: ADMIN_ID, role: 'admin' };
      }
      next();
    });

    app.post('/api/posts', testUpload.array('images', 4), createPost);
    app.put('/api/posts/:id', testUpload.array('images', 4), updatePost);
  });

  // ============================================================================
  // CREATE POST ANNOUNCEMENT TESTS
  // ============================================================================
  describe('POST /api/posts (createPost)', () => {
    it('should return 401 when unauthenticated', async () => {
      const response = await request(app).post('/api/posts').send({
        title: 'Unauthenticated Announcement',
        description: 'Should fail without auth token.',
        category: 'general',
        isAnnouncement: true,
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
      expect(mockPostModel).not.toHaveBeenCalled();
    });

    it('should allow a teacher to create a post with isAnnouncement: true and force isAnonymous: false', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer teacher-token')
        .send({
          title: 'Midterm Lab Schedule Update',
          description: 'CompLab 3 will be used for Friday lab exams.',
          category: 'college-activities',
          isAnnouncement: true,
          isAnonymous: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Post created successfully');
      expect(response.body.post.isAnnouncement).toBe(true);
      expect(response.body.post.isAnonymous).toBe(false);
      expect(mockPostModel).toHaveBeenCalledWith(
        expect.objectContaining({
          author: TEACHER_ID,
          isAnnouncement: true,
          isAnonymous: false,
        })
      );
      expect(mockPostSave).toHaveBeenCalledTimes(1);
      expect(mockPostPopulate).toHaveBeenCalledWith('author', '-password');
    });

    it('should allow an admin to create a post with multipart string isAnnouncement: "true"', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer admin-token')
        .field('title', 'Campus System Maintenance Notice')
        .field('description', 'Portal maintenance runs Saturday from 10 PM to midnight.')
        .field('category', 'college-activities')
        .field('isAnnouncement', 'true')
        .field('isAnonymous', 'false');

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Post created successfully');
      expect(response.body.post.isAnnouncement).toBe(true);
      expect(mockPostModel).toHaveBeenCalledWith(
        expect.objectContaining({
          author: ADMIN_ID,
          isAnnouncement: true,
          isAnonymous: false,
        })
      );
      expect(mockPostSave).toHaveBeenCalledTimes(1);
    });

    it('should coerce isAnnouncement to false when a student creates a post with isAnnouncement: true', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer student-token')
        .send({
          title: 'Student Study Group Post',
          description: 'Reviewing Data Structures at 3F Library.',
          category: 'general',
          isAnnouncement: true,
          isAnonymous: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.post.isAnnouncement).toBe(false);
      expect(response.body.post.isAnonymous).toBe(true);
      expect(mockPostModel).toHaveBeenCalledWith(
        expect.objectContaining({
          author: STUDENT_ID,
          isAnnouncement: false,
          isAnonymous: true,
        })
      );
    });

    it('should coerce multipart string isAnnouncement: "true" to false for students', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer student-token')
        .field('title', 'Student Multipart Attempt')
        .field('description', 'Attempting announcement flag via FormData.')
        .field('category', 'general')
        .field('isAnnouncement', 'true');

      expect(response.status).toBe(201);
      expect(response.body.post.isAnnouncement).toBe(false);
      expect(mockPostModel).toHaveBeenCalledWith(
        expect.objectContaining({
          author: STUDENT_ID,
          isAnnouncement: false,
        })
      );
    });
  });

  // ============================================================================
  // UPDATE POST ANNOUNCEMENT TESTS
  // ============================================================================
  describe('PUT /api/posts/:id (updatePost)', () => {
    it('should prevent a student from escalating isAnnouncement to true on their own post', async () => {
      const studentPost = createMockPostDoc({
        author: STUDENT_ID,
        isAnnouncement: false,
      });
      mockPostFindById.mockResolvedValue(studentPost);

      const response = await request(app)
        .put(`/api/posts/${POST_ID}`)
        .set('Authorization', 'Bearer student-token')
        .send({
          title: 'Updated Student Title',
          isAnnouncement: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Post updated successfully');
      expect(response.body.post.title).toBe('Updated Student Title');
      expect(response.body.post.isAnnouncement).toBe(false);
      expect(studentPost.isAnnouncement).toBe(false);
      expect(studentPost.save).toHaveBeenCalledTimes(1);
    });

    it('should prevent a student from escalating isAnnouncement via multipart string "true"', async () => {
      const studentPost = createMockPostDoc({
        author: STUDENT_ID,
        isAnnouncement: false,
      });
      mockPostFindById.mockResolvedValue(studentPost);

      const response = await request(app)
        .put(`/api/posts/${POST_ID}`)
        .set('Authorization', 'Bearer student-token')
        .field('title', 'Multipart Escalation Attempt')
        .field('isAnnouncement', 'true');

      expect(response.status).toBe(200);
      expect(response.body.post.isAnnouncement).toBe(false);
      expect(studentPost.isAnnouncement).toBe(false);
    });

    it('should allow a teacher to toggle isAnnouncement on and off for their own post', async () => {
      const teacherPost = createMockPostDoc({
        author: TEACHER_ID,
        isAnnouncement: false,
        isAnonymous: false,
      });
      mockPostFindById.mockResolvedValue(teacherPost);

      // Toggle ON (boolean true)
      const enableRes = await request(app)
        .put(`/api/posts/${POST_ID}`)
        .set('Authorization', 'Bearer teacher-token')
        .send({
          isAnnouncement: true,
          isAnonymous: true,
        });

      expect(enableRes.status).toBe(200);
      expect(enableRes.body.post.isAnnouncement).toBe(true);
      expect(enableRes.body.post.isAnonymous).toBe(false);
      expect(teacherPost.isAnnouncement).toBe(true);

      // Toggle OFF (multipart string 'false')
      const disableRes = await request(app)
        .put(`/api/posts/${POST_ID}`)
        .set('Authorization', 'Bearer teacher-token')
        .field('isAnnouncement', 'false');

      expect(disableRes.status).toBe(200);
      expect(disableRes.body.post.isAnnouncement).toBe(false);
      expect(disableRes.body.post.isAnonymous).toBe(false);
      expect(teacherPost.isAnnouncement).toBe(false);
      expect(teacherPost.save).toHaveBeenCalledTimes(2);
    });

    it('should return 403 when a teacher tries to update another user post', async () => {
      const studentPost = createMockPostDoc({
        author: STUDENT_ID,
        isAnnouncement: false,
      });
      mockPostFindById.mockResolvedValue(studentPost);

      const response = await request(app)
        .put(`/api/posts/${POST_ID}`)
        .set('Authorization', 'Bearer teacher-token')
        .send({ isAnnouncement: true });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Not authorized to update this post');
      expect(studentPost.save).not.toHaveBeenCalled();
    });
  });
});
