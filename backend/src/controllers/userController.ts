import { Request, Response } from 'express';
import User from '../models/User';
import { adminAuth } from '../utils/firebase';
import { logger, getRequestContext } from '../utils/logger';

/**
 * Sync / upsert user profile after Firebase authentication.
 * 
 * Called by the frontend after a successful Firebase sign-in (email/password or SSO).
 * Creates a MongoDB user record on first login or returns the existing one.
 * The request must already be authenticated (authMiddleware verifies the token
 * and attaches req.user, but for first-time users the middleware will 404).
 * 
 * Because first-time users won't exist in Mongo yet, this endpoint performs its
 * own Firebase token verification so it can run WITHOUT authMiddleware.
 */
export const syncProfile = async (req: Request, res: Response) => {
  try {
    // Extract and verify Firebase ID token directly
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.slice(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    const { uid, email, name, picture, email_verified, firebase } = decodedToken;

    if (!uid || !email) {
      return res.status(400).json({ message: 'Invalid token — missing uid or email' });
    }

    // Determine auth provider
    const signInProvider = firebase?.sign_in_provider || 'password';

    // Check for optional role from request body (only used on first registration)
    const { role: requestedRole, name: requestedName } = req.body;

    // Try to find existing user
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // First login — create Mongo user record
      const displayName = requestedName || name || email.split('@')[0];
      const userRole = ['student', 'teacher'].includes(requestedRole) ? requestedRole : 'student';

      user = new User({
        name: displayName,
        email,
        firebaseUid: uid,
        authProvider: signInProvider,
        emailVerified: email_verified || false,
        role: userRole,
        profilePicture: picture || undefined,
      });

      await user.save();
      logger.info('New user created via Firebase sync', { userId: user._id.toString(), provider: signInProvider });
    } else {
      // Returning user — update email verification status and provider if changed
      let needsSave = false;

      if (email_verified && !user.emailVerified) {
        user.emailVerified = true;
        needsSave = true;
      }

      if (signInProvider !== user.authProvider) {
        user.authProvider = signInProvider as any;
        needsSave = true;
      }

      if (needsSave) {
        await user.save();
      }
    }

    res.json({
      message: 'Profile synced',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        emailVerified: user.emailVerified,
        authProvider: user.authProvider,
        bio: user.bio,
        contactInformation: user.contactInformation,
      },
    });
  } catch (error) {
    logger.error('Profile sync failed', error instanceof Error ? error : new Error('Unknown error'));
    res.status(500).json({ message: 'An error occurred during profile sync' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.user.userId);
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
    );

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
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while fetching users' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
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
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while searching users' });
  }
};


