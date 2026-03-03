import request from 'supertest';
import express from 'express';
import {
  validateCreatePost,
  validateCreateComment,
  validateObjectId,
  validateSearchQuery,
} from '../src/middleware/validation';

// Create a minimal Express app for testing validation middleware
const createTestApp = (middleware: any[], mockHandler?: any) => {
  const app = express();
  app.use(express.json());
  app.post('/test', ...middleware, mockHandler || ((req: any, res: any) => res.json({ success: true })));
  app.get('/test', ...middleware, mockHandler || ((req: any, res: any) => res.json({ success: true })));
  app.get('/test/:id', ...middleware, mockHandler || ((req: any, res: any) => res.json({ success: true })));
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
});
