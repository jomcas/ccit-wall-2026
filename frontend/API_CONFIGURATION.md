# API Configuration: Mock vs Real API

## Overview
The frontend uses environment variables to determine whether to use mock data or connect to the real backend API. Here's how it works in detail.

---

## How Detection Works

### 1. **Environment Variables**

Two key environment variables control the behavior:

```typescript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true';
```

#### `REACT_APP_API_URL`
- **Purpose**: Specifies the backend server URL
- **Default**: `http://localhost:5000/api`
- **Override**: Can be set in `.env` or `.env.local` file
- **Example**: `http://localhost:4000/api` or `https://api.example.com`

#### `REACT_APP_USE_MOCK_DATA`
- **Purpose**: Boolean flag to enable/disable mock data
- **Type**: String comparison (must equal `'true'` exactly)
- **Default**: `false` (uses real API)
- **Valid Values**: 
  - `'true'` → Use mock data
  - `'false'` or unset → Use real API

---

### 2. **Conditional API Selection**

```typescript
const apiService = USE_MOCK_DATA ? mockApiService : {
  register: (name, email, password, role) =>
    api.post('/auth/register', { name, email, password, role }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  // ... more API methods
};
```

**Decision Logic:**
- **If `USE_MOCK_DATA === 'true'`**: 
  - Use `mockApiService` 
  - All data comes from in-memory mock objects
  - No HTTP requests made
  
- **If `USE_MOCK_DATA !== 'true'`**: 
  - Use real axios API client
  - Makes actual HTTP requests to backend
  - Requires backend server to be running

---

### 3. **Request Flow Diagrams**

#### Real API Flow
```
Frontend Component
        ↓
    Service Layer (e.g., authService.login())
        ↓
    apiService (routes to real API)
        ↓
    axios instance with interceptor
        ↓
    HTTP POST request
        ↓
Backend Server (http://localhost:4000/api)
        ↓
    Database Query
        ↓
    Response (JSON)
        ↓
Frontend Component (state updated)
```

#### Mock API Flow
```
Frontend Component
        ↓
    Service Layer (e.g., authService.login())
        ↓
    mockApiService
        ↓
    In-memory data lookup/manipulation
        ↓
    Simulated delay (MOCK_DELAY = 300ms)
        ↓
    Response returned (instant, no HTTP)
        ↓
Frontend Component (state updated)
```

---

## Configuration Files

### `.env` File (Default Configuration)
Located at: `frontend/.env`

```bash
# Backend API URL
REACT_APP_API_URL=http://localhost:4000/api

# Use real API (production/development with backend)
REACT_APP_USE_MOCK_DATA=false
```

### `.env.local` File (Local Development Override)
Located at: `frontend/.env.local`

This file is NOT committed to version control and is used for local development overrides.

**To use mock data locally:**
```bash
# Use mock API for testing/development without backend
REACT_APP_USE_MOCK_DATA=true
```

**To use real API with different backend URL:**
```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_USE_MOCK_DATA=false
```

---

## Request Interceptor

All real API requests automatically include authentication:

```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Functionality:**
- Retrieves JWT token from browser localStorage
- Attaches token to `Authorization` header as `Bearer <token>`
- Applied to EVERY HTTP request automatically
- Mock API bypasses this (no authentication needed for testing)

**Example Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Service Layer Organization

Services are organized by domain and all route through `apiService`:

### Auth Service
```typescript
export const authService = {
  register: (name, email, password, role) → apiService.register()
  login: (email, password) → apiService.login()
  getProfile: () → apiService.getProfile()
  updateProfile: (data) → apiService.updateProfile()
};
```

### Post Service
```typescript
export const postService = {
  getAllPosts: (search?, category?) → apiService.getAllPosts()
  getPostById: (id) → apiService.getPostById()
  searchPosts: (query) → apiService.searchPosts()
  createPost: (data) → apiService.createPost()
  updatePost: (id, data) → apiService.updatePost()
  deletePost: (id) → apiService.deletePost()
  likePost: (id) → apiService.likePost()
};
```

### Comment Service
```typescript
export const commentService = {
  createComment: (postId, content) → apiService.createComment()
  getComments: (postId) → apiService.getComments()
  updateComment: (id, content) → apiService.updateComment()
  deleteComment: (id) → apiService.deleteComment()
  likeComment: (id) → apiService.likeComment()
};
```

### User Service
```typescript
export const userService = {
  getAllUsers: () → apiService.getAllUsers()
  getUserById: (id) → apiService.getUserById()
  searchUsers: (query) → apiService.searchUsers()
};
```

**Key Point:** Components only call service methods, not `apiService` directly. Services handle routing to mock or real API.

---

## When to Use Each

| Scenario | `REACT_APP_USE_MOCK_DATA` | Environment File | Backend Required |
|----------|---------------------------|------------------|------------------|
| Development with backend | `false` | `.env.local` | ✅ Yes |
| Testing without backend | `true` | `.env.local` | ❌ No |
| UI/Component testing | `true` | `.env.local` | ❌ No |
| Production deployment | `false` | `.env` | ✅ Yes |
| Debugging frontend logic | `true` | `.env.local` | ❌ No |

---

## Current Setup (Your Project)

### Real API (Current Configuration)
- `REACT_APP_USE_MOCK_DATA` is **not set** (defaults to `false`)
- Backend URL: `http://localhost:4000/api`
- All requests go to your **real backend server**
- **Requirement**: Backend must be running

