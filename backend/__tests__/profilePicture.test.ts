/**
 * Profile Picture Upload API Tests
 *
 * Tests for the PATCH /api/auth/profile/picture endpoint including:
 * - Authentication checks
 * - File validation (missing file, invalid type, file too large)
 * - Successful upload with and without existing profile picture
 * - Old picture cleanup (best-effort deletion)
 * - Error handling
 */

import express, { Express } from 'express';
import request from 'supertest';

// Mock mongoose before importing controllers
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn(),
    connect: jest.fn(),
    connection: {
      close: jest.fn(),
    },
  };
});

// Mock the User model
const mockUserModel = {
  findById: jest.fn(),
  findOne: jest.fn(),
};

jest.mock('../src/models/User', () => mockUserModel);

// Mock storage utilities
const mockUploadProfilePicture = jest.fn();
const mockExtractStoragePath = jest.fn();
const mockDeleteFile = jest.fn();

jest.mock('../src/utils/storage', () => ({
  uploadProfilePicture: mockUploadProfilePicture,
  extractStoragePath: mockExtractStoragePath,
  deleteFile: mockDeleteFile,
  uploadFile: jest.fn(),
}));

// Mock firebase
jest.mock('../src/utils/firebase', () => ({
  adminAuth: { verifyIdToken: jest.fn() },
  adminStorage: { name: 'test-bucket', file: jest.fn() },
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  getRequestContext: jest.fn(),
}));

// Mock auth middleware
jest.mock('../src/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = { userId: 'user123', role: 'student' };
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  },
}));

import { updateProfilePicture } from '../src/controllers/userController';
import multer from 'multer';

// Set up a multer instance for testing (mirrors profilePictureUpload config)
const testUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

