# CCIT Wall Development Agent Guide

## Project Overview
**Project Name**: CCIT Wall  
**Description**: A MERN stack social media platform for National University Philippines College of Computing and Information Technologies (CCIT)  
**Tech Stack**: React + TypeScript (Frontend) | Node.js + Express + TypeScript (Backend) | MongoDB (Database)

---

## Core Objectives

1. **Build a secure authentication system** with role-based access control (Student, Teacher, Admin)
2. **Implement a full-featured posting system** with text, images, and file attachments
3. **Enable user interactions** through likes, emoji reactions, and comments
4. **Provide comprehensive user profiles** with editing and activity history
5. **Create an admin dashboard** for activity monitoring and content moderation
6. **Implement search functionality** by user name and post title
7. **Ensure RESTful API architecture** and responsive design with NU branding

---

## Development Priorities

### Phase 1: Authentication & User Management
- [ ] User registration and login (Students, Teachers, Admins)
- [ ] Password encryption and session management
- [ ] Role-based authorization middleware
- [ ] User profile creation and storage
- [ ] Profile editing functionality (name, bio, picture, contact info)

### Phase 2: Core Posting Features
- [ ] Post creation with title, description, and media attachments
- [ ] Post visibility options (public, anonymous for students)
- [ ] Post categories (for students: college-related, general, extracurricular)
- [ ] Like and emoji reaction system
- [ ] Comment functionality
- [ ] Post sharing capability

### Phase 3: Search & Discovery
- [ ] Search by user name
- [ ] Search by post title
- [ ] Filter results by post category (for students)
- [ ] Search performance optimization

### Phase 4: Admin Features
- [ ] Admin dashboard with activity overview
- [ ] View all user activities (posts, comments, interactions)
- [ ] Content moderation tools
- [ ] User account management
- [ ] Audit logging for admin actions

### Phase 5: UI/UX & Polish
- [ ] Responsive design for mobile and desktop
- [ ] NU branding implementation (Gold and Blue colors)
- [ ] Intuitive navigation
- [ ] Form validation and error handling
- [ ] Loading states and user feedback

---

## API Architecture (RESTful Endpoints)

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Posts
- `POST /api/posts` - Create post
- `GET /api/posts` - Get all posts (with pagination)
- `GET /api/posts/:id` - Get single post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like a post
- `DELETE /api/posts/:id/like` - Unlike a post
- `POST /api/posts/:id/react` - Add emoji reaction
- `DELETE /api/posts/:id/react` - Remove reaction

### Comments
- `POST /api/posts/:id/comments` - Create comment
- `GET /api/posts/:id/comments` - Get post comments
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Udpdate user profile
- `GET /api/users/:id/posts` - Get user's posts
- `DELETE /api/users/:id` - Delete user account (admin only)

### Search
- `GET /api/search/users?name=query` - Search users by name
- `GET /api/search/posts?title=query` - Search posts by title

### Admin
- `GET /api/admin/dashboard` - Admin dashboard data
- `GET /api/admin/users` - Manage users
- `GET /api/admin/posts` - Review all posts
- `GET /api/admin/activities` - View activity logs

---

## Database Models

### User
```
- _id (ObjectId)
- email (String, unique)
- password (String, hashed)
- name (String)
- bio (String)
- profilePicture (String/URL)
- contactInfo (String)
- role (Enum: 'student', 'teacher', 'admin')
- isAnonymous (Boolean, for students)
- createdAt (Date)
- updatedAt (Date)
```

### Post
```
- _id (ObjectId)
- title (String)
- description (String)
- content (String)
- author (ObjectId, ref: User)
- media (Array of URLs/file paths)
- attachments (Array of file paths)
- visibility (Enum: 'public', 'anonymous')
- category (Enum: 'college-related', 'general', 'extracurricular') - for students
- likes (Array of ObjectIds - user refs)
- reactions (Array of { userId, emoji })
- comments (Array of ObjectIds - comment refs)
- createdAt (Date)
- updatedAt (Date)
```

### Comment
```
- _id (ObjectId)
- content (String)
- author (ObjectId, ref: User)
- post (ObjectId, ref: Post)
- likes (Array of ObjectIds - user refs)
- reactions (Array of { userId, emoji })
- createdAt (Date)
- updatedAt (Date)
```

