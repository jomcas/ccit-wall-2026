import { Request, Response, NextFunction } from 'express';
import { generateSessionId, secureCompare } from '../utils/crypto';

/**
 * Session Management Middleware
 * 
 * Provides secure session handling with cookie protection attributes
 * following OWASP session management guidelines.
 */

/**
 * Session configuration interface
 */
interface SessionConfig {
  /** Cookie name for the session */
  cookieName: string;
  /** Session timeout in milliseconds (default: 30 minutes) */
  maxAge: number;
  /** Whether to set Secure attribute (HTTPS only) */
  secure: boolean;
  /** SameSite attribute value */
  sameSite: 'strict' | 'lax' | 'none';
  /** Cookie path */
  path: string;
  /** Cookie domain (optional) */
  domain?: string;
}

/**
 * Default session configuration
 * 
 * SECURITY NOTES:
 * - HttpOnly: Always true - prevents XSS from accessing cookies
 * - Secure: True in production - ensures HTTPS-only transmission
 * - SameSite: 'strict' - prevents CSRF attacks
 * - maxAge: 30 minutes - limits exposure window
 */
const getDefaultConfig = (): SessionConfig => {
  const isProd = process.env.NODE_ENV === 'production';
  
  return {
    cookieName: process.env.SESSION_COOKIE_NAME || 'sessionId',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '', 10) || 30 * 60 * 1000, // 30 minutes
    secure: isProd || process.env.SESSION_SECURE === 'true',
    sameSite: (process.env.SESSION_SAME_SITE as 'strict' | 'lax' | 'none') || 'strict',
    path: '/',
    domain: process.env.SESSION_DOMAIN,
  };
};

/**
 * Cookie options builder
 * 
 * Creates Express cookie options with secure attributes.
 */
const buildCookieOptions = (config: SessionConfig): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
} => ({
  httpOnly: true, // SECURITY: Prevents JavaScript access to cookie
  secure: config.secure, // SECURITY: HTTPS-only when enabled
  sameSite: config.sameSite, // SECURITY: CSRF protection
  maxAge: config.maxAge,
  path: config.path,
  ...(config.domain && { domain: config.domain }),
});

/**
 * Set secure session cookie
 * 
 * Creates a new session with secure cookie attributes:
 * - HttpOnly: Prevents XSS attacks from accessing the cookie
 * - Secure: Ensures cookie is only sent over HTTPS
 * - SameSite: Prevents CSRF attacks
 * 
 * @param res - Express response object
 * @param sessionId - The session identifier to store
 * @param config - Optional custom configuration
 */
export const setSecureSessionCookie = (
  res: Response,
  sessionId: string,
  config?: Partial<SessionConfig>
): void => {
  const finalConfig = { ...getDefaultConfig(), ...config };
  const cookieOptions = buildCookieOptions(finalConfig);
  
  res.cookie(finalConfig.cookieName, sessionId, cookieOptions);
};

/**
 * Clear session cookie
 * 
 * Removes the session cookie from the client.
 * 
 * @param res - Express response object
 * @param config - Optional custom configuration
 */
export const clearSessionCookie = (
  res: Response,
  config?: Partial<SessionConfig>
): void => {
  const finalConfig = { ...getDefaultConfig(), ...config };
  
  res.clearCookie(finalConfig.cookieName, {
    httpOnly: true,
    secure: finalConfig.secure,
    sameSite: finalConfig.sameSite,
    path: finalConfig.path,
    ...(finalConfig.domain && { domain: finalConfig.domain }),
  });
};

/**
 * Session inactivity timeout middleware
 * 
 * Tracks session activity and invalidates sessions that have been
 * inactive for too long.
 * 
 * SECURITY: Implements session inactivity timeout to:
 * - Reduce exposure window for stolen sessions
 * - Automatically log out inactive users
 * - Comply with security best practices
 * 
 * @param timeoutMs - Inactivity timeout in milliseconds (default: 30 minutes)
 */
