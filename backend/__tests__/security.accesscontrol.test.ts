import express, { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  authMiddleware,
  adminMiddleware,
  teacherMiddleware,
  requireRoles,
  requireMinRole,
  requireOwnership,
  optionalAuthMiddleware,
} from '../src/middleware/auth';

// Test JWT secret
const TEST_SECRET = 'test-secret-for-testing';

// Helper to create test tokens
const createTestToken = (payload: { userId: string; role: string }, expiresIn: string = '1h') => {
  return jwt.sign(payload, TEST_SECRET, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
};

// Helper to create test app
const createTestApp = (middleware: any[]) => {
  const app = express();
  app.use(express.json());
  
  // Apply middleware chain
  app.get('/test', ...middleware, (req: any, res: any) => {
    res.json({ 
      success: true, 
      user: req.user,
      message: 'Access granted' 
    });
  });
  
  app.get('/test/:id', ...middleware, (req: any, res: any) => {
    res.json({ 
      success: true, 
      user: req.user,
      resourceId: req.params.id 
    });
  });
  
  return app;
};

describe('Access Control (Authorization) Security Tests', () => {
  
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  });

  // ============================================================================
  // AUTHENTICATION MIDDLEWARE TESTS
  // ============================================================================
  describe('Authentication Middleware (Deny by Default)', () => {
    const app = createTestApp([authMiddleware]);

    it('should deny access without Authorization header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('Authentication required');
    });

    it('should deny access with empty Authorization header', async () => {
      const response = await request(app)
        .get('/test')
        .set('Authorization', '');
      
      expect(response.status).toBe(401);
    });

    it('should deny access without Bearer scheme', async () => {
      const token = createTestToken({ userId: '123', role: 'student' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', token);
      
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Bearer');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should deny access with expired token', async () => {
      const token = createTestToken({ userId: '123', role: 'student' }, '-1s');
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token has expired');
    });

    it('should deny access with token missing userId', async () => {
      const token = jwt.sign({ role: 'student' }, TEST_SECRET);
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token payload');
    });

    it('should deny access with token missing role', async () => {
      const token = jwt.sign({ userId: '123' }, TEST_SECRET);
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token payload');
    });

    it('should deny access with invalid role', async () => {
      const token = jwt.sign({ userId: '123', role: 'superadmin' }, TEST_SECRET);
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid user role');
    });

    it('should allow access with valid student token', async () => {
      const token = createTestToken({ userId: '123', role: 'student' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.userId).toBe('123');
      expect(response.body.user.role).toBe('student');
    });

    it('should allow access with valid teacher token', async () => {
      const token = createTestToken({ userId: '456', role: 'teacher' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('teacher');
    });

    it('should allow access with valid admin token', async () => {
      const token = createTestToken({ userId: '789', role: 'admin' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('admin');
    });
  });

  // ============================================================================
  // ADMIN MIDDLEWARE TESTS
  // ============================================================================
  describe('Admin Middleware', () => {
    const app = createTestApp([authMiddleware, adminMiddleware]);

    it('should deny access to students', async () => {
      const token = createTestToken({ userId: '123', role: 'student' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toBe('Admin access required');
    });

    it('should deny access to teachers', async () => {
      const token = createTestToken({ userId: '456', role: 'teacher' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
    });

    it('should allow access to admins', async () => {
      const token = createTestToken({ userId: '789', role: 'admin' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================================
  // TEACHER MIDDLEWARE TESTS
  // ============================================================================
  describe('Teacher Middleware', () => {
    const app = createTestApp([authMiddleware, teacherMiddleware]);

    it('should deny access to students', async () => {
      const token = createTestToken({ userId: '123', role: 'student' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Teacher or admin access required');
    });

    it('should allow access to teachers', async () => {
      const token = createTestToken({ userId: '456', role: 'teacher' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
    });

    it('should allow access to admins', async () => {
      const token = createTestToken({ userId: '789', role: 'admin' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
    });
  });

  // ============================================================================
  // REQUIRE ROLES MIDDLEWARE TESTS
  // ============================================================================
  describe('Require Roles Middleware (Least Privilege)', () => {
    it('should allow only specified roles', async () => {
      const app = createTestApp([authMiddleware, requireRoles(['teacher', 'admin'])]);
      
      // Student should be denied
      const studentToken = createTestToken({ userId: '123', role: 'student' });
      const studentResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(studentResponse.status).toBe(403);
      
      // Teacher should be allowed
      const teacherToken = createTestToken({ userId: '456', role: 'teacher' });
      const teacherResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(teacherResponse.status).toBe(200);
      
      // Admin should be allowed
      const adminToken = createTestToken({ userId: '789', role: 'admin' });
      const adminResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminResponse.status).toBe(200);
    });

    it('should allow single role restriction', async () => {
      const app = createTestApp([authMiddleware, requireRoles(['admin'])]);
      
      const teacherToken = createTestToken({ userId: '456', role: 'teacher' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  // ============================================================================
  // REQUIRE MIN ROLE MIDDLEWARE TESTS
  // ============================================================================
  describe('Require Minimum Role Middleware (Role Hierarchy)', () => {
    it('should enforce role hierarchy (teacher minimum)', async () => {
      const app = createTestApp([authMiddleware, requireMinRole('teacher')]);
      
      // Student (level 1) < Teacher (level 2) - should be denied
      const studentToken = createTestToken({ userId: '123', role: 'student' });
      const studentResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(studentResponse.status).toBe(403);
      
      // Teacher (level 2) >= Teacher (level 2) - should be allowed
      const teacherToken = createTestToken({ userId: '456', role: 'teacher' });
      const teacherResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(teacherResponse.status).toBe(200);
      
      // Admin (level 3) >= Teacher (level 2) - should be allowed
      const adminToken = createTestToken({ userId: '789', role: 'admin' });
      const adminResponse = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminResponse.status).toBe(200);
    });

    it('should enforce role hierarchy (admin minimum)', async () => {
      const app = createTestApp([authMiddleware, requireMinRole('admin')]);
      
      const teacherToken = createTestToken({ userId: '456', role: 'teacher' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${teacherToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('admin');
    });
  });

  // ============================================================================
  // REQUIRE OWNERSHIP MIDDLEWARE TESTS
  // ============================================================================
  describe('Require Ownership Middleware', () => {
    it('should allow users to access their own resources', async () => {
      const app = createTestApp([authMiddleware, requireOwnership('id')]);
      
      const token = createTestToken({ userId: 'user123', role: 'student' });
      const response = await request(app)
        .get('/test/user123')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.resourceId).toBe('user123');
    });

    it('should deny users access to other users resources', async () => {
      const app = createTestApp([authMiddleware, requireOwnership('id')]);
      
      const token = createTestToken({ userId: 'user123', role: 'student' });
      const response = await request(app)
        .get('/test/user456')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
      expect(response.body.message).toContain('your own resources');
    });

    it('should allow admins to bypass ownership check by default', async () => {
      const app = createTestApp([authMiddleware, requireOwnership('id')]);
      
      const token = createTestToken({ userId: 'admin1', role: 'admin' });
      const response = await request(app)
        .get('/test/user456')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
    });

    it('should not allow admin bypass when disabled', async () => {
      const app = createTestApp([authMiddleware, requireOwnership('id', false)]);
      
      const token = createTestToken({ userId: 'admin1', role: 'admin' });
      const response = await request(app)
        .get('/test/user456')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(403);
    });
  });

  // ============================================================================
  // OPTIONAL AUTH MIDDLEWARE TESTS
  // ============================================================================
  describe('Optional Authentication Middleware', () => {
    const app = createTestApp([optionalAuthMiddleware]);

    it('should allow access without authentication', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(200);
      expect(response.body.user).toBeUndefined();
    });

    it('should attach user when valid token provided', async () => {
      const token = createTestToken({ userId: '123', role: 'student' });
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.user.userId).toBe('123');
    });

    it('should allow access with invalid token (treated as no auth)', async () => {
      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(200);
      expect(response.body.user).toBeUndefined();
    });

    it('should allow access with expired token (treated as no auth)', async () => {
      const token = createTestToken({ userId: '123', role: 'student' }, '-1s');
      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.user).toBeUndefined();
    });
  });

  // ============================================================================
  // AUTHORIZATION VALIDATION ON EVERY REQUEST
  // ============================================================================
  describe('Authorization Validation on Every Request', () => {
    it('should validate token on each request (not cached)', async () => {
      const app = createTestApp([authMiddleware]);
      
      // First request with valid token
      const token = createTestToken({ userId: '123', role: 'student' });
      const response1 = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);
      expect(response1.status).toBe(200);
      
      // Second request without token should fail
      const response2 = await request(app).get('/test');
      expect(response2.status).toBe(401);
    });

    it('should reject if token becomes invalid between requests', async () => {
      const app = createTestApp([authMiddleware]);
      
      // Create a short-lived token (1 second)
      const shortToken = createTestToken({ userId: '123', role: 'student' }, '1s');
      
      // First request should succeed
      const response1 = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${shortToken}`);
      expect(response1.status).toBe(200);
      
      // Wait for token to expire (slightly more than 1 second)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Second request with same token should fail
      const response2 = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${shortToken}`);
      expect(response2.status).toBe(401);
    });
  });
});
