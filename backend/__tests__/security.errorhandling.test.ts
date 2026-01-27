/**
 * Security Tests: Error Handling and Logging
 * 
 * Tests for secure error handling practices:
 * - Stack traces not exposed in production
 * - Consistent error response format
 * - Sensitive data not logged
 * - Proper error categorization
 * - Request ID tracking
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  requestIdMiddleware,
  requestLoggingMiddleware,
  notFoundHandler,
  globalErrorHandler,
  asyncHandler,
  handleMongoError,
  getSafeErrorMessage,
} from '../src/middleware/errorHandler';
import {
  logger,
  sanitize,
  getRequestContext,
  generateRequestId,
} from '../src/utils/logger';

// =============================================================================
// TEST SETUP
// =============================================================================

/**
 * Create test app with error handling middleware
 */
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  return app;
}

/**
 * Add error handler to app (must be called after routes)
 */
function addErrorHandler(app: Express): void {
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
}

// Store original env
const originalEnv = process.env.NODE_ENV;

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});

// =============================================================================
// CUSTOM ERROR CLASSES TESTS
// =============================================================================

describe('Error Handling Security Tests', () => {
  describe('Custom Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 400, true, 'TEST_ERROR');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.stack).toBeDefined();
    });

    it('should create ValidationError with field errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' },
      ];
      const error = new ValidationError(errors);
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual(errors);
    });

    it('should create AuthenticationError with 401 status', () => {
      const error = new AuthenticationError('Invalid token');
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.message).toBe('Invalid token');
    });

    it('should create ForbiddenError with 403 status', () => {
      const error = new ForbiddenError('Admin access required');
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should create NotFoundError with 404 status', () => {
      const error = new NotFoundError('User');
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });

    it('should create ConflictError with 409 status', () => {
      const error = new ConflictError('Email already registered');
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT_ERROR');
    });

    it('should create RateLimitError with 429 status and retryAfter', () => {
      const error = new RateLimitError(60);
      
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
    });

    it('should create InternalError marked as non-operational', () => {
      const error = new InternalError('Database connection failed');
      
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });

  // ============================================================================
  // STACK TRACE EXPOSURE TESTS
  // ============================================================================
  describe('Stack Trace Protection', () => {
    it('should NOT expose stack trace in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DEBUG = 'false';
      
      const app = createTestApp();
      app.get('/error', () => {
        throw new Error('Sensitive internal error');
      });
      addErrorHandler(app);
      
      const response = await request(app).get('/error');
      
      expect(response.status).toBe(500);
      expect(response.body.error.stack).toBeUndefined();
      expect(response.body.error.message).toBe('Internal server error');
      
      process.env.NODE_ENV = 'development';
    });

    it('should use generic message for 500 errors in production', async () => {
      process.env.NODE_ENV = 'production';
      
      const app = createTestApp();
      app.get('/error', () => {
        throw new Error('Database password exposed!');
      });
      addErrorHandler(app);
      
      const response = await request(app).get('/error');
      
      expect(response.body.error.message).toBe('Internal server error');
      expect(response.body.error.message).not.toContain('Database');
      expect(response.body.error.message).not.toContain('password');
      
      process.env.NODE_ENV = 'development';
    });

    it('should show error details in development mode', async () => {
      process.env.NODE_ENV = 'development';
      
      const app = createTestApp();
      app.get('/error', () => {
        throw new AppError('Test error in dev', 400);
      });
      addErrorHandler(app);
      
      const response = await request(app).get('/error');
      
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Test error in dev');
    });
  });

  // ============================================================================
  // REQUEST ID TRACKING TESTS
  // ============================================================================
  describe('Request ID Tracking', () => {
    it('should add request ID to response headers', async () => {
      const app = createTestApp();
      app.get('/test', (req, res) => res.json({ ok: true }));
      addErrorHandler(app);
      
      const response = await request(app).get('/test');
      
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^req_/);
    });

    it('should use provided X-Request-ID header', async () => {
      const app = createTestApp();
      app.get('/test', (req, res) => res.json({ ok: true }));
      addErrorHandler(app);
      
      const response = await request(app)
        .get('/test')
        .set('X-Request-ID', 'custom-request-123');
      
      expect(response.headers['x-request-id']).toBe('custom-request-123');
    });

    it('should include request ID in error responses', async () => {
      const app = createTestApp();
      app.get('/error', () => {
        throw new AppError('Test error', 400);
      });
      addErrorHandler(app);
      
      const response = await request(app).get('/error');
      
      expect(response.body.error.requestId).toBeDefined();
    });
  });

  // ============================================================================
  // CONSISTENT ERROR FORMAT TESTS
  // ============================================================================
  describe('Consistent Error Response Format', () => {
    it('should return consistent format for validation errors', async () => {
      const app = createTestApp();
      app.post('/validate', () => {
        throw new ValidationError([
          { field: 'email', message: 'Invalid email' },
        ]);
      });
      addErrorHandler(app);
      
      const response = await request(app).post('/validate');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error).toHaveProperty('errors');
      expect(response.body.error.errors).toEqual([
        { field: 'email', message: 'Invalid email' },
      ]);
    });

    it('should return consistent format for auth errors', async () => {
      const app = createTestApp();
      app.get('/protected', () => {
        throw new AuthenticationError();
      });
      addErrorHandler(app);
      
      const response = await request(app).get('/protected');
      
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should return consistent format for forbidden errors', async () => {
      const app = createTestApp();
      app.get('/admin', () => {
        throw new ForbiddenError();
      });
      addErrorHandler(app);
      
      const response = await request(app).get('/admin');
      
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN_ERROR');
    });

    it('should include Retry-After header for rate limit errors', async () => {
      const app = createTestApp();
      app.get('/limited', () => {
        throw new RateLimitError(120);
      });
      addErrorHandler(app);
      
      const response = await request(app).get('/limited');
      
      expect(response.status).toBe(429);
      expect(response.headers['retry-after']).toBe('120');
    });
  });

  // ============================================================================
  // 404 HANDLER TESTS
  // ============================================================================
  describe('404 Not Found Handler', () => {
    it('should return 404 for undefined routes', async () => {
      const app = createTestApp();
      addErrorHandler(app);
      
      const response = await request(app).get('/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    });
  });

  // ============================================================================
  // ASYNC ERROR HANDLING TESTS
  // ============================================================================
  describe('Async Error Handling', () => {
    it('should catch async errors with asyncHandler', async () => {
      const app = createTestApp();
      
      app.get('/async-error', asyncHandler(async () => {
        throw new AppError('Async error', 400);
      }));
      addErrorHandler(app);
      
      const response = await request(app).get('/async-error');
      
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Async error');
    });

    it('should handle rejected promises', async () => {
      const app = createTestApp();
      
      app.get('/promise-reject', asyncHandler(async () => {
        return Promise.reject(new AppError('Promise rejected', 500));
      }));
      addErrorHandler(app);
      
      const response = await request(app).get('/promise-reject');
      
      expect(response.status).toBe(500);
    });
  });

  // ============================================================================
  // MONGODB ERROR HANDLING TESTS
  // ============================================================================
  describe('MongoDB Error Handling', () => {
    it('should convert duplicate key error to ConflictError', () => {
      const mongoError = {
        code: 11000,
        keyPattern: { email: 1 },
      };
      
      const appError = handleMongoError(mongoError);
      
      expect(appError).toBeInstanceOf(ConflictError);
      expect(appError.statusCode).toBe(409);
      expect(appError.message).toContain('email');
    });

    it('should convert Mongoose ValidationError to ValidationError', () => {
      const mongoError = {
        name: 'ValidationError',
        errors: {
          name: { message: 'Name is required' },
          email: { message: 'Invalid email format' },
        },
      };
      
      const appError = handleMongoError(mongoError);
      
      expect(appError).toBeInstanceOf(ValidationError);
      expect((appError as ValidationError).errors).toHaveLength(2);
    });

    it('should convert CastError to ValidationError', () => {
      const mongoError = {
        name: 'CastError',
        path: '_id',
        value: 'invalid-id',
      };
      
      const appError = handleMongoError(mongoError);
      
      expect(appError).toBeInstanceOf(ValidationError);
    });

    it('should return InternalError for unknown MongoDB errors', () => {
      const mongoError = { name: 'UnknownError' };
      
      const appError = handleMongoError(mongoError);
      
      expect(appError).toBeInstanceOf(InternalError);
    });
  });
});

// =============================================================================
// LOGGER SANITIZATION TESTS
// =============================================================================

describe('Logger Security Tests', () => {
  describe('Sensitive Data Sanitization', () => {
    it('should redact password fields', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
      };
      
      const sanitized = sanitize(data) as Record<string, unknown>;
      
      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.email).toBe('john@example.com');
    });

    it('should redact token fields', () => {
      const data = {
        userId: '123',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
        refreshToken: 'refresh-token-value',
      };
      
      const sanitized = sanitize(data) as Record<string, unknown>;
      
      expect(sanitized.userId).toBe('123');
      expect(sanitized.accessToken).toBe('[REDACTED]');
      expect(sanitized.refreshToken).toBe('[REDACTED]');
    });

    it('should redact API keys', () => {
      const data = {
        apiKey: 'sk_live_abc123',
        api_key: 'pk_test_xyz789',
      };
      
      const sanitized = sanitize(data) as Record<string, unknown>;
      
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.api_key).toBe('[REDACTED]');
    });

    it('should redact nested sensitive fields', () => {
      const data = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            apiKey: 'key123',
          },
        },
      };
      
      const sanitized = sanitize(data) as Record<string, any>;
      
      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.credentials.password).toBe('[REDACTED]');
      expect(sanitized.user.credentials.apiKey).toBe('[REDACTED]');
    });

    it('should redact JWT tokens in string values', () => {
      const data = {
        authHeader: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature',
      };
      
      const sanitized = sanitize(data) as Record<string, unknown>;
      
      expect(sanitized.authHeader).toContain('[REDACTED]');
      expect(sanitized.authHeader).not.toContain('eyJ');
    });

    it('should redact Bearer tokens in strings', () => {
      const logMessage = 'Request with Bearer abc123xyz token failed';
      
      const sanitized = sanitize(logMessage);
      
      expect(sanitized).toContain('Bearer [REDACTED]');
      expect(sanitized).not.toContain('abc123xyz');
    });

    it('should handle arrays with sensitive data', () => {
      const data = [
        { username: 'user1', password: 'pass1' },
        { username: 'user2', password: 'pass2' },
      ];
      
      const sanitized = sanitize(data) as Array<Record<string, unknown>>;
      
      expect(sanitized[0].username).toBe('user1');
      expect(sanitized[0].password).toBe('[REDACTED]');
      expect(sanitized[1].password).toBe('[REDACTED]');
    });

    it('should handle null and undefined values', () => {
      expect(sanitize(null)).toBeNull();
      expect(sanitize(undefined)).toBeUndefined();
    });

    it('should preserve non-sensitive data types', () => {
      const data = {
        count: 42,
        active: true,
        name: 'Test',
      };
      
      const sanitized = sanitize(data) as Record<string, unknown>;
      
      expect(sanitized.count).toBe(42);
      expect(sanitized.active).toBe(true);
      expect(sanitized.name).toBe('Test');
    });

    it('should prevent infinite recursion on deep objects', () => {
      const data: Record<string, any> = { level: 1 };
      let current = data;
      
      // Create deeply nested object (15 levels)
      for (let i = 2; i <= 15; i++) {
        current.nested = { level: i };
        current = current.nested;
      }
      
      // Should not throw and should handle gracefully
      const sanitized = sanitize(data) as Record<string, any>;
      expect(sanitized).toBeDefined();
    });
  });

  // ============================================================================
  // REQUEST CONTEXT TESTS
  // ============================================================================
  describe('Request Context Extraction', () => {
    it('should extract context from request', () => {
      const mockReq = {
        method: 'POST',
        path: '/api/users',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-request-id': 'req-123',
        },
        socket: { remoteAddress: '127.0.0.1' },
        user: { userId: 'user-456' },
      } as unknown as Request;
      
      const context = getRequestContext(mockReq);
      
      expect(context.method).toBe('POST');
      expect(context.path).toBe('/api/users');
      expect(context.ip).toBe('127.0.0.1');
      expect(context.userAgent).toBe('Mozilla/5.0');
      expect(context.userId).toBe('user-456');
    });
  });

  // ============================================================================
  // REQUEST ID GENERATION TESTS
  // ============================================================================
  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const ids = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        ids.add(generateRequestId());
      }
      
      expect(ids.size).toBe(100);
    });

    it('should generate IDs with req_ prefix', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req_/);
    });
  });
});

// =============================================================================
// SAFE ERROR MESSAGE TESTS
// =============================================================================

describe('getSafeErrorMessage', () => {
  it('should return AppError message', () => {
    const error = new AppError('Custom error', 400);
    expect(getSafeErrorMessage(error)).toBe('Custom error');
  });

  it('should return generic message for unknown errors in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const error = new Error('Sensitive internal details');
    expect(getSafeErrorMessage(error)).toBe('An unexpected error occurred');
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should handle non-Error objects', () => {
    expect(getSafeErrorMessage('string error')).toBe('An unexpected error occurred');
    expect(getSafeErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getSafeErrorMessage(undefined)).toBe('An unexpected error occurred');
  });
});