export const sessionInactivityTimeout = (timeoutMs?: number) => {
  const timeout = timeoutMs || parseInt(process.env.SESSION_INACTIVITY_TIMEOUT || '', 10) || 30 * 60 * 1000;
  
  // In-memory store for last activity timestamps
  // In production, use Redis or similar for distributed systems
  const lastActivity = new Map<string, number>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    
    if (!sessionId) {
      return next();
    }
    
    const now = Date.now();
    const lastActiveTime = lastActivity.get(sessionId);
    
    if (lastActiveTime) {
      const inactiveTime = now - lastActiveTime;
      
      if (inactiveTime > timeout) {
        // Session has been inactive too long
        lastActivity.delete(sessionId);
        clearSessionCookie(res);
        
        return res.status(401).json({
          error: 'Session Expired',
          message: 'Your session has expired due to inactivity. Please log in again.',
          code: 'SESSION_TIMEOUT'
        });
      }
    }
    
    // Update last activity time
    lastActivity.set(sessionId, now);
    
    // Cleanup old entries periodically (every 100 requests)
    if (Math.random() < 0.01) {
      const cutoff = now - timeout;
      for (const [id, time] of lastActivity.entries()) {
        if (time < cutoff) {
          lastActivity.delete(id);
        }
      }
    }
    
    next();
  };
};

/**
 * Session regeneration middleware
 * 
 * Regenerates session ID to prevent session fixation attacks.
 * Should be called after successful authentication.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @returns The new session ID
 */
export const regenerateSession = (req: Request, res: Response): string => {
  // Generate new cryptographically secure session ID
  const newSessionId = generateSessionId();
  
  // Set new session cookie with secure attributes
  setSecureSessionCookie(res, newSessionId);
  
  return newSessionId;
};

/**
 * Secure headers middleware for session protection
 * 
 * Adds security headers that protect sessions:
 * - Cache-Control: Prevents caching of authenticated pages
 * - Pragma: HTTP/1.0 cache prevention
 * - Expires: Immediate expiration
 */
export const sessionSecurityHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Prevent caching of authenticated responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  next();
};

/**
 * CSRF token validation middleware factory
 * 
 * Validates CSRF tokens in requests to prevent Cross-Site Request Forgery.
 * 
 * @param tokenHeader - Header name containing the CSRF token (default: 'x-csrf-token')
 */
export const validateCSRFToken = (tokenHeader: string = 'x-csrf-token') => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF validation for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    const csrfToken = req.headers[tokenHeader.toLowerCase()] as string;
    const sessionCsrfToken = req.cookies?.csrfToken;
    
    if (!csrfToken || !sessionCsrfToken) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING'
      });
    }
    
    // Use constant-time comparison to prevent timing attacks
    if (!secureCompare(csrfToken, sessionCsrfToken)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'CSRF token invalid',
        code: 'CSRF_TOKEN_INVALID'
      });
    }
    
    next();
  };
};

/**
 * Set CSRF token cookie
 * 
 * Creates a CSRF token and sets it in a cookie.
 * The token should be included in subsequent requests via header.
 * 
 * @param res - Express response object
 * @param token - The CSRF token to set
 * @param config - Optional cookie configuration
 */
export const setCSRFCookie = (
  res: Response,
  token: string,
  config?: Partial<SessionConfig>
): void => {
  const finalConfig = { ...getDefaultConfig(), ...config };
  
  // CSRF cookie should NOT be HttpOnly so JavaScript can read it
  // But it should still have Secure and SameSite
  res.cookie('csrfToken', token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: finalConfig.secure,
    sameSite: finalConfig.sameSite,
    maxAge: finalConfig.maxAge,
    path: finalConfig.path,
    ...(finalConfig.domain && { domain: finalConfig.domain }),
  });
};

/**
 * Session configuration summary for documentation
 */
export const getSessionConfigSummary = (): {
  cookieName: string;
  maxAge: string;
  secure: boolean;
  sameSite: string;
  inactivityTimeout: string;
} => {
  const config = getDefaultConfig();
  const inactivityTimeout = parseInt(process.env.SESSION_INACTIVITY_TIMEOUT || '', 10) || 30 * 60 * 1000;
  
  return {
    cookieName: config.cookieName,
    maxAge: `${config.maxAge / 1000 / 60} minutes`,
    secure: config.secure,
    sameSite: config.sameSite,
    inactivityTimeout: `${inactivityTimeout / 1000 / 60} minutes`,
  };
};
