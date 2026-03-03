import express from 'express';
import request from 'supertest';
import {
  authMiddleware,
  adminMiddleware,
  teacherMiddleware,
  requireRoles,
  requireMinRole,
  requireOwnership,
  optionalAuthMiddleware,
} from '../src/middleware/auth';

// ---------------------------------------------------------------------------
// Mock Firebase Admin SDK
// ---------------------------------------------------------------------------
const mockVerifyIdToken = jest.fn();
jest.mock('../src/utils/firebase', () => ({
  adminAuth: { verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args) },
}));

// ---------------------------------------------------------------------------
// Mock User model — must support .findOne().select() chaining
// ---------------------------------------------------------------------------
let mockUserResult: any = null;
const mockFindOne = jest.fn().mockImplementation(() => ({
  select: jest.fn().mockImplementation(() => Promise.resolve(mockUserResult)),
}));
jest.mock('../src/models/User', () => ({
  __esModule: true,
  default: { findOne: (...args: any[]) => mockFindOne(...args) },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Simulate a successful Firebase token verification + DB lookup */
const mockValidToken = (uid: string, role: string, userId = uid) => {
  mockVerifyIdToken.mockResolvedValue({ uid, email: `${uid}@test.com` });
  mockUserResult = { _id: userId, firebaseUid: uid, role };
};

const createTestApp = (middleware: any[]) => {
  const app = express();
  app.use(express.json());

  app.get('/test', ...middleware, (req: any, res: any) => {
    res.json({ success: true, user: req.user, message: 'Access granted' });
  });

  app.get('/test/:id', ...middleware, (req: any, res: any) => {
    res.json({ success: true, user: req.user, resourceId: req.params.id });
  });

  return app;
};

// ---------------------------------------------------------------------------
describe('Access Control (Authorization) Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // AUTHENTICATION MIDDLEWARE
  // ==========================================================================
  describe('Authentication Middleware (Deny by Default)', () => {
    const app = createTestApp([authMiddleware]);

    it('should deny access without Authorization header', async () => {
      const res = await request(app).get('/test');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication required');
    });

    it('should deny access with empty Authorization header', async () => {
      const res = await request(app).get('/test').set('Authorization', '');
      expect(res.status).toBe(401);
    });

    it('should deny access without Bearer scheme', async () => {
      const res = await request(app).get('/test').set('Authorization', 'some-token');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Bearer');
    });

    it('should deny access with invalid token (Firebase rejects)', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
      const res = await request(app).get('/test').set('Authorization', 'Bearer bad-token');
      expect(res.status).toBe(401);
    });

    it('should deny access when user not found in database', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid: 'uid123', email: 'a@b.com' });
      mockUserResult = null;
      const res = await request(app).get('/test').set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(401);
    });

    it('should allow access with valid token and existing user (student)', async () => {
      mockValidToken('uid-student', 'student', 'mongo-id-1');
      const res = await request(app).get('/test').set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.userId).toBe('mongo-id-1');
      expect(res.body.user.role).toBe('student');
    });

    it('should allow access with valid token and existing user (teacher)', async () => {
      mockValidToken('uid-teacher', 'teacher', 'mongo-id-2');
      const res = await request(app).get('/test').set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('teacher');
    });

    it('should allow access with valid token and existing user (admin)', async () => {
      mockValidToken('uid-admin', 'admin', 'mongo-id-3');
      const res = await request(app).get('/test').set('Authorization', 'Bearer valid-token');
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
    });
  });

  // ==========================================================================
  // ADMIN MIDDLEWARE
  // ==========================================================================
  describe('Admin Middleware', () => {
    const app = createTestApp([authMiddleware, adminMiddleware]);

    it('should deny access to students', async () => {
      mockValidToken('uid1', 'student');
      const res = await request(app).get('/test').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Admin access required');
    });

    it('should deny access to teachers', async () => {
      mockValidToken('uid2', 'teacher');
      const res = await request(app).get('/test').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });

    it('should allow access to admins', async () => {
      mockValidToken('uid3', 'admin');
      const res = await request(app).get('/test').set('Authorization', 'Bearer t');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // TEACHER MIDDLEWARE
  // ==========================================================================
  describe('Teacher Middleware', () => {
    const app = createTestApp([authMiddleware, teacherMiddleware]);

    it('should deny access to students', async () => {
      mockValidToken('uid1', 'student');
      const res = await request(app).get('/test').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Teacher or admin access required');
    });

    it('should allow access to teachers', async () => {
      mockValidToken('uid2', 'teacher');
      const res = await request(app).get('/test').set('Authorization', 'Bearer t');
      expect(res.status).toBe(200);
    });

    it('should allow access to admins', async () => {
      mockValidToken('uid3', 'admin');
      const res = await request(app).get('/test').set('Authorization', 'Bearer t');
      expect(res.status).toBe(200);
    });
  });

  // ==========================================================================
  // REQUIRE ROLES
  // ==========================================================================
  describe('Require Roles Middleware (Least Privilege)', () => {
    it('should allow only specified roles', async () => {
      const app = createTestApp([authMiddleware, requireRoles(['teacher', 'admin'])]);

      // Student denied
      mockValidToken('uid1', 'student');
      expect((await request(app).get('/test').set('Authorization', 'Bearer t')).status).toBe(403);

      // Teacher allowed
      mockValidToken('uid2', 'teacher');
      expect((await request(app).get('/test').set('Authorization', 'Bearer t')).status).toBe(200);

      // Admin allowed
      mockValidToken('uid3', 'admin');
      expect((await request(app).get('/test').set('Authorization', 'Bearer t')).status).toBe(200);
    });

    it('should allow single role restriction', async () => {
      const app = createTestApp([authMiddleware, requireRoles(['admin'])]);
      mockValidToken('uid2', 'teacher');
      const res = await request(app).get('/test').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Insufficient permissions');
    });
  });

  // ==========================================================================
  // REQUIRE MIN ROLE
  // ==========================================================================
  describe('Require Minimum Role Middleware (Role Hierarchy)', () => {
    it('should enforce role hierarchy (teacher minimum)', async () => {
      const app = createTestApp([authMiddleware, requireMinRole('teacher')]);

      mockValidToken('uid1', 'student');
      expect((await request(app).get('/test').set('Authorization', 'Bearer t')).status).toBe(403);

      mockValidToken('uid2', 'teacher');
      expect((await request(app).get('/test').set('Authorization', 'Bearer t')).status).toBe(200);

      mockValidToken('uid3', 'admin');
      expect((await request(app).get('/test').set('Authorization', 'Bearer t')).status).toBe(200);
    });

    it('should enforce role hierarchy (admin minimum)', async () => {
      const app = createTestApp([authMiddleware, requireMinRole('admin')]);
      mockValidToken('uid2', 'teacher');
      const res = await request(app).get('/test').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('admin');
    });
  });

  // ==========================================================================
  // REQUIRE OWNERSHIP
  // ==========================================================================
  describe('Require Ownership Middleware', () => {
    it('should allow users to access their own resources', async () => {
      const app = createTestApp([authMiddleware, requireOwnership('id')]);
      mockValidToken('uid1', 'student', 'user123');
      const res = await request(app).get('/test/user123').set('Authorization', 'Bearer t');
      expect(res.status).toBe(200);
      expect(res.body.resourceId).toBe('user123');
    });

    it('should deny users access to other users resources', async () => {
      const app = createTestApp([authMiddleware, requireOwnership('id')]);
      mockValidToken('uid1', 'student', 'user123');
      const res = await request(app).get('/test/user456').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('your own resources');
    });

    it('should allow admins to bypass ownership check by default', async () => {
      const app = createTestApp([authMiddleware, requireOwnership('id')]);
      mockValidToken('uid-admin', 'admin', 'admin1');
      const res = await request(app).get('/test/user456').set('Authorization', 'Bearer t');
      expect(res.status).toBe(200);
    });

    it('should not allow admin bypass when disabled', async () => {
      const app = createTestApp([authMiddleware, requireOwnership('id', false)]);
      mockValidToken('uid-admin', 'admin', 'admin1');
      const res = await request(app).get('/test/user456').set('Authorization', 'Bearer t');
      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // OPTIONAL AUTH
  // ==========================================================================
  describe('Optional Authentication Middleware', () => {
    const app = createTestApp([optionalAuthMiddleware]);

    it('should allow access without authentication', async () => {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
      expect(res.body.user).toBeUndefined();
    });

    it('should attach user when valid token provided', async () => {
      mockValidToken('uid1', 'student', 'mongo1');
      const res = await request(app).get('/test').set('Authorization', 'Bearer valid');
      expect(res.status).toBe(200);
      expect(res.body.user.userId).toBe('mongo1');
    });

    it('should allow access with invalid token (treated as no auth)', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('bad token'));
      const res = await request(app).get('/test').set('Authorization', 'Bearer bad');
      expect(res.status).toBe(200);
      expect(res.body.user).toBeUndefined();
    });
  });

  // ==========================================================================
  // AUTHORIZATION ON EVERY REQUEST
  // ==========================================================================
  describe('Authorization Validation on Every Request', () => {
    it('should validate token on each request (not cached)', async () => {
      const app = createTestApp([authMiddleware]);

      // First request with valid token
      mockValidToken('uid1', 'student');
      const res1 = await request(app).get('/test').set('Authorization', 'Bearer t');
      expect(res1.status).toBe(200);

      // Second request without token should fail
      const res2 = await request(app).get('/test');
      expect(res2.status).toBe(401);
    });
  });
});
