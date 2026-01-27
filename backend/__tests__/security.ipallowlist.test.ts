/**
 * IP Allowlist Middleware Tests
 * 
 * Verifies that IP-based access control works correctly for admin routes.
 */

import express, { Express, Request } from 'express';
import request from 'supertest';
import { ipAllowlist } from '../src/middleware/security';

describe('IP Allowlist Middleware', () => {
  let app: Express;
  
  afterEach(() => {
    delete process.env.ADMIN_ALLOWLIST_CIDR;
    delete process.env.ENABLE_TRUST_PROXY;
    delete process.env.NODE_ENV;
  });
  
  describe('When Allowlist is Not Configured', () => {
    beforeEach(() => {
      app = express();
      app.use(ipAllowlist);
      
      app.get('/admin/test', (req, res) => {
        res.json({ message: 'Admin endpoint' });
      });
    });
    
    it('should allow all IPs when ADMIN_ALLOWLIST_CIDR is not set', async () => {
      const response = await request(app).get('/admin/test');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin endpoint');
    });
  });
  
  describe('With Valid CIDR Allowlist', () => {
    beforeEach(() => {
      process.env.ADMIN_ALLOWLIST_CIDR = '127.0.0.1/32,192.168.1.0/24';
      
      app = express();
      
      // Mock req.ip for testing
      app.use((req: Request, res, next) => {
        // Simulate localhost
        Object.defineProperty(req, 'ip', {
          value: '127.0.0.1',
          writable: true
        });
        next();
      });
      
      app.use(ipAllowlist);
      
      app.get('/admin/test', (req, res) => {
        res.json({ message: 'Admin endpoint' });
      });
    });
    
    it('should allow IP in the whitelist', async () => {
      const response = await request(app).get('/admin/test');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin endpoint');
    });
    
    it('should reject IP not in the whitelist', async () => {
      app = express();
      app.use((req: Request, res, next) => {
        // Simulate a different IP
        Object.defineProperty(req, 'ip', {
          value: '10.0.0.1',
          writable: true
        });
        next();
      });
      
      app.use(ipAllowlist);
      
      app.get('/admin/test', (req, res) => {
        res.json({ message: 'Admin endpoint' });
      });
      
      const response = await request(app).get('/admin/test');
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });
  
  describe('X-Forwarded-For Header (Proxy Support)', () => {
    beforeEach(() => {
      process.env.ADMIN_ALLOWLIST_CIDR = '192.168.1.0/24';
      process.env.ENABLE_TRUST_PROXY = 'true';
      
      app = express();
      app.use(ipAllowlist);
      
      app.get('/admin/test', (req, res) => {
        res.json({ message: 'Admin endpoint' });
      });
    });
    
    it('should read real IP from X-Forwarded-For when trust proxy is enabled', async () => {
      const response = await request(app)
        .get('/admin/test')
        .set('X-Forwarded-For', '192.168.1.100');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin endpoint');
    });
    
    it('should reject IPs in X-Forwarded-For when not in allowlist', async () => {
      const response = await request(app)
        .get('/admin/test')
        .set('X-Forwarded-For', '10.0.0.1');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
    
    it('should handle IPv6-mapped IPv4 addresses', async () => {
      app = express();
      app.use((req: Request, res, next) => {
        Object.defineProperty(req, 'ip', {
          value: '::ffff:192.168.1.50',
          writable: true
        });
        next();
      });
      
      app.use(ipAllowlist);
      
      app.get('/admin/test', (req, res) => {
        res.json({ message: 'Admin endpoint' });
      });
      
      const response = await request(app).get('/admin/test');
      expect(response.status).toBe(200);
    });
  });
  
  describe('CIDR Range Validation', () => {
    beforeEach(() => {
      process.env.ADMIN_ALLOWLIST_CIDR = '192.168.1.0/24';
    });
    
    it('should handle invalid CIDR gracefully', async () => {
      process.env.ADMIN_ALLOWLIST_CIDR = 'invalid-cidr';
      
      app = express();
      app.use((req: Request, res, next) => {
        Object.defineProperty(req, 'ip', {
          value: '192.168.1.1',
          writable: true
        });
        next();
      });
      
      app.use(ipAllowlist);
      
      app.get('/admin/test', (req, res) => {
        res.json({ message: 'Admin endpoint' });
      });
      
      const response = await request(app).get('/admin/test');
      // Invalid CIDR should not match any IP, so access is denied
      expect(response.status).toBe(403);
    });
  });
  
  describe('Error Response Format', () => {
    beforeEach(() => {
      process.env.ADMIN_ALLOWLIST_CIDR = '10.0.0.0/8';
      
      app = express();
      app.use((req: Request, res, next) => {
        Object.defineProperty(req, 'ip', {
          value: '192.168.1.1',
          writable: true
        });
        next();
      });
      
      app.use(ipAllowlist);
      
      app.get('/admin/test', (req, res) => {
        res.json({ message: 'Admin endpoint' });
      });
    });
    
    it('should return proper 403 error structure', async () => {
      const response = await request(app).get('/admin/test');
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Forbidden');
    });
  });
});
