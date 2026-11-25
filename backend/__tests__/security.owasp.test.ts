/**
 * OWASP Top 10 Hardening — Regression Suite
 *
 * Locks in the security fixes applied across auth/access, posts/media and
 * infra/validation slices:
 *   A01 Broken Access Control       — account linking, role escalation, anonymous
 *                                     masking, auth-required routes, field projection,
 *                                     attachment injection, profile-picture IDOR
 *   A03 Injection                   — regex escaping (ReDoS), operator/array injection
 *   A04/A08 Insecure Design/Integrity — image magic-byte verification
 *   A05/A09 Misconfiguration/Logging — CORS 403, no raw error leakage on 500
 *   A07 Identification & Auth       — revocation-checked Firebase token verification
 *
 * The full Express app (src/index.ts) is exercised for route-level tests, with
 * Firebase, Mongoose models, storage and logger mocked.
 */

import mongoose from 'mongoose';
import request from 'supertest';
import type { Express, Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Environment — must be set before src/index.ts is required
// ---------------------------------------------------------------------------
process.env.VERCEL = '1'; // prevent app.listen()
process.env.DEBUG = 'false';
process.env.RATE_LIMIT_MAX = '100000';
process.env.AUTH_SYNC_RATE_LIMIT_MAX = '100000';
process.env.ADMIN_ALLOWLIST_CIDR = '';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockVerifyIdToken = jest.fn();
jest.mock('../src/utils/firebase', () => ({
  adminAuth: { verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args) },
  adminStorage: { name: 'test-bucket', file: jest.fn() },
}));

jest.mock('../src/utils/logger', () => {
  const fn = () => jest.fn();
  return {
    logger: {
      debug: fn(), info: fn(), warn: fn(), error: fn(), fatal: fn(),
      authEvent: fn(), accessEvent: fn(), validationFailure: fn(),
      rateLimitEvent: fn(), securityEvent: fn(), httpRequest: fn(), dbOperation: fn(),
    },
    getRequestContext: () => ({}),
    generateRequestId: () => 'test-request-id',
    sanitize: (x: unknown) => x,
  };
});

jest.mock('../src/utils/notificationHelper', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
  deleteNotification: jest.fn().mockResolvedValue(undefined),
}));

const mockUploadFile = jest.fn();
const mockUploadProfilePicture = jest.fn();
const mockDeleteFiles = jest.fn();
const mockDeleteFile = jest.fn();
const mockExtractStoragePath = jest.fn();
jest.mock('../src/utils/storage', () => ({
  uploadFile: (...a: any[]) => mockUploadFile(...a),
  uploadProfilePicture: (...a: any[]) => mockUploadProfilePicture(...a),
  deleteFiles: (...a: any[]) => mockDeleteFiles(...a),
  deleteFile: (...a: any[]) => mockDeleteFile(...a),
  extractStoragePath: (...a: any[]) => mockExtractStoragePath(...a),
  validateImageMagicBytes: (...a: any[]) =>
    jest.requireActual('../src/utils/storage').validateImageMagicBytes(...a),
}));

// User model: constructor (syncProfile `new User`) + statics
const mockUserCtor = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserFind = jest.fn();
const mockUserFindById = jest.fn();
jest.mock('../src/models/User', () => {
  const MockUser: any = function (this: any, data: any) {
    return mockUserCtor(data);
  };
  MockUser.findOne = (...a: any[]) => mockUserFindOne(...a);
  MockUser.find = (...a: any[]) => mockUserFind(...a);
  MockUser.findById = (...a: any[]) => mockUserFindById(...a);
  MockUser.countDocuments = jest.fn().mockResolvedValue(0);
  return { __esModule: true, default: MockUser };
});

const mockPostFind = jest.fn();
const mockPostFindById = jest.fn();
const mockPostCtor = jest.fn();
jest.mock('../src/models/Post', () => {
  const MockPost: any = function (this: any, data: any) {
    return mockPostCtor(data);
  };
  MockPost.find = (...a: any[]) => mockPostFind(...a);
  MockPost.findById = (...a: any[]) => mockPostFindById(...a);
  MockPost.findByIdAndDelete = jest.fn();
  MockPost.countDocuments = jest.fn().mockResolvedValue(0);
  return { __esModule: true, default: MockPost };
});

const mockCommentFind = jest.fn();
jest.mock('../src/models/Comment', () => ({
  __esModule: true,
  default: { find: (...a: any[]) => mockCommentFind(...a) },
}));

// ---------------------------------------------------------------------------
// Imports under test (resolved against the mocks above)
// ---------------------------------------------------------------------------
import { sanitizePostForViewer, getAllPosts, searchPosts as searchPostsCtrl } from '../src/controllers/postController';
import {
  searchUsers as adminSearchUsers,
  searchPosts as adminSearchPosts,
  getActivityDashboard,
} from '../src/controllers/adminController';
import { getAllUsers } from '../src/controllers/userController';
import { verifyUploadedImages } from '../src/middleware/upload';
import { authMiddleware, optionalAuthMiddleware } from '../src/middleware/auth';

const { validateImageMagicBytes, uploadFile: realUploadFile } =
  jest.requireActual('../src/utils/storage');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Thenable Mongoose-style query chain resolving (or rejecting) to `result`. */
const chain = (result: unknown, reject = false) => {
  const q: any = {};
  for (const m of ['populate', 'sort', 'select', 'limit', 'skip', 'lean']) {
    q[m] = jest.fn(() => q);
  }
  q.then = (onFulfilled: any, onRejected: any) =>
    (reject ? Promise.reject(result) : Promise.resolve(result)).then(onFulfilled, onRejected);
  q.catch = (onRejected: any) => q.then(undefined, onRejected);
  return q;
};

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res as Response & { status: jest.Mock; json: jest.Mock };
};

