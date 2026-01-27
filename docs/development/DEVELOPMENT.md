# CCIT Wall - Development Guide

## Quick Start

### Install All Dependencies
```bash
npm run install-all
```

### Run Development Servers
```bash
npm run dev
```

This will start both the backend (port 5000) and frontend (port 3000) simultaneously.

## Project Features Implementation Status

### Phase 1: User Authentication & Profile Management ✅
- [x] User registration (Student, Teacher, Admin roles)
- [x] User login with JWT
- [x] Profile viewing
- [x] Profile editing
- [x] Role-based access control

### Phase 2: Core Posting & Interaction Features ✅
- [x] Create posts (title, description, category, optional anonymous)
- [x] Read posts with search and filtering
- [x] Update posts
- [x] Delete posts
- [x] Like posts
- [x] Emoji reactions
- [x] Share posts
- [x] Comments on posts
- [x] Like comments

### Phase 3: Admin Dashboard & Monitoring
- [ ] Activity dashboard
- [ ] User activity logs
- [ ] Content moderation tools
- [ ] Post deletion by admin
- [ ] User management interface

### Phase 4: Testing, Deployment & Launch
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Production deployment

## Database Models

### User
- name, email, password, role, bio, profilePicture
- timestamps

### Post
- title, description, author, category, isAnonymous
- attachments, likes, reactions, comments, shares
- timestamps

### Comment
- content, author, post
- likes, timestamps

## API Architecture

All endpoints follow RESTful principles:
- GET /api/posts - Read
- POST /api/posts - Create
- PUT /api/posts/:id - Update
- DELETE /api/posts/:id - Delete

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Role-based access control
- Input validation
- CORS configuration

## Color Scheme (NU Branding)

- Primary Gold: #ffc107
- Primary Blue: #1e40af
- Dark Blue: #0f2847
- Light Gray: #f5f5f5

## Next Steps

1. Set up MongoDB database
2. Configure environment variables
3. Install dependencies
4. Run development servers
5. Implement admin features
6. Add unit and integration tests
7. Deploy to production

---

For detailed API documentation, see the README.md in the root directory.
