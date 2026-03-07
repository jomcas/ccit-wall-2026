# AGENTS.md - Coding Agent Guidelines for CCIT-Wall

Social media platform for NU Manila CCIT. Backend: Express.js + TypeScript + Firebase Admin. Frontend: React + TypeScript + Firebase Auth. Database: MongoDB/Mongoose. Auth: Firebase Authentication (not JWT/bcrypt).

## Project Structure
```
ccit-wall/
├── backend/src/
│   ├── controllers/     # Route handlers (admin, comment, notification, post, user)
│   ├── middleware/      # auth.ts, errorHandler.ts, security.ts, session.ts, upload.ts, validation.ts
│   ├── models/          # Mongoose schemas (Comment, Notification, Post, User)
│   ├── routes/          # Express route definitions
│   ├── utils/           # firebase.ts, crypto.ts, storage.ts, logger.ts, notificationHelper.ts
│   └── index.ts         # Entry point (default port 4000)
├── backend/__tests__/   # Jest tests (10 test files — notification + security suite)
├── frontend/src/
│   ├── components/      # Reusable UI (Post, Layout, Sidebars, NotificationBell, etc.)
│   ├── config/          # firebase.ts (client init), themes.ts (post themes)
│   ├── contexts/        # SessionContext.tsx, ThemeContext.tsx
│   ├── pages/           # 11 pages (Feed, Profile, Login, Register, About, etc.)
│   ├── services/        # api.ts (axios + Firebase token), mockApi.ts, mockData.ts
│   ├── styles/          # tokens.css, index.css (~6900 lines), theme.css, LandingPage.css
│   ├── types/           # TypeScript interfaces
│   └── App.tsx          # Main app with routing
└── docs/                # Project documentation
```

## Build, Lint, and Test Commands

### Root Level
- `npm run install-all` — Install all dependencies (root + backend + frontend)
- `npm run dev` — Start backend + frontend concurrently
- `npm run build` — Build both backend and frontend

### Backend (`cd backend`)
- `npm run dev` — Start dev server with ts-node
- `npm run build` — Compile TypeScript to `./dist`
- `npm start` — Run compiled output (`node dist/index.js`)
- `npm run lint` — Run ESLint
- `npm test` — Run all Jest tests (timeout: 30s)
- `npm test -- __tests__/notification.test.ts` — Run single test file
- `npm test -- --testPathPattern="security"` — Run tests matching pattern
- `npm test -- -t "should return 401"` — Run by test description
- `npm run test:watch` — Run tests in watch mode

### Frontend (`cd frontend`)
- `npm start` — Dev server (port 3000)
- `npm run build` — Production build
- `npm test -- --watchAll=false` — Run tests once (non-interactive)

## TypeScript Configuration
- **Target:** ES2020 for both backend and frontend
- **Strict mode:** `strict: true`, `strictNullChecks: true`, `noImplicitAny: true`
- **Backend:** CommonJS modules, output to `./dist`, sourceMap enabled
- **Frontend:** ESNext modules, JSX `react-jsx`, ESLint extends `react-app`

## Code Style

### Import Order
```typescript
// 1. Node.js built-ins
import crypto from 'crypto';
// 2. External packages
import { Request, Response } from 'express';
import mongoose from 'mongoose';
// 3. Internal modules
import { logger } from '../utils/logger';
import User from '../models/User';
// 4. Types (type-only imports)
import type { IUser } from '../models/User';
```

### Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Models/Components | PascalCase | `User.ts`, `NotificationBell.tsx` |
| Controllers/Utils | camelCase | `userController.ts`, `logger.ts` |
| Test files | `*.test.ts` | `notification.test.ts` |
| Interfaces (backend) | `I` prefix | `IUser`, `INotification` |
| Interfaces (frontend) | PascalCase | `User`, `Notification` |
| Functions/Variables | camelCase | `createNotification`, `userId` |
| Constants | UPPER_SNAKE | `FIREBASE_PROJECT_ID`, `BCRYPT_ROUNDS` |
| CSS files | PascalCase for pages, camelCase otherwise | `LandingPage.css`, `tokens.css` |

## Error Handling

### Backend — Custom Error Classes
```typescript
import { AppError, ValidationError, NotFoundError, AuthenticationError,
         ForbiddenError, ConflictError, RateLimitError } from '../middleware/errorHandler';

if (!user) throw new NotFoundError('User');
if (!valid) throw new ValidationError([{ field: 'email', message: 'Invalid email' }]);
```

### Backend — Async Handler
```typescript
import { asyncHandler } from '../middleware/errorHandler';
router.get('/users/:id', asyncHandler(async (req, res) => {
  // Errors automatically passed to global error handler
}));
```

### Frontend — Session Handling
The axios interceptor in `api.ts` attaches the Firebase ID token and handles 401s. Components use `SessionContext` for auth state.

## Authentication (Firebase)

Auth uses Firebase — **not** bcrypt/JWT. The backend verifies Firebase ID tokens via `firebase-admin`.

