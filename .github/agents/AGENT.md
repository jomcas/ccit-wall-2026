# AGENTS.md - Coding Agent Guidelines for CCIT-Wall

Guidelines for AI coding agents. CCIT-Wall is a MERN stack social media platform for National University Manila's College of Computing and Information Technologies.

## Project Structure
```
ccit-wall/
├── backend/                    # Express.js + TypeScript API
│   ├── src/
│   │   ├── controllers/        # Route handlers
│   │   │   ├── adminController.ts
│   │   │   ├── commentController.ts
│   │   │   ├── notificationController.ts
│   │   │   ├── postController.ts
│   │   │   └── userController.ts
│   │   ├── middleware/         # Auth, validation, errors, security
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── security.ts
│   │   │   ├── session.ts
│   │   │   └── validation.ts
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── Comment.ts
│   │   │   ├── Notification.ts
│   │   │   ├── Post.ts
│   │   │   └── User.ts
│   │   ├── routes/             # Express routes
│   │   │   ├── adminRoutes.ts
│   │   │   ├── commentRoutes.ts
│   │   │   ├── notificationRoutes.ts
│   │   │   ├── postRoutes.ts
│   │   │   └── userRoutes.ts
│   │   ├── utils/              # Helpers
│   │   │   ├── auth.ts
│   │   │   ├── crypto.ts
│   │   │   ├── email.ts
│   │   │   ├── logger.ts
│   │   │   └── notificationHelper.ts
│   │   └── index.ts            # App entry point
│   └── __tests__/              # Jest tests (240 tests)
│       ├── notification.test.ts
│       ├── security.accesscontrol.test.ts
│       ├── security.auth.test.ts
│       ├── security.crypto.test.ts
│       ├── security.errorhandling.test.ts
│       ├── security.headers.test.ts
│       ├── security.ipallowlist.test.ts
│       ├── security.methods.test.ts
│       ├── security.ratelimit.test.ts
│       ├── security.session.test.ts
│       └── security.validation.test.ts
├── frontend/                   # React + TypeScript SPA
│   └── src/
│       ├── components/         # Reusable UI components
│       │   ├── NotificationBell.tsx
│       │   ├── NotificationItem.tsx
│       │   └── Post.tsx
│       ├── pages/              # Page components
│       │   ├── CreatePost.tsx
│       │   ├── Feed.tsx
│       │   ├── ForgotPassword.tsx
│       │   ├── LandingPage.tsx
│       │   ├── Login.tsx
│       │   ├── Notifications.tsx
│       │   ├── Profile.tsx
│       │   ├── Register.tsx
│       │   ├── ResetPassword.tsx
│       │   └── UserProfile.tsx
│       ├── services/           # API client (axios)
│       │   ├── api.ts
│       │   ├── mockApi.ts
│       │   └── mockData.ts
│       ├── styles/             # CSS
│       │   ├── index.css
│       │   └── LandingPage.css
│       ├── types/              # TypeScript types
│       │   └── index.ts
│       ├── App.tsx             # Main app with routing
│       └── index.tsx           # Entry point
└── docs/                       # Documentation
```

## Build, Lint, and Test Commands

### Root Level
- `npm run install-all` - Install all dependencies (root, backend, frontend)
- `npm run dev` - Start backend and frontend concurrently
- `npm run build` - Build both backend and frontend

### Backend (`cd backend`)
- `npm run dev` - Start dev server with ts-node
- `npm run build` - Compile TypeScript to `dist/`
- `npm run lint` - Run ESLint
- `npm test` - Run all Jest tests (240 tests)
- `npm test -- --testPathPattern="<pattern>"` - Run tests matching pattern
- `npm test -- __tests__/notification.test.ts` - Run specific test file
- `npm test -- -t "should hash passwords"` - Run test by description

### Frontend (`cd frontend`)
- `npm start` - Start dev server (port 3000)
- `npm run build` - Production build
- `npm test -- --watchAll=false` - Run tests once (CI mode)

## Code Style Guidelines

