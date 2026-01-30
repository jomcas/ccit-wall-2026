# AGENTS.md - Coding Agent Guidelines for CCIT-Wall

This document provides guidelines for AI coding agents working in this repository.
CCIT-Wall is a MERN stack social media platform for CCIT (College of Computing and Information Technologies).

## Project Structure

```
ccit-wall/
├── backend/          # Express.js + TypeScript API server
│   ├── src/
│   │   ├── controllers/   # Route handlers (business logic)
│   │   ├── middleware/    # Auth, validation, error handling
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # Express route definitions
│   │   └── utils/         # Helpers (auth, crypto, logger, email)
│   └── __tests__/         # Jest test files
├── frontend/         # React + TypeScript SPA
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Page-level components
│       ├── services/      # API client (axios)
│       └── styles/        # CSS files
└── docs/             # Documentation
```

## Build, Lint, and Test Commands

### Backend (`cd backend`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with ts-node |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run lint` | Run ESLint on `src/` |
| `npm test` | Run all Jest tests |
| `npm test -- --testPathPattern="<pattern>"` | Run tests matching pattern |
| `npm test -- --testPathPattern="security.auth"` | Example: run auth security tests |
| `npm test -- __tests__/security.validation.test.ts` | Run a specific test file |
| `npm test -- -t "should hash passwords"` | Run tests matching description |
| `npm run test:watch` | Run tests in watch mode |

### Frontend (`cd frontend`)

| Command | Description |
|---------|-------------|
| `npm start` | Start React dev server (port 3000) |
| `npm run build` | Production build to `build/` |
| `npm test` | Run React tests (interactive) |
| `npm test -- --watchAll=false` | Run tests once (CI mode) |

## Code Style Guidelines

### TypeScript Configuration

Both frontend and backend use **strict mode** TypeScript:
- `strict: true` - Enables all strict type checking
- `strictNullChecks: true` - Null/undefined must be handled explicitly
- `noImplicitAny: true` - No implicit `any` types allowed
- Target: ES2020

### Import Order and Style

Organize imports in this order, with blank lines between groups:

```typescript
// 1. Node.js built-ins (backend only)
import crypto from 'crypto';

// 2. External packages
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

// 3. Internal modules (use relative paths)
import { logger } from '../utils/logger';
import User from '../models/User';

// 4. Types/interfaces (if separate)
import type { IUser } from '../models/User';
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (components) | PascalCase | `Login.tsx`, `PostCard.tsx` |
| Files (utilities) | camelCase | `logger.ts`, `auth.ts` |
| Files (tests) | `*.test.ts` | `security.auth.test.ts` |
| Interfaces | PascalCase with `I` prefix | `IUser`, `IPost` |
| Types | PascalCase | `LogLevel`, `UserRole` |
| Classes | PascalCase | `AppError`, `ValidationError` |
| Functions | camelCase | `hashPassword`, `generateToken` |
| Constants | UPPER_SNAKE_CASE | `BCRYPT_ROUNDS`, `JWT_SECRET` |
| Variables | camelCase | `userId`, `isAuthenticated` |
| React Components | PascalCase | `const Login: React.FC = ...` |

### Error Handling

**Backend**: Use custom error classes and the `asyncHandler` wrapper:

```typescript
// Use custom error classes from middleware/errorHandler.ts
import { AppError, ValidationError, NotFoundError } from '../middleware/errorHandler';

// Throw specific errors - they're caught by global error handler
if (!user) {
  throw new NotFoundError('User');
}

// For async route handlers, use asyncHandler to catch promise rejections
import { asyncHandler } from '../middleware/errorHandler';

router.get('/users/:id', asyncHandler(async (req, res) => {
  // Errors automatically passed to error handler
}));
```

**Frontend**: Use try/catch with user-friendly error messages:

```typescript
try {
  const response = await authService.login(email, password);
} catch (err: any) {
  setError(err.response?.data?.message || 'Login failed');
}
```

### Controller Pattern (Backend)

Always add `req.user` guards in protected routes:

```typescript
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // req.user is now safely narrowed
    const user = await User.findById(req.user.userId);
    // ...
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
```

### React Component Pattern (Frontend)

```typescript
import React, { useState } from 'react';

interface ComponentProps {
  title: string;
  onAction: () => void;
}

const Component: React.FC<ComponentProps> = ({ title, onAction }) => {
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="card">
      {/* JSX content */}
    </div>
  );
};

export default Component;
```

## Security Practices

This codebase implements secure coding practices. When modifying security-related code:

1. **Input Validation**: Use `express-validator` middleware in routes
2. **Authentication**: Never expose password hashes; use bcrypt (12+ rounds)
3. **Authorization**: Apply `authMiddleware` before protected routes
4. **Error Handling**: Never expose stack traces in production
5. **Logging**: Use the `logger` utility; it auto-redacts sensitive data
6. **Secrets**: Read from environment variables, never hardcode

## Environment Variables

Backend requires these variables (see `backend/.env.example`):

- `PORT` - Server port (default: 4000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - **Required in production** (64+ chars recommended)
- `NODE_ENV` - `development` or `production`
- `BCRYPT_ROUNDS` - Password hashing rounds (default: 12)

## Common Tasks

### Adding a New API Endpoint

1. Add validation rules in `backend/src/middleware/validation.ts`
2. Add route in `backend/src/routes/<domain>Routes.ts`
3. Implement handler in `backend/src/controllers/<domain>Controller.ts`
4. Add tests in `backend/__tests__/`

### Adding a New Frontend Page

1. Create component in `frontend/src/pages/<PageName>.tsx`
2. Add route in `frontend/src/App.tsx`
3. Add API service function in `frontend/src/services/api.ts` if needed
