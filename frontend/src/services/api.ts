import axios from 'axios';
import { mockApiService } from './mockApi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true';

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

// Request interceptor - skip requests if session already expired
api.interceptors.request.use((config) => {
  // If session is already expired and token is cleared, cancel the request
  const token = localStorage.getItem('token');
  if (!token && sessionExpiredHandled) {
    // Return a cancelled request
    const controller = new AbortController();
    controller.abort();
    return {
      ...config,
      signal: controller.signal,
    };
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - mark session as expired on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !sessionExpiredHandled) {
      sessionExpiredHandled = true;
      // Clear token immediately to prevent further requests
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Use mock API if enabled
const apiService = USE_MOCK_DATA ? mockApiService : {
  register: (name: string, email: string, password: string, role: string) =>
    api.post('/auth/register', { name, email, password, role }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post(`/auth/reset-password/${token}`, { password }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  getAllUsers: () => api.get('/auth/users'),
  getUserById: (id: string) => api.get(`/auth/users/${id}`),
  searchUsers: (query: string) => api.get('/auth/users/search', { params: { query } }),
  getAllPosts: (search?: string, category?: string) =>
    api.get('/posts', { params: { search, category } }),
  getPostById: (id: string) => api.get(`/posts/${id}`),
  searchPosts: (query: string) => api.get('/posts/search', { params: { query } }),
  // createPost now accepts FormData for image uploads
  createPost: (data: FormData | any) => {
    // If data is FormData (has images), use multipart/form-data
    if (data instanceof FormData) {
      return api.post('/posts', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    // Otherwise use JSON
    return api.post('/posts', data);
  },
  updatePost: (id: string, data: any) => api.put(`/posts/${id}`, data),
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

// Auth Services
export const authService = {
  register: (name: string, email: string, password: string, role: string) =>
    apiService.register(name, email, password, role),
  login: (email: string, password: string) =>
    apiService.login(email, password),
  forgotPassword: (email: string) =>
    apiService.forgotPassword(email),
  resetPassword: (token: string, password: string) =>
    apiService.resetPassword(token, password),
  getProfile: () => apiService.getProfile(),
  updateProfile: (data: any) => apiService.updateProfile(data),
};

// Post Services
export const postService = {
  getAllPosts: (search?: string, category?: string) =>
    apiService.getAllPosts(search, category),
  getPostById: (id: string) => apiService.getPostById(id),
  searchPosts: (query: string) => apiService.searchPosts(query),
  createPost: (data: any) => apiService.createPost(data),
  updatePost: (id: string, data: any) => apiService.updatePost(id, data),
  deletePost: (id: string) => apiService.deletePost(id),
  likePost: (id: string) => apiService.likePost(id),
  addReaction: (id: string, emoji: string) =>
    apiService.addReaction(id, emoji),
  sharePost: (id: string) => apiService.sharePost(id),
};

// Comment Services
export const commentService = {
  createComment: (postId: string, content: string) =>
    apiService.createComment(postId, content),
  getComments: (postId: string) => apiService.getComments(postId),
  updateComment: (id: string, content: string) =>
    apiService.updateComment(id, content),
  deleteComment: (id: string) => apiService.deleteComment(id),
  likeComment: (id: string) => apiService.likeComment(id),
};

// User Services
export const userService = {
  getAllUsers: () => apiService.getAllUsers(),
  getUserById: (id: string) => apiService.getUserById(id),
  searchUsers: (query: string) => apiService.searchUsers(query),
};

// Admin Services
export const adminService = {
  getDashboard: () => apiService.getDashboard(),
  getUserActivity: (userId: string) =>
    apiService.getUserActivity(userId),
  searchUsers: (query: string) => apiService.adminSearchUsers(query),
  searchPosts: (query: string) => apiService.adminSearchPosts(query),
};

// Notification Services
export const notificationService = {
  getNotifications: (page: number = 1, limit: number = 20, unreadOnly: boolean = false) =>
    api.get('/notifications', { params: { page, limit, unreadOnly } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
};

export default api;
