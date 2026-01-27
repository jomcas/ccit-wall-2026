import { hashPassword, comparePasswords, generateToken, verifyToken } from '../src/utils/auth';

describe('Authentication and Password Management Security Tests', () => {
  
  // ============================================================================
  // PASSWORD HASHING TESTS
  // ============================================================================
  describe('Password Hashing', () => {
    const testPassword = 'SecureP@ssword123';

    it('should hash passwords and never store them in plain text', async () => {
      const hashedPassword = await hashPassword(testPassword);
      
      // Hash should not equal the original password
      expect(hashedPassword).not.toBe(testPassword);
      
      // Hash should be a bcrypt hash (starts with $2a$ or $2b$)
      expect(hashedPassword).toMatch(/^\$2[ab]\$/);
    });

    it('should generate different hashes for the same password (salting)', async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);
      
      // Same password should produce different hashes due to unique salts
      expect(hash1).not.toBe(hash2);
    });

    it('should use at least 10 bcrypt rounds for security', async () => {
      const hashedPassword = await hashPassword(testPassword);
      
      // Extract the cost factor from the bcrypt hash
      // Format: $2a$XX$... where XX is the cost factor
      const costFactor = parseInt(hashedPassword.split('$')[2], 10);
      
      expect(costFactor).toBeGreaterThanOrEqual(10);
    });

    it('should correctly verify a valid password', async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isValid = await comparePasswords(testPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isValid = await comparePasswords('WrongPassword123!', hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty password gracefully', async () => {
      const hashedPassword = await hashPassword('');
      const isValid = await comparePasswords('', hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should handle special characters in passwords', async () => {
      const specialPassword = 'P@$$w0rd!#%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await hashPassword(specialPassword);
      const isValid = await comparePasswords(specialPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'A'.repeat(100) + '1!aB';
      const hashedPassword = await hashPassword(longPassword);
      const isValid = await comparePasswords(longPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });
  });

  // ============================================================================
  // JWT TOKEN TESTS
  // ============================================================================
  describe('JWT Token Security', () => {
    const testUserId = '507f1f77bcf86cd799439011';
    const testRole = 'student';

    beforeEach(() => {
      // Set test JWT secret
      process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
      process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
      delete process.env.JWT_SECRET;
      delete process.env.NODE_ENV;
    });

    it('should generate a valid JWT token', () => {
      const token = generateToken(testUserId, testRole);
      
      // Token should be a string
      expect(typeof token).toBe('string');
      
      // Token should have three parts (header.payload.signature)
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include userId and role in token payload', () => {
      const token = generateToken(testUserId, testRole);
      const decoded = verifyToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testUserId);
      expect(decoded?.role).toBe(testRole);
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken(testUserId, testRole);
      const token2 = generateToken('different-user-id', 'admin');
      
      expect(token1).not.toBe(token2);
    });

    it('should fail verification for tampered tokens', () => {
      const token = generateToken(testUserId, testRole);
      const [header, payload, signature] = token.split('.');
      
      // Tamper with the payload
      const tamperedPayload = Buffer.from(JSON.stringify({
        userId: 'hacked-user-id',
        role: 'admin'
      })).toString('base64');
      
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;
      const decoded = verifyToken(tamperedToken);
      
      expect(decoded).toBeNull();
    });

    it('should fail verification for expired tokens', async () => {
      // Set a very short expiration
      process.env.JWT_EXPIRES_IN = '1ms';
      
      const token = generateToken(testUserId, testRole);
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const decoded = verifyToken(token);
      
      expect(decoded).toBeNull();
    });

    it('should fail verification with wrong secret', () => {
      const token = generateToken(testUserId, testRole);
      
      // Change the secret
      process.env.JWT_SECRET = 'different-secret';
      
      const decoded = verifyToken(token);
      
      expect(decoded).toBeNull();
    });

    it('should require JWT_SECRET in production environment', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      
      expect(() => generateToken(testUserId, testRole))
        .toThrow('SECURITY ERROR: JWT_SECRET must be set in production environment');
    });
  });

  // ============================================================================
  // BCRYPT ROUNDS CONFIGURATION TESTS
  // ============================================================================
  describe('Bcrypt Rounds Configuration', () => {
    afterEach(() => {
      delete process.env.BCRYPT_ROUNDS;
    });

    it('should use default rounds (12) when BCRYPT_ROUNDS is not set', async () => {
      delete process.env.BCRYPT_ROUNDS;
      
      const hashedPassword = await hashPassword('TestPassword1!');
      const costFactor = parseInt(hashedPassword.split('$')[2], 10);
      
      expect(costFactor).toBe(12);
    });

    it('should respect BCRYPT_ROUNDS environment variable', async () => {
      process.env.BCRYPT_ROUNDS = '14';
      
      // Need to re-import to get fresh module with new env
      jest.resetModules();
      const { hashPassword: freshHashPassword } = await import('../src/utils/auth');
      
      const hashedPassword = await freshHashPassword('TestPassword1!');
      const costFactor = parseInt(hashedPassword.split('$')[2], 10);
      
      expect(costFactor).toBe(14);
    });

    it('should use minimum 10 rounds even if lower value is set', async () => {
      process.env.BCRYPT_ROUNDS = '5';
      
      jest.resetModules();
      const { hashPassword: freshHashPassword } = await import('../src/utils/auth');
      
      const hashedPassword = await freshHashPassword('TestPassword1!');
      const costFactor = parseInt(hashedPassword.split('$')[2], 10);
      
      // Should use default (12) since 5 is below minimum (10)
      expect(costFactor).toBeGreaterThanOrEqual(10);
    });
  });
});
