/**
 * HTTP Method Restriction Tests
 * 
 * Verifies that only allowed HTTP methods are permitted.
 */

import express, { Express } from 'express';
import request from 'supertest';
import { restrictHttpMethods } from '../src/middleware/security';

describe('HTTP Method Restriction', () => {
  let app: Express;
  
  beforeEach(() => {
    app = express();
    app.use(restrictHttpMethods);
    
    // Test route that supports multiple methods
    app.get('/test', (req, res) => res.json({ method: 'GET' }));
    app.post('/test', (req, res) => res.json({ method: 'POST' }));
    app.head('/test', (req, res) => res.send());
    app.options('/test', (req, res) => res.send());
    
    // Catch disallowed methods
    app.all('/test', (req, res) => {
      res.status(405).json({ error: 'Method Not Allowed' });
    });
  });
  
  describe('Allowed Methods', () => {
    it('should allow GET requests', async () => {
      const response = await request(app).get('/test');
      expect(response.status).not.toBe(405);
    });
    
    it('should allow POST requests', async () => {
      const response = await request(app).post('/test');
      expect(response.status).not.toBe(405);
    });
    
    it('should allow HEAD requests', async () => {
      const response = await request(app).head('/test');
      expect(response.status).not.toBe(405);
    });
  });
  
  describe('Disallowed Methods', () => {
    it('should block DELETE requests with 405', async () => {
      const response = await request(app).delete('/test');
      expect(response.status).toBe(405);
      expect(response.body.error).toBe('Method Not Allowed');
    });
    
    it('should block PUT requests with 405', async () => {
      const response = await request(app).put('/test');
      expect(response.status).toBe(405);
      expect(response.body.error).toBe('Method Not Allowed');
    });
    
    it('should block PATCH requests with 405', async () => {
      const response = await request(app).patch('/test');
      expect(response.status).toBe(405);
      expect(response.body.error).toBe('Method Not Allowed');
    });
    
    it('should block TRACE requests with 405', async () => {
      const response = await request(app).trace('/test');
      expect(response.status).toBe(405);
      expect(response.body.error).toBe('Method Not Allowed');
    });
  });
  
  describe('CORS OPTIONS Method', () => {
    let appWithCors: Express;
    
    beforeEach(() => {
      // Set ENABLE_CORS to allow OPTIONS
      process.env.ENABLE_CORS = 'true';
      
      appWithCors = express();
      appWithCors.use(restrictHttpMethods);
      
      appWithCors.get('/test', (req, res) => res.json({ method: 'GET' }));
      appWithCors.options('/test', (req, res) => res.send());
    });
    
    afterEach(() => {
      delete process.env.ENABLE_CORS;
    });
    
    it('should allow OPTIONS when CORS is enabled', async () => {
      const response = await request(appWithCors).options('/test');
      expect(response.status).not.toBe(405);
    });
  });
  
  describe('Error Response Format', () => {
    it('should include allowedMethods in error response', async () => {
      const response = await request(app).delete('/test');
      expect(response.body.allowedMethods).toBeDefined();
      expect(response.body.allowedMethods).toContain('GET');
      expect(response.body.allowedMethods).toContain('POST');
      expect(response.body.allowedMethods).toContain('HEAD');
    });
  });
});
