import axios from 'axios';
import { auth } from '../config/firebase';
import { mockApiService } from './mockApi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

export const IS_MOCK_MODE = process.env.REACT_APP_USE_MOCK_DATA === 'true';

// Track if we've already detected an expired session to prevent duplicate handling
let sessionExpiredHandled = false;

// Function to reset the session expired flag (call this on successful login)
export const resetSessionExpiredFlag = () => {
  sessionExpiredHandled = false;
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach Firebase ID token
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;

  // If session already expired and no Firebase user, cancel the request
  if (!user && sessionExpiredHandled) {
    const controller = new AbortController();
    controller.abort();
    return { ...config, signal: controller.signal };
  }

  if (user) {
    try {
      const idToken = await user.getIdToken();
      config.headers.Authorization = `Bearer ${idToken}`;
    } catch {
      // Token refresh failed — treat as expired session
      sessionExpiredHandled = true;
    }
  }

  // For FormData, delete Content-Type header so browser sets it with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// Response interceptor - mark session as expired on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !sessionExpiredHandled) {
      sessionExpiredHandled = true;
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

const apiService = {
  // Sync Firebase user with backend (creates or updates Mongo user)
  syncProfile: (data?: { role?: string; name?: string }) => api.post('/auth/sync', data || {}),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  getAllUsers: () => api.get('/auth/users'),
  getUserById: (id: string) => api.get(`/auth/users/${id}`),
  searchUsers: (query: string) => api.get('/auth/users/search', { params: { query } }),
  getAllPosts: (search?: string, category?: string) =>
    api.get('/posts', { params: { search, category } }),
  getPostById: (id: string) => api.get(`/posts/${id}`),
  searchPosts: (query: string) => api.get('/posts/search', { params: { query } }),
  createPost: (data: FormData | any) => api.post('/posts', data),
  updatePost: (id: string, data: FormData | any) => api.put(`/posts/${id}`, data),
  deletePost: (id: string) => api.delete(`/posts/${id}`),
  likePost: (id: string) => api.post(`/posts/${id}/like`),
  addReaction: (id: string, emoji: string) =>
    api.post(`/posts/${id}/reaction`, { emoji }),
  sharePost: (id: string) => api.post(`/posts/${id}/share`),
  createComment: (postId: string, content: string) =>
    api.post(`/posts/${postId}/comments`, { content }),
  getComments: (postId: string) => api.get(`/posts/${postId}/comments`),
  updateComment: (id: string, content: string) =>
    api.put(`/comments/${id}`, { content }),
  deleteComment: (id: string) => api.delete(`/comments/${id}`),
  likeComment: (id: string) => api.post(`/comments/${id}/like`),
  getDashboard: () => api.get('/admin/dashboard'),
  getUserActivity: (userId: string) =>
    api.get(`/admin/users/${userId}/activity`),
  adminSearchUsers: (query: string) => api.get('/admin/search/users', { params: { query } }),
  adminSearchPosts: (query: string) => api.get('/admin/search/posts', { params: { query } }),
};

// Auth Services (Firebase handles sign-in/sign-up; backend only does sync & profile)
export const authService = {
  syncProfile: (data?: { role?: string; name?: string }) =>
    IS_MOCK_MODE ? mockApiService.syncProfile(data) : apiService.syncProfile(data),
  getProfile: () =>
    IS_MOCK_MODE ? mockApiService.getProfile() : apiService.getProfile(),
  updateProfile: (data: any) =>
    IS_MOCK_MODE ? mockApiService.updateProfile(data) : apiService.updateProfile(data),
  uploadProfilePicture: (file: File) => {
    if (IS_MOCK_MODE) {
      return mockApiService.uploadProfilePicture(file);
    }
    const formData = new FormData();
    formData.append('profilePicture', file);
    return api.patch('/auth/profile/picture', formData);
  },
};

// Post Services
export const postService = {
  getAllPosts: (search?: string, category?: string) =>
    IS_MOCK_MODE
      ? mockApiService.getAllPosts(search, category)
      : apiService.getAllPosts(search, category),
  getPostById: (id: string) =>
    IS_MOCK_MODE ? mockApiService.getPostById(id) : apiService.getPostById(id),
  searchPosts: (query: string) =>
    IS_MOCK_MODE ? mockApiService.searchPosts(query) : apiService.searchPosts(query),
  createPost: (data: any) =>
    IS_MOCK_MODE ? mockApiService.createPost(data) : apiService.createPost(data),
  updatePost: (id: string, data: any) =>
    IS_MOCK_MODE ? mockApiService.updatePost(id, data) : apiService.updatePost(id, data),
  deletePost: (id: string) =>
    IS_MOCK_MODE ? mockApiService.deletePost(id) : apiService.deletePost(id),
  likePost: (id: string) =>
    IS_MOCK_MODE ? mockApiService.likePost(id) : apiService.likePost(id),
  addReaction: (id: string, emoji: string) =>
    IS_MOCK_MODE ? mockApiService.addReaction(id, emoji) : apiService.addReaction(id, emoji),
  sharePost: (id: string) =>
    IS_MOCK_MODE ? mockApiService.sharePost(id) : apiService.sharePost(id),
};

// Comment Services
export const commentService = {
  createComment: (postId: string, content: string) =>
    IS_MOCK_MODE
      ? mockApiService.createComment(postId, content)
      : apiService.createComment(postId, content),
  getComments: (postId: string) =>
    IS_MOCK_MODE ? mockApiService.getComments(postId) : apiService.getComments(postId),
  updateComment: (id: string, content: string) =>
    IS_MOCK_MODE ? mockApiService.updateComment(id, content) : apiService.updateComment(id, content),
  deleteComment: (id: string) =>
    IS_MOCK_MODE ? mockApiService.deleteComment(id) : apiService.deleteComment(id),
  likeComment: (id: string) =>
    IS_MOCK_MODE ? mockApiService.likeComment(id) : apiService.likeComment(id),
};

// User Services
export const userService = {
  getAllUsers: () =>
    IS_MOCK_MODE ? mockApiService.getAllUsers() : apiService.getAllUsers(),
  getUserById: (id: string) =>
    IS_MOCK_MODE ? mockApiService.getUserById(id) : apiService.getUserById(id),
  searchUsers: (query: string) =>
    IS_MOCK_MODE ? mockApiService.searchUsers(query) : apiService.searchUsers(query),
};

// Admin Services
export const adminService = {
  getDashboard: () =>
    IS_MOCK_MODE ? mockApiService.getDashboard() : apiService.getDashboard(),
  getUserActivity: (userId: string) =>
    IS_MOCK_MODE ? mockApiService.getUserActivity(userId) : apiService.getUserActivity(userId),
  searchUsers: (query: string) =>
    IS_MOCK_MODE ? mockApiService.adminSearchUsers(query) : apiService.adminSearchUsers(query),
  searchPosts: (query: string) =>
    IS_MOCK_MODE ? mockApiService.adminSearchPosts(query) : apiService.adminSearchPosts(query),
};

// Notification Services
export const notificationService = {
  getNotifications: (page: number = 1, limit: number = 20, unreadOnly: boolean = false) =>
    IS_MOCK_MODE
      ? mockApiService.getNotifications(page, limit, unreadOnly)
      : api.get('/notifications', { params: { page, limit, unreadOnly } }),
  getUnreadCount: () =>
    IS_MOCK_MODE ? mockApiService.getUnreadCount() : api.get('/notifications/unread-count'),
  markAsRead: (id: string) =>
    IS_MOCK_MODE ? mockApiService.markAsRead(id) : api.put(`/notifications/${id}/read`),
  markAllAsRead: () =>
    IS_MOCK_MODE ? mockApiService.markAllAsRead() : api.put('/notifications/read-all'),
  deleteNotification: (id: string) =>
    IS_MOCK_MODE ? mockApiService.deleteNotification(id) : api.delete(`/notifications/${id}`),
};

export default api;
