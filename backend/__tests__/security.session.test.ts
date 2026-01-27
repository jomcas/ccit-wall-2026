import express, { Express } from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import {
  setSecureSessionCookie,
  clearSessionCookie,
  sessionInactivityTimeout,
  regenerateSession,
  sessionSecurityHeaders,
  validateCSRFToken,
  setCSRFCookie,
  getSessionConfigSummary,
} from '../src/middleware/session';
import { generateCSRFToken, generateSessionId } from '../src/utils/crypto';

// Helper to create test app
const createTestApp = (middleware?: any[]) => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  
  if (middleware) {
    app.use(...middleware);
  }
  
  return app;
};

describe('Session Management Security Tests', () => {
  
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.SESSION_SECURE;
    delete process.env.SESSION_SAME_SITE;
    delete process.env.SESSION_MAX_AGE;
  });

  // ============================================================================
  // SECURE COOKIE ATTRIBUTES TESTS
  // ============================================================================
  describe('Secure Cookie Attributes', () => {
    it('should set HttpOnly attribute on session cookies', async () => {
      const app = createTestApp();
      app.get('/set-session', (req, res) => {
        setSecureSessionCookie(res, 'test-session-id');
        res.json({ success: true });
      });
      
      const response = await request(app).get('/set-session');
      const cookies = response.headers['set-cookie'];
      
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('HttpOnly');
    });

    it('should set Secure attribute in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const app = createTestApp();
      app.get('/set-session', (req, res) => {
        setSecureSessionCookie(res, 'test-session-id');
        res.json({ success: true });
      });
      
      const response = await request(app).get('/set-session');
      const cookies = response.headers['set-cookie'];
      
      expect(cookies[0]).toContain('Secure');
    });

    it('should set SameSite attribute to strict by default', async () => {
      const app = createTestApp();
      app.get('/set-session', (req, res) => {
        setSecureSessionCookie(res, 'test-session-id');
        res.json({ success: true });
      });
      
      const response = await request(app).get('/set-session');
      const cookies = response.headers['set-cookie'];
      
      expect(cookies[0]).toContain('SameSite=Strict');
    });

    it('should set appropriate Max-Age', async () => {
      const app = createTestApp();
      app.get('/set-session', (req, res) => {
        setSecureSessionCookie(res, 'test-session-id');
        res.json({ success: true });
      });
      
      const response = await request(app).get('/set-session');
      const cookies = response.headers['set-cookie'];
      
      expect(cookies[0]).toContain('Max-Age');
    });

    it('should allow custom cookie configuration', async () => {
      const app = createTestApp();
      app.get('/set-session', (req, res) => {
        setSecureSessionCookie(res, 'test-session-id', {
          cookieName: 'customSession',
          sameSite: 'lax',
          maxAge: 60000, // 1 minute
        });
        res.json({ success: true });
      });
      
      const response = await request(app).get('/set-session');
      const cookies = response.headers['set-cookie'];
      
      expect(cookies[0]).toContain('customSession=');
      expect(cookies[0]).toContain('SameSite=Lax');
    });

    it('should clear session cookie properly', async () => {
      const app = createTestApp();
      app.get('/clear-session', (req, res) => {
        clearSessionCookie(res);
        res.json({ success: true });
      });
      
      const response = await request(app).get('/clear-session');
      const cookies = response.headers['set-cookie'];
      
      expect(cookies).toBeDefined();
      // Cookie should be expired
      expect(cookies[0]).toMatch(/Expires=.*1970|Max-Age=0/i);
    });
  });

  // ============================================================================
  // SESSION INACTIVITY TIMEOUT TESTS
  // ============================================================================
  describe('Session Inactivity Timeout', () => {
    it('should allow requests within timeout period', async () => {
      const app = createTestApp([sessionInactivityTimeout(5000)]); // 5 second timeout
      
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
      
      // First request with session
      const response = await request(app)
        .get('/test')
        .set('Cookie', 'sessionId=test-session-123');
      
      expect(response.status).toBe(200);
    });

    it('should reject requests after inactivity timeout', async () => {
      const app = createTestApp([sessionInactivityTimeout(100)]); // 100ms timeout
      
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
      
      // First request to register session
      await request(app)
        .get('/test')
        .set('Cookie', 'sessionId=test-session-timeout');
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Second request should be rejected
      const response = await request(app)
        .get('/test')
        .set('Cookie', 'sessionId=test-session-timeout');
      
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('SESSION_TIMEOUT');
    });

    it('should extend session on activity', async () => {
      const app = createTestApp([sessionInactivityTimeout(200)]); // 200ms timeout
      
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
      
      // First request
      await request(app)
        .get('/test')
        .set('Cookie', 'sessionId=test-session-extend');
      
      // Wait half the timeout
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second request (should extend timeout)
      const response1 = await request(app)
        .get('/test')
        .set('Cookie', 'sessionId=test-session-extend');
      expect(response1.status).toBe(200);
      
      // Wait another half timeout
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Third request should still work
      const response2 = await request(app)
        .get('/test')
        .set('Cookie', 'sessionId=test-session-extend');
      expect(response2.status).toBe(200);
    });

    it('should allow requests without session', async () => {
      const app = createTestApp([sessionInactivityTimeout(5000)]);
      
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(200);
    });
  });

  // ============================================================================
  // SESSION REGENERATION TESTS
  // ============================================================================
  describe('Session Regeneration', () => {
    it('should generate new session ID on regeneration', async () => {
      const app = createTestApp();
      
      let sessionId1: string = '';
      let sessionId2: string = '';
      
      app.get('/regenerate', (req, res) => {
        sessionId1 = generateSessionId();
        sessionId2 = regenerateSession(req, res);
        res.json({ success: true });
      });
      
      await request(app).get('/regenerate');
      
      // Session IDs should be different (new one generated)
      expect(sessionId2).toBeDefined();
      expect(sessionId2).not.toBe('');
      expect(typeof sessionId2).toBe('string');
      expect(sessionId2.length).toBe(64); // 32 bytes hex = 64 chars
    });

    it('should set secure cookie on regeneration', async () => {
      const app = createTestApp();
      
      app.get('/regenerate', (req, res) => {
        regenerateSession(req, res);
        res.json({ success: true });
      });
      
      const response = await request(app).get('/regenerate');
      const cookies = response.headers['set-cookie'];
      
      expect(cookies[0]).toContain('HttpOnly');
      expect(cookies[0]).toContain('SameSite=Strict');
    });
  });

  // ============================================================================
  // SESSION SECURITY HEADERS TESTS
  // ============================================================================
  describe('Session Security Headers', () => {
    it('should set Cache-Control header', async () => {
      const app = createTestApp([sessionSecurityHeaders]);
      
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app).get('/test');
      
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['cache-control']).toContain('no-cache');
    });

    it('should set Pragma header', async () => {
      const app = createTestApp([sessionSecurityHeaders]);
      
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app).get('/test');
      
      expect(response.headers['pragma']).toBe('no-cache');
    });

    it('should set Expires header to 0', async () => {
      const app = createTestApp([sessionSecurityHeaders]);
      
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app).get('/test');
      
      expect(response.headers['expires']).toBe('0');
    });
  });

  // ============================================================================
  // CSRF PROTECTION TESTS
  // ============================================================================
  describe('CSRF Token Validation', () => {
    it('should skip CSRF validation for GET requests', async () => {
      const app = createTestApp([validateCSRFToken()]);
      
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(200);
    });

    it('should skip CSRF validation for HEAD requests', async () => {
      const app = createTestApp([validateCSRFToken()]);
      
      app.head('/test', (req, res) => {
        res.send();
      });
      
      const response = await request(app).head('/test');
      
      expect(response.status).toBe(200);
    });

    it('should reject POST without CSRF token', async () => {
      const app = createTestApp([validateCSRFToken()]);
      
      app.post('/test', (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app)
        .post('/test')
        .send({ data: 'test' });
      
      expect(response.status).toBe(403);
      expect(response.body.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should reject POST with invalid CSRF token', async () => {
      const app = createTestApp([validateCSRFToken()]);
      
      app.post('/test', (req, res) => {
        res.json({ success: true });
      });
      
      const response = await request(app)
        .post('/test')
        .set('x-csrf-token', 'invalid-token')
        .set('Cookie', 'csrfToken=different-token')
        .send({ data: 'test' });
      
      expect(response.status).toBe(403);
      expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('should allow POST with valid CSRF token', async () => {
      const app = createTestApp([validateCSRFToken()]);
      
      app.post('/test', (req, res) => {
        res.json({ success: true });
      });
      
      const csrfToken = generateCSRFToken();
      
      const response = await request(app)
        .post('/test')
        .set('x-csrf-token', csrfToken)
        .set('Cookie', `csrfToken=${csrfToken}`)
        .send({ data: 'test' });
      
      expect(response.status).toBe(200);
    });

    it('should use custom header name for CSRF token', async () => {
      const app = createTestApp([validateCSRFToken('x-custom-csrf')]);
      
      app.post('/test', (req, res) => {
        res.json({ success: true });
      });
      
      const csrfToken = generateCSRFToken();
      
      const response = await request(app)
        .post('/test')
        .set('x-custom-csrf', csrfToken)
        .set('Cookie', `csrfToken=${csrfToken}`)
        .send({ data: 'test' });
      
      expect(response.status).toBe(200);
    });
  });

  // ============================================================================
  // CSRF COOKIE TESTS
  // ============================================================================
  describe('CSRF Cookie', () => {
    it('should set CSRF cookie without HttpOnly (readable by JS)', async () => {
      const app = createTestApp();
      
      app.get('/csrf', (req, res) => {
        setCSRFCookie(res, 'test-csrf-token');
        res.json({ success: true });
      });
      
      const response = await request(app).get('/csrf');
      const cookies = response.headers['set-cookie'];
      
      // CSRF cookie should NOT be HttpOnly
      expect(cookies[0]).not.toContain('HttpOnly');
    });

    it('should set Secure and SameSite on CSRF cookie', async () => {
      process.env.NODE_ENV = 'production';
      
      const app = createTestApp();
      
      app.get('/csrf', (req, res) => {
        setCSRFCookie(res, 'test-csrf-token');
        res.json({ success: true });
      });
      
      const response = await request(app).get('/csrf');
      const cookies = response.headers['set-cookie'];
      
      expect(cookies[0]).toContain('Secure');
      expect(cookies[0]).toContain('SameSite=Strict');
    });
  });

  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================
  describe('Session Configuration', () => {
    it('should return session configuration summary', () => {
      const config = getSessionConfigSummary();
      
      expect(config).toHaveProperty('cookieName');
      expect(config).toHaveProperty('maxAge');
      expect(config).toHaveProperty('secure');
      expect(config).toHaveProperty('sameSite');
      expect(config).toHaveProperty('inactivityTimeout');
    });

    it('should respect environment variables', () => {
      process.env.SESSION_SAME_SITE = 'lax';
      process.env.SESSION_SECURE = 'true';
      
      const config = getSessionConfigSummary();
      
      expect(config.sameSite).toBe('lax');
      expect(config.secure).toBe(true);
    });
  });
});
