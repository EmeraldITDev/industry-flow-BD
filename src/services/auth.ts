import api from './api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    department: string;
    createdAt: string;
  };
  token: string;
  requiresPasswordChange: boolean;
}

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  newPassword_confirmation: string;
}

export const authService = {
  // Login
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', credentials);
    
    // Store token and user data
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      // Always clear local storage even if request fails
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  },

  // Get current user
  me: async () => {
    const response = await api.get('/api/auth/me');
    
    // Update stored user data
    localStorage.setItem('user', JSON.stringify(response.data));
    
    return response.data;
  },

  // Change password
  changePassword: async (data: ChangePasswordData) => {
    const response = await api.post('/api/auth/change-password', data);
    return response.data;
  },

  // Get stored token
  getToken: (): string | null => {
    return localStorage.getItem('authToken');
  },

  // Get stored user
  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('authToken');
  },
};
