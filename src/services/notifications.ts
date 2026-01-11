import api from './api';
import { Notification } from '@/types/notifications';

// Helper to normalize array responses from backend
const normalizeArray = (data: any): Notification[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};

export const notificationsService = {
  // Get all notifications for current user
  getAll: async (): Promise<Notification[]> => {
    const response = await api.get('/api/notifications');
    return normalizeArray(response.data);
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{ count: number }>('/api/notifications/unread-count');
    return response.data.count || 0;
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