### TypeScript
Both frontend and backend use **strict mode**: `strict: true`, `strictNullChecks: true`, `noImplicitAny: true`. Target: ES2020.

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
| Component files | PascalCase | `NotificationBell.tsx` |
| Utility files | camelCase | `notificationHelper.ts` |
| Test files | `*.test.ts` | `notification.test.ts` |
| Interfaces | `I` prefix | `IUser`, `INotification` |
| Classes/Types | PascalCase | `AppError`, `NotificationType` |
| Functions/Variables | camelCase | `createNotification`, `userId` |
| Constants | UPPER_SNAKE | `JWT_SECRET`, `POLLING_INTERVAL` |

## Error Handling

### Backend - Custom Error Classes
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

### Frontend - Session Expiration Pattern
```typescript
const handleSessionExpired = useCallback(() => {
  alert('Your session has expired. Please log in again.');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  navigate('/login');
  window.location.reload();
}, [navigate]);

try {
  const response = await someService.getData();
} catch (error: any) {
  if (error.response?.status === 401) {
    handleSessionExpired();
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
import { validateNotificationId, validateGetNotifications } from '../middleware/validation';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

router.use(authMiddleware); // All routes require auth
router.get('/', validateGetNotifications, getNotifications);
router.put('/:id/read', validateNotificationId, markAsRead);
router.delete('/:id', validateNotificationId, deleteNotificationById);
```

### React Component with Hooks
```typescript
interface Props {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<Props> = ({ notification, onMarkAsRead, onDelete }) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification._id);
    }
    if (notification.post) {
      navigate(`/feed`);
    }
  };

  return <div className={`notification-item ${notification.read ? '' : 'unread'}`}>...</div>;
};

export default NotificationItem;
```

### Mongoose Model with Indexes
```typescript
export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: 'post_liked' | 'post_commented' | 'comment_liked' | 'post_reaction';
  post?: mongoose.Types.ObjectId;
  comment?: mongoose.Types.ObjectId;
  reactionEmoji?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema({ ... }, { timestamps: true });

// Compound indexes for efficient queries
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
```

### Notification Helper Pattern
```typescript
import { createNotification, deleteNotificationOnUnlike } from '../utils/notificationHelper';

// In postController.ts - when liking a post
if (!post.likes.includes(userId)) {
  await createNotification({
    recipientId: post.author._id.toString(),
    senderId: userId,
    type: 'post_liked',
    postId: post._id.toString(),
  });
} else {
  await deleteNotificationOnUnlike(userId, post._id.toString(), 'post_liked');
}
```

## API Endpoints

### Authentication (`/api/users`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /forgot-password` - Request password reset
- `POST /reset-password/:token` - Reset password
- `GET /profile` - Get current user profile (auth required)
- `PUT /profile` - Update profile (auth required)
- `GET /` - Get all users (auth required)
- `GET /search` - Search users (auth required)
- `GET /:id` - Get user by ID (auth required)

### Posts (`/api/posts`)
- `GET /` - Get all posts
- `GET /search` - Search posts
- `GET /:id` - Get post by ID
- `POST /` - Create post (auth required)
- `PUT /:id` - Update post (auth required, owner only)
- `DELETE /:id` - Delete post (auth required, owner only)
- `POST /:id/like` - Toggle like (auth required)
- `POST /:id/react` - Add reaction (auth required)

### Comments (`/api/comments`)
- `GET /post/:postId` - Get comments for post
- `POST /post/:postId` - Create comment (auth required)
- `PUT /:id` - Update comment (auth required, owner only)
- `DELETE /:id` - Delete comment (auth required, owner only)
- `POST /:id/like` - Toggle like (auth required)

### Notifications (`/api/notifications`)
- `GET /` - Get paginated notifications (auth required)
  - Query params: `page`, `limit`, `unreadOnly`
- `GET /unread-count` - Get unread count (auth required)
- `PUT /read-all` - Mark all as read (auth required)
- `PUT /:id/read` - Mark single as read (auth required)
- `DELETE /:id` - Delete notification (auth required)

