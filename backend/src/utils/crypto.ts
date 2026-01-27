import crypto, { BinaryToTextEncoding } from 'crypto';

/**
 * Cryptographic Utilities Module
 * 
 * Provides cryptographically secure random value generation using Node.js
 * built-in crypto module. All functions use CSPRNG (Cryptographically Secure
 * Pseudo-Random Number Generator) for security-sensitive operations.
 * 
 * SECURITY NOTE: Never use Math.random() for security-sensitive values like:
 * - Session IDs
 * - CSRF tokens
 * - Password reset tokens
 * - API keys
 * - Any secret or unguessable value
 */

/**
 * Generate a cryptographically secure random string.
 * 
 * Uses crypto.randomBytes() which is a CSPRNG suitable for generating
 * tokens, session IDs, and other security-sensitive values.
 * 
 * @param length - The length of the random string (default: 32)
 * @param encoding - The encoding to use ('hex', 'base64', 'base64url') (default: 'hex')
 * @returns A cryptographically secure random string
 */
export const generateSecureToken = (
  length: number = 32,
  encoding: BufferEncoding = 'hex'
): string => {
  // For hex encoding, we need half the bytes since each byte = 2 hex chars
  // For base64, roughly 3 bytes = 4 chars
  const byteLength = encoding === 'hex' ? Math.ceil(length / 2) : Math.ceil(length * 0.75);
  return crypto.randomBytes(byteLength).toString(encoding).slice(0, length);
};

/**
 * Generate a cryptographically secure UUID v4.
 * 
 * Uses crypto.randomUUID() which generates a RFC 4122 compliant UUID v4
 * using a CSPRNG.
 * 
 * @returns A cryptographically secure UUID v4 string
 */
export const generateSecureUUID = (): string => {
  return crypto.randomUUID();
};

/**
 * Generate a secure password reset token.
 * 
 * Creates a URL-safe token suitable for password reset links.
 * Uses base64url encoding which is safe for URLs without additional encoding.
 * 
 * @param expiresInMinutes - Token expiration time in minutes (default: 60)
 * @returns Object containing the token and expiration timestamp
 */
export const generatePasswordResetToken = (expiresInMinutes: number = 60): {
  token: string;
  expiresAt: Date;
} => {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  
  return { token, expiresAt };
};

/**
 * Generate a secure CSRF token.
 * 
 * Creates a token suitable for CSRF protection in forms.
 * 
 * @returns A 32-character hex string CSRF token
 */
export const generateCSRFToken = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Generate a secure API key.
 * 
 * Creates a long, URL-safe API key with a prefix for easy identification.
 * 
 * @param prefix - Optional prefix for the API key (e.g., 'sk_live_', 'pk_test_')
 * @returns A secure API key string
 */
export const generateAPIKey = (prefix: string = ''): string => {
  const key = crypto.randomBytes(32).toString('base64url');
  return `${prefix}${key}`;
};

/**
 * Generate a secure session ID.
 * 
 * Creates a session identifier with high entropy suitable for session management.
 * 
 * @returns A 64-character hex string session ID
 */
export const generateSessionId = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Securely compare two strings in constant time.
 * 
 * Prevents timing attacks by ensuring the comparison takes the same
 * amount of time regardless of where the strings differ.
 * 
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal, false otherwise
 */
export const secureCompare = (a: string, b: string): boolean => {
  // Convert strings to buffers for timingSafeEqual
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  
  // If lengths differ, still do a comparison to maintain constant time
  // but we know the result will be false
  if (bufA.length !== bufB.length) {
    // Compare with a dummy buffer of same length as bufA
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Hash a value using SHA-256.
 * 
 * Useful for creating fingerprints or checksums. NOT suitable for password hashing
 * (use bcrypt for passwords).
 * 
 * @param value - The value to hash
 * @param encoding - The output encoding (default: 'hex')
 * @returns The SHA-256 hash of the value
 */
export const sha256Hash = (value: string, encoding: BinaryToTextEncoding = 'hex'): string => {
  return crypto.createHash('sha256').update(value).digest(encoding);
};

/**
 * Generate a hash-based message authentication code (HMAC).
 * 
 * Useful for verifying data integrity and authenticity.
 * 
 * @param data - The data to sign
 * @param secret - The secret key for HMAC
 * @param algorithm - The hash algorithm (default: 'sha256')
 * @returns The HMAC signature
 */
export const generateHMAC = (
  data: string,
  secret: string,
  algorithm: string = 'sha256'
): string => {
  return crypto.createHmac(algorithm, secret).update(data).digest('hex');
};

/**
 * Verify an HMAC signature.
 * 
 * Uses constant-time comparison to prevent timing attacks.
 * 
 * @param data - The original data
 * @param signature - The HMAC signature to verify
 * @param secret - The secret key used for signing
 * @param algorithm - The hash algorithm (default: 'sha256')
 * @returns True if signature is valid, false otherwise
 */
export const verifyHMAC = (
  data: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean => {
  const expectedSignature = generateHMAC(data, secret, algorithm);
  return secureCompare(signature, expectedSignature);
};
