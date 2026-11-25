import { Request, Response } from 'express';
import User from '../models/User';
import { adminAuth } from '../utils/firebase';
import { logger } from '../utils/logger';
import { uploadProfilePicture, extractStoragePath, deleteFile } from '../utils/storage';

/**
 * Fields safe to expose on directory / search / public profile endpoints.
 * Excludes internal identity fields (firebaseUid, authProvider, emailVerified, __v).
 */
const PUBLIC_USER_SELECT = '_id name email role bio profilePicture contactInformation createdAt updatedAt';

/** Maximum accepted length for search queries (ReDoS / DoS hardening). */
const MAX_SEARCH_QUERY_LENGTH = 100;

/** Maximum number of results returned by a search. */
const MAX_SEARCH_RESULTS = 50;

/** Firebase Admin error codes that indicate an invalid / unusable ID token. */
const FIREBASE_TOKEN_ERROR_CODES = new Set([
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/user-disabled',
  'auth/argument-error',
]);

/** Escape user input so it is matched literally inside a MongoDB $regex. */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Parse a comma-separated env var into a normalized, lowercase list. */
const parseEnvList = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);

/**
 * Determine whether an email is allowlisted as faculty.
 * Requires a Firebase-verified email AND a match against either
 * FACULTY_EMAILS (exact emails) or FACULTY_EMAIL_DOMAINS (exact domains).
 */
const isFacultyEmail = (email: string, emailVerified: boolean | undefined): boolean => {
  if (emailVerified !== true) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const facultyEmails = parseEnvList(process.env.FACULTY_EMAILS);
  if (facultyEmails.includes(normalizedEmail)) return true;

  const atIndex = normalizedEmail.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = normalizedEmail.slice(atIndex + 1);
  const facultyDomains = parseEnvList(process.env.FACULTY_EMAIL_DOMAINS);
  return facultyDomains.includes(domain);
};

/**
 * Sync / upsert user profile after Firebase authentication.
 *
 * Called by the frontend after a successful Firebase sign-in (email/password or SSO).
 * Creates a MongoDB user record on first login or returns the existing one.
 *
 * Because first-time users won't exist in Mongo yet, this endpoint performs its
 * own Firebase token verification so it can run WITHOUT authMiddleware.
 *
 * SECURITY:
 * - Token is verified with checkRevoked = true.
 * - An existing account found by email is only linked to a new Firebase UID when
 *   the token's email is verified (prevents account takeover via unverified email).
 * - Role is never taken from the request body; 'teacher' is only granted to
 *   verified emails matching the FACULTY_EMAILS / FACULTY_EMAIL_DOMAINS allowlist.
 */