### Reaction
```
- _id (ObjectId)
- emoji (String)
- user (ObjectId, ref: User)
- post (ObjectId, ref: Post) - nullable for comment reactions
- comment (ObjectId, ref: Comment) - nullable for post reactions
- createdAt (Date)
```

---

## Implementation Guidelines

### Code Standards
- **Language**: TypeScript across all backend and frontend code
- **Architecture**: RESTful API with clear separation of concerns
- **File Structure**: Controllers, models, routes, middleware, utils separated
- **Error Handling**: Comprehensive error handling with meaningful error messages
- **Validation**: Input validation on both frontend and backend

### Frontend Components
- Use React functional components with hooks
- Implement proper state management
- Create reusable component structures
- Handle loading and error states
- Form validation before submission

### Backend Best Practices
- Middleware for authentication and authorization
- Input sanitization and validation
- Database query optimization
- Proper HTTP status codes
- Comprehensive error responses

### Security
- Hash passwords using bcrypt
- Implement JWT for session management
- Validate all user inputs
- Implement CORS properly
- Rate limiting on sensitive endpoints
- Audit logging for admin actions

### Responsive Design
- Mobile-first approach
- Test on multiple breakpoints
- Use CSS media queries
- NU branding colors: Gold (#D4AF37) and Blue (#003DA5)

---

## Testing Checklist

### Authentication
- [ ] User can register with valid credentials
- [ ] User can login with correct credentials
- [ ] Failed login with incorrect credentials
- [ ] Session expires after timeout
- [ ] Role-based access control works for each role

### Posting
- [ ] Students can create public posts
- [ ] Students can create anonymous posts
- [ ] Teachers can only create public posts
- [ ] Posts with title and description save correctly
- [ ] Media uploads work properly
- [ ] Post deletion removes all associated comments and reactions

### Interactions
- [ ] Users can like/unlike posts
- [ ] Users can add emoji reactions
- [ ] Users can comment on posts
- [ ] Comments can be edited and deleted by author
- [ ] Reactions display correctly

### Search
- [ ] Search by user name returns correct results
- [ ] Search by post title returns correct results
- [ ] Search filters work properly
- [ ] Search handles special characters

### Admin
- [ ] Admin can view all user activities
- [ ] Admin can delete inappropriate posts
- [ ] Admin can manage user accounts
- [ ] Admin dashboard displays accurate data
- [ ] Admin actions are logged

### UI/UX
- [ ] Application is responsive on mobile and desktop
- [ ] NU colors are properly implemented
- [ ] Navigation is intuitive
- [ ] Loading states are visible
- [ ] Error messages are clear and helpful

---

## Development Workflow

1. **Feature Planning**: Break down each phase into specific tasks
2. **Backend First**: Implement API endpoints before frontend integration
3. **Database**: Create and test models before implementing logic
4. **Frontend Development**: Build components that consume the API
5. **Integration Testing**: Test frontend-backend communication
6. **Polish & Deploy**: Fix bugs, optimize performance, deploy

---

## Success Criteria

- ✅ Full CRUD operations working for all entities
- ✅ Authentication and authorization functioning correctly
- ✅ All role-based permissions enforced
- ✅ Search functionality returns accurate results
- ✅ Admin dashboard displays all required information
- ✅ Responsive design works on mobile and desktop
- ✅ NU branding properly implemented
- ✅ Code follows TypeScript and RESTful best practices
- ✅ All endpoints tested and working
- ✅ Application deployed and accessible

---

## Common Tasks for AI Agent

### When Adding a New Feature
1. Create database model if needed
2. Create controller with CRUD operations
3. Create routes and middleware
4. Implement API endpoints
5. Create frontend component/page
6. Connect to API service
7. Add error handling and validation
8. Test thoroughly

### When Debugging
1. Check error logs and console output
2. Verify database connection
3. Check API response status codes
4. Validate input data format
5. Test with different user roles
6. Review middleware chain execution

### When Refactoring
1. Maintain backward compatibility
2. Update tests accordingly
3. Document changes
4. Verify all endpoints still work
5. Check frontend components still function

---

## Resources

- **Frontend Source**: `/frontend/src`
- **Backend Source**: `/backend/src`
- **Database Models**: `/backend/src/models`
- **API Routes**: `/backend/src/routes`
- **Frontend Pages**: `/frontend/src/pages`
- **Components**: `/frontend/src/components`
- **Documentation**: `.github/Plan/`

