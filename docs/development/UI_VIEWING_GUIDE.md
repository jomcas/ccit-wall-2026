# CCIT Wall - UI Viewing Guide with Mock Data

## 🚀 Getting Started

Since you have mock data enabled, you can run just the frontend without needing the backend running!

### Start the Frontend Only

```bash
cd /Users/lz43/Developer/test-emf/ai-test/ccit-wall/frontend
npm start
```

This will open the app at `http://localhost:3000` automatically.

---

## 📄 Pages Available

### 1. **Login Page**
- **URL:** `http://localhost:3000/login`
- **What to do:**
  - Use any of these mock credentials to login:
    - Email: `juan@nu.edu.ph` | Password: `password` (Student)
    - Email: `maria.santos@nu.edu.ph` | Password: `password` (Teacher)
    - Email: `pedro@nu.edu.ph` | Password: `password` (Student)
  - Or use any email since mock API doesn't validate
  - Password can be anything
- **Features:**
  - Email and password inputs
  - Login button
  - Link to register page
  - Error message display

### 2. **Register Page**
- **URL:** `http://localhost:3000/register`
- **What to do:**
  - Fill in any name, email, and password
  - Select role: Student, Teacher, or Admin
  - Click Register
  - You'll be automatically logged in
- **Features:**
  - Name, email, password inputs
  - Role selection dropdown
  - Register button
  - Link to login page

### 3. **Feed Page** (After Login)
- **URL:** `http://localhost:3000/`
- **Requires:** Authentication (login first)
- **What to do:**
  - View all mock posts from users
  - Search posts by title using the search box
  - Filter by category (College Activities, General, Extracurricular)
  - Click on posts to interact with them
- **Features:**
  - Post listing with titles and descriptions
  - Author info and timestamps
  - Like button (toggles like on/off)
  - Comment count
  - Comment section (click "Comments" to expand)
  - Delete button (if you created the post)

### 4. **Create Post Page** (After Login)
- **URL:** `http://localhost:3000/create`
- **Requires:** Authentication (login first)
- **What to do:**
  - Enter a post title
  - Enter a post description
  - Select a category
  - Optionally check "Post anonymously"
  - Click "Create Post"
  - New post appears at top of feed
- **Features:**
  - Title input
  - Description textarea
  - Category dropdown
  - Anonymous checkbox
  - Create Post button

---

## 🔄 User Flow

Here's the recommended flow to see all pages:

1. **Start the app:**
   ```bash
   cd /Users/lz43/Developer/test-emf/ai-test/ccit-wall/frontend
   npm start
   ```

2. **See the Login Page** (default page when not authenticated)
   - You'll be redirected here automatically

3. **Login with mock data:**
   - Email: `juan@nu.edu.ph`
   - Password: `anything`
   - Click Login

4. **View the Feed Page** (automatic redirect after login)
   - See all 5 mock posts
   - Try searching for "hackathon" or "React"
   - Try filtering by category
   - Click on post comments to see mock comments
   - Try liking posts
   - Try adding new comments

5. **Create a New Post** (click "Create Post" in header)
   - Fill in post details
   - Create the post
   - See it appear at the top of the feed

6. **Logout and Try Register** (click logout button)
   - Click "Register" link
   - Fill in details
   - Register
   - See you're logged in with new user info

---

## 📊 Mock Data Available

### Users:
- **Juan Dela Cruz** (Student) - juan@nu.edu.ph
- **Dr. Maria Santos** (Teacher) - maria.santos@nu.edu.ph
- **Pedro Reyes** (Student) - pedro@nu.edu.ph
- **Admin User** (Admin) - admin@nu.edu.ph

### Posts:
1. "Excited to announce our new hackathon!" - By Dr. Maria Santos
2. "Thoughts on the new React 19 features" - By Juan Dela Cruz
3. "Anonymous tip: Library closes at 8 PM" - Anonymous by Pedro
4. "Basketball tournament finals this weekend!" - By Juan Dela Cruz
5. "New study group for Data Structures" - By Pedro Reyes

### Comments:
- 2 mock comments ready to interact with

---

## 🎨 Features You Can Test

- ✅ Login/Register with mock data
- ✅ View feed with realistic posts
- ✅ Search posts by title
- ✅ Filter posts by category
- ✅ Like/unlike posts
- ✅ Add comments on posts
- ✅ See mock reactions
- ✅ Create new posts
- ✅ Delete your own posts
- ✅ User profile info in header
- ✅ Logout functionality
- ✅ NU branding colors (Gold & Blue)

---

## 🔄 Switching to Real Backend

When you're ready to use the real backend:

1. **Stop the frontend** (Ctrl+C in terminal)

2. **Disable mock data** in `frontend/.env`:
   ```
   REACT_APP_USE_MOCK_DATA=false
   ```

3. **Start both frontend and backend**:
   ```bash
   cd /Users/lz43/Developer/test-emf/ai-test/ccit-wall
   npm run dev
   ```

4. **Backend will run on** `http://localhost:5000/api`
5. **Frontend will run on** `http://localhost:3000`

---

## 💡 Tips

- Mock data persists during your session (stays as you interact with it)
- Refreshing the page keeps your login state
- Mock API responses have 300ms delay for realistic feel
- All CRUD operations work on mock data
- No MongoDB needed while using mock data

Enjoy exploring the UI! 🎉
