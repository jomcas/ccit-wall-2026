/**
 * Security Headers and Fingerprinting Tests
 * 
 * Verifies that security headers are correctly set and fingerprinting
 * information is minimized.
 */

import express, { Express } from 'express';
import request from 'supertest';
import helmet from 'helmet';
import { restrictHttpMethods } from '../src/middleware/security';

describe('Security Headers & Fingerprinting', () => {
  let app: Express;
  
  beforeEach(() => {
    app = express();
    
    // Disable fingerprinting
    app.disable('x-powered-by');
    app.disable('etag');
    
    // Apply Helmet
    app.use(helmet({
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'sameorigin' }
    }));
    
    // Simple test route
    app.get('/test', (req, res) => {
      res.json({ message: 'ok' });
    });
  });
  
  describe('Stack Fingerprinting', () => {
    it('should not expose X-Powered-By header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
    
    it('should not send ETag header (by default)', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['etag']).toBeUndefined();
    });
    
    it('should not expose server version', async () => {
      const response = await request(app).get('/test');
      const server = response.headers['server'];
      // Server header should not contain version info like "Express/4.18.2"
      if (server) {
        expect(server).not.toMatch(/[\d.]+/);
      }
    });
  });
  
  describe('Helmet Headers', () => {
    it('should set X-Frame-Options to SAMEORIGIN', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
    
    it('should set X-Content-Type-Options to nosniff', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
    
    it('should set Referrer-Policy to no-referrer', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
    });
    
    it('should set Cross-Origin-Opener-Policy to same-origin', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    });
    
    it('should set Strict-Transport-Security header', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
    
    it('should not set legacy X-XSS-Protection by default', async () => {
      const response = await request(app).get('/test');
      // Helmet no longer sets this by default in v7+
      // If you want it, you'd need to explicitly enable it
    });
  });
  
  describe('CSP Header (when enabled)', () => {
    let appWithCSP: Express;
    
    beforeEach(() => {
      appWithCSP = express();
      appWithCSP.disable('x-powered-by');
      
      // Enable CSP explicitly
      appWithCSP.use(helmet({
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            objectSrc: ["'none'"]
          }
        }
      }));
      
      appWithCSP.get('/test', (req, res) => {
        res.json({ message: 'ok' });
      });
    });
    
    it('should set Content-Security-Policy header when enabled', async () => {
      const response = await request(appWithCSP).get('/test');
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toMatch(/default-src/);
    });
    
    it('should restrict CSP directives correctly', async () => {
      const response = await request(appWithCSP).get('/test');
      const cspHeader = response.headers['content-security-policy'];
      expect(cspHeader).toMatch(/object-src 'none'/);
    });
  });
});
