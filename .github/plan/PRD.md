# Product Requirements Document: CCIT Wall

## Executive Summary
A MERN stack web application called CCIT Wall for the College of Computing and Information Technologies (CCIT) of National University Philippines. This platform is a simple social media application (similar to Facebook/Tumblr/Twitter) designed for the university college community, enabling students, teachers, and administrators to share updates, announcements, and collaborate within the college community.

---

## 1. Product Overview

### Purpose
Create an internal social media platform for CCIT to facilitate communication and community engagement among students, faculty, and administrators.

### Target Users
- **Students**: Post publicly or anonymously about college-related activities, general topics, or extracurricular activities; engage with peers
- **Teachers**: Post announcements and reminders to the college community
- **Administrators**: Monitor and view all activities of both teachers and students

---

## 2. Core Features

### 2.1 Posting System
- **Post Types**: Text-only, with pictures, or file attachments
- **Post Format**: Each post must have a post title and post description
- **Visibility Options**: 
  - **Students**: Can post either publicly or anonymously
  - **Students Categories**: College-related activities, general topics, or extracurricular-related content
  - **Teachers**: Public posts only (announcements and reminders)

### 2.2 Post Interactions
- **Metrics**: Likes and emoji reactions
- **Comments**: Comment functionality for engagement
- **Sharing**: Share posts with other users or to profiles

### 2.3 Search Functionality
- **Search by Name**: Find users by their name
- **Search by Post Title**: Discover posts by their title
- The search functionality must support both search by name and search by post title

### 2.4 User Profiles
- **Profile Editing**: Must have good profile editing functionality for both students and teachers
- **Profile Management**: Comprehensive editing capabilities including:
  - Add and update profile image/picture
  - Edit user information (name, bio, contact information, etc.)
- **User Information**: Display name, bio, profile picture, contact information
- **Activity Feed**: History of user posts and interactions

### 2.5 Administrative Functions
- **Activity Monitoring**: Admin can see all the activities of both teachers and students
- **Dashboard**: Comprehensive dashboard to view and monitor all platform activity
- **Content Moderation**: Ability to review and manage posts
- **User Management**: Manage user accounts and permissions

### 2.6 Authentication & Authorization
- **Authentication System**: Must have proper authentication (secure login and registration)
- **Role-Based Access**: Student, Teacher, Admin roles with different permissions
- **Session Management**: Secure session handling

---

## 3. Technical Stack

### Frontend
- **Framework**: React
- **Language**: TypeScript
- **UI Branding**: NU official colors (Gold and Blue)
- **Responsive Design**: Mobile and desktop support

### Backend
- **Server**: Node.js with Express
- **Language**: TypeScript (must be used throughout)
- **Database**: MongoDB
- **API**: RESTful API architecture - all code must follow RESTful principles

---

## 4. Data Operations (CRUD)

The platform must follow CRUD functionalities and will support full CRUD operations for:
- Posts (Create, Read, Update, Delete)
- Comments (Create, Read, Update, Delete)
- User Profiles (Create, Read, Update, Delete)
- Reactions (Create, Delete)
- User Accounts (Admin only Create, Read, Update, Delete)

---

## 5. User Experience Requirements

### Visual Design
- Good UI suitable for NU branding (Gold and Blue color scheme)
- Professional interface reflecting National University Philippines branding
- Intuitive navigation
- Clear visual hierarchy

### Accessibility
- Responsive design for various device sizes
- Accessible forms and interactive elements
- Fast loading times

---

## 6. Security & Privacy

- Password encryption and secure authentication
- Data validation and sanitization
- Role-based access control
- Audit logging for admin activities

---

## 7. Success Metrics

- Successful user authentication and authorization
- Full CRUD functionality across all features
- User engagement (posts, comments, reactions)
- Admin visibility into platform activity
- Platform uptime and performance

---

## 8. Out of Scope (Future Considerations)

- Mobile native apps
- Advanced analytics and reporting
- Real-time notifications
- Direct messaging between users
- Content recommendation algorithms

---

## 9. Timeline & Milestones

- **Phase 1**: User authentication and profile management
- **Phase 2**: Core posting and interaction features
- **Phase 3**: Admin dashboard and monitoring
- **Phase 4**: Testing, deployment, and launch
