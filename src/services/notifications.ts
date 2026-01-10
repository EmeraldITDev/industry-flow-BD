import api from './api';
import { Notification, NotificationType } from '@/types/notifications';

export interface CreateNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  recipientIds: string[];  // User IDs to notify
  projectId?: string;
  taskId?: string;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationType;
}

export const notificationsService = {
  // Get all notifications for current user
  getAll: async (filters?: NotificationFilters): Promise<Notification[]> => {
    const response = await api.get('/api/notifications', { params: filters });
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/api/notifications/unread-count');
    return response.data.count || 0;
  },

  // Mark notification as read
  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/api/notifications/${id}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await api.patch('/api/notifications/read-all');
  },

  // Delete notification
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/notifications/${id}`);
  },

  // Clear all notifications
  clearAll: async (): Promise<void> => {
    await api.delete('/api/notifications');
  },

  // Send notification (admin/system use)
  create: async (data: CreateNotificationData): Promise<Notification> => {
    const response = await api.post('/api/notifications', data);
    return response.data;
  },
};
