# CCIT Wall - Social Media Platform

A modern social media platform for the College of Computing and Information Technologies (CCIT) at National University Philippines. Built with MERN stack, Firebase Authentication, and deployed on Vercel.

## Project Structure

```
ccit-wall/
├── backend/          # Node.js/Express TypeScript backend
│   ├── src/
│   │   ├── models/   # MongoDB/Mongoose schemas
│   │   ├── routes/   # API routes
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Auth, validation, security middleware
│   │   ├── utils/    # Firebase, storage, logger utilities
│   │   └── index.ts  # Entry point
│   ├── __tests__/    # Jest test suites
│   ├── package.json
│   ├── tsconfig.json
│   ├── vercel.json   # Vercel deployment config
│   └── .env.example
└── frontend/         # React TypeScript frontend
    ├── public/       # Static files
    ├── src/
    │   ├── pages/    # Page components
    │   ├── components/ # Reusable components
    │   ├── contexts/ # SessionContext, ThemeContext
    │   ├── services/ # API calls
    │   ├── config/   # Firebase client config
    │   ├── types/    # TypeScript interfaces
    │   ├── styles/   # Design system CSS (tokens, themes)
    │   ├── App.tsx   # Main app with routing
    │   └── index.tsx # React entry point
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

## Features

- ✅ **Firebase Authentication** with Google SSO
- ✅ **Firebase Storage** for image uploads (JPEG, PNG, GIF, WebP)
- ✅ Role-based access control (Student, Teacher, Admin)
- ✅ Create, Read, Update, Delete posts with images
- ✅ Post interactions (likes, emoji reactions, shares)
- ✅ Nested comments with likes
- ✅ Real-time notifications
- ✅ User profiles with profile pictures
- ✅ Search functionality (users and posts)
- ✅ Admin dashboard for activity monitoring
- ✅ **Security features**: Rate limiting, CORS, helmet, input validation
- ✅ Dark mode support
- ✅ Responsive design with NU branding (Gold and Blue)
- ✅ Production deployment on Vercel

## Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Firebase Admin SDK (ID token verification)
- **Storage**: Firebase Cloud Storage
- **Security**: Helmet, express-rate-limit, express-validator
- **Testing**: Jest with Supertest
- **Deployment**: Vercel Serverless Functions

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **Authentication**: Firebase Client SDK
- **HTTP Client**: Axios with request/response interceptors
- **Styling**: Plain CSS with design tokens (no frameworks)
- **State Management**: Context API (SessionContext, ThemeContext)
- **Build Tool**: Create React App
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local instance or MongoDB Atlas)
- Firebase project with Authentication and Storage enabled
- npm or yarn

### Firebase Setup

1. **Create a Firebase project** at [Firebase Console](https://console.firebase.google.com/)

2. **Enable Authentication**:
   - Go to **Authentication** → **Sign-in method**
   - Enable **Email/Password** and **Google** providers
   - Add authorized domains (localhost:3000, your production domain)

3. **Enable Cloud Storage**:
   - Go to **Storage** → Get started
   - Set up security rules (see `docs/` for examples)

4. **Get Firebase credentials**:
   - **For Frontend**: Go to Project Settings → Your apps → Web app config
   - **For Backend**: Go to Project Settings → Service accounts → Generate new private key

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/ccit-wall
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Firebase Admin SDK (from service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Security (optional)
ENABLE_CORS=true
RATE_LIMIT_MAX=10000
RATE_LIMIT_WINDOW_MS=900000
```

5. Start the backend development server:
```bash
npm run dev
```

The API will be available at `http://localhost:4000`

### Running Tests
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm test -- notification    # Run specific test file
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your `.env` file with Firebase Web SDK credentials:
```env
REACT_APP_API_URL=http://localhost:4000/api
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

5. Start the frontend development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

### Running Both Together

From the root directory:
```bash
npm run install-all   # Install all dependencies
npm run dev          # Run backend + frontend concurrently
```

## API Endpoints

All authenticated endpoints require a Firebase ID token in the `Authorization` header:
```
Authorization: Bearer <firebase-id-token>
```

### Authentication & Users
- `POST /api/users/sync` - Sync Firebase user to MongoDB (auto-called on login)
- `GET /api/users/profile` - Get current user profile (authenticated)
- `PUT /api/users/profile` - Update user profile (authenticated)
- `GET /api/users` - Get all users (authenticated)
- `GET /api/users/:id` - Get user by ID (authenticated)
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/users/search` - Search users (authenticated)

### Posts
- `GET /api/posts` - Get all posts with pagination, search, and filters
- `POST /api/posts` - Create a new post with images (authenticated)
- `GET /api/posts/:id` - Get post by ID
- `PUT /api/posts/:id` - Update post (authenticated, owner only)
- `DELETE /api/posts/:id` - Delete post (authenticated, owner/admin)
- `POST /api/posts/:id/like` - Like/unlike post (authenticated)
- `POST /api/posts/:id/reaction` - Add emoji reaction (authenticated)
- `POST /api/posts/:id/share` - Share post (authenticated)

### Comments
- `POST /api/comments` - Create comment on post (authenticated)
- `GET /api/posts/:postId/comments` - Get comments for post
- `PUT /api/comments/:id` - Update comment (authenticated, owner only)
- `DELETE /api/comments/:id` - Delete comment (authenticated, owner/admin)
- `POST /api/comments/:id/like` - Like/unlike comment (authenticated)

