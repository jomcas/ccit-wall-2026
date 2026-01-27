import {
  generateSecureToken,
  generateSecureUUID,
  generatePasswordResetToken,
  generateCSRFToken,
  generateAPIKey,
  generateSessionId,
  secureCompare,
  sha256Hash,
  generateHMAC,
  verifyHMAC,
} from '../src/utils/crypto';

describe('Cryptographic Practices Security Tests', () => {
  
  // ============================================================================
  // SECURE TOKEN GENERATION TESTS
  // ============================================================================
  describe('Secure Token Generation', () => {
    it('should generate tokens of specified length', () => {
      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);
      const token64 = generateSecureToken(64);
      
      expect(token16.length).toBe(16);
      expect(token32.length).toBe(32);
      expect(token64.length).toBe(64);
    });

    it('should generate unique tokens (CSPRNG)', () => {
      const tokens = new Set<string>();
      
      // Generate 1000 tokens and ensure they're all unique
      for (let i = 0; i < 1000; i++) {
        tokens.add(generateSecureToken(32));
      }
      
      expect(tokens.size).toBe(1000);
    });

    it('should support different encodings', () => {
      const hexToken = generateSecureToken(32, 'hex');
      const base64Token = generateSecureToken(32, 'base64');
      const base64urlToken = generateSecureToken(32, 'base64url');
      
      // Hex should only contain 0-9, a-f
      expect(hexToken).toMatch(/^[0-9a-f]+$/);
      
      // Base64 may contain +, /, =
      expect(base64Token).toMatch(/^[A-Za-z0-9+/=]+$/);
      
      // Base64url should not contain +, /, = (URL-safe)
      expect(base64urlToken).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should default to 32 character hex tokens', () => {
      const token = generateSecureToken();
      
      expect(token.length).toBe(32);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  // ============================================================================
  // UUID GENERATION TESTS
  // ============================================================================
  describe('Secure UUID Generation', () => {
    it('should generate valid UUID v4 format', () => {
      const uuid = generateSecureUUID();
      
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set<string>();
      
      for (let i = 0; i < 1000; i++) {
        uuids.add(generateSecureUUID());
      }
      
      expect(uuids.size).toBe(1000);
    });
  });

  // ============================================================================
  // PASSWORD RESET TOKEN TESTS
  // ============================================================================
  describe('Password Reset Token Generation', () => {
    it('should generate a URL-safe token', () => {
      const { token } = generatePasswordResetToken();
      
      // Should be base64url encoded (no +, /, =)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        const { token } = generatePasswordResetToken();
        tokens.add(token);
      }
      
      expect(tokens.size).toBe(100);
    });

    it('should include expiration timestamp', () => {
      const { expiresAt } = generatePasswordResetToken(60); // 60 minutes
      
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should respect custom expiration time', () => {
      const now = Date.now();
      const { expiresAt } = generatePasswordResetToken(30); // 30 minutes
      
      const expectedExpiration = now + 30 * 60 * 1000;
      // Allow 1 second tolerance for test execution time
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiration - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiration + 1000);
    });

    it('should default to 60 minute expiration', () => {
      const now = Date.now();
      const { expiresAt } = generatePasswordResetToken();
      
      const expectedExpiration = now + 60 * 60 * 1000;
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiration - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiration + 1000);
    });
  });

  // ============================================================================
  // CSRF TOKEN TESTS
  // ============================================================================
  describe('CSRF Token Generation', () => {
    it('should generate 32-character hex tokens', () => {
      const token = generateCSRFToken();
      
      expect(token.length).toBe(32);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique CSRF tokens', () => {
      const tokens = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCSRFToken());
      }
      
      expect(tokens.size).toBe(100);
    });
  });

  // ============================================================================
  // API KEY GENERATION TESTS
  // ============================================================================
  describe('API Key Generation', () => {
    it('should generate URL-safe API keys', () => {
      const key = generateAPIKey();
      
      // Should be base64url encoded
      expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should support custom prefixes', () => {
      const liveKey = generateAPIKey('sk_live_');
      const testKey = generateAPIKey('pk_test_');
      
      expect(liveKey).toMatch(/^sk_live_[A-Za-z0-9_-]+$/);
      expect(testKey).toMatch(/^pk_test_[A-Za-z0-9_-]+$/);
    });

    it('should generate unique API keys', () => {
      const keys = new Set<string>();
      
      for (let i = 0; i < 100; i++) {
        keys.add(generateAPIKey('key_'));
      }
      
      expect(keys.size).toBe(100);
    });
  });

  // ============================================================================
  // SESSION ID TESTS
  // ============================================================================
  describe('Session ID Generation', () => {
    it('should generate 64-character hex session IDs', () => {
      const sessionId = generateSessionId();
      
      expect(sessionId.length).toBe(64);
      expect(sessionId).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique session IDs', () => {
      const sessionIds = new Set<string>();
      
      for (let i = 0; i < 1000; i++) {
        sessionIds.add(generateSessionId());
      }
      
      expect(sessionIds.size).toBe(1000);
    });
  });

  // ============================================================================
  // SECURE COMPARE TESTS (Timing Attack Prevention)
  // ============================================================================
  describe('Secure String Comparison', () => {
    it('should return true for equal strings', () => {
      expect(secureCompare('password123', 'password123')).toBe(true);
      expect(secureCompare('', '')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(secureCompare('password123', 'password124')).toBe(false);
      expect(secureCompare('abc', 'abcd')).toBe(false);
      expect(secureCompare('password', '')).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      expect(secureCompare('short', 'longer string')).toBe(false);
      expect(secureCompare('a', 'aa')).toBe(false);
    });

    it('should handle special characters', () => {
      const special1 = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const special2 = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      
      expect(secureCompare(special1, special2)).toBe(true);
    });
  });

  // ============================================================================
  // SHA-256 HASH TESTS
  // ============================================================================
  describe('SHA-256 Hashing', () => {
    it('should generate consistent hashes for same input', () => {
      const hash1 = sha256Hash('test data');
      const hash2 = sha256Hash('test data');
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = sha256Hash('data1');
      const hash2 = sha256Hash('data2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex hashes by default', () => {
      const hash = sha256Hash('test');
      
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should support different encodings', () => {
      const hexHash = sha256Hash('test', 'hex');
      const base64Hash = sha256Hash('test', 'base64');
      
      expect(hexHash).toMatch(/^[0-9a-f]+$/);
      expect(base64Hash).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
  });

  // ============================================================================
  // HMAC TESTS
  // ============================================================================
  describe('HMAC Generation and Verification', () => {
    const testData = 'important data to sign';
    const secret = 'my-secret-key';

    it('should generate consistent HMACs for same data and secret', () => {
      const hmac1 = generateHMAC(testData, secret);
      const hmac2 = generateHMAC(testData, secret);
      
      expect(hmac1).toBe(hmac2);
    });

    it('should generate different HMACs for different data', () => {
      const hmac1 = generateHMAC('data1', secret);
      const hmac2 = generateHMAC('data2', secret);
      
      expect(hmac1).not.toBe(hmac2);
    });

    it('should generate different HMACs for different secrets', () => {
      const hmac1 = generateHMAC(testData, 'secret1');
      const hmac2 = generateHMAC(testData, 'secret2');
      
      expect(hmac1).not.toBe(hmac2);
    });

    it('should verify valid HMACs', () => {
      const signature = generateHMAC(testData, secret);
      
      expect(verifyHMAC(testData, signature, secret)).toBe(true);
    });

    it('should reject invalid HMACs', () => {
      const signature = generateHMAC(testData, secret);
      
      expect(verifyHMAC(testData, signature, 'wrong-secret')).toBe(false);
      expect(verifyHMAC('tampered data', signature, secret)).toBe(false);
    });

    it('should support different algorithms', () => {
      const sha256Hmac = generateHMAC(testData, secret, 'sha256');
      const sha512Hmac = generateHMAC(testData, secret, 'sha512');
      
      // SHA-512 produces longer output
      expect(sha512Hmac.length).toBeGreaterThan(sha256Hmac.length);
    });
  });

  // ============================================================================
  // ENTROPY/RANDOMNESS TESTS
  // ============================================================================
  describe('Randomness Quality', () => {
    it('should have good character distribution in generated tokens', () => {
      // Generate a long token and check character distribution
      const token = generateSecureToken(10000, 'hex');
      
      const charCount: { [key: string]: number } = {};
      for (const char of token) {
        charCount[char] = (charCount[char] || 0) + 1;
      }
      
      // For hex, we expect roughly equal distribution of 0-9, a-f
      // Each character should appear roughly 10000/16 ≈ 625 times
      // Allow for some variance (within 40%)
      const expectedCount = 10000 / 16;
      const tolerance = expectedCount * 0.4;
      
      for (const char of '0123456789abcdef') {
        const count = charCount[char] || 0;
        expect(count).toBeGreaterThan(expectedCount - tolerance);
        expect(count).toBeLessThan(expectedCount + tolerance);
      }
    });
  });
});
