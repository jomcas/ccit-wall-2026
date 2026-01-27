/**
 * Secure Logger Utility
 * 
 * This module provides structured logging with security best practices:
 * - Prevents logging of sensitive data (passwords, tokens, etc.)
 * - Structured JSON format for production (easier to parse/monitor)
 * - Human-readable format for development
 * - Log levels for filtering by severity
 * - Request context (correlation IDs, user IDs)
 * - Automatic PII sanitization
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  method?: string;
  path?: string;
  userAgent?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  [key: string]: unknown;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel;
const LOG_FORMAT = process.env.LOG_FORMAT || (NODE_ENV === 'production' ? 'json' : 'pretty');
const LOG_INCLUDE_STACK = process.env.LOG_INCLUDE_STACK !== 'false' || NODE_ENV !== 'production';

// Log level priority (higher = more severe)
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// =============================================================================
// SENSITIVE DATA PATTERNS
// =============================================================================

/**
 * Patterns that indicate sensitive data that should be redacted
 */
const SENSITIVE_KEYS = [
  'password',
  'passwd',
  'pass',
  'pwd',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'apikey',
  'authorization',
  'auth',
  'bearer',
  'jwt',
  'sessionId',
  'session_id',
  'cookie',
  'credit_card',
  'creditCard',
  'creditcard',
  'cc_number',
  'ccNumber',
  'cvv',
  'cvc',
  'ssn',
  'social_security',
  'socialSecurity',
  'pin',
  'otp',
  'totp',
  'private_key',
  'privateKey',
  'privatekey',
];

/**
 * Regex patterns for sensitive data detection
 */
const SENSITIVE_PATTERNS = [
  // JWT tokens (xxxx.xxxx.xxxx format)
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  // Bearer tokens in authorization headers
  /Bearer\s+[a-zA-Z0-9_-]+/gi,
  // Email addresses (partial redaction)
  /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  // Credit card numbers (basic pattern)
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  // MongoDB ObjectId patterns that might be sensitive
  // (we don't redact these by default, but can be enabled)
];

// Redaction placeholder
const REDACTED = '[REDACTED]';

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Check if a key name indicates sensitive data
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive.toLowerCase()));
}

/**
 * Sanitize a string value by replacing sensitive patterns
 */
function sanitizeString(value: string): string {
  let sanitized = value;
  
  // Redact JWT tokens
  sanitized = sanitized.replace(
    /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    REDACTED
  );
  
  // Redact Bearer tokens
  sanitized = sanitized.replace(
    /Bearer\s+[a-zA-Z0-9_-]+/gi,
    `Bearer ${REDACTED}`
  );
  
  return sanitized;
}

/**
 * Recursively sanitize an object, redacting sensitive fields
 */
export function sanitize(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = REDACTED;
      } else if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitize(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  return String(obj);
}

/**
 * Sanitize an Error object for logging
 */
function sanitizeError(err: Error): { name: string; message: string; stack?: string } {
  return {
    name: err.name,
    message: sanitizeString(err.message),
    ...(LOG_INCLUDE_STACK && err.stack ? { stack: sanitizeString(err.stack) } : {}),
  };
}

// =============================================================================
// FORMATTING FUNCTIONS
// =============================================================================

/**
 * Format timestamp in ISO 8601 format
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log entry as JSON (production format)
 */
function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Format log entry as human-readable text (development format)
 */
