import express, { Express } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import userRoutes from './routes/userRoutes';
import postRoutes from './routes/postRoutes';
import commentRoutes from './routes/commentRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { restrictHttpMethods, ipAllowlist } from './middleware/security';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ccit-wall';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

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
// SECURITY: Helmet - Comprehensive HTTP Header Hardening
// ============================================================================
// Helmet sets various HTTP headers to protect against common attacks:
// - X-Frame-Options: SAMEORIGIN (prevents clickjacking)
// - X-Content-Type-Options: nosniff (prevents MIME type sniffing)
// - Referrer-Policy: no-referrer (privacy-first referrer policy)
// - Cross-Origin-Opener-Policy: same-origin (prevents window.opener access)
// - And many others...
app.use(helmet({
  contentSecurityPolicy: false, // Disabled by default to avoid breaking existing assets
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be loaded cross-origin
  referrerPolicy: { policy: 'no-referrer' },
  frameguard: { action: 'sameorigin' }
}));

// Optional: Content Security Policy (CSP)
// Uncomment or enable via ENABLE_CSP=true to enforce strict CSP.
// This may break inline scripts or external asset loading—test carefully in development first.
if (process.env.ENABLE_CSP === 'true') {
  app.use(helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Adjust based on your frontend needs
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }));
}

// ============================================================================
// SECURITY: HTTP Method Restriction
// ============================================================================
// Restrict HTTP methods to only safe/common ones.
// - Allowed: GET, POST, HEAD
// - If CORS enabled (ENABLE_CORS=true): Also allow OPTIONS for preflight
// Returns 405 Method Not Allowed for others (PUT, DELETE, TRACE, etc.)
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
// CORS - Client URL Configuration
// ============================================================================
// CORS is explicitly enabled here. Origins are restricted to CLIENT_URL.
// For production, ensure CLIENT_URL is set to your frontend domain only.
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3002',
  'https://ccit-wall-2026-d5sb.vercel.app',
  'https://ccit-wall-2026.vercel.app'
];

// Add CLIENT_URL if it's set in environment
if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any Vercel preview deployment URL for this project
    if (origin.match(/^https:\/\/ccit-wall-2026.*\.vercel\.app$/)) {
      return callback(null, true);
    }
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================================================
// Body Parsing Middleware
// ============================================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// Static File Serving - Uploads Directory
// ============================================================================
// Serve uploaded files (images) from the uploads directory
// Use __dirname to ensure correct path regardless of working directory
const uploadsPath = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// ============================================================================
// Database Connection
// ============================================================================
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
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

// Serve frontend in production - MUST be after all API routes
app.get('*', (req, res, next) => {
  // Don't intercept API routes - let them fall through to 404 handler
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found', message: 'API endpoint not found' });
  }
  
  // Resolve absolute path to frontend build
  // Use __dirname to ensure correct path regardless of working directory
  const indexPath = path.join(__dirname, '..', '..', 'frontend', 'build', 'index.html');
  
  // Only serve index.html if it exists (production build)
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'Not Found',
      message: 'Frontend build not found. Run `npm run build` in frontend directory for production.'
    });
  }
});

// ============================================================================
// Error Handler (Optional but Recommended)
// ============================================================================
// Catch-all error handler that doesn't leak stack traces in production
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = isProd ? 'Internal Server Error' : err.message;
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.DEBUG === 'true' && { stack: err.stack })
  });
});

// ============================================================================
// Start Server
// ============================================================================
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} (${NODE_ENV})`);
  console.log(`Trust Proxy: ${isProd && process.env.ENABLE_TRUST_PROXY !== 'false' ? 'enabled' : 'disabled'}`);
  console.log(`Rate Limit: ${process.env.RATE_LIMIT_MAX || 200} requests per ${process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000}ms`);
});

export default app;