const oid = () => new mongoose.Types.ObjectId().toHexString();

const VIEWER_ID = oid();
const OWNER_ID = oid();
const ADMIN_ID = oid();

/** Authenticate subsequent requests through the real authMiddleware as `userId`/`role`. */
const loginAs = (userId: string, role: 'student' | 'teacher' | 'admin') => {
  mockVerifyIdToken.mockResolvedValue({ uid: `fb-${userId}` });
  mockUserFindOne.mockImplementation(() => chain({ _id: userId, role }));
};

const SECRET_ERROR = 'MongoServerError: auth failed for mongodb://admin:hunter2@db';

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const GIF_HEADER = Buffer.from('GIF89a\x01\x00\x01\x00', 'binary');
const WEBP_HEADER = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 '),
]);
const SCRIPT_PAYLOAD = Buffer.from('<script>alert(1)</script>');
const PDF_PAYLOAD = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj');

const makeAuthor = (id: string, name = 'Real Name') => ({
  _id: id,
  name,
  email: `${name.replace(/\s/g, '').toLowerCase()}@nu.edu.ph`,
  role: 'student',
  firebaseUid: 'firebase-secret-uid',
  authProvider: 'password',
  emailVerified: true,
});

const makePost = (overrides: Record<string, unknown> = {}) => ({
  _id: oid(),
  title: 'Post',
  description: 'Body',
  category: 'general',
  isAnonymous: false,
  author: makeAuthor(OWNER_ID),
  attachments: [],
  ...overrides,
});

const ANON_MASK = { _id: null, name: 'Anonymous', role: 'student' };

// ---------------------------------------------------------------------------
// App bootstrap
// ---------------------------------------------------------------------------
let app: Express;

beforeAll(() => {
  jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose as any);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  app = require('../src/index').default;
});

afterAll(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.FACULTY_EMAILS;
  delete process.env.FACULTY_EMAIL_DOMAINS;
});

// ===========================================================================
// A01 — syncProfile account takeover & role escalation
// ===========================================================================
describe('A01: syncProfile account linking & role assignment', () => {
  const existingVictim = () => ({
    _id: 'victim-mongo-id',
    name: 'Victim',
    email: 'victim@nu.edu.ph',
    role: 'admin',
    firebaseUid: 'victim-firebase-uid',
    authProvider: 'password',
    emailVerified: true,
    save: jest.fn().mockResolvedValue(undefined),
  });

  const newUserSave = jest.fn();
  beforeEach(() => {
    newUserSave.mockReset().mockResolvedValue(undefined);
    mockUserCtor.mockImplementation((data: any) => ({ ...data, _id: 'new-user-id', save: newUserSave }));
  });

  it('verifies the Firebase token with checkRevoked = true', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'u1', email: 'u1@nu.edu.ph', email_verified: true });
    mockUserFindOne.mockResolvedValue(null);

    await request(app).post('/api/auth/sync').set('Authorization', 'Bearer tok-1').send({});

    expect(mockVerifyIdToken).toHaveBeenCalledWith('tok-1', true);
  });

  it('returns 401 without a Bearer token', async () => {
    const res = await request(app).post('/api/auth/sync').send({});
    expect(res.status).toBe(401);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('blocks takeover (409) when email exists under a different firebaseUid and email_verified is false', async () => {
    const victim = existingVictim();
    mockVerifyIdToken.mockResolvedValue({
      uid: 'attacker-uid',
      email: 'victim@nu.edu.ph',
      email_verified: false,
      firebase: { sign_in_provider: 'password' },
    });
    mockUserFindOne
      .mockResolvedValueOnce(null) // by firebaseUid
      .mockResolvedValueOnce(victim); // by email

    const res = await request(app).post('/api/auth/sync').set('Authorization', 'Bearer attacker').send({});

    expect(res.status).toBe(409);
    expect(victim.firebaseUid).toBe('victim-firebase-uid');
    expect(victim.save).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain('victim-mongo-id');
  });

  it('blocks takeover when email_verified is missing entirely', async () => {
    const victim = existingVictim();
    mockVerifyIdToken.mockResolvedValue({ uid: 'attacker-uid', email: 'victim@nu.edu.ph' });
    mockUserFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(victim);

    const res = await request(app).post('/api/auth/sync').set('Authorization', 'Bearer attacker').send({});

    expect(res.status).toBe(409);
    expect(victim.save).not.toHaveBeenCalled();
  });

  it('links the existing account when email_verified is true', async () => {
    const victim = existingVictim();
    mockVerifyIdToken.mockResolvedValue({
      uid: 'google-uid',
      email: 'victim@nu.edu.ph',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    });
    mockUserFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(victim);

    const res = await request(app).post('/api/auth/sync').set('Authorization', 'Bearer legit').send({});

    expect(res.status).toBe(200);
    expect(victim.firebaseUid).toBe('google-uid');
    expect(victim.authProvider).toBe('google.com');
    expect(victim.save).toHaveBeenCalled();
    expect(res.body.user).not.toHaveProperty('firebaseUid');
  });

  it('ignores client-supplied role "teacher" and defaults to "student"', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'new-uid', email: 'student@nu.edu.ph', email_verified: true });
    mockUserFindOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/sync')
      .set('Authorization', 'Bearer t')
      .send({ name: 'Eve', role: 'teacher' });

    expect(res.status).toBe(200);
    expect(mockUserCtor).toHaveBeenCalledWith(expect.objectContaining({ role: 'student', name: 'Eve' }));
    expect(res.body.user.role).toBe('student');
  });

  it('ignores client-supplied role "admin"', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'new-uid', email: 'x@nu.edu.ph', email_verified: true });
    mockUserFindOne.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/sync').set('Authorization', 'Bearer t').send({ role: 'admin' });

    expect(res.body.user.role).toBe('student');
  });

  it('grants "teacher" for a verified email listed in FACULTY_EMAILS', async () => {
    process.env.FACULTY_EMAILS = 'other@nu.edu.ph, Prof.Smith@NU.edu.ph';
    mockVerifyIdToken.mockResolvedValue({ uid: 'p1', email: 'prof.smith@nu.edu.ph', email_verified: true });
    mockUserFindOne.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/sync').set('Authorization', 'Bearer t').send({});

    expect(res.body.user.role).toBe('teacher');
  });

  it('does NOT grant "teacher" for an allowlisted email that is unverified', async () => {
    process.env.FACULTY_EMAILS = 'prof.smith@nu.edu.ph';
    mockVerifyIdToken.mockResolvedValue({ uid: 'p1', email: 'prof.smith@nu.edu.ph', email_verified: false });
    mockUserFindOne.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/sync').set('Authorization', 'Bearer t').send({});

    expect(res.body.user.role).toBe('student');
  });

  it('grants "teacher" for a verified email on an exact FACULTY_EMAIL_DOMAINS match', async () => {
    process.env.FACULTY_EMAIL_DOMAINS = 'faculty.nu.edu.ph';
    mockVerifyIdToken.mockResolvedValue({ uid: 'p2', email: 'jdoe@faculty.nu.edu.ph', email_verified: true });
    mockUserFindOne.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/sync').set('Authorization', 'Bearer t').send({});

    expect(res.body.user.role).toBe('teacher');
  });

  it.each([
    'jdoe@evilfaculty.nu.edu.ph',
    'jdoe@faculty.nu.edu.ph.attacker.com',
    'jdoe@sub.faculty.nu.edu.ph',
  ])('does NOT grant "teacher" for look-alike domain %s', async (email) => {
    process.env.FACULTY_EMAIL_DOMAINS = 'faculty.nu.edu.ph';
    mockVerifyIdToken.mockResolvedValue({ uid: 'p3', email, email_verified: true });
    mockUserFindOne.mockResolvedValue(null);

    const res = await request(app).post('/api/auth/sync').set('Authorization', 'Bearer t').send({});

    expect(res.body.user.role).toBe('student');
  });

  it.each(['auth/id-token-revoked', 'auth/user-disabled', 'auth/id-token-expired'])(
    'returns 401 (not 500) when token verification fails with %s',
    async (code) => {
      mockVerifyIdToken.mockRejectedValue(Object.assign(new Error('firebase'), { code }));

      const res = await request(app).post('/api/auth/sync').set('Authorization', 'Bearer bad').send({});

      expect(res.status).toBe(401);
    }
  );
});

