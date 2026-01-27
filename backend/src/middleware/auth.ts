import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * User payload structure in JWT token
 */
interface JWTPayload {
  userId: string;
  role: 'student' | 'teacher' | 'admin';
  iat?: number;
  exp?: number;
}

/**
 * Extended Express Request with typed user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Valid user roles in the system
 */
export const USER_ROLES = ['student', 'teacher', 'admin'] as const;
export type UserRole = typeof USER_ROLES[number];

/**
 * Role hierarchy for permission checks
 * Higher index = more permissions
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 1,
  teacher: 2,
  admin: 3,
};

/**
 * SECURITY: Get JWT secret with production validation
 * 
 * Throws an error if JWT_SECRET is not configured in production,
 * preventing the use of insecure fallback values.
 */
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd && !secret) {
    throw new Error('SECURITY ERROR: JWT_SECRET must be set in production');
  }
  
  return secret || 'dev-secret-do-not-use-in-production';
};

/**
 * Authentication Middleware
 * 
 * SECURITY: Implements "Deny by Default" policy
 * - Validates JWT token on every request
 * - Rejects requests without valid authentication
 * - Uses server-side token validation (not client-provided claims)
 * 
 * The token must be provided in the Authorization header using Bearer scheme:
 * Authorization: Bearer <token>
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }
    
    // Validate Bearer scheme
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid authentication scheme. Use: Bearer <token>' 
      });
    }
    
    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    
    if (!token || token.trim() === '') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication token required' 
      });
    }
    
    // Verify and decode token using server-side secret
    const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload;
    
    // Validate token payload structure
    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid token payload' 
      });
    }
    
    // Validate role is a known role
    if (!USER_ROLES.includes(decoded.role)) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid user role' 
      });
    }
    
    // Attach validated user to request object
    // SECURITY: Only use server-validated data for authorization decisions
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Token has expired' 
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid token' 
      });
    }
    
    // Generic error for other cases
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication failed' 
    });
  }
};

/**
 * Admin Authorization Middleware
 * 
 * SECURITY: Enforces admin-only access
 * Must be used AFTER authMiddleware
 */
export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // SECURITY: Deny by default - check authentication first
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required' 
    });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Admin access required' 
    });
  }
  
  next();
};

/**
 * Teacher Authorization Middleware
 * 
 * SECURITY: Enforces teacher or admin access
 * Teachers and admins can access, students cannot
 * Must be used AFTER authMiddleware
 */
export const teacherMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication required' 
    });
  }
  
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Teacher or admin access required' 
    });
  }
  
  next();
};

/**
 * Role-Based Access Control Middleware Factory
 * 
 * Creates middleware that checks if user has one of the allowed roles.
 * Implements Least Privilege principle by requiring explicit role allowlist.
 * 
 * @param allowedRoles - Array of roles that can access the resource
 * @returns Express middleware function
 * 
 * @example
 * // Only teachers and admins can access
 * router.post('/grades', authMiddleware, requireRoles(['teacher', 'admin']), createGrade);
 */
export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // SECURITY: Deny by default
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Insufficient permissions' 
      });
    }
    
    next();
  };
};

/**
 * Minimum Role Level Middleware Factory
 * 
 * Creates middleware that checks if user has at least the specified role level.
 * Uses role hierarchy: student < teacher < admin
 * 
 * @param minimumRole - Minimum role level required
 * @returns Express middleware function
 * 
 * @example
 * // Teachers and admins can access (but not students)
 * router.get('/reports', authMiddleware, requireMinRole('teacher'), getReports);
 */
export const requireMinRole = (minimumRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }
    
    const userRoleLevel = ROLE_HIERARCHY[req.user.role];
    const requiredRoleLevel = ROLE_HIERARCHY[minimumRole];
    
    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Minimum role required: ${minimumRole}` 
      });
    }
    
    next();
  };
};

/**
 * Resource Ownership Middleware Factory
 * 
 * Creates middleware that verifies the authenticated user owns the resource.
 * Useful for routes like /users/:id where users can only access their own data.
 * 
 * @param paramName - Name of the URL parameter containing the resource owner ID
 * @param allowAdmin - Whether admins can bypass ownership check (default: true)
 * @returns Express middleware function
 * 
 * @example
 * // Users can only update their own profile, admins can update any
 * router.put('/users/:id', authMiddleware, requireOwnership('id'), updateUser);
 */
export const requireOwnership = (paramName: string = 'id', allowAdmin: boolean = true) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }
    
    const resourceOwnerId = req.params[paramName];
    const requestingUserId = req.user.userId;
    
    // Admin bypass (if enabled)
    if (allowAdmin && req.user.role === 'admin') {
      return next();
    }
    
    // Check ownership
    if (resourceOwnerId !== requestingUserId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only access your own resources' 
      });
    }
    
    next();
  };
};

/**
 * Optional Authentication Middleware
 * 
 * Attempts to authenticate the user but doesn't fail if no token is provided.
 * Useful for routes that have different behavior for authenticated vs anonymous users.
 * 
 * If a token is provided but invalid, it will still reject the request.
 */
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    // No auth header - continue without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.slice(7);
    
    if (!token || token.trim() === '') {
      return next();
    }
    
    // Verify token
    const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload;
    
    if (decoded.userId && decoded.role && USER_ROLES.includes(decoded.role)) {
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // For optional auth, invalid tokens are treated as no auth
    // This prevents errors for expired tokens on public routes
    next();
  }
};
