/**
 * Error Handling Middleware
 * 
 * Secure error handling that:
 * - Never exposes stack traces in production
 * - Logs errors appropriately without sensitive data
 * - Returns consistent error response format
 * - Handles specific error types (validation, auth, not found, etc.)
 * - Adds request ID tracking for debugging
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { logger, getRequestContext, generateRequestId, LogContext } from '../utils/logger';

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validation failed', 400, true, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization/Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, 'FORBIDDEN_ERROR');
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
  }
}

/**
 * Conflict error (409) - e.g., duplicate resource
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, true, 'CONFLICT_ERROR');
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number) {
    super('Too many requests', 429, true, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

/**
 * Internal server error (500) - for unexpected errors
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    // Mark as non-operational since it's unexpected
    super(message, 500, false, 'INTERNAL_ERROR');
  }
}

// =============================================================================
// ERROR RESPONSE INTERFACE
// =============================================================================

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    requestId?: string;
    errors?: Array<{ field: string; message: string }>;
    // Stack only in development with DEBUG=true
    stack?: string;
  };
}

// =============================================================================
// MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Helper functions to check environment at runtime (for testing flexibility)
 */
function isProduction(): boolean {
  return (process.env.NODE_ENV || 'development') === 'production';
}

function shouldShowStack(): boolean {
  return process.env.DEBUG === 'true' && !isProduction();
}

/**
 * Request ID middleware - adds unique ID to each request for tracking
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Request logging middleware - logs incoming requests
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const context = getRequestContext(req);

  // Log request start at debug level
  logger.debug(`Incoming request: ${req.method} ${req.path}`, context);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.httpRequest(req.method, req.path, res.statusCode, duration, context);
  });

  next();
}

/**
 * 404 Not Found handler - catches requests to undefined routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const context = getRequestContext(req);
  logger.warn(`Route not found: ${req.method} ${req.path}`, context);
  next(new NotFoundError('Route'));
}

/**
 * Global error handler - processes all errors and sends appropriate responses
 */
export const globalErrorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const context: LogContext = getRequestContext(req);
  const requestId = (req as any).requestId;

  // Determine if this is an operational error (expected) or programming error (bug)
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? (err as AppError).statusCode : 500;
  const isOperational = isAppError ? (err as AppError).isOperational : false;

  // Log the error
  if (statusCode >= 500 || !isOperational) {
    // Unexpected errors - log with full details
    logger.error(
      `Unhandled error: ${err.message}`,
      err,
      context,
      { statusCode, isOperational }
    );

    // For critical unhandled errors, also log as security event
    if (!isOperational) {
      logger.securityEvent(
        'unhandled_error',
        'medium',
        context,
        { errorName: err.name, errorMessage: err.message }
      );
    }
  } else if (statusCode === 401 || statusCode === 403) {
    // Auth-related errors - log as auth events
    logger.authEvent(
      statusCode === 401 ? 'token_invalid' : 'login_failure',
      context,
      { errorMessage: err.message }
    );
  } else if (statusCode === 400 && err instanceof ValidationError) {
    // Validation errors - log fields that failed
    for (const validationErr of (err as ValidationError).errors) {
      logger.validationFailure(validationErr.field, validationErr.message, context);
    }
  } else if (statusCode === 429) {
    // Rate limit errors
    logger.rateLimitEvent('rate_limit_exceeded', context);
  } else {
    // Other operational errors - log at warn level
    logger.warn(`Request error: ${err.message}`, context, { statusCode });
  }

  // Build error response
  const response: ErrorResponse = {
    error: {
      // In production, use generic messages for 500 errors
      message: isProduction() && statusCode >= 500 ? 'Internal server error' : err.message,
      ...(isAppError && (err as AppError).code ? { code: (err as AppError).code } : {}),
      ...(requestId ? { requestId } : {}),
      // Include validation errors if present
      ...(err instanceof ValidationError ? { errors: err.errors } : {}),
      // Include stack trace only in development with DEBUG=true
      ...(shouldShowStack() && err.stack ? { stack: err.stack } : {}),
    },
  };

  // Set appropriate headers
  if (err instanceof RateLimitError && err.retryAfter) {
    res.setHeader('Retry-After', err.retryAfter);
  }

  // Send response
  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper - catches async errors and passes to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Unhandled rejection handler - for process-level error handling
 */
export function setupProcessErrorHandlers(): void {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.fatal('Unhandled Promise Rejection', error, undefined, {
      category: 'process',
      type: 'unhandledRejection',
    });

    // In production, consider graceful shutdown
    // process.exit(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.fatal('Uncaught Exception', error, undefined, {
      category: 'process',
      type: 'uncaughtException',
    });

    // Uncaught exceptions are unrecoverable - exit
    process.exit(1);
  });

  // Handle SIGTERM (graceful shutdown)
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    // Perform cleanup here
    process.exit(0);
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down');
    process.exit(0);
  });
}

// =============================================================================
// MONGODB ERROR HANDLER
// =============================================================================

/**
 * Transforms MongoDB errors into appropriate AppErrors
 */
export function handleMongoError(err: any): AppError {
  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return new ConflictError(`A record with this ${field} already exists`);
  }

  // Validation error from Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.entries(err.errors).map(([field, error]: [string, any]) => ({
      field,
      message: error.message,
    }));
    return new ValidationError(errors);
  }

  // Cast error (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return new ValidationError([{
      field: err.path,
      message: `Invalid ${err.path}: ${err.value}`,
    }]);
  }

  // Default to internal error
  return new InternalError('Database error occurred');
}

// =============================================================================
// HELPER: Safe error message extraction
// =============================================================================

/**
 * Safely extract error message without exposing internals
 */
export function getSafeErrorMessage(err: unknown): string {
  if (err instanceof AppError) {
    return err.message;
  }
  
  if (err instanceof Error) {
    // In production, don't expose error messages from unknown errors
    return isProduction() ? 'An unexpected error occurred' : err.message;
  }
  
  return 'An unexpected error occurred';
}