// ===========================================================================
// A01 — Anonymous post masking & sensitive author fields
// ===========================================================================
describe('A01: sanitizePostForViewer', () => {
  const anonPost = () => makePost({ isAnonymous: true, author: makeAuthor(OWNER_ID) });

  it('masks the author of an anonymous post for a non-owner student', () => {
    const out = sanitizePostForViewer(anonPost(), { userId: VIEWER_ID, role: 'student' });
    expect(out.author).toEqual(ANON_MASK);
  });

  it('masks the author of an anonymous post for a teacher who is not the owner', () => {
    const out = sanitizePostForViewer(anonPost(), { userId: VIEWER_ID, role: 'teacher' });
    expect(out.author).toEqual(ANON_MASK);
  });

  it('masks the author when there is no viewer at all', () => {
    expect(sanitizePostForViewer(anonPost()).author).toEqual(ANON_MASK);
  });

  it('reveals the author to the post owner, without sensitive fields', () => {
    const out = sanitizePostForViewer(anonPost(), { userId: OWNER_ID, role: 'student' });
    expect(out.author.name).toBe('Real Name');
    expect(out.author).not.toHaveProperty('firebaseUid');
    expect(out.author).not.toHaveProperty('authProvider');
    expect(out.author).not.toHaveProperty('emailVerified');
  });

  it('reveals the author to an admin, without sensitive fields', () => {
    const out = sanitizePostForViewer(anonPost(), { userId: ADMIN_ID, role: 'admin' });
    expect(out.author.name).toBe('Real Name');
    expect(out.author).not.toHaveProperty('firebaseUid');
  });

  it('masks an unpopulated (ObjectId) author on anonymous posts for non-owners', () => {
    const post = makePost({ isAnonymous: true, author: new mongoose.Types.ObjectId(OWNER_ID) });
    expect(sanitizePostForViewer(post, { userId: VIEWER_ID, role: 'student' }).author).toEqual(ANON_MASK);
    expect(String(sanitizePostForViewer(post, { userId: OWNER_ID, role: 'student' }).author)).toBe(OWNER_ID);
  });

  it('always strips firebaseUid/authProvider/emailVerified on public posts', () => {
    const out = sanitizePostForViewer(makePost(), { userId: VIEWER_ID, role: 'student' });
    expect(out.author.name).toBe('Real Name');
    expect(out.author).not.toHaveProperty('firebaseUid');
    expect(out.author).not.toHaveProperty('authProvider');
    expect(out.author).not.toHaveProperty('emailVerified');
  });

  it('uses toObject() for Mongoose documents', () => {
    const plain = anonPost();
    const doc = { toObject: jest.fn(() => plain) };
    const out = sanitizePostForViewer(doc, { userId: VIEWER_ID, role: 'student' });
    expect(doc.toObject).toHaveBeenCalled();
    expect(out.author).toEqual(ANON_MASK);
  });
});

