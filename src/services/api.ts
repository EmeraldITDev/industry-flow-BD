import axios from 'axios';

// Base URL - update this based on your environment
const BASE_URL = import.meta.env.VITE_API_URL || 'https://industry-flow-backend.onrender.com';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Important for CORS with credentials
});

// Request interceptor to add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // FormData must omit Content-Type so the browser sets multipart + boundary.
    // A hardcoded multipart/form-data (or the default application/json) breaks uploads.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        delete (config.headers as Record<string, unknown>)['Content-Type'];
        delete (config.headers as Record<string, unknown>)['content-type'];
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response?.status === 401) {
      // Clear token - let AuthContext handle redirect via React Router
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // Don't use window.location.href as it causes full page reload
      // The ProtectedRoute component will handle the redirect
    }
    return Promise.reject(error);
  }
);

export default api;
