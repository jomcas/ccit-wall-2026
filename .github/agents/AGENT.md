# AGENTS.md - Coding Agent Guidelines for CCIT-Wall

MERN stack social media platform for NU Manila CCIT. Backend: Express.js + TypeScript. Frontend: React + TypeScript. Database: MongoDB/Mongoose.

## Project Structure
```
ccit-wall/
├── backend/src/
│   ├── controllers/     # Route handlers (admin, comment, notification, post, user)
│   ├── middleware/      # auth.ts, errorHandler.ts, security.ts, session.ts, validation.ts
│   ├── models/          # Mongoose schemas (Comment, Notification, Post, User)
│   ├── routes/          # Express routes
│   ├── utils/           # Helpers (auth, crypto, email, logger, notificationHelper)
│   └── index.ts         # Entry point
├── backend/__tests__/   # Jest tests (240 tests)
├── frontend/src/
│   ├── components/      # Reusable UI (NotificationBell, NotificationItem, Post)
│   ├── pages/           # Page components
│   ├── services/        # API client (axios)
│   ├── types/           # TypeScript types
│   └── App.tsx          # Main app with routing
└── docs/
```

## Build, Lint, and Test Commands

### Root Level
- `npm run install-all` - Install all dependencies
- `npm run dev` - Start backend + frontend concurrently
- `npm run build` - Build both

### Backend (`cd backend`)
- `npm run dev` - Start dev server
- `npm run build` - Compile TypeScript
- `npm run lint` - Run ESLint
- `npm test` - Run all tests
- `npm test -- __tests__/notification.test.ts` - Run specific file
- `npm test -- --testPathPattern="security"` - Match pattern
- `npm test -- -t "should hash passwords"` - Run by description

### Frontend (`cd frontend`)
- `npm start` - Dev server (port 3000)
- `npm run build` - Production build
- `npm test -- --watchAll=false` - Run tests once

## Code Style

### TypeScript
Both use strict mode: `strict: true`, `strictNullChecks: true`, `noImplicitAny: true`. Target: ES2020.

### Import Order
```typescript
// 1. Node.js built-ins
import crypto from 'crypto';
// 2. External packages
import { Request, Response } from 'express';
// 3. Internal modules
import { logger } from '../utils/logger';
import User from '../models/User';
// 4. Types (if separate)
import type { IUser } from '../models/User';
```

### Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Components/Models | PascalCase | `NotificationBell.tsx`, `User.ts` |
| Utils/Controllers | camelCase | `notificationHelper.ts` |
| Tests | `*.test.ts` | `notification.test.ts` |
| Interfaces | `I` prefix | `IUser`, `INotification` |
| Functions/Variables | camelCase | `createNotification`, `userId` |
| Constants | UPPER_SNAKE | `JWT_SECRET`, `POLLING_INTERVAL` |

## Error Handling

### Backend - Custom Errors
```typescript
import { AppError, ValidationError, NotFoundError, AuthenticationError,
         ForbiddenError, ConflictError, RateLimitError } from '../middleware/errorHandler';

if (!user) throw new NotFoundError('User');
if (!valid) throw new ValidationError('Invalid input');
```

### Backend - Async Handler
```typescript
import { asyncHandler } from '../middleware/errorHandler';
router.get('/users/:id', asyncHandler(async (req, res) => {
  // Errors automatically passed to error handler
}));
```

### Frontend - Session Expiration
```typescript
try {
  const response = await someService.getData();
} catch (error: any) {
  if (error.response?.status === 401) {
    handleSessionExpired(); // Clear localStorage, redirect to /login
    return;
  }
  setError(error.response?.data?.message || 'Operation failed');
}
```

## Common Patterns

### Controller with Auth Guard
```typescript
export const getNotifications = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  const notifications = await Notification.find({ recipient: req.user.userId });
  res.json(notifications);
};
```

### Route with Validation
```typescript
import { validateNotificationId } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';

router.use(authMiddleware);
router.get('/', validateGetNotifications, getNotifications);
router.put('/:id/read', validateNotificationId, markAsRead);
```

### React Component
```typescript
interface Props {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<Props> = ({ notification, onMarkAsRead }) => {
  const navigate = useNavigate();
  return <div className={`notification-item ${notification.read ? '' : 'unread'}`}>...</div>;
};

export default NotificationItem;
```

## Adding New Features

### New API Endpoint
1. Add model in `backend/src/models/<Model>.ts` (if needed)
2. Add validation in `backend/src/middleware/validation.ts`
3. Add route in `backend/src/routes/<domain>Routes.ts`
4. Add handler in `backend/src/controllers/<domain>Controller.ts`
5. Register routes in `backend/src/index.ts`
6. Add tests in `backend/__tests__/<domain>.test.ts`

### New Frontend Page
1. Create `frontend/src/pages/<PageName>.tsx`
2. Add route in `frontend/src/App.tsx`
3. Add API function in `frontend/src/services/api.ts`
4. Add types in `frontend/src/types/index.ts` (if needed)

## Security Practices

1. **Input Validation**: Use `express-validator` in routes
2. **Authentication**: bcrypt (12+ rounds), JWT tokens
3. **Authorization**: `authMiddleware` for protected routes, `adminMiddleware` for admin
4. **Errors**: Never expose stack traces in production
5. **Logging**: Use `logger` utility (auto-redacts sensitive data)
6. **Secrets**: Environment variables only, never hardcode

## Environment Variables

**Backend** (`backend/.env`):
- `PORT`, `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV`, `BCRYPT_ROUNDS`

**Frontend** (`frontend/.env`):
- `REACT_APP_API_URL`

## Test Pattern
```typescript
jest.mock('../src/models/Notification', () => mockNotificationModel);

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