describe('A01: anonymous masking through GET /api/posts, /api/posts/:id, /api/posts/search', () => {
  const fixtures = () => [
    makePost({ title: 'anon-other', isAnonymous: true, author: makeAuthor(OWNER_ID, 'Owner Person') }),
    makePost({ title: 'anon-mine', isAnonymous: true, author: makeAuthor(VIEWER_ID, 'Viewer Person') }),
    makePost({ title: 'public', isAnonymous: false, author: makeAuthor(OWNER_ID, 'Owner Person') }),
  ];

  it('GET /api/posts masks other users\' anonymous posts for a student viewer', async () => {
    loginAs(VIEWER_ID, 'student');
    mockPostFind.mockReturnValue(chain(fixtures()));

    const res = await request(app).get('/api/posts').set('Authorization', 'Bearer t');

    expect(res.status).toBe(200);
    const byTitle = Object.fromEntries(res.body.map((p: any) => [p.title, p]));
    expect(byTitle['anon-other'].author).toEqual(ANON_MASK);
    expect(byTitle['anon-mine'].author.name).toBe('Viewer Person');
    expect(byTitle['public'].author.name).toBe('Owner Person');
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('firebase-secret-uid');
    expect(raw).not.toContain('authProvider');
    expect(raw).not.toContain('emailVerified');
  });

  it('GET /api/posts reveals anonymous authors to an admin', async () => {
    loginAs(ADMIN_ID, 'admin');
    mockPostFind.mockReturnValue(chain(fixtures()));

    const res = await request(app).get('/api/posts').set('Authorization', 'Bearer t');

    const anon = res.body.find((p: any) => p.title === 'anon-other');
    expect(anon.author.name).toBe('Owner Person');
    expect(anon.author).not.toHaveProperty('firebaseUid');
  });

  it('GET /api/posts/:id masks for a non-owner student', async () => {
    loginAs(VIEWER_ID, 'student');
    const post = fixtures()[0];
    mockPostFindById.mockReturnValue(chain(post));

    const res = await request(app).get(`/api/posts/${post._id}`).set('Authorization', 'Bearer t');

    expect(res.status).toBe(200);
    expect(res.body.author).toEqual(ANON_MASK);
  });

  it('GET /api/posts/:id reveals to the owner', async () => {
    loginAs(OWNER_ID, 'student');
    const post = fixtures()[0];
    mockPostFindById.mockReturnValue(chain(post));

    const res = await request(app).get(`/api/posts/${post._id}`).set('Authorization', 'Bearer t');

    expect(res.body.author.name).toBe('Owner Person');
    expect(res.body.author).not.toHaveProperty('firebaseUid');
  });

  it('GET /api/posts/search masks anonymous authors', async () => {
    loginAs(VIEWER_ID, 'student');
    mockPostFind.mockReturnValue(chain(fixtures()));

    const res = await request(app).get('/api/posts/search?query=anon').set('Authorization', 'Bearer t');

    expect(res.status).toBe(200);
    expect(res.body.find((p: any) => p.title === 'anon-other').author).toEqual(ANON_MASK);
    expect(JSON.stringify(res.body)).not.toContain('firebase-secret-uid');
  });
});

