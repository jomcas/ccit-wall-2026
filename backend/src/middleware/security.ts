/**
 * Security Middleware Module
 * 
 * Provides HTTP method restriction and IP-based allowlisting for sensitive routes.
 */

import { Request, Response, NextFunction } from 'express';
import CIDR from 'ip-cidr';

/**
 * HTTP Method Restriction Middleware
 * 
 * Restricts which HTTP methods are allowed on the server.
 * - Allowed by default: GET, POST, PUT, PATCH, DELETE, HEAD
 * - If CORS is enabled (ENABLE_CORS=true), OPTIONS is also allowed
 * 
 * Returns 405 Method Not Allowed for disallowed methods.
 * 
 * Environment Variables:
 * - ENABLE_CORS: Set to "true" to allow OPTIONS method for CORS preflight
 */
export const restrictHttpMethods = (req: Request, res: Response, next: NextFunction) => {
  const enableCors = process.env.ENABLE_CORS === 'true';
  
  // Base allowed methods - OPTIONS is always allowed for CORS preflight support
  const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
  
  if (!allowedMethods.has(req.method)) {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: `HTTP ${req.method} is not allowed on this server`,
      allowedMethods: Array.from(allowedMethods)
    });
  }
  
  next();
};

/**
 * IP Allowlist Middleware for Admin Routes
 * 
 * Restricts access to admin routes based on IP CIDR ranges.
 * 
 * Environment Variables:
 * - ADMIN_ALLOWLIST_CIDR: Comma-separated list of CIDR ranges (e.g., "10.0.0.0/8,192.168.1.0/24")
 *   If not set, all IPs are allowed (disabled).
 * - ENABLE_TRUST_PROXY: Set to "true" if behind a reverse proxy (default: "true" in production)
 *   When enabled, reads X-Forwarded-For header to get real client IP.
 * 
 * Usage:
 *   app.use('/api/admin', ipAllowlist, adminRoutes);
 * 
 * Returns 403 Forbidden for IPs not in the allowlist.
 */
export const ipAllowlist = (req: Request, res: Response, next: NextFunction) => {
  const allowlistEnv = process.env.ADMIN_ALLOWLIST_CIDR;
  
  // If no allowlist configured, skip check
  if (!allowlistEnv) {
    return next();
  }
  
  // Parse comma-separated CIDR ranges
  const cidrs = allowlistEnv.split(',').map(c => c.trim()).filter(Boolean);
  
  // Get client IP
  const enableTrustProxy = process.env.ENABLE_TRUST_PROXY !== 'false' && 
                          (process.env.NODE_ENV === 'production' || process.env.ENABLE_TRUST_PROXY === 'true');
  
  let clientIp = req.ip || req.connection.remoteAddress || '';
  
  if (enableTrustProxy) {
    // When behind a reverse proxy (e.g., NGINX), get the real IP from X-Forwarded-For header
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      // X-Forwarded-For can contain multiple IPs; the first one is the client IP
      clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0]).trim();
    }
  }
  
  // Remove IPv6 prefix if present (::ffff:) to normalize to IPv4
  if (clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.slice(7);
  }
  
  // Check if IP is in any of the allowed CIDR ranges
  const isAllowed = cidrs.some(cidrRange => {
    try {
      const cidr = new CIDR(cidrRange);
      return cidr.contains(clientIp);
    } catch (error) {
      console.error(`Invalid CIDR range: ${cidrRange}`, error);
      return false;
    }
  });
  
  if (!isAllowed) {
    console.warn(`Access denied for IP ${clientIp} on admin route`);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Your IP address is not authorized to access this resource'
    });
  }
  
  next();
};