### Backend auth middleware (`middleware/auth.ts`)
Extracts `Authorization: Bearer <firebaseIdToken>`, verifies with Firebase Admin SDK, attaches `req.user` with `userId` (MongoDB ObjectId) and `firebaseUid`.

### Frontend auth flow
- `frontend/src/config/firebase.ts` — initializes Firebase client SDK
- `frontend/src/contexts/SessionContext.tsx` — `onAuthStateChanged` listener, provides auth state
- `frontend/src/services/api.ts` — request interceptor calls `auth.currentUser.getIdToken()` to attach token

### User model fields
`firebaseUid`, `authProvider` (`'password' | 'google.com' | 'github.com' | 'microsoft.com'`), `emailVerified`, `name`, `email`, `role`, `studentId`, `phone`, `profilePicture`. No `password` field.

## CSS Architecture

Plain CSS with a design token system — no Tailwind, no CSS modules, no CSS-in-JS.

### File load order (in App.tsx)
1. `tokens.css` — Design tokens (colors, typography, spacing, shadows, radii, transitions)
2. `index.css` — All component styles + legacy variable aliases (lines 1-28, DO NOT MODIFY)
3. `theme.css` — Dark mode overrides for styles that can't be handled by token flips

### Key token variables
- Surfaces: `--bg`, `--surface-1/2/3`, `--surface-raised`, `--surface-inset`
- Text: `--ink`, `--ink-secondary`, `--ink-muted`, `--ink-on-accent`, `--ink-inverse`
- Brand: `--accent-gold` (primary accent), `--accent-ink` (deep blue)
- Semantics: `--danger`, `--success`, `--warning`, `--info`
- Spacing: `--space-1` (4px) through `--space-10` (64px)
- Z-index: `--z-base`(1), `--z-dropdown`(100), `--z-sticky`(200), `--z-overlay`(300), `--z-modal`(400), `--z-toast`(500)

### Dark mode
`ThemeContext.tsx` sets `data-theme="dark"` on `<html>`. Token values flip in `[data-theme="dark"]` block in `tokens.css`. Use tokens — avoid hardcoded colors.

## Common Patterns

### Controller with Auth Check
```typescript
export const getNotifications = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const notifications = await Notification.find({ recipient: req.user.userId });
  res.json(notifications);
};
```

### Route with Validation
```typescript
import { validateNotificationId, validateGetNotifications } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
router.use(authMiddleware);
router.get('/', validateGetNotifications, getNotifications);
router.put('/:id/read', validateNotificationId, markAsRead);
```

### File Upload (Firebase Storage)
```typescript
import { uploadFile } from '../utils/storage';
// In controller — multer provides req.file with buffer in memory
const url = await uploadFile(file.buffer, file.mimetype, file.originalname);
```

## Adding New Features

### New API Endpoint
1. Add model in `backend/src/models/<Model>.ts` (if needed)
2. Add validation rules in `backend/src/middleware/validation.ts`
3. Add controller in `backend/src/controllers/<domain>Controller.ts`
4. Add routes in `backend/src/routes/<domain>Routes.ts`
5. Register routes in `backend/src/index.ts`
6. Add tests in `backend/__tests__/<domain>.test.ts`

### New Frontend Page
1. Create `frontend/src/pages/<PageName>.tsx`
2. Add route in `frontend/src/App.tsx`
3. Add API function in `frontend/src/services/api.ts`
4. Add types in `frontend/src/types/index.ts` (if needed)
5. Add styles in `frontend/src/styles/index.css` using token variables

## Security Practices
1. **Input Validation:** Always use `express-validator` for route validation
2. **Authentication:** Firebase Admin SDK verifies ID tokens (not JWT/bcrypt)
3. **Authorization:** `authMiddleware` for protected routes, `adminMiddleware` for admin-only
4. **Errors:** Never expose stack traces in production (handled by `globalErrorHandler`)
5. **Logging:** Use `logger` utility (auto-redacts passwords, tokens, sensitive data)
6. **Secrets:** Environment variables only, never hardcode
7. **File Uploads:** multer memory storage + Firebase Storage (never save to local disk)

## Environment Variables

**Backend** (`backend/.env`): `PORT` (default 4000), `MONGODB_URI`, `NODE_ENV`, `CLIENT_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`. See `backend/.env.example` for full list including rate limiting, email, and security toggles.

**Frontend** (`frontend/.env`): `REACT_APP_API_URL`, `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, `REACT_APP_FIREBASE_PROJECT_ID`, `REACT_APP_FIREBASE_STORAGE_BUCKET`, `REACT_APP_USE_MOCK_DATA`.

## Test Pattern
```typescript
jest.mock('../src/models/Notification', () => mockNotificationModel);
jest.mock('../src/middleware/auth', () => ({
  authMiddleware: (req, res, next) => { req.user = { userId: 'test' }; next(); }
}));

describe('Notification API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return paginated notifications', async () => {
    mockNotificationModel.find.mockReturnValue(mockQuery);
    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', 'Bearer valid-token');
    expect(response.status).toBe(200);
  });
});
```