### Notifications
- `GET /api/notifications` - Get user notifications (authenticated)
- `PUT /api/notifications/:id/read` - Mark notification as read (authenticated)
- `PUT /api/notifications/read-all` - Mark all as read (authenticated)
- `DELETE /api/notifications/:id` - Delete notification (authenticated)

### Admin
- `GET /api/admin/dashboard` - Get activity dashboard (admin only)
- `GET /api/admin/users/:userId/activity` - Get user activity log (admin only)
- `GET /api/admin/search/users` - Search users (admin only)
- `GET /api/admin/search/posts` - Search posts (admin only)

## Build and Deployment

### Backend Build
```bash
cd backend
npm run build    # TypeScript compilation to ./dist
npm start        # Run production build
```

### Frontend Build
```bash
cd frontend
npm run build    # Create React App production build
```

### Deploying to Vercel

#### Backend (API)
1. Push your code to GitHub
2. Import project to Vercel
3. Configure **Environment Variables** in Vercel dashboard:
   ```
   MONGODB_URI
   NODE_ENV=production
   CLIENT_URL=https://your-frontend.vercel.app
   FIREBASE_PROJECT_ID
   FIREBASE_CLIENT_EMAIL
   FIREBASE_PRIVATE_KEY
   FIREBASE_STORAGE_BUCKET
   ENABLE_CORS=true
   ```
4. Vercel automatically detects `vercel.json` configuration
5. Deploy

#### Frontend
1. Import frontend to Vercel
2. Set **Root Directory** to `frontend`
3. Configure **Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-backend.vercel.app/api
   REACT_APP_FIREBASE_API_KEY
   REACT_APP_FIREBASE_AUTH_DOMAIN
   REACT_APP_FIREBASE_PROJECT_ID
   REACT_APP_FIREBASE_STORAGE_BUCKET
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID
   REACT_APP_FIREBASE_APP_ID
   ```
4. Deploy

#### Important: Firebase Authorized Domains
After deployment, add your Vercel domain to Firebase Console:
- Go to **Authentication** → **Settings** → **Authorized domains**
- Add your production domain (e.g., `your-app.vercel.app`)
- This fixes the `auth/unauthorized-domain` error

## Environment Variables Reference

### Backend (.env)
```env
# Server
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/ccit-wall

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# Security
ENABLE_CORS=true
DEBUG=true
ENABLE_TRUST_PROXY=true
RATE_LIMIT_MAX=10000
RATE_LIMIT_WINDOW_MS=900000
```

### Frontend (.env)
```env
# Backend API
REACT_APP_API_URL=http://localhost:4000/api

# Firebase Web SDK
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef

# Optional
REACT_APP_USE_MOCK_DATA=false
```

## Security Features

- **Firebase Authentication**: Industry-standard authentication with secure token verification
- **Rate Limiting**: Configurable rate limits to prevent abuse
- **Helmet.js**: Sets security HTTP headers
- **CORS**: Configurable cross-origin resource sharing
- **Input Validation**: express-validator for all user inputs
- **Secure File Uploads**: MIME type validation, size limits, Firebase Storage
- **Role-Based Access Control**: Student, Teacher, Admin roles with middleware guards
- **Sanitized Logging**: Automatic redaction of sensitive data in logs

## Project Documentation

- `docs/development/` - Development guides
- `docs/security/` - Security implementation docs
- `docs/deploy/` - Deployment guides
- `AGENTS.md` - AI coding agent guidelines
- Backend tests: `backend/__tests__/` (10 test suites, 200+ tests)

## Common Issues & Solutions

### 1. Firebase `auth/unauthorized-domain` Error
**Solution**: Add your domain to Firebase Console → Authentication → Authorized domains

### 2. `ERR_REQUIRE_ESM` Error in Vercel
**Solution**: Already fixed - using Node's built-in `crypto.randomUUID()` instead of uuid package

### 3. MongoDB Connection Issues
**Solution**: Check your `MONGODB_URI` format and network access in MongoDB Atlas

### 4. CORS Errors
**Solution**: Ensure `CLIENT_URL` in backend `.env` matches your frontend URL

### 5. Firebase Private Key Issues
**Solution**: In Vercel, paste the private key with actual newlines (not escaped `\n`)

## Development Workflow

### Git Branches
- `main` - Production branch
- `feature/firebase-integration` - Firebase Auth & Storage (✅ Complete)
- `ui/bulletin-board-refresh` - UI improvements (🔄 In Progress)

### Making Changes
1. Create a feature branch from `main`
2. Make your changes with descriptive commits
3. Run tests: `npm test` (backend)
4. Build to verify: `npm run build`
5. Push and create a Pull Request

### Code Style
- Follow TypeScript strict mode
- Use ESLint configurations
- See `AGENTS.md` for detailed coding guidelines
- Import order: Node.js built-ins → External packages → Internal modules → Types

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Testing

Backend includes comprehensive test coverage:
```bash
npm test                              # Run all tests
npm test -- notification             # Run notification tests
npm test -- --testPathPattern=security # Run security suite
npm run test:watch                   # Watch mode
```

## License

MIT License - See LICENSE file for details

## Support & Contact

- **Issues**: Submit via GitHub Issues
- **Documentation**: Check `docs/` directory
- **Security**: See `docs/security/README_SECURITY_DEPLOYMENT.md`

## Acknowledgments

- Built for **CCIT, National University Philippines**
- Firebase for authentication and storage infrastructure
- MongoDB for flexible data modeling
- Vercel for seamless deployment

---

**Version**: 2.0.0 (Firebase Integration)  
**Last Updated**: March 2026  
Built with ❤️ for CCIT, National University Philippines
