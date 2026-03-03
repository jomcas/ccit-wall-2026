import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../utils/firebase';
import User from '../models/User';

/**
 * User payload structure attached to req.user after Firebase token verification
 */
interface FirebaseUserPayload {
  userId: string;       // MongoDB _id
  firebaseUid: string;  // Firebase UID
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
      user?: FirebaseUserPayload;
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
 * Authentication Middleware — Firebase ID Token verification
 * 
 * SECURITY: Implements "Deny by Default" policy
 * - Validates Firebase ID token on every request via Admin SDK
 * - Maps Firebase UID → MongoDB user document for role resolution
 * - Rejects requests without valid authentication
 * 
 * The token must be provided in the Authorization header using Bearer scheme:
 * Authorization: Bearer <firebase-id-token>
 */
export const authMiddleware = async (
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
        message: 'Authentication required',
      });
    }

    // Validate Bearer scheme
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authentication scheme. Use: Bearer <token>',
      });
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    if (!token || token.trim() === '') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token required',
      });
    }

    // Verify Firebase ID token using Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken.uid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token payload',
      });
    }

    // Look up the MongoDB user by firebaseUid to get role and app-level userId
    const user = await User.findOne({ firebaseUid: decodedToken.uid }).select('_id role');

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account not found. Please complete registration.',
      });
    }

    // Validate role
    if (!USER_ROLES.includes(user.role as UserRole)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid user role',
      });
    }

    // Attach validated user to request object
    req.user = {
      userId: user._id.toString(),
      firebaseUid: decodedToken.uid,
      role: user.role as 'student' | 'teacher' | 'admin',
    };

    next();
  } catch (error: any) {
    // Firebase token errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired',
      });
    }

    if (
      error.code === 'auth/argument-error' ||
      error.code === 'auth/id-token-revoked'
    ) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    }

    // Generic error for other cases
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
    });
  }
};

/**
 * Admin Authorization Middleware
 * Must be used AFTER authMiddleware
 */
export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }

  next();
};

/**
 * Teacher Authorization Middleware
 * Teachers and admins can access, students cannot.
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
      message: 'Authentication required',
    });
  }

  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Teacher or admin access required',
    });
  }

  next();
};

/**
 * Role-Based Access Control Middleware Factory
 */
export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Minimum Role Level Middleware Factory
 * Uses role hierarchy: student < teacher < admin
 */
export const requireMinRole = (minimumRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role];
    const requiredRoleLevel = ROLE_HIERARCHY[minimumRole];

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Minimum role required: ${minimumRole}`,
      });
    }

    next();
  };
};

/**
 * Resource Ownership Middleware Factory
 */
export const requireOwnership = (paramName: string = 'id', allowAdmin: boolean = true) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const resourceOwnerId = req.params[paramName];
    const requestingUserId = req.user.userId;

    if (allowAdmin && req.user.role === 'admin') {
      return next();
    }

    if (resourceOwnerId !== requestingUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources',
      });
    }

    next();
  };
};

/**
 * Optional Authentication Middleware
 * 
 * Attempts to authenticate the user via Firebase but doesn't fail
 * if no token is provided. Useful for public-with-optional-auth routes.
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);

    if (!token || token.trim() === '') {
      return next();
    }

    const decodedToken = await adminAuth.verifyIdToken(token);

    if (decodedToken.uid) {
      const user = await User.findOne({ firebaseUid: decodedToken.uid }).select('_id role');
      if (user && USER_ROLES.includes(user.role as UserRole)) {
        req.user = {
          userId: user._id.toString(),
          firebaseUid: decodedToken.uid,
          role: user.role as 'student' | 'teacher' | 'admin',
        };
      }
    }

    next();
  } catch {
    // For optional auth, invalid tokens are treated as no auth
    next();
  }
};