// ===========================================================================
// A01 — Authentication required on read routes
// ===========================================================================
describe('A01: read routes require authentication', () => {
  const postId = oid();

  it.each([
    ['GET /api/posts/:id', `/api/posts/${postId}`],
    ['GET /api/posts/:postId/comments', `/api/posts/${postId}/comments`],
    ['GET /api/posts', '/api/posts'],
    ['GET /api/posts/search', '/api/posts/search?query=x'],
    ['GET /api/auth/users', '/api/auth/users'],
    ['GET /api/auth/users/:id', `/api/auth/users/${postId}`],
  ])('%s returns 401 without a Bearer token', async (_label, url) => {
    const res = await request(app).get(url);
    expect(res.status).toBe(401);
    expect(mockPostFindById).not.toHaveBeenCalled();
    expect(mockPostFind).not.toHaveBeenCalled();
    expect(mockCommentFind).not.toHaveBeenCalled();
    expect(mockUserFind).not.toHaveBeenCalled();
  });

  it('GET /api/posts/:id returns 401 with a non-Bearer scheme', async () => {
    const res = await request(app).get(`/api/posts/${postId}`).set('Authorization', `Basic ${postId}`);
    expect(res.status).toBe(401);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('GET /api/posts/:postId/comments succeeds once authenticated', async () => {
    loginAs(VIEWER_ID, 'student');
    mockCommentFind.mockReturnValue(chain([]));

    const res = await request(app).get(`/api/posts/${postId}/comments`).set('Authorization', 'Bearer t');

    expect(res.status).toBe(200);
    expect(mockCommentFind).toHaveBeenCalledWith({ post: postId });
  });
});

// ===========================================================================
// A01/A05 — Public user field projection
// ===========================================================================
describe('A01/A05: user endpoints project only public fields', () => {
  const SENSITIVE = /firebaseUid|authProvider|emailVerified|password/;

  const expectPublicProjection = (q: any) => {
    expect(q.select).toHaveBeenCalledTimes(1);
    const projection = q.select.mock.calls[0][0];
    expect(typeof projection).toBe('string');
    // Inclusion projection (whitelist), so new sensitive fields never leak by default
    expect(projection).not.toMatch(/(^|\s)-/);
    expect(projection).not.toMatch(SENSITIVE);
    expect(projection).toMatch(/\bname\b/);
  };

  beforeEach(() => loginAs(VIEWER_ID, 'student'));

  it('GET /api/auth/users (getAllUsers)', async () => {
    const q = chain([]);
    mockUserFind.mockReturnValue(q);
    const res = await request(app).get('/api/auth/users').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expectPublicProjection(q);
  });

  it('GET /api/auth/users/:id (getUserById)', async () => {
    const q = chain({ _id: OWNER_ID, name: 'Owner' });
    mockUserFindById.mockReturnValue(q);
    const res = await request(app).get(`/api/auth/users/${OWNER_ID}`).set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expectPublicProjection(q);
  });

  it('GET /api/auth/users/search (searchUsers)', async () => {
    const q = chain([]);
    mockUserFind.mockReturnValue(q);
    const res = await request(app).get('/api/auth/users/search?query=ann').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
    expectPublicProjection(q);
    expect(q.limit).toHaveBeenCalled();
  });

  it('admin searchUsers never projects firebaseUid', async () => {
    const q = chain([]);
    mockUserFind.mockReturnValue(q);
    const res = mockRes();
    await adminSearchUsers({ query: { query: 'ann' }, user: { userId: ADMIN_ID, role: 'admin' } } as any, res);
    const projection: string = q.select.mock.calls[0][0];
    expect(projection).toMatch(/-firebaseUid/);
    expect(projection).toMatch(/-password/);
  });
});

// ===========================================================================
// A01/A03 — updatePost attachment injection
// ===========================================================================
describe('A01/A03: updatePost ignores injected existingImages URLs', () => {
  const KEPT = 'https://storage.googleapis.com/test-bucket/posts/kept.jpg';
  const REMOVED = 'https://storage.googleapis.com/test-bucket/posts/removed.jpg';
  const VICTIM = 'https://storage.googleapis.com/test-bucket/posts/victim-other-post.jpg';
  const EVIL = 'https://evil.example.com/tracker.png';

  const makeDoc = () => ({
    _id: oid(),
    title: 'T',
    description: 'D',
    category: 'general',
    isAnonymous: false,
    isAnnouncement: false,
    author: { toString: () => OWNER_ID },
    attachments: [KEPT, REMOVED],
    save: jest.fn().mockResolvedValue(undefined),
    populate: jest.fn().mockResolvedValue(undefined),
  });

  it.each([
    ['array body', (urls: string[]) => urls],
    ['JSON-string body (multipart form)', (urls: string[]) => JSON.stringify(urls)],
  ])('drops URLs not already attached (%s)', async (_label, encode) => {
    loginAs(OWNER_ID, 'student');
    const doc = makeDoc();
    mockPostFindById.mockResolvedValue(doc);
    mockDeleteFiles.mockResolvedValue(undefined);

    const res = await request(app)
      .put(`/api/posts/${doc._id}`)
      .set('Authorization', 'Bearer t')
      .send({ existingImages: encode([KEPT, EVIL, VICTIM]) });

    expect(res.status).toBe(200);
    expect(doc.attachments).toEqual([KEPT]);
    expect(mockDeleteFiles).toHaveBeenCalledWith([REMOVED]);
    const deleted = mockDeleteFiles.mock.calls.flat(2);
    expect(deleted).not.toContain(VICTIM);
    expect(JSON.stringify(res.body)).not.toContain('evil.example.com');
  });

  it('rejects non-string entries in existingImages', async () => {
    loginAs(OWNER_ID, 'student');
    const doc = makeDoc();
    mockPostFindById.mockResolvedValue(doc);

    await request(app)
      .put(`/api/posts/${doc._id}`)
      .set('Authorization', 'Bearer t')
      .send({ existingImages: [KEPT, { $gt: '' }, 42] });

    expect(doc.attachments).toEqual([KEPT]);
  });

  it('returns 403 when a non-owner tries to update', async () => {
    loginAs(VIEWER_ID, 'student');
    const doc = makeDoc();
    mockPostFindById.mockResolvedValue(doc);

    const res = await request(app)
      .put(`/api/posts/${doc._id}`)
      .set('Authorization', 'Bearer t')
      .send({ existingImages: [VICTIM] });

    expect(res.status).toBe(403);
    expect(doc.save).not.toHaveBeenCalled();
    expect(mockDeleteFiles).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// A01 — Profile picture cleanup IDOR
// ===========================================================================
describe('A01: profile picture replacement only deletes the caller\'s own objects', () => {
  const NEW_URL = `https://storage.googleapis.com/test-bucket/profile-pictures/${VIEWER_ID}/new.png`;

  const makeUser = (profilePicture: string) => ({
    _id: VIEWER_ID,
    name: 'Viewer',
    email: 'viewer@nu.edu.ph',
    role: 'student',
    profilePicture,
    save: jest.fn().mockResolvedValue(undefined),
  });

  it.each([
    ['another user\'s post image', 'posts/victim.jpg'],
    ['another user\'s profile picture', `profile-pictures/${OWNER_ID}/avatar.png`],
    ['a traversal path', `profile-pictures/${VIEWER_ID}/../${OWNER_ID}/avatar.png`],
  ])('does not delete %s', async (_label, storagePath) => {
    loginAs(VIEWER_ID, 'student');
    mockUserFindById.mockResolvedValue(makeUser(`https://storage.googleapis.com/test-bucket/${storagePath}`));
    mockExtractStoragePath.mockReturnValue(storagePath);
    mockUploadProfilePicture.mockResolvedValue(NEW_URL);

    const res = await request(app)
      .patch('/api/auth/profile/picture')
      .set('Authorization', 'Bearer t')
      .attach('profilePicture', PNG_HEADER, { filename: 'a.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it('deletes the caller\'s own previous profile picture', async () => {
    loginAs(VIEWER_ID, 'student');
    const ownPath = `profile-pictures/${VIEWER_ID}/old.png`;
    mockUserFindById.mockResolvedValue(makeUser(`https://storage.googleapis.com/test-bucket/${ownPath}`));
    mockExtractStoragePath.mockReturnValue(ownPath);
    mockUploadProfilePicture.mockResolvedValue(NEW_URL);
    mockDeleteFile.mockResolvedValue(undefined);

    const res = await request(app)
      .patch('/api/auth/profile/picture')
      .set('Authorization', 'Bearer t')
      .attach('profilePicture', PNG_HEADER, { filename: 'a.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(mockDeleteFile).toHaveBeenCalledWith(ownPath);
  });
});

// ===========================================================================
// A03 — Regex injection / ReDoS / operator injection
// ===========================================================================
describe('A03: search inputs are regex-escaped and type-checked', () => {
  const REDOS = '(a+)+$';
  const ESCAPED_REDOS = '\\(a\\+\\)\\+\\$';

  const expectLiteral = (pattern: string, literal: string) => {
    const re = new RegExp(pattern, 'i');
    expect(re.test(literal)).toBe(true);
    expect(re.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab')).toBe(false);
  };

  it('GET /api/posts/search escapes metacharacters', async () => {
    loginAs(VIEWER_ID, 'student');
    mockPostFind.mockReturnValue(chain([]));

    const res = await request(app)
      .get(`/api/posts/search?query=${encodeURIComponent(REDOS)}`)
      .set('Authorization', 'Bearer t');

    expect(res.status).toBe(200);
    const filter = mockPostFind.mock.calls[0][0];
    expect(filter.title.$regex).toBe(ESCAPED_REDOS);
    expectLiteral(filter.title.$regex, REDOS);
  });

  it('GET /api/posts?search= escapes metacharacters', async () => {
    loginAs(VIEWER_ID, 'student');
    mockPostFind.mockReturnValue(chain([]));

    await request(app).get(`/api/posts?search=${encodeURIComponent('.*[a-z]{1,}')}`).set('Authorization', 'Bearer t');

    const filter = mockPostFind.mock.calls[0][0];
    expect(filter.title.$regex).toBe('\\.\\*\\[a-z\\]\\{1,\\}');
  });

  it('GET /api/auth/users/search escapes metacharacters', async () => {
    loginAs(VIEWER_ID, 'student');
    mockUserFind.mockReturnValue(chain([]));

    await request(app)
      .get(`/api/auth/users/search?query=${encodeURIComponent(REDOS)}`)
      .set('Authorization', 'Bearer t');

    const filter = mockUserFind.mock.calls[0][0];
    expect(filter.name.$regex).toBe(ESCAPED_REDOS);
  });

  it('admin searchUsers / searchPosts escape metacharacters', async () => {
    const req: any = { query: { query: REDOS }, user: { userId: ADMIN_ID, role: 'admin' } };
    mockUserFind.mockReturnValue(chain([]));
    mockPostFind.mockReturnValue(chain([]));

    await adminSearchUsers(req, mockRes());
    await adminSearchPosts(req, mockRes());

    expect(mockUserFind.mock.calls[0][0].name.$regex).toBe(ESCAPED_REDOS);
    expect(mockPostFind.mock.calls[0][0].title.$regex).toBe(ESCAPED_REDOS);
  });

  it('caps search length at 100 characters', async () => {
    mockPostFind.mockReturnValue(chain([]));
    await searchPostsCtrl({ query: { query: 'a'.repeat(5000) } } as any, mockRes());
    expect(mockPostFind.mock.calls[0][0].title.$regex).toHaveLength(100);
  });

  it.each([
    ['unknown category', '/api/posts?category=evil'],
    ['operator-injected category', '/api/posts?category[$ne]=general'],
    ['array category', '/api/posts?category=general&category=extracurricular'],
    ['operator-injected search', '/api/posts?search[$regex]=.*'],
  ])('GET /api/posts rejects %s with 400', async (_label, url) => {
    loginAs(VIEWER_ID, 'student');
    const res = await request(app).get(url).set('Authorization', 'Bearer t');
    expect(res.status).toBe(400);
    expect(mockPostFind).not.toHaveBeenCalled();
  });

  it('getAllPosts controller rejects non-string category/search (defense in depth)', async () => {
    const r1 = mockRes();
    await getAllPosts({ query: { category: { $ne: null } } } as any, r1);
    expect(r1.status).toHaveBeenCalledWith(400);

    const r2 = mockRes();
    await getAllPosts({ query: { search: ['a', 'b'] } } as any, r2);
    expect(r2.status).toHaveBeenCalledWith(400);

    expect(mockPostFind).not.toHaveBeenCalled();
  });

  it('GET /api/posts treats empty search and category query params as omitted (200)', async () => {
    loginAs(VIEWER_ID, 'student');
    mockPostFind.mockReturnValue(chain([]));
    const res = await request(app)
      .get('/api/posts?search=&category=')
      .set('Authorization', 'Bearer t');

    expect(res.status).toBe(200);
    expect(mockPostFind).toHaveBeenCalledWith({});
  });

  it('searchPosts / admin search reject non-string query with 400', async () => {
    const r1 = mockRes();
    await searchPostsCtrl({ query: { query: { $gt: '' } } } as any, r1);
    expect(r1.status).toHaveBeenCalledWith(400);

    const r2 = mockRes();
    await adminSearchUsers({ query: { query: ['x', 'y'] } } as any, r2);
    expect(r2.status).toHaveBeenCalledWith(400);

    expect(mockPostFind).not.toHaveBeenCalled();
    expect(mockUserFind).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// A04/A08 — Image magic-byte verification
// ===========================================================================
describe('A04/A08: image content verification', () => {
  describe('validateImageMagicBytes', () => {
    it.each([
      ['image/jpeg', JPEG_HEADER],
      ['image/png', PNG_HEADER],
      ['image/gif', GIF_HEADER],
      ['image/gif', Buffer.from('GIF87a\x00\x00', 'binary')],
      ['image/webp', WEBP_HEADER],
    ])('accepts a genuine %s header', (mime, buf) => {
      expect(validateImageMagicBytes(buf, mime)).toBe(true);
    });

    it.each([
      ['image/png', SCRIPT_PAYLOAD],
      ['image/jpeg', SCRIPT_PAYLOAD],
      ['image/png', PDF_PAYLOAD],
      ['image/webp', PDF_PAYLOAD],
      ['image/gif', SCRIPT_PAYLOAD],
      ['image/png', JPEG_HEADER], // MIME/content mismatch
      ['image/jpeg', PNG_HEADER],
      ['image/webp', Buffer.from('RIFF\x00\x00\x00\x00WAVE', 'binary')],
      ['image/png', Buffer.alloc(0)],
      ['image/svg+xml', Buffer.from('<svg onload=alert(1)>')],
    ])('rejects spoofed %s buffer', (mime, buf) => {
      expect(validateImageMagicBytes(buf, mime)).toBe(false);
    });

    it('rejects non-buffer input', () => {
      expect(validateImageMagicBytes('\x89PNG' as any, 'image/png')).toBe(false);
    });
  });

  describe('uploadFile (storage) refuses spoofed content', () => {
    it('throws an "Unsupported file type" error before touching storage', async () => {
      await expect(realUploadFile(SCRIPT_PAYLOAD, 'image/png', 'x.png')).rejects.toThrow(/Unsupported file type/);
    });
  });

  describe('verifyUploadedImages middleware', () => {
    const run = (req: any) => {
      const res = mockRes();
      const next = jest.fn() as unknown as NextFunction & jest.Mock;
      verifyUploadedImages(req as Request, res, next);
      return { res, next };
    };

    it('passes genuine single and multi-file uploads', () => {
      expect(run({ file: { buffer: PNG_HEADER, mimetype: 'image/png' } }).next).toHaveBeenCalled();
      expect(
        run({
          files: [
            { buffer: JPEG_HEADER, mimetype: 'image/jpeg' },
            { buffer: WEBP_HEADER, mimetype: 'image/webp' },
          ],
        }).next
      ).toHaveBeenCalled();
    });

    it('passes requests without files', () => {
      expect(run({}).next).toHaveBeenCalled();
    });

    it.each([
      ['single spoofed file', { file: { buffer: SCRIPT_PAYLOAD, mimetype: 'image/png' } }],
      [
        'one spoofed file among valid ones',
        {
          files: [
            { buffer: PNG_HEADER, mimetype: 'image/png' },
            { buffer: PDF_PAYLOAD, mimetype: 'image/jpeg' },
          ],
        },
      ],
      ['spoofed file in a field map', { files: { images: [{ buffer: SCRIPT_PAYLOAD, mimetype: 'image/gif' }] } }],
    ])('returns 400 for %s', (_label, req) => {
      const { res, next } = run(req);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('routes wire verifyUploadedImages', () => {
    beforeEach(() => loginAs(VIEWER_ID, 'student'));

    it('POST /api/posts rejects a spoofed image with 400', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer t')
        .field('title', 'Hello')
        .field('description', 'World')
        .field('category', 'general')
        .attach('images', SCRIPT_PAYLOAD, { filename: 'x.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid image file signature/i);
      expect(mockUploadFile).not.toHaveBeenCalled();
      expect(mockPostCtor).not.toHaveBeenCalled();
    });

    it('PUT /api/posts/:id rejects a spoofed image with 400', async () => {
      const res = await request(app)
        .put(`/api/posts/${oid()}`)
        .set('Authorization', 'Bearer t')
        .attach('images', PDF_PAYLOAD, { filename: 'x.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(400);
      expect(mockPostFindById).not.toHaveBeenCalled();
    });

    it('PATCH /api/auth/profile/picture rejects a spoofed image with 400', async () => {
      const res = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer t')
        .attach('profilePicture', SCRIPT_PAYLOAD, { filename: 'avatar.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid image file signature/i);
      expect(mockUserFindById).not.toHaveBeenCalled();
      expect(mockUploadProfilePicture).not.toHaveBeenCalled();
    });

    it('PATCH /api/auth/profile/picture accepts a genuine PNG', async () => {
      mockUserFindById.mockResolvedValue({
        _id: VIEWER_ID,
        name: 'V',
        role: 'student',
        save: jest.fn().mockResolvedValue(undefined),
      });
      mockUploadProfilePicture.mockResolvedValue('https://storage.googleapis.com/test-bucket/profile-pictures/x.png');

      const res = await request(app)
        .patch('/api/auth/profile/picture')
        .set('Authorization', 'Bearer t')
        .attach('profilePicture', PNG_HEADER, { filename: 'avatar.png', contentType: 'image/png' });

      expect(res.status).toBe(200);
      expect(mockUploadProfilePicture).toHaveBeenCalled();
    });
  });
});

// ===========================================================================
// A07 — Revocation-checked token verification
// ===========================================================================
describe('A07: authMiddleware token revocation', () => {
  const run = async (mw: (req: any, res: any, next: any) => Promise<unknown>, token = 'tok') => {
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();
    await mw(req, res, next);
    return { req, res, next };
  };

  it('calls verifyIdToken(token, true)', async () => {
    loginAs(VIEWER_ID, 'student');
    const { next, req } = await run(authMiddleware, 'abc.def.ghi');
    expect(mockVerifyIdToken).toHaveBeenCalledWith('abc.def.ghi', true);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ userId: VIEWER_ID, firebaseUid: `fb-${VIEWER_ID}`, role: 'student' });
  });

  it.each(['auth/id-token-revoked', 'auth/user-disabled', 'auth/id-token-expired', 'auth/argument-error'])(
    'returns 401 on %s',
    async (code) => {
      mockVerifyIdToken.mockRejectedValue(Object.assign(new Error('firebase'), { code }));
      const { res, next } = await run(authMiddleware);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    }
  );

  it('returns 401 through the full app when the token is revoked', async () => {
    mockVerifyIdToken.mockRejectedValue(Object.assign(new Error('revoked'), { code: 'auth/id-token-revoked' }));
    const res = await request(app).get('/api/posts').set('Authorization', 'Bearer revoked');
    expect(res.status).toBe(401);
    expect(mockPostFind).not.toHaveBeenCalled();
  });

  it('optionalAuthMiddleware also checks revocation and treats revoked tokens as anonymous', async () => {
    mockVerifyIdToken.mockRejectedValue(Object.assign(new Error('revoked'), { code: 'auth/id-token-revoked' }));
    const { req, next } = await run(optionalAuthMiddleware, 'opt');
    expect(mockVerifyIdToken).toHaveBeenCalledWith('opt', true);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});

// ===========================================================================
// A05/A09 — Error leakage & CORS misconfiguration
// ===========================================================================
describe('A05/A09: 500 responses never leak raw errors', () => {
  const expectGeneric = (body: any) => {
    const raw = JSON.stringify(body);
    expect(raw).not.toContain('hunter2');
    expect(raw).not.toContain('MongoServerError');
    expect(body).not.toHaveProperty('error');
    expect(body).not.toHaveProperty('stack');
  };

  it('GET /api/posts → { message: "Internal server error" }', async () => {
    loginAs(VIEWER_ID, 'student');
    mockPostFind.mockReturnValue(chain(new Error(SECRET_ERROR), true));

    const res = await request(app).get('/api/posts').set('Authorization', 'Bearer t');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Internal server error' });
  });

  it('GET /api/posts/:id → { message: "Internal server error" }', async () => {
    loginAs(VIEWER_ID, 'student');
    mockPostFindById.mockReturnValue(chain(new Error(SECRET_ERROR), true));

    const res = await request(app).get(`/api/posts/${oid()}`).set('Authorization', 'Bearer t');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Internal server error' });
  });

  it('GET /api/posts/:postId/comments → { message: "Internal server error" }', async () => {
    loginAs(VIEWER_ID, 'student');
    mockCommentFind.mockReturnValue(chain(new Error(SECRET_ERROR), true));

    const res = await request(app).get(`/api/posts/${oid()}/comments`).set('Authorization', 'Bearer t');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: 'Internal server error' });
  });

  it('admin controllers → { message: "Internal server error" }', async () => {
    mockPostFind.mockReturnValue(chain(new Error(SECRET_ERROR), true));
    mockUserFind.mockReturnValue(chain(new Error(SECRET_ERROR), true));
    const req: any = { query: { query: 'x' }, user: { userId: ADMIN_ID, role: 'admin' } };

    for (const handler of [getActivityDashboard, adminSearchUsers, adminSearchPosts]) {
      const res = mockRes();
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    }
  });

  it('user controllers return a generic message only', async () => {
    mockUserFind.mockReturnValue(chain(new Error(SECRET_ERROR), true));
    const res = mockRes();
    await getAllUsers({} as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expectGeneric(res.json.mock.calls[0][0]);
  });

  it('syncProfile returns a generic message for unexpected failures', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'u', email: 'u@nu.edu.ph', email_verified: true });
    mockUserFindOne.mockRejectedValue(new Error(SECRET_ERROR));

    const res = await request(app).post('/api/auth/sync').set('Authorization', 'Bearer t').send({});

    expect(res.status).toBe(500);
    expectGeneric(res.body);
  });
});

describe('A05: CORS rejects unknown origins with 403 (not 500)', () => {
  it('returns 403 for a disallowed origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Not allowed by CORS');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns 403 for a disallowed preflight', async () => {
    const res = await request(app)
      .options('/api/posts')
      .set('Origin', 'https://evil.example.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows an approved origin', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://ccit-wall.vercel.app');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://ccit-wall.vercel.app');
  });

  it('allows requests without an Origin header (server-to-server)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('does not treat a suffix look-alike origin as approved', async () => {
    const res = await request(app).get('/health').set('Origin', 'https://ccit-wall.vercel.app.evil.com');
    expect(res.status).toBe(403);
  });
});
