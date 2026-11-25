import request from 'supertest';
import express from 'express';
import {
  validateCreatePost,
  validateUpdatePost,
  validateCreateComment,
  validateObjectId,
  validateUserIdParam,
  validateSearchQuery,
  validateGetPostsQuery,
  validateSyncProfile,
  validateProfileUpdate,
  validateReaction,
} from '../src/middleware/validation';

// Create a minimal Express app for testing validation middleware
const createTestApp = (middleware: any[], mockHandler?: any) => {
  const app = express();
  app.use(express.json());
  app.post('/test', ...middleware, mockHandler || ((req: any, res: any) => res.json({ success: true, body: req.body, query: req.query })));
  app.put('/test', ...middleware, mockHandler || ((req: any, res: any) => res.json({ success: true, body: req.body })));
  app.get('/test', ...middleware, mockHandler || ((req: any, res: any) => res.json({ success: true, query: req.query })));
  app.get('/test/:id', ...middleware, mockHandler || ((req: any, res: any) => res.json({ success: true })));
  app.get('/users/:userId', ...middleware, mockHandler || ((req: any, res: any) => res.json({ success: true })));
  app.post('/test/:id/reaction', ...middleware, mockHandler || ((req: any, res: any) => res.json({ success: true, body: req.body })));
  app.post('/test/:postId/comments', ...middleware, mockHandler || ((req: any, res: any) => res.json({ success: true })));
  return app;
};

