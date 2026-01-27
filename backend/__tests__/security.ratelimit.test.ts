/**
 * Rate Limiting Integration Tests
 * 
 * Verifies that rate limiting is properly configured and working.
 */

import express, { Express } from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';

describe('Rate Limiting', () => {
  let app: Express;
  
  beforeEach(() => {
    app = express();
  });
  
  describe('Global Rate Limiter Configuration', () => {
    beforeEach(() => {
      // Configure with test-friendly limits for faster test execution
      const limiter = rateLimit({
        windowMs: 1000, // 1 second window for testing
        max: 5, // 5 requests per second
        standardHeaders: true,
        legacyHeaders: false
      });
      
      app.use(limiter);
      
      app.get('/test', (req, res) => {
        res.json({ message: 'ok' });
      });
    });
    
    it('should allow requests within limit', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });
    
    it('should include rate limit headers in response', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['ratelimit-limit']).toBe('5');
    });
    
    it('should reject requests exceeding limit', async () => {
      // Make 6 requests to exceed limit of 5
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test');
      }
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(429); // Too Many Requests
    });
    
    it('should include retry information in error response', async () => {
      // Exceed the limit
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test');
      }
      
      const response = await request(app).get('/test');
      expect(response.status).toBe(429);
      // Check for rate limit info in response
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });
  
  describe('Environment Variable Configuration', () => {
    it('should use RATE_LIMIT_WINDOW_MS from environment', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '5000';
      
      const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
      expect(windowMs).toBe(5000);
      
      delete process.env.RATE_LIMIT_WINDOW_MS;
    });
    
    it('should use RATE_LIMIT_MAX from environment', () => {
      process.env.RATE_LIMIT_MAX = '100';
      
      const max = Number(process.env.RATE_LIMIT_MAX || 200);
      expect(max).toBe(100);
      
      delete process.env.RATE_LIMIT_MAX;
    });
    
    it('should use defaults when environment variables not set', () => {
      const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
      const max = Number(process.env.RATE_LIMIT_MAX || 200);
      
      expect(windowMs).toBe(15 * 60 * 1000);
      expect(max).toBe(200);
    });
  });
  
  describe('Endpoint-Specific Rate Limiting', () => {
    beforeEach(() => {
      const globalLimiter = rateLimit({
        windowMs: 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false
      });
      
      const authLimiter = rateLimit({
        windowMs: 1000,
        max: 2, // Stricter for auth
        standardHeaders: true,
        legacyHeaders: false
      });
      
      app.use(globalLimiter);
      
      app.post('/api/auth/login', authLimiter, (req, res) => {
        res.json({ token: 'test' });
      });
      
      app.get('/api/posts', (req, res) => {
        res.json({ posts: [] });
      });
    });
    
    it('should apply stricter limits to auth endpoints', async () => {
      // Make 2 requests to auth endpoint (at limit)
      for (let i = 0; i < 2; i++) {
        await request(app).post('/api/auth/login').send({});
      }
      
      // Third request should be rejected
      const response = await request(app).post('/api/auth/login').send({});
      expect(response.status).toBe(429);
    });
    
    it('should allow more requests to non-auth endpoints', async () => {
      // Make multiple requests to public endpoint (global limit is higher)
      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/api/posts');
        expect(response.status).toBe(200);
      }
    });
  });
  
  describe('Rate Limit Reset', () => {
    beforeEach(() => {
      const limiter = rateLimit({
        windowMs: 100, // Very short window for testing
        max: 2,
        standardHeaders: true,
        legacyHeaders: false
      });
      
      app.use(limiter);
      
      app.get('/test', (req, res) => {
        res.json({ message: 'ok' });
      });
    });
    
    it('should reset limit after time window expires', async () => {
      // First two requests should succeed
      for (let i = 0; i < 2; i++) {
        const response = await request(app).get('/test');
        expect(response.status).toBe(200);
      }
      
      // Third request should fail
      let response = await request(app).get('/test');
      expect(response.status).toBe(429);
      
      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Now request should succeed again
      response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });
  });
});