describe('Profile Picture Upload API', () => {
  let app: Express;

  // Helper to create a mock user object
  const createMockUser = (overrides: Record<string, any> = {}) => ({
    _id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'student',
    profilePicture: null,
    emailVerified: true,
    authProvider: 'password',
    bio: null,
    contactInformation: null,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Simulate auth middleware
    app.use((req: any, _res, next) => {
      if (req.headers.authorization === 'Bearer valid-token') {
        req.user = { userId: 'user123', role: 'student' };
      }
      next();
    });

    // Mount route with multer + controller
    app.patch(
      '/api/auth/profile/picture',
      testUpload.single('profilePicture'),
      updateProfilePicture
    );

    jest.clearAllMocks();
  });

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================
  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .attach('profilePicture', Buffer.from('fake-image'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  // ============================================================================
  // FILE VALIDATION TESTS
  // ============================================================================
  describe('File Validation', () => {
    it('should return 400 if no file is uploaded', async () => {
      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No file uploaded. Please select an image.');
    });

    it('should return 400 if upload throws unsupported file type error', async () => {
      const mockUser = createMockUser();
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUploadProfilePicture.mockRejectedValue(
        new Error('Unsupported file type: application/pdf. Allowed: JPEG, PNG, GIF, WebP')
      );

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('fake-pdf-data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Unsupported file type');
    });

    it('should return 400 if upload throws file too large error', async () => {
      const mockUser = createMockUser();
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUploadProfilePicture.mockRejectedValue(
        new Error('File too large (6.0 MB). Max: 5 MB.')
      );

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('fake-large-data'), {
          filename: 'large.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('File too large');
    });
  });

  // ============================================================================
  // USER NOT FOUND TESTS
  // ============================================================================
  describe('User Not Found', () => {
    it('should return 404 if user is not found in database', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('fake-image'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
      expect(mockUserModel.findById).toHaveBeenCalledWith('user123');
    });
  });

  // ============================================================================
  // SUCCESSFUL UPLOAD TESTS
  // ============================================================================
  describe('Successful Upload', () => {
    it('should upload profile picture and return updated user', async () => {
      const mockUser = createMockUser();
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUploadProfilePicture.mockResolvedValue(
        'https://storage.googleapis.com/test-bucket/profile-pictures/user123/abc.jpg'
      );

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('fake-image-data'), {
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile picture updated successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.profilePicture).toBe(
        'https://storage.googleapis.com/test-bucket/profile-pictures/user123/abc.jpg'
      );
      expect(response.body.user.id).toBe('user123');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user.email).toBe('test@example.com');

      // Verify upload was called with correct arguments
      expect(mockUploadProfilePicture).toHaveBeenCalledWith(
        expect.any(Buffer),
        'image/jpeg',
        'avatar.jpg',
        'user123'
      );

      // Verify user was saved
      expect(mockUser.save).toHaveBeenCalled();

      // No old picture to delete
      expect(mockExtractStoragePath).not.toHaveBeenCalled();
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it('should delete old profile picture when uploading a new one', async () => {
      const oldPictureUrl = 'https://storage.googleapis.com/test-bucket/profile-pictures/user123/old.jpg';
      const oldStoragePath = 'profile-pictures/user123/old.jpg';
      const newPictureUrl = 'https://storage.googleapis.com/test-bucket/profile-pictures/user123/new.jpg';

      const mockUser = createMockUser({ profilePicture: oldPictureUrl });
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUploadProfilePicture.mockResolvedValue(newPictureUrl);
      mockExtractStoragePath.mockReturnValue(oldStoragePath);
      mockDeleteFile.mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('new-image-data'), {
          filename: 'new-avatar.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(200);
      expect(response.body.user.profilePicture).toBe(newPictureUrl);

      // Verify old picture cleanup
      expect(mockExtractStoragePath).toHaveBeenCalledWith(oldPictureUrl);
      expect(mockDeleteFile).toHaveBeenCalledWith(oldStoragePath);
    });

    it('should not fail if old picture deletion fails (best-effort)', async () => {
      const oldPictureUrl = 'https://storage.googleapis.com/test-bucket/profile-pictures/user123/old.jpg';
      const oldStoragePath = 'profile-pictures/user123/old.jpg';
      const newPictureUrl = 'https://storage.googleapis.com/test-bucket/profile-pictures/user123/new.jpg';

      const mockUser = createMockUser({ profilePicture: oldPictureUrl });
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUploadProfilePicture.mockResolvedValue(newPictureUrl);
      mockExtractStoragePath.mockReturnValue(oldStoragePath);
      mockDeleteFile.mockRejectedValue(new Error('Storage delete failed'));

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('new-image-data'), {
          filename: 'new-avatar.jpg',
          contentType: 'image/jpeg',
        });

      // Should still succeed despite deletion failure
      expect(response.status).toBe(200);
      expect(response.body.user.profilePicture).toBe(newPictureUrl);
      expect(mockDeleteFile).toHaveBeenCalledWith(oldStoragePath);
    });

    it('should skip deletion if old picture URL is not from Firebase Storage', async () => {
      const externalUrl = 'https://example.com/external-avatar.jpg';
      const newPictureUrl = 'https://storage.googleapis.com/test-bucket/profile-pictures/user123/new.jpg';

      const mockUser = createMockUser({ profilePicture: externalUrl });
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUploadProfilePicture.mockResolvedValue(newPictureUrl);
      mockExtractStoragePath.mockReturnValue(null); // Not a Firebase Storage URL

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('new-image-data'), {
          filename: 'new-avatar.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(200);
      expect(mockExtractStoragePath).toHaveBeenCalledWith(externalUrl);
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it('should handle PNG file uploads', async () => {
      const mockUser = createMockUser();
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUploadProfilePicture.mockResolvedValue(
        'https://storage.googleapis.com/test-bucket/profile-pictures/user123/abc.png'
      );

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('fake-png-data'), {
          filename: 'avatar.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(200);
      expect(mockUploadProfilePicture).toHaveBeenCalledWith(
        expect.any(Buffer),
        'image/png',
        'avatar.png',
        'user123'
      );
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================
  describe('Error Handling', () => {
    it('should return 500 for unexpected upload errors', async () => {
      const mockUser = createMockUser();
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUploadProfilePicture.mockRejectedValue(new Error('Firebase connection failed'));

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('fake-image-data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while updating profile picture');
    });

    it('should return 500 if user.save() fails', async () => {
      const mockUser = createMockUser();
      mockUser.save.mockRejectedValue(new Error('Database write failed'));
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUploadProfilePicture.mockResolvedValue(
        'https://storage.googleapis.com/test-bucket/profile-pictures/user123/abc.jpg'
      );

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('fake-image-data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while updating profile picture');
    });

    it('should return 500 if findById throws', async () => {
      mockUserModel.findById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('fake-image-data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while updating profile picture');
    });
  });

  // ============================================================================
  // RESPONSE FORMAT TESTS
  // ============================================================================
  describe('Response Format', () => {
    it('should return all expected user fields in response', async () => {
      const mockUser = createMockUser({
        bio: 'Hello world',
        contactInformation: { phone: '123-456' },
      });
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUploadProfilePicture.mockResolvedValue(
        'https://storage.googleapis.com/test-bucket/profile-pictures/user123/abc.jpg'
      );

      const response = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer valid-token')
        .attach('profilePicture', Buffer.from('fake-image-data'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(200);
      const { user } = response.body;
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('profilePicture');
      expect(user).toHaveProperty('emailVerified');
      expect(user).toHaveProperty('authProvider');
      expect(user).toHaveProperty('bio');
      expect(user).toHaveProperty('contactInformation');
    });
  });
});