describe('Input Validation Security Tests', () => {
  
  // ============================================================================
  // POST VALIDATION TESTS
  // ============================================================================
  describe('Create Post Validation', () => {
    const app = createTestApp(validateCreatePost);

    it('should reject post with missing title', async () => {
      const response = await request(app)
        .post('/test')
        .send({ description: 'Test description', category: 'general' });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.path === 'title')).toBe(true);
    });

    it('should reject post with missing description', async () => {
      const response = await request(app)
        .post('/test')
        .send({ title: 'Test title', category: 'general' });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.path === 'description')).toBe(true);
    });

    it('should reject post with invalid category', async () => {
      const response = await request(app)
        .post('/test')
        .send({ title: 'Test title', description: 'Test description', category: 'invalid-category' });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.path === 'category')).toBe(true);
    });

    it('should reject post with title exceeding max length', async () => {
      const response = await request(app)
        .post('/test')
        .send({ title: 'a'.repeat(201), description: 'Test description', category: 'general' });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.path === 'title')).toBe(true);
    });

    it('should accept valid post data', async () => {
      const response = await request(app)
        .post('/test')
        .send({ title: 'Test title', description: 'Test description', category: 'general' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept valid post with all optional fields', async () => {
      const response = await request(app)
        .post('/test')
        .send({ 
          title: 'Test title', 
          description: 'Test description', 
          category: 'college-activities',
          isAnonymous: true,
          attachments: ['https://example.com/image.png']
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================================
  // MONGODB OBJECTID VALIDATION TESTS
  // ============================================================================
  describe('ObjectId Validation', () => {
    const app = createTestApp(validateObjectId);

    it('should reject invalid MongoDB ObjectId', async () => {
      const response = await request(app)
        .get('/test/invalid-id');
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.path === 'id')).toBe(true);
    });

    it('should accept valid MongoDB ObjectId', async () => {
      const response = await request(app)
        .get('/test/507f1f77bcf86cd799439011');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================================
  // SEARCH QUERY VALIDATION TESTS
  // ============================================================================
  describe('Search Query Validation', () => {
    const app = createTestApp(validateSearchQuery);

    it('should reject search with missing query parameter', async () => {
      const response = await request(app)
        .get('/test');
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.path === 'query')).toBe(true);
    });

    it('should reject search with empty query', async () => {
      const response = await request(app)
        .get('/test?query=');
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.path === 'query')).toBe(true);
    });

    it('should reject search query exceeding max length', async () => {
      const response = await request(app)
        .get('/test?query=' + 'a'.repeat(101));
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.path === 'query')).toBe(true);
    });

    it('should accept valid search query', async () => {
      const response = await request(app)
        .get('/test?query=test');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should sanitize search query to prevent XSS', async () => {
      const mockHandler = (req: any, res: any) => res.json({ query: req.query.query });
      const appWithHandler = express();
      appWithHandler.use(express.json());
      appWithHandler.get('/test', ...validateSearchQuery, mockHandler);
      
      const response = await request(appWithHandler)
        .get('/test?query=<script>alert("xss")</script>');
      
      expect(response.status).toBe(200);
      // The query should be escaped
      expect(response.body.query).not.toContain('<script>');
    });
  });

  // ============================================================================
  // COMMENT VALIDATION TESTS
  // ============================================================================
  describe('Create Comment Validation', () => {
    const app = createTestApp(validateCreateComment);

    it('should reject comment with missing content', async () => {
      const response = await request(app)
        .post('/test/507f1f77bcf86cd799439011/comments')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.path === 'content')).toBe(true);
    });

    it('should reject comment with invalid post ID', async () => {
      const response = await request(app)
        .post('/test/invalid-id/comments')
        .send({ content: 'Test comment' });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.path === 'postId')).toBe(true);
    });

    it('should reject comment exceeding max length', async () => {
      const response = await request(app)
        .post('/test/507f1f77bcf86cd799439011/comments')
        .send({ content: 'a'.repeat(2001) });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.some((e: any) => e.path === 'content')).toBe(true);
    });

    it('should accept valid comment', async () => {
      const response = await request(app)
        .post('/test/507f1f77bcf86cd799439011/comments')
        .send({ content: 'This is a valid comment' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================================
  // REACTION VALIDATION TESTS
  // ============================================================================
  describe('Reaction Validation', () => {
    const app = createTestApp(validateReaction);

    it('should accept quick reaction emojis and legacy reaction names', async () => {
      for (const emoji of ['🔥', '👏', '💡', '👍', '❤️', 'like']) {
        const response = await request(app)
          .post('/test/507f1f77bcf86cd799439011/reaction')
          .send({ emoji });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it('should reject missing emoji field', async () => {
      const response = await request(app)
        .post('/test/507f1f77bcf86cd799439011/reaction')
        .send({ reactionType: 'like' });

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'emoji')).toBe(true);
    });

    it('should reject emoji not in allowlist', async () => {
      const response = await request(app)
        .post('/test/507f1f77bcf86cd799439011/reaction')
        .send({ emoji: '💀' });

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'emoji')).toBe(true);
    });

    it('should reject invalid post ID in reaction request', async () => {
      const response = await request(app)
        .post('/test/not-an-id/reaction')
        .send({ emoji: '🔥' });

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'id')).toBe(true);
    });
  });

  // ============================================================================
  // ISANNOUNCEMENT & UNESCAPED STORED TEXT TESTS
  // ============================================================================
  describe('Post isAnnouncement & Stored Text Validation', () => {
    const createApp = createTestApp(validateCreatePost);
    const updateApp = createTestApp(validateUpdatePost);

    it('should convert FormData string isAnnouncement to boolean on create', async () => {
      const response = await request(createApp)
        .post('/test')
        .send({
          title: "Dean's List & Honors",
          description: 'Congrats everyone',
          category: 'college-activities',
          isAnnouncement: 'true',
        });

      expect(response.status).toBe(200);
      expect(response.body.body.isAnnouncement).toBe(true);
      // Stored title should not be HTML-escaped
      expect(response.body.body.title).toBe("Dean's List & Honors");
    });

    it('should reject non-boolean isAnnouncement on create', async () => {
      const response = await request(createApp)
        .post('/test')
        .send({
          title: 'Valid title',
          description: 'Valid description',
          category: 'general',
          isAnnouncement: 'not-a-bool',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'isAnnouncement')).toBe(true);
    });

    it('should convert FormData string isAnnouncement to boolean on update', async () => {
      const response = await request(updateApp)
        .put('/test')
        .send({ isAnnouncement: 'false', title: "Q&A Session's Notes" });

      expect(response.status).toBe(200);
      expect(response.body.body.isAnnouncement).toBe(false);
      expect(response.body.body.title).toBe("Q&A Session's Notes");
    });

    it('should reject invalid isAnnouncement on update', async () => {
      const response = await request(updateApp)
        .put('/test')
        .send({ isAnnouncement: 'maybe' });

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'isAnnouncement')).toBe(true);
    });
  });

  // ============================================================================
  // GET POSTS QUERY VALIDATION TESTS
  // ============================================================================
  describe('Get Posts Query Validation', () => {
    const app = createTestApp(validateGetPostsQuery);

    it('should accept empty query parameters', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    it('should accept valid category and trimmed search query', async () => {
      const response = await request(app)
        .get('/test?category=college-activities&search=%20hackathon%20');

      expect(response.status).toBe(200);
      expect(response.body.query.search).toBe('hackathon');
    });

    it('should reject invalid category in query', async () => {
      const response = await request(app).get('/test?category=unknown');

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'category')).toBe(true);
    });

    it('should reject search query exceeding 100 characters', async () => {
      const response = await request(app).get('/test?search=' + 'a'.repeat(101));

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'search')).toBe(true);
    });
  });

  // ============================================================================
  // USER ID PARAM VALIDATION TESTS
  // ============================================================================
  describe('User ID Param Validation', () => {
    const app = createTestApp(validateUserIdParam);

    it('should accept valid MongoDB userId parameter', async () => {
      const response = await request(app).get('/users/507f1f77bcf86cd799439011');
      expect(response.status).toBe(200);
    });

    it('should reject invalid MongoDB userId parameter', async () => {
      const response = await request(app).get('/users/not-valid-id');

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'userId')).toBe(true);
    });
  });

  // ============================================================================
  // SYNC PROFILE VALIDATION TESTS
  // ============================================================================
  describe('Sync Profile Validation', () => {
    const app = createTestApp(validateSyncProfile);

    it('should accept request with no name', async () => {
      const response = await request(app).post('/test').send({});
      expect(response.status).toBe(200);
    });

    it('should accept valid trimmed name', async () => {
      const response = await request(app).post('/test').send({ name: '  Juan Dela Cruz  ' });
      expect(response.status).toBe(200);
      expect(response.body.body.name).toBe('Juan Dela Cruz');
    });

    it('should reject whitespace-only name', async () => {
      const response = await request(app).post('/test').send({ name: '   ' });
      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'name')).toBe(true);
    });

    it('should reject name exceeding 100 characters', async () => {
      const response = await request(app).post('/test').send({ name: 'a'.repeat(101) });
      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'name')).toBe(true);
    });
  });

  // ============================================================================
  // PROFILE UPDATE & PROFILE PICTURE URL HARDENING TESTS
  // ============================================================================
  describe('Profile Update Validation', () => {
    const app = createTestApp(validateProfileUpdate);

    afterEach(() => {
      delete process.env.ALLOWED_IMAGE_HOSTS;
    });

    it('should accept trusted HTTPS profilePicture hosts and preserve unescaped text', async () => {
      const response = await request(app)
        .put('/test')
        .send({
          name: "O'Connor & Co.",
          contactInformation: 'Room 402 & Lab B',
          profilePicture: 'https://storage.googleapis.com/ccit-wall/avatars/user1.png',
        });

      expect(response.status).toBe(200);
      expect(response.body.body.name).toBe("O'Connor & Co.");
      expect(response.body.body.contactInformation).toBe('Room 402 & Lab B');
    });

    it('should accept hosts listed in ALLOWED_IMAGE_HOSTS', async () => {
      process.env.ALLOWED_IMAGE_HOSTS = 'cdn.ccit-wall.edu.ph, images.example.org';
      const response = await request(app)
        .put('/test')
        .send({
          profilePicture: 'https://cdn.ccit-wall.edu.ph/u/avatar.jpg',
        });

      expect(response.status).toBe(200);
    });

    it('should reject non-HTTPS profilePicture URLs', async () => {
      const response = await request(app)
        .put('/test')
        .send({
          profilePicture: 'http://storage.googleapis.com/ccit-wall/avatar.png',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'profilePicture')).toBe(true);
    });

    it('should reject untrusted profilePicture hostnames', async () => {
      const response = await request(app)
        .put('/test')
        .send({
          profilePicture: 'https://evil.example.com/tracker.png',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'profilePicture')).toBe(true);
    });

    it('should reject userinfo URL spoofing attempts', async () => {
      const response = await request(app)
        .put('/test')
        .send({
          profilePicture: 'https://storage.googleapis.com@evil.example.com/avatar.png',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors.some((e: any) => e.path === 'profilePicture')).toBe(true);
    });
  });
});