### Admin (`/api/admin`)
- `GET /dashboard` - Get admin dashboard stats
- `GET /users` - Get all users with details
- `DELETE /users/:id` - Delete user
- `DELETE /posts/:id` - Delete any post

## Security Practices

1. **Input Validation**: Use `express-validator` in routes
2. **Authentication**: bcrypt (12+ rounds), JWT tokens
3. **Authorization**: `authMiddleware` for protected routes, `adminMiddleware` for admin routes
4. **HTTP Methods**: Restricted to GET, POST, PUT, PATCH, DELETE, HEAD (configurable via `restrictHttpMethods`)
5. **Errors**: Never expose stack traces in production
6. **Logging**: Use `logger` utility (auto-redacts sensitive data)
7. **Secrets**: Environment variables only, never hardcode
8. **Session**: Handle 401 responses with session expiration flow

## Environment Variables

**Backend** (`backend/.env`):
- `PORT` - Server port (default: 5001)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret (required in production, 64+ chars)
- `NODE_ENV` - Environment (development/production/test)
- `BCRYPT_ROUNDS` - Password hashing rounds (default: 12)
- `ENABLE_CORS` - Enable OPTIONS method for CORS (default: false)

**Frontend** (`frontend/.env`):
- `REACT_APP_API_URL` - Backend API URL

## Adding New Features

### New API Endpoint
1. Add model in `backend/src/models/<Model>.ts` (if needed)
2. Add validation in `backend/src/middleware/validation.ts`
3. Add route in `backend/src/routes/<domain>Routes.ts`
4. Add handler in `backend/src/controllers/<domain>Controller.ts`
5. Add helper functions in `backend/src/utils/` (if needed)
6. Register routes in `backend/src/index.ts`
7. Add tests in `backend/__tests__/<domain>.test.ts`

### New Frontend Page
1. Create `frontend/src/pages/<PageName>.tsx`
2. Add route in `frontend/src/App.tsx`
3. Add API function in `frontend/src/services/api.ts`
4. Add types in `frontend/src/types/index.ts` (if needed)
5. Add styles in `frontend/src/styles/index.css`

### New Frontend Component
1. Create `frontend/src/components/<ComponentName>.tsx`
2. Import and use in pages
3. Add styles in `frontend/src/styles/index.css`

## Testing

### Backend Test Structure
Tests are organized by domain:
- `notification.test.ts` - Notification API tests (20 tests)
- `security.*.test.ts` - Security-related tests (220 tests)

### Running Tests
```bash
# All tests
cd backend && npm test

# Specific test file
npm test -- __tests__/notification.test.ts

# Tests matching pattern
npm test -- --testPathPattern="notification"

# Single test by name
npm test -- -t "should return 401 if not authenticated"
```

### Test Pattern (with mocks)
```typescript
jest.mock('../src/models/Notification', () => mockNotificationModel);

describe('Notification API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return paginated notifications for authenticated user', async () => {
    mockNotificationModel.find.mockReturnValue(mockQuery);
    mockNotificationModel.countDocuments.mockResolvedValue(2);

    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.notifications).toHaveLength(2);
  });
});
```

## Frontend Types

```typescript
// User
interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  bio?: string;
  profilePicture?: string;
  contactInformation?: string;
}

// Post
interface Post {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  author: User;
  category: 'college-activities' | 'general' | 'extracurricular';
  isAnonymous: boolean;
  likes: string[];
  reactions: Map<string, string[]>;
  comments: Comment[];
  createdAt: Date;
}

// Notification
type NotificationType = 'post_liked' | 'post_commented' | 'comment_liked' | 'post_reaction';

interface Notification {
  _id: string;
  recipient: string;
  sender: { _id: string; name: string; profilePicture?: string; };
  type: NotificationType;
  post?: { _id: string; title: string; };
  comment?: { _id: string; content: string; };
  reactionEmoji?: string;
  read: boolean;
  createdAt: string;
}
```
