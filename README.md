# CCIT Wall - Social Media Platform

A MERN stack web application for the College of Computing and Information Technologies (CCIT) of National University Philippines.

## Project Structure

```
ccit-wall/
├── backend/          # Node.js/Express TypeScript backend
│   ├── src/
│   │   ├── models/   # MongoDB models
│   │   ├── routes/   # API routes
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Auth middleware
│   │   ├── utils/    # Helper functions
│   │   └── index.ts  # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── frontend/         # React TypeScript frontend
    ├── public/       # Static files
    ├── src/
    │   ├── pages/    # Page components
    │   ├── components/ # Reusable components
    │   ├── services/ # API calls
    │   ├── types/    # TypeScript types
    │   ├── styles/   # CSS styles
    │   ├── App.tsx   # Main app component
    │   └── index.tsx # React entry point
    ├── package.json
    ├── tsconfig.json
    └── .env.example
```

## Features

- ✅ User Authentication (Student, Teacher, Admin roles)
- ✅ Create, Read, Update, Delete posts
- ✅ Post interactions (likes, emoji reactions, shares)
- ✅ Comments on posts with likes
- ✅ User profiles with editing
- ✅ Search functionality (by user name and post title)
- ✅ Admin dashboard for activity monitoring
- ✅ RESTful API architecture
- ✅ TypeScript throughout
- ✅ NU branding (Gold and Blue colors)

## Tech Stack

### Backend
- Node.js with Express
- TypeScript
- MongoDB
- JWT for authentication
- bcryptjs for password hashing

### Frontend
- React 18
- TypeScript
- React Router for navigation
- Axios for API calls
- CSS for styling

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd ccit-wall/backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ccit-wall
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

5. Start the backend development server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd ccit-wall/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Start the frontend development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (authenticated)
- `PUT /api/auth/profile` - Update user profile (authenticated)
- `GET /api/auth/users` - Get all users (authenticated)
- `GET /api/auth/users/:id` - Get user by ID (authenticated)

### Posts
- `GET /api/posts` - Get all posts with search and filter
- `POST /api/posts` - Create a new post (authenticated)
- `GET /api/posts/:id` - Get post by ID
- `PUT /api/posts/:id` - Update post (authenticated)
- `DELETE /api/posts/:id` - Delete post (authenticated)
- `POST /api/posts/:id/like` - Like/unlike post (authenticated)
- `POST /api/posts/:id/reaction` - Add emoji reaction (authenticated)
- `POST /api/posts/:id/share` - Share post (authenticated)

### Comments
- `POST /api/posts/:postId/comments` - Create comment (authenticated)
- `GET /api/posts/:postId/comments` - Get comments for post
- `PUT /api/comments/:id` - Update comment (authenticated)
- `DELETE /api/comments/:id` - Delete comment (authenticated)
- `POST /api/comments/:id/like` - Like/unlike comment (authenticated)

### Admin
- `GET /api/admin/dashboard` - Get activity dashboard (admin only)
- `GET /api/admin/users/:userId/activity` - Get user activity log (admin only)
- `GET /api/admin/search/users` - Search users (admin only)
- `GET /api/admin/search/posts` - Search posts (admin only)

## Build and Deployment

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
```

The build folder will contain the production-ready files.

## Environment Variables

### Backend
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ccit-wall
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=development
```

### Frontend
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Support

For support, please contact the development team or submit an issue in the repository.

---

Built with ❤️ for CCIT, National University Philippines
