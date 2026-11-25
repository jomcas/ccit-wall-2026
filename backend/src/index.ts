import express, { Express } from 'express';
import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import userRoutes from './routes/userRoutes';
import postRoutes from './routes/postRoutes';
import commentRoutes from './routes/commentRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { restrictHttpMethods, ipAllowlist } from './middleware/security';
import {
  requestIdMiddleware,
  requestLoggingMiddleware,
  notFoundHandler,
  globalErrorHandler,
  setupProcessErrorHandlers,
  ForbiddenError,
} from './middleware/errorHandler';
import { logger } from './utils/logger';

const app: Express = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ccit-wall';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

if (NODE_ENV !== 'test') {
  setupProcessErrorHandlers();
}

// ============================================================================
// SECURITY: Hide Stack Fingerprinting
// ============================================================================
// Disable the X-Powered-By header to prevent attackers from identifying
// the server technology (Express)
app.disable('x-powered-by');

// Disable ETags by default for consistency and reduced information disclosure.
// Note: ETags can be helpful for caching, but disable by default for security.
// Enable with ENABLE_ETAG=true if needed for performance optimization.
if (process.env.ENABLE_ETAG !== 'true') {
  app.disable('etag');
}

// ============================================================================
// SECURITY: Trust Proxy (for reverse proxy setups like NGINX with TLS offload)
// ============================================================================
// When running behind a reverse proxy, enable this so Express correctly
// identifies the client IP from X-Forwarded-For headers and marks cookies
// as secure when HTTPS is terminated at the proxy.
// Enabled by default in production, disable with ENABLE_TRUST_PROXY=false if needed.
if (isProd && process.env.ENABLE_TRUST_PROXY !== 'false') {
  app.set('trust proxy', 1);
}

// ============================================================================
// CORS - Client URL Configuration (MUST be before security middleware)
// ============================================================================
// CORS is explicitly restricted to approved origins only.
// Localhost origins are included only outside production.
// Additional origins can be supplied via CLIENT_URL or comma-separated ALLOWED_ORIGINS.
// This MUST be placed before restrictHttpMethods to properly handle OPTIONS preflight requests.
const devOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
];

const officialOrigins = [
  'https://ccit-wall.vercel.app',
  'https://ccit-wall-2026-d5sb.vercel.app',
  'https://ccit-wall-2026.vercel.app',
];

const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    ...(!isProd ? devOrigins : []),
    ...officialOrigins,
    ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.trim()] : []),
    ...extraOrigins,
  ])
);

/**
 * CORS origin check. Rejected origins produce a 403 ForbiddenError so the
 * globalErrorHandler responds with a clean 403 instead of a generic 500.
 */
export const corsOriginHandler = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void => {
  // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
  if (!origin) return callback(null, true);
  // Allow only explicitly approved origins
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  callback(new ForbiddenError('Not allowed by CORS'));
};

app.use(cors({
  origin: corsOriginHandler,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================================================
// SECURITY: Helmet - Comprehensive HTTP Header Hardening
// ============================================================================
// Helmet sets various HTTP headers to protect against common attacks:
// - Content-Security-Policy: strict API policy enabled by default (disable via ENABLE_CSP=false)
// - X-Frame-Options: SAMEORIGIN (prevents clickjacking)
// - X-Content-Type-Options: nosniff (prevents MIME type sniffing)
// - Referrer-Policy: no-referrer (privacy-first referrer policy)
// - Cross-Origin-Opener-Policy: same-origin (prevents window.opener access)
const cspConfig = process.env.ENABLE_CSP === 'false'
  ? false
  : {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    };

app.use(helmet({
  contentSecurityPolicy: cspConfig,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be loaded cross-origin
  referrerPolicy: { policy: 'no-referrer' },
  frameguard: { action: 'sameorigin' }
}));

// ============================================================================
// OBSERVABILITY: Request ID & Structured Request Logging
// ============================================================================
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);

// ============================================================================
// SECURITY: HTTP Method Restriction
// ============================================================================
// Restrict HTTP methods to only safe/common ones.
// - Allowed: GET, POST, PUT, PATCH, DELETE, HEAD
// - If CORS enabled (ENABLE_CORS=true): Also allow OPTIONS for preflight
// Returns 405 Method Not Allowed for others (TRACE, etc.)
// This applies to the entire application unless overridden per-route.
app.use(restrictHttpMethods);

// ============================================================================
// SECURITY: Rate Limiting
// ============================================================================
// Global rate limiter to mitigate DoS attacks and brute-force attempts.
// Configuration:
// - Default: 200 requests per 15 minutes per IP
// - Configurable via env vars: RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000), // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX || 200), // 200 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Optional: Skip rate limiting for health checks and other safe endpoints
    // Uncomment if needed:
    // if (req.path === '/health') return true;
    return false;
  }
});

// Apply global rate limiter to all routes
app.use(limiter);

// ============================================================================
// Body Parsing Middleware
// ============================================================================
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ============================================================================
// Database Connection
// ============================================================================
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error(
      'MongoDB connection error',
      error instanceof Error ? error : new Error(String(error))
    );
  });

// ============================================================================
// Routes
// ============================================================================
app.use('/api/auth', userRoutes);
app.use('/api', postRoutes);
app.use('/api', commentRoutes);
app.use('/api/notifications', notificationRoutes);

// Admin routes with IP allowlist middleware (when enabled)
app.use('/api/admin', ipAllowlist, adminRoutes);

// ============================================================================
// Health Check Endpoint
// ============================================================================
// This endpoint can be used by load balancers and monitoring systems.
// No authentication required.
app.get('/health', (req, res) => {
  res.json({ status: 'CCIT Wall API is running' });
});

// ============================================================================
// Centralized 404 & Error Handling
// ============================================================================
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ============================================================================
// Start Server
// ============================================================================
// Only listen if not running as a Vercel serverless function
if (process.env.VERCEL === undefined) {
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT} (${NODE_ENV})`, undefined, {
      port: PORT,
      nodeEnv: NODE_ENV,
      trustProxy: isProd && process.env.ENABLE_TRUST_PROXY !== 'false',
      rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 200),
      rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    });
  });
} else {
  logger.info(`Running as Vercel serverless function (${NODE_ENV})`);
}

export default app;