function formatPretty(entry: LogEntry): string {
  const { timestamp, level, message, context, error, ...rest } = entry;
  
  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
    fatal: '\x1b[35m', // Magenta
  };
  
  const reset = '\x1b[0m';
  const color = levelColors[level];
  const levelStr = `${color}[${level.toUpperCase()}]${reset}`;
  
  let output = `${timestamp} ${levelStr} ${message}`;
  
  if (context && Object.keys(context).length > 0) {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' ');
    output += ` | ${contextStr}`;
  }
  
  if (Object.keys(rest).length > 0) {
    output += ` | ${JSON.stringify(rest)}`;
  }
  
  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`;
    if (error.stack) {
      output += `\n  Stack: ${error.stack.split('\n').slice(1, 4).join('\n    ')}`;
    }
  }
  
  return output;
}

// =============================================================================
// LOGGER CLASS
// =============================================================================

class Logger {
  private minLevel: number;
  private format: 'json' | 'pretty';

  constructor() {
    this.minLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.info;
    this.format = LOG_FORMAT as 'json' | 'pretty';
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    extra?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: getTimestamp(),
      level,
      message,
      ...(context ? { context: sanitize(context) as LogContext } : {}),
      ...(error ? { error: sanitizeError(error) } : {}),
      ...(extra ? sanitize(extra) as Record<string, unknown> : {}),
    };

    const formatted = this.format === 'json' ? formatJson(entry) : formatPretty(entry);

    // Use appropriate console method based on level
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
    }
  }

  // =========================================================================
  // PUBLIC LOGGING METHODS
  // =========================================================================

  debug(message: string, context?: LogContext, extra?: Record<string, unknown>): void {
    this.log('debug', message, context, undefined, extra);
  }

  info(message: string, context?: LogContext, extra?: Record<string, unknown>): void {
    this.log('info', message, context, undefined, extra);
  }

  warn(message: string, context?: LogContext, extra?: Record<string, unknown>): void {
    this.log('warn', message, context, undefined, extra);
  }

  error(message: string, error?: Error, context?: LogContext, extra?: Record<string, unknown>): void {
    this.log('error', message, context, error, extra);
  }

  fatal(message: string, error?: Error, context?: LogContext, extra?: Record<string, unknown>): void {
    this.log('fatal', message, context, error, extra);
  }

  // =========================================================================
  // SECURITY-SPECIFIC LOGGING METHODS
  // =========================================================================

  /**
   * Log authentication-related events
   */
  authEvent(
    event: 'login_success' | 'login_failure' | 'logout' | 'token_refresh' | 'token_invalid' | 'password_change' | 'password_reset_request',
    context?: LogContext,
    extra?: Record<string, unknown>
  ): void {
    const level: LogLevel = event.includes('failure') || event.includes('invalid') ? 'warn' : 'info';
    this.log(level, `Auth event: ${event}`, context, undefined, { event, category: 'auth', ...extra });
  }

  /**
   * Log access control events
   */
  accessEvent(
    event: 'access_granted' | 'access_denied' | 'insufficient_permissions' | 'resource_not_found',
    context?: LogContext,
    extra?: Record<string, unknown>
  ): void {
    const level: LogLevel = event === 'access_granted' ? 'debug' : 'warn';
    this.log(level, `Access event: ${event}`, context, undefined, { event, category: 'access', ...extra });
  }

  /**
   * Log validation failures
   */
  validationFailure(
    field: string,
    reason: string,
    context?: LogContext,
    extra?: Record<string, unknown>
  ): void {
    this.log('warn', `Validation failure: ${field} - ${reason}`, context, undefined, {
      field,
      reason,
      category: 'validation',
      ...extra,
    });
  }

  /**
   * Log rate limit events
   */
  rateLimitEvent(
    event: 'rate_limit_exceeded' | 'rate_limit_warning',
    context?: LogContext,
    extra?: Record<string, unknown>
  ): void {
    this.log('warn', `Rate limit event: ${event}`, context, undefined, { event, category: 'ratelimit', ...extra });
  }

  /**
   * Log security-related suspicious activities
   */
  securityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext,
    extra?: Record<string, unknown>
  ): void {
    const level: LogLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.log(level, `Security event: ${event}`, context, undefined, {
      event,
      severity,
      category: 'security',
      ...extra,
    });
  }

  /**
   * Log HTTP request (for access logs)
   */
  httpRequest(
    method: string,
    path: string,
    statusCode: number,
    responseTimeMs: number,
    context?: LogContext
  ): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `${method} ${path} ${statusCode} ${responseTimeMs}ms`, context, undefined, {
      category: 'http',
      statusCode,
      responseTimeMs,
    });
  }

  /**
   * Log database operations (optional, can be verbose)
   */
  dbOperation(
    operation: string,
    collection: string,
    durationMs: number,
    context?: LogContext,
    extra?: Record<string, unknown>
  ): void {
    this.log('debug', `DB: ${operation} on ${collection} (${durationMs}ms)`, context, undefined, {
      category: 'database',
      operation,
      collection,
      durationMs,
      ...extra,
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const logger = new Logger();

// Also export the class for testing or custom instances
export { Logger };

// =============================================================================
// REQUEST CONTEXT HELPER
// =============================================================================

import { Request } from 'express';

/**
 * Extract logging context from an Express request
 */
export function getRequestContext(req: Request): LogContext {
  return {
    requestId: (req as any).requestId || req.headers['x-request-id'] as string,
    userId: (req as any).user?.userId,
    ip: req.ip || req.socket.remoteAddress,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
  };
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}
