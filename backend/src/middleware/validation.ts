import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle validation results.
 * Returns a 400 status with validation errors if any exist.
 */
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * Validation rules for user registration.
 * - name: Required, trimmed, escaped to prevent XSS
 * - email: Must be a valid email format, normalized
 * - password: Minimum 8 characters, must contain uppercase, lowercase, number, and special character
 * - role: Optional, must be one of 'student', 'teacher', 'admin'
 */
export const validateRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[@$!%*?&]/).withMessage('Password must contain at least one special character (@$!%*?&)'),
  body('role')
    .optional()
    .isIn(['student', 'teacher', 'admin']).withMessage('Role must be one of: student, teacher, admin'),
  handleValidationErrors
];

/**
 * Validation rules for user login.
 * - email: Must be a valid email format
 * - password: Required (not empty)
 */
export const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validation rules for profile update.
 * - name: Optional, trimmed, escaped
 * - bio: Optional, trimmed, max 500 characters
 * - profilePicture: Optional, must be a valid URL
 * - contactInformation: Optional, trimmed, escaped
 */
export const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .escape(),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Bio must not exceed 500 characters'),
  body('profilePicture')
    .optional()
    .trim()
    .isURL().withMessage('Profile picture must be a valid URL'),
  body('contactInformation')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Contact information must not exceed 200 characters')
    .escape(),
  handleValidationErrors
];

/**
 * Validation rules for MongoDB ObjectId parameters.
 */
export const validateObjectId = [
  param('id')
    .isMongoId().withMessage('Invalid ID format'),
  handleValidationErrors
];

/**
 * Validation rules for search queries.
 * - query: Required, trimmed, minimum 1 character
 */
export const validateSearchQuery = [
  query('query')
    .trim()
    .notEmpty().withMessage('Search query is required')
    .isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters')
    .escape(),
  handleValidationErrors
];

// ============================================================================
// POST VALIDATION
// ============================================================================

/**
 * Validation rules for creating a post.
 * - title: Required, trimmed, 1-200 characters
 * - description: Required, trimmed, 1-5000 characters
 * - category: Required, must be one of the allowed categories
 * - isAnonymous: Optional, must be boolean
 * - attachments: Optional, must be array of valid URLs
 */
export const validateCreatePost = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters')
    .escape(),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 1, max: 5000 }).withMessage('Description must be between 1 and 5000 characters'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['college-activities', 'general', 'extracurricular']).withMessage('Category must be one of: college-activities, general, extracurricular'),
  body('isAnonymous')
    .optional()
    .isBoolean().withMessage('isAnonymous must be a boolean value'),
  body('attachments')
    .optional()
    .isArray().withMessage('Attachments must be an array')
    .custom((attachments: string[]) => {
      if (attachments && attachments.length > 0) {
        const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        for (const url of attachments) {
          if (!urlRegex.test(url)) {
            throw new Error('Each attachment must be a valid URL');
          }
        }
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Validation rules for updating a post.
 * Similar to create but all fields are optional.
 */
export const validateUpdatePost = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters')
    .escape(),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 }).withMessage('Description must be between 1 and 5000 characters'),
  body('category')
    .optional()
    .isIn(['college-activities', 'general', 'extracurricular']).withMessage('Category must be one of: college-activities, general, extracurricular'),
  body('isAnonymous')
    .optional()
    .isBoolean().withMessage('isAnonymous must be a boolean value'),
  body('attachments')
    .optional()
    .isArray().withMessage('Attachments must be an array'),
  handleValidationErrors
];

/**
 * Validation for post ID parameter.
 */
export const validatePostId = [
  param('id')
    .isMongoId().withMessage('Invalid post ID format'),
  handleValidationErrors
];

/**
 * Validation for reaction type.
 */
export const validateReaction = [
  param('id')
    .isMongoId().withMessage('Invalid post ID format'),
  body('reactionType')
    .notEmpty().withMessage('Reaction type is required')
    .isIn(['like', 'love', 'laugh', 'wow', 'sad', 'angry']).withMessage('Invalid reaction type'),
  handleValidationErrors
];

// ============================================================================
// COMMENT VALIDATION
// ============================================================================

/**
 * Validation rules for creating a comment.
 * - content: Required, trimmed, 1-2000 characters
 */
export const validateCreateComment = [
  param('postId')
    .isMongoId().withMessage('Invalid post ID format'),
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters'),
  handleValidationErrors
];

/**
 * Validation rules for updating a comment.
 */
export const validateUpdateComment = [
  param('id')
    .isMongoId().withMessage('Invalid comment ID format'),
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters'),
  handleValidationErrors
];

/**
 * Validation for comment ID parameter.
 */
export const validateCommentId = [
  param('id')
    .isMongoId().withMessage('Invalid comment ID format'),
  handleValidationErrors
];

/**
 * Validation for getting comments by post ID.
 */
export const validatePostIdParam = [
  param('postId')
    .isMongoId().withMessage('Invalid post ID format'),
  handleValidationErrors
];
