import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * SECURITY: Password Hashing Configuration
 * 
 * Using bcrypt with a cost factor of 12 rounds for password hashing.
 * This provides a good balance between security and performance.
 * 
 * Cost factor explanation:
 * - Each increment doubles the computation time
 * - 12 rounds ≈ 250ms on modern hardware
 * - Provides strong protection against brute-force attacks
 * 
 * Configurable via BCRYPT_ROUNDS environment variable (default: 12, min: 10)
 */
const BCRYPT_MIN_ROUNDS = 10;
const BCRYPT_DEFAULT_ROUNDS = 12;

const getBcryptRounds = (): number => {
  const envRounds = parseInt(process.env.BCRYPT_ROUNDS || '', 10);
  if (!isNaN(envRounds) && envRounds >= BCRYPT_MIN_ROUNDS) {
    return envRounds;
  }
  return BCRYPT_DEFAULT_ROUNDS;
};

/**
 * Hash a password using bcrypt with secure salt rounds.
 * 
 * @param password - The plain text password to hash
 * @returns The hashed password with embedded salt
 */
export const hashPassword = async (password: string): Promise<string> => {
  const rounds = getBcryptRounds();
  const salt = await bcrypt.genSalt(rounds);
  return bcrypt.hash(password, salt);
};

/**
 * Compare a plain text password with a hashed password.
 * Uses constant-time comparison to prevent timing attacks.
 * 
 * @param password - The plain text password to verify
 * @param hashedPassword - The stored hashed password
 * @returns True if passwords match, false otherwise
 */
export const comparePasswords = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * SECURITY: JWT Token Generation
 * 
 * Generates a signed JWT token for authenticated users.
 * 
 * Security considerations:
 * - JWT_SECRET must be set in production (throws error if not set)
 * - Token expiration configurable via JWT_EXPIRES_IN (default: 24h)
 * - Shorter expiration in production is recommended for better security
 * 
 * @param userId - The user's unique identifier
 * @param role - The user's role for authorization
 * @returns A signed JWT token string
 * @throws Error if JWT_SECRET is not configured in production
 */
export const generateToken = (userId: string, role: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';
  
  // SECURITY: Require JWT_SECRET in production
  if (isProd && !jwtSecret) {
    throw new Error('SECURITY ERROR: JWT_SECRET must be set in production environment');
  }
  
  // Use environment variable or fallback to development secret
  // WARNING: The fallback secret should NEVER be used in production
  const secret = jwtSecret || 'dev-secret-do-not-use-in-production';
  
  // Token expiration: configurable, defaults to 24 hours
  // Shorter expiration = better security, worse UX
  // Default to '24h' which is a valid ms string format
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(
    { userId, role },
    secret,
    { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
  );
};

/**
 * Verify and decode a JWT token.
 * 
 * @param token - The JWT token to verify
 * @returns The decoded token payload or null if invalid
 */
export const verifyToken = (token: string): { userId: string; role: string } | null => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    const isProd = process.env.NODE_ENV === 'production';
    
    if (isProd && !jwtSecret) {
      throw new Error('SECURITY ERROR: JWT_SECRET must be set in production environment');
    }
    
    const secret = jwtSecret || 'dev-secret-do-not-use-in-production';
    const decoded = jwt.verify(token, secret) as { userId: string; role: string };
    return decoded;
  } catch (error) {
    return null;
  }
};
