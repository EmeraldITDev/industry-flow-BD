import api from './api';
import { Notification } from '@/types/notifications';

// Helper to normalize array responses from backend
const normalizeArray = (data: any): Notification[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

// Check if user is authenticated before making requests
const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('authToken');
};

export const notificationsService = {
  // Get all notifications for current user
  getAll: async (): Promise<Notification[]> => {
    if (!isAuthenticated()) {
      return []; // Return empty array if not logged in
    }
    try {
      const response = await api.get('/api/notifications');
      const normalized = normalizeArray(response.data);
      console.log('[Notifications] Fetched notifications:', normalized.length);
      return normalized;
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 401 || status === 404 || status === 500) {
        // User not logged in, endpoint doesn't exist, or server error - gracefully handle
        if (status === 500) {
          console.warn('[Notifications] Server error (500) - notifications endpoint may be unavailable');
        } else {
          console.log('[Notifications] Not authenticated or endpoint not found, skipping notifications');
        }
        return [];
      }
      // Log error but don't throw - gracefully handle network errors
      console.error('[Notifications] Error fetching notifications:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        url: error.config?.url,
      });
      // Return empty array instead of throwing to prevent UI errors
      return [];
    }
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    if (!isAuthenticated()) {
      return 0;
    }
    try {
      const response = await api.get<{ count: number }>('/api/notifications/unread-count');
      return response.data.count || 0;
    } catch (error: any) {
      if (error.response?.status === 401) {
        return 0;
      }
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (id: number): Promise<Notification> => {
    const response = await api.patch<Notification>(`/api/notifications/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await api.patch('/api/notifications/read-all');
  },

  // Delete notification
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/notifications/${id}`);
  },

  // Clear all notifications
  clearAll: async (): Promise<void> => {
    await api.delete('/api/notifications');
  },
};
