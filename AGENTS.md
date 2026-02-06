# AGENTS.md - Coding Agent Guidelines for CCIT-Wall

MERN stack social media platform for NU Manila CCIT. Backend: Express.js + TypeScript. Frontend: React + TypeScript. Database: MongoDB/Mongoose.

## Project Structure
```
ccit-wall/
├── backend/src/
│   ├── controllers/     # Route handlers (admin, comment, notification, post, user)
│   ├── middleware/      # auth.ts, errorHandler.ts, security.ts, session.ts, validation.ts
│   ├── models/          # Mongoose schemas (Comment, Notification, Post, User)
│   ├── routes/          # Express route definitions
│   ├── utils/           # Helpers (auth, crypto, email, logger, notificationHelper)
│   └── index.ts         # Entry point
├── backend/__tests__/   # Jest tests (11 test files covering API and security)
├── frontend/src/
│   ├── components/      # Reusable UI (NotificationBell, Post, Layout, etc.)
│   ├── pages/           # Page components (Feed, Profile, Login, etc.)
│   ├── services/        # API client (axios)
│   ├── types/           # TypeScript interfaces
│   └── App.tsx          # Main app with routing
└── docs/                # Project documentation
```

## Build, Lint, and Test Commands

### Root Level
- `npm run install-all` - Install all dependencies (root + backend + frontend)
- `npm run dev` - Start backend + frontend concurrently
- `npm run build` - Build both backend and frontend

### Backend (`cd backend`)
- `npm run dev` - Start dev server with ts-node
- `npm run build` - Compile TypeScript to `./dist`
- `npm run lint` - Run ESLint
- `npm test` - Run all Jest tests
- `npm test -- __tests__/notification.test.ts` - Run single test file
- `npm test -- --testPathPattern="security"` - Run tests matching pattern
- `npm test -- -t "should hash passwords"` - Run by test description

### Frontend (`cd frontend`)
- `npm start` - Dev server (port 3000)
- `npm run build` - Production build
- `npm test -- --watchAll=false` - Run tests once (non-interactive)

## TypeScript Configuration
- **Target:** ES2020 for both backend and frontend
- **Strict mode:** `strict: true`, `strictNullChecks: true`, `noImplicitAny: true`
- **Backend:** CommonJS modules, output to `./dist`
- **Frontend:** ESNext modules, JSX react-jsx

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
| Constants | UPPER_SNAKE | `JWT_SECRET`, `BCRYPT_ROUNDS` |

## Error Handling

### Backend - Custom Error Classes
```typescript
import { AppError, ValidationError, NotFoundError, AuthenticationError,
         ForbiddenError, ConflictError, RateLimitError } from '../middleware/errorHandler';

// Usage
if (!user) throw new NotFoundError('User');
if (!valid) throw new ValidationError([{ field: 'email', message: 'Invalid email' }]);
```

### Backend - Async Handler (auto catches errors)
```typescript
import { asyncHandler } from '../middleware/errorHandler';
router.get('/users/:id', asyncHandler(async (req, res) => {
  // Errors automatically passed to global error handler
}));
```

### Frontend - Session Handling
```typescript
try {
  const response = await api.getData();
} catch (error: any) {
  if (error.response?.status === 401) {
    handleSessionExpired(); // Clear localStorage, redirect to /login
    return;
  }
  setError(error.response?.data?.message || 'Operation failed');
}
```

## Common Patterns

### Mongoose Model
```typescript
export interface IUser extends Document {
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
}

const UserSchema: Schema = new Schema({ /* fields */ }, { timestamps: true });
export default mongoose.model<IUser>('User', UserSchema);
```

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

### React Component
```typescript
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead }) => {
  return <div className={`notification-item ${notification.read ? '' : 'unread'}`}>...</div>;
};

export default NotificationItem;
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

## Security Practices
1. **Input Validation:** Always use `express-validator` for route validation
2. **Authentication:** bcrypt (12+ rounds), JWT tokens
3. **Authorization:** `authMiddleware` for protected routes, `adminMiddleware` for admin-only
4. **Errors:** Never expose stack traces in production (handled by `globalErrorHandler`)
5. **Logging:** Use `logger` utility (auto-redacts passwords, tokens, sensitive data)
6. **Secrets:** Environment variables only, never hardcode

## Environment Variables

**Backend** (`backend/.env`):
- `PORT` - Server port (default 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT signing
- `NODE_ENV` - `development` | `production`
- `BCRYPT_ROUNDS` - Password hashing rounds (default 12)

**Frontend** (`frontend/.env`):
- `REACT_APP_API_URL` - Backend API URL

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