export const syncProfile = async (req: Request, res: Response) => {
  try {
    // Extract and verify Firebase ID token directly
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.slice(7);
    if (!token || token.trim() === '') {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decodedToken = await adminAuth.verifyIdToken(token, true);
    const { uid, email, name, picture, email_verified, firebase } = decodedToken;

    if (!uid || !email) {
      return res.status(400).json({ message: 'Invalid token — missing uid or email' });
    }

    // Determine auth provider
    const signInProvider = firebase?.sign_in_provider || 'password';

    // Only the display name is accepted from the body (role is intentionally ignored)
    const requestedName: unknown = req.body?.name;

    // 1. Look up by Firebase UID first
    let user = await User.findOne({ firebaseUid: uid });
    let linkedExisting = false;

    // 2. Fall back to email lookup, but only link when the email is verified
    if (!user) {
      const existingByEmail = await User.findOne({ email });
      if (existingByEmail) {
        if (existingByEmail.firebaseUid !== uid && email_verified !== true) {
          logger.warn('Blocked unverified email account linking attempt', {
            userId: existingByEmail._id.toString(),
          });
          return res.status(409).json({
            message: 'An account with this email already exists. Please verify your email before linking.',
          });
        }
        user = existingByEmail;
        linkedExisting = true;
      }
    }

    if (!user) {
      // First login — create Mongo user record
      const displayName =
        (typeof requestedName === 'string' && requestedName.trim()) || name || email.split('@')[0];
      const userRole = isFacultyEmail(email, email_verified) ? 'teacher' : 'student';

      user = new User({
        name: displayName,
        email,
        firebaseUid: uid,
        authProvider: signInProvider,
        emailVerified: email_verified === true,
        role: userRole,
        profilePicture: picture || undefined,
      });

      await user.save();
      logger.info('New user created via Firebase sync', {
        userId: user._id.toString(),
        provider: signInProvider,
        role: userRole,
      });
    } else {
      // Returning user — update firebaseUid (verified link only), provider, and email verification status
      let needsSave = false;

      if (uid !== user.firebaseUid) {
        // Reaching here implies email_verified === true (checked above)
        user.firebaseUid = uid;
        needsSave = true;
      }

      if (email_verified === true && !user.emailVerified) {
        user.emailVerified = true;
        needsSave = true;
      }

      if (signInProvider !== user.authProvider) {
        user.authProvider = signInProvider as typeof user.authProvider;
        needsSave = true;
      }

      if (needsSave) {
        await user.save();
        if (linkedExisting) {
          logger.info('Linked verified Firebase identity to existing account', {
            userId: user._id.toString(),
            provider: signInProvider,
          });
        }
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
  } catch (error: unknown) {
    const code = (error as { code?: unknown } | null)?.code;
    if (typeof code === 'string' && FIREBASE_TOKEN_ERROR_CODES.has(code)) {
      return res.status(401).json({ message: 'Invalid or expired authentication token' });
    }
    logger.error('Profile sync failed', error instanceof Error ? error : new Error('Unknown error'));
    res.status(500).json({ message: 'An error occurred during profile sync' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.user.userId).select('-__v');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Fetch profile failed', error instanceof Error ? error : new Error('Unknown error'));
    res.status(500).json({ message: 'An error occurred while fetching profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { name, bio, profilePicture, contactInformation } = req.body ?? {};

    // Only include fields that were actually provided (never overwrite with undefined)
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (bio !== undefined) update.bio = bio;
    if (profilePicture !== undefined) update.profilePicture = profilePicture;
    if (contactInformation !== undefined) update.contactInformation = contactInformation;

    const user = await User.findByIdAndUpdate(req.user.userId, { $set: update }, {
      new: true,
      runValidators: true,
    }).select('-__v');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    logger.error('Profile update failed', error instanceof Error ? error : new Error('Unknown error'));
    res.status(500).json({ message: 'An error occurred while updating profile' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select(PUBLIC_USER_SELECT);
    res.json(users);
  } catch (error) {
    logger.error('Fetch users failed', error instanceof Error ? error : new Error('Unknown error'));
    res.status(500).json({ message: 'An error occurred while fetching users' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select(PUBLIC_USER_SELECT);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    logger.error('Fetch user failed', error instanceof Error ? error : new Error('Unknown error'));
    res.status(500).json({ message: 'An error occurred while fetching user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    logger.info('User deleted by admin', { userId: req.params.id, adminId: req.user?.userId });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user failed', error instanceof Error ? error : new Error('Unknown error'));
    res.status(500).json({ message: 'An error occurred while deleting user' });
  }
};

/**
 * Upload and update the authenticated user's profile picture.
 *
 * Expects a single file via multipart/form-data with the field name "profilePicture".
 * Uploads to Firebase Storage under `profile-pictures/<userId>/`, saves the public
 * URL to the User document, and deletes the previous picture from storage if it was
 * also hosted in Firebase Storage.
 */
export const updateProfilePicture = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded. Please select an image.' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Upload new picture to Firebase Storage
    const newPictureUrl = await uploadProfilePicture(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      req.user.userId
    );

    // Delete old profile picture from Firebase Storage if it exists.
    // SECURITY (A01/IDOR): only delete objects inside this user's own
    // `profile-pictures/<userId>/` namespace. `profilePicture` can be set via
    // PUT /profile to any allowed-host URL, so without this check a user could
    // point it at another user's post/profile image and have it deleted here.
    if (user.profilePicture) {
      const oldStoragePath = extractStoragePath(user.profilePicture);
      const ownPrefix = `profile-pictures/${req.user.userId}/`;
      if (
        oldStoragePath &&
        oldStoragePath.startsWith(ownPrefix) &&
        !oldStoragePath.includes('..')
      ) {
        try {
          await deleteFile(oldStoragePath);
        } catch (err) {
          // Log but don't fail — old file cleanup is best-effort
          logger.warn('Failed to delete old profile picture from storage', { error: err });
        }
      }
    }

    // Update user document with new URL
    user.profilePicture = newPictureUrl;
    await user.save();

    logger.info('Profile picture updated', { userId: req.user.userId });

    res.json({
      message: 'Profile picture updated successfully',
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
  } catch (error: any) {
    // Handle multer/storage validation errors with friendly messages
    if (error.message?.includes('Unsupported file type') || error.message?.includes('File too large')) {
      return res.status(400).json({ message: error.message });
    }
    logger.error('Profile picture update failed', error instanceof Error ? error : new Error('Unknown error'));
    res.status(500).json({ message: 'An error occurred while updating profile picture' });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const safeQuery = escapeRegex(query.trim().slice(0, MAX_SEARCH_QUERY_LENGTH));

    const users = await User.find({
      name: { $regex: safeQuery, $options: 'i' },
    })
      .select(PUBLIC_USER_SELECT)
      .limit(MAX_SEARCH_RESULTS);

    res.json(users);
  } catch (error) {
    logger.error('User search failed', error instanceof Error ? error : new Error('Unknown error'));
    res.status(500).json({ message: 'An error occurred while searching users' });
  }
};
