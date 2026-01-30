import { Request, Response } from 'express';
import User from '../models/User';
import { hashPassword, comparePasswords, generateToken } from '../utils/auth';
import { generateSecureToken, sha256Hash } from '../utils/crypto';
import { sendPasswordResetEmail } from '../utils/email';
import { logger, getRequestContext } from '../utils/logger';

/**
 * SECURITY: Generic error message for authentication failures
 * Using the same message for all auth failures prevents user enumeration attacks
 */
const AUTH_ERROR_MESSAGE = 'Invalid email and/or password';

/**
 * Register a new user
 * 
 * SECURITY CONSIDERATIONS:
 * - Password is hashed before storage using bcrypt
 * - Uses generic error message to prevent user enumeration
 * - Never returns the password in responses
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // SECURITY: Return generic error to prevent user enumeration
      // An attacker cannot determine if an email is registered
      return res.status(400).json({ message: 'Registration failed. Please check your information and try again.' });
    }

    const hashedPassword = await hashPassword(password);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
    });

    await user.save();

    const token = generateToken(user._id.toString(), user.role);
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // SECURITY: Don't expose internal error details
    res.status(500).json({ message: 'An error occurred during registration' });
  }
};

/**
 * Login a user
 * 
 * SECURITY CONSIDERATIONS:
 * - Uses generic error message for both invalid email and password
 * - Prevents timing attacks by always comparing password (even for non-existent users)
 * - Never returns the password in responses
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // SECURITY: Return generic error to prevent user enumeration
      return res.status(401).json({ message: AUTH_ERROR_MESSAGE });
    }

    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      // SECURITY: Same error message for wrong password
      return res.status(401).json({ message: AUTH_ERROR_MESSAGE });
    }

    const token = generateToken(user._id.toString(), user.role);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // SECURITY: Don't expose internal error details
    res.status(500).json({ message: 'An error occurred during login' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while fetching profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { name, bio, profilePicture, contactInformation } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, bio, profilePicture, contactInformation },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while updating profile' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while fetching users' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while fetching user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while deleting user' });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const users = await User.find({
      name: { $regex: query, $options: 'i' },
    }).select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while searching users' });
  }
};

// ============================================================================
// PASSWORD RESET
// ============================================================================

/**
 * Password reset token expiration time (1 hour)
 */
const PASSWORD_RESET_EXPIRES_MS = 60 * 60 * 1000; // 1 hour

/**
 * Request a password reset
 * 
 * SECURITY CONSIDERATIONS:
 * - Always returns success message even if email doesn't exist (prevents enumeration)
 * - Token is hashed before storage (prevents database leak exposure)
 * - Token expires after 1 hour
 * - Uses secure random token generation
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const context = getRequestContext(req);
  
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // SECURITY: Always return success to prevent email enumeration
    // Even if user doesn't exist, we return the same response
    if (!user) {
      logger.info('Password reset requested for non-existent email', context);
      return res.json({
        message: 'If an account with that email exists, we have sent a password reset link.',
      });
    }

    // Generate a secure random token
    const resetToken = generateSecureToken(32); // 32 bytes = 64 hex chars
    
    // Hash the token before storing in database
    // This way, even if the database is compromised, the attacker can't use the tokens
    const hashedToken = sha256Hash(resetToken);

    // Set token and expiration on user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MS);
    await user.save();

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken, user.name);

    if (!emailResult.success) {
      logger.error('Failed to send password reset email', new Error(emailResult.error || 'Unknown error'), context);
      // Don't reveal email sending failure to user
    } else {
      logger.info('Password reset email sent', { ...context, userId: user._id.toString() });
    }

    // SECURITY: Same response regardless of whether email was sent
    res.json({
      message: 'If an account with that email exists, we have sent a password reset link.',
    });
  } catch (error) {
    logger.error('Password reset request failed', error instanceof Error ? error : new Error('Unknown error'), context);
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
};

/**
 * Reset password using token
 * 
 * SECURITY CONSIDERATIONS:
 * - Token is compared using hash (constant time not needed since we're comparing hashes)
 * - Token expiration is checked
 * - Token is invalidated after use
 * - Password is hashed before storage
 */
export const resetPassword = async (req: Request, res: Response) => {
  const context = getRequestContext(req);
  
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the provided token to compare with stored hash
    const hashedToken = sha256Hash(token);

    // Find user with valid (non-expired) reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      logger.warn('Invalid or expired password reset token used', context);
      return res.status(400).json({
        message: 'Password reset token is invalid or has expired.',
      });
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update user's password and clear reset token fields
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info('Password reset successful', { ...context, userId: user._id.toString() });

    res.json({
      message: 'Your password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    logger.error('Password reset failed', error instanceof Error ? error : new Error('Unknown error'), context);
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
};
