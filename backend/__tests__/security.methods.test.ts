/**
 * HTTP Method Restriction Tests
 * 
 * Verifies that only allowed HTTP methods are permitted.
 * Allowed by default: GET, POST, PUT, PATCH, DELETE, HEAD
 * Disallowed: TRACE, CONNECT, and other non-standard methods
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
    app.put('/test', (req, res) => res.json({ method: 'PUT' }));
    app.patch('/test', (req, res) => res.json({ method: 'PATCH' }));
    app.delete('/test', (req, res) => res.json({ method: 'DELETE' }));
    app.head('/test', (req, res) => res.send());
    app.options('/test', (req, res) => res.send());
  });
  
  describe('Allowed Methods', () => {
    it('should allow GET requests', async () => {
      const response = await request(app).get('/test');
      expect(response.status).not.toBe(405);
      expect(response.body.method).toBe('GET');
    });
    
    it('should allow POST requests', async () => {
      const response = await request(app).post('/test');
      expect(response.status).not.toBe(405);
      expect(response.body.method).toBe('POST');
    });
    
    it('should allow PUT requests', async () => {
      const response = await request(app).put('/test');
      expect(response.status).not.toBe(405);
      expect(response.body.method).toBe('PUT');
    });
    
    it('should allow PATCH requests', async () => {
      const response = await request(app).patch('/test');
      expect(response.status).not.toBe(405);
      expect(response.body.method).toBe('PATCH');
    });
    
    it('should allow DELETE requests', async () => {
      const response = await request(app).delete('/test');
      expect(response.status).not.toBe(405);
      expect(response.body.method).toBe('DELETE');
    });
    
    it('should allow HEAD requests', async () => {
      const response = await request(app).head('/test');
      expect(response.status).not.toBe(405);
    });
  });
  
  describe('Disallowed Methods', () => {
    it('should block TRACE requests with 405', async () => {
      const response = await request(app).trace('/test');
      expect(response.status).toBe(405);
      expect(response.body.error).toBe('Method Not Allowed');
    });
    
    it('should include error message for disallowed methods', async () => {
      const response = await request(app).trace('/test');
      expect(response.body.message).toContain('TRACE');
      expect(response.body.message).toContain('not allowed');
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
      const response = await request(app).trace('/test');
      expect(response.body.allowedMethods).toBeDefined();
      expect(response.body.allowedMethods).toContain('GET');
      expect(response.body.allowedMethods).toContain('POST');
      expect(response.body.allowedMethods).toContain('PUT');
      expect(response.body.allowedMethods).toContain('PATCH');
      expect(response.body.allowedMethods).toContain('DELETE');
      expect(response.body.allowedMethods).toContain('HEAD');
    });
    
    it('should not include OPTIONS in allowedMethods when CORS is disabled', async () => {
      const response = await request(app).trace('/test');
      expect(response.body.allowedMethods).not.toContain('OPTIONS');
    });
  });
});