**Start the full stack:**
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### To Switch to Mock Data

**Step 1:** Create `frontend/.env.local`
```bash
REACT_APP_USE_MOCK_DATA=true
```

**Step 2:** Restart frontend dev server
```bash
cd frontend
npm run dev
```

**Step 3:** All API calls will use mock data
- No backend server needed
- Data comes from `mockData.ts`
- Instant responses (simulated 300ms delay)

---

## Mock Data Location

All mock data is defined in:
```
frontend/src/services/mockData.ts
```

**Mock Data Includes:**
- `mockUsers`: Sample user accounts
- `mockPosts`: Sample posts with various categories
- `mockComments`: Sample comments on posts
- `mockAuthResponse`: Sample authentication response

**Example Mock User:**
```typescript
{
  id: '1',
  name: 'Juan Dela Cruz',
  email: 'juan@example.com',
  role: 'student',
  bio: 'Computer Science student interested in web development',
  profilePicture: 'https://i.pravatar.cc/150?img=1',
  createdAt: new Date()
}
```

---

## Simulated Network Delay

The mock API includes a simulated network delay for realistic testing:

```typescript
const MOCK_DELAY = 300; // milliseconds

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockApiService = {
  login: async (email, password) => {
    await delay(MOCK_DELAY); // Simulate network latency
    const user = mockUsers.find((u) => u.email === email);
    return { data: { message: 'Login successful', token: 'mock_token_...', user } };
  }
};
```

This simulates real-world network conditions even with mock data.

---

## Troubleshooting

### Issue: Still getting backend errors with `REACT_APP_USE_MOCK_DATA=true`

**Solution:**
1. Stop the frontend dev server (Ctrl+C)
2. Verify `.env.local` exists and has correct content
3. Restart: `npm run dev`
4. Check browser console for environment variable value

### Issue: Mock data not loading

**Solution:**
1. Check that `mockData.ts` exists in `frontend/src/services/`
2. Verify mock data exports are correct
3. Restart frontend dev server

### Issue: Backend errors when `REACT_APP_USE_MOCK_DATA=false`

**Solution:**
1. Ensure backend server is running: `cd backend && npm run dev`
2. Verify `REACT_APP_API_URL` matches backend port (default: `http://localhost:4000/api`)
3. Check backend logs for errors
4. Verify MongoDB is running if using real database

---

## Development Workflow

### Scenario 1: Full-Stack Development
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend (with real API)
cd frontend
npm run dev

# Access at http://localhost:3000
```

### Scenario 2: Frontend-Only Development
```bash
# Single Terminal: Frontend (with mock API)
cd frontend

# Create .env.local with:
# REACT_APP_USE_MOCK_DATA=true

npm run dev

# Access at http://localhost:3000
# No backend needed!
```

### Scenario 3: Testing
```bash
# Frontend (with mock API)
cd frontend

# Create .env.local with:
# REACT_APP_USE_MOCK_DATA=true

npm run test

# Tests use consistent mock data
```

---

## Environment Variables Summary

| Variable | Type | Default | Purpose |
|----------|------|---------|---------|
| `REACT_APP_API_URL` | String | `http://localhost:5000/api` | Backend server URL |
| `REACT_APP_USE_MOCK_DATA` | Boolean (string) | `'false'` | Enable mock data |

---

## Key Takeaways

1. **Two modes**: Mock data (testing) or Real API (production/development)
2. **Environment variables control** which mode is active
3. **No code changes needed** - just toggle via `.env.local`
4. **Service layer abstracts** the choice from components
5. **Mock data includes delay** to simulate real-world latency
6. **Authentication** works with both modes
7. **Switching modes** requires dev server restart

