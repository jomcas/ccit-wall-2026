import axios from 'axios';
import { mockApiService } from './mockApi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === 'true';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  createPost: (data: any) => api.post('/posts', data),
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

export default api;
