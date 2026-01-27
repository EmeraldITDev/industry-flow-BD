import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Notification, NotificationType } from '@/types/notifications';
import { notificationsService } from '@/services/notifications';
import { authService } from '@/services/auth';
import { toast } from 'sonner';
import { useDesktopNotifications } from '@/hooks/useDesktopNotifications';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Toast configuration for notification types
const toastConfig: Record<NotificationType, { icon: string }> = {
  task_assigned: { icon: '📋' },
  status_change: { icon: '🔄' },
  deadline_approaching: { icon: '⏰' },
  comment: { icon: '💬' },
  stage_change: { icon: '➡️' },
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousNotificationsRef = useRef<Set<number>>(new Set());
  const { showNotification: showDesktopNotification } = useDesktopNotifications();

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!authService.isAuthenticated()) {
      setNotifications([]);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await notificationsService.getAll();
      
      // Check for new notifications and show desktop notifications
      const currentNotificationIds = new Set(data.map(n => n.id));
      const newNotifications = data.filter(
        n => !previousNotificationsRef.current.has(n.id) && !n.read
      );
      
      // Show desktop notifications for new unread notifications
      newNotifications.forEach(notification => {
        showDesktopNotification(notification);
        // Also show toast for visibility
        const config = toastConfig[notification.type];
        toast.info(notification.title, {
          description: notification.message,
          duration: 5000,
        });
      });
      
      // Update previous notifications set
      previousNotificationsRef.current = currentNotificationIds;
      
      setNotifications(data);
    } catch (err: any) {
      // Don't show error for 401 - user just isn't logged in
      if (err.response?.status === 401) {
        setNotifications([]);
        return;
      }
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [showDesktopNotification]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      toast.error('Failed to mark notification as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsService.markAllAsRead();
      const now = new Date().toISOString();
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: now })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      toast.error('Failed to mark all as read');
    }
  }, []);

  const clearNotification = useCallback(async (id: number) => {
    try {
      await notificationsService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to clear notification:', err);
      toast.error('Failed to clear notification');
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await notificationsService.clearAll();
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear all notifications:', err);
      toast.error('Failed to clear notifications');
    }
  }, []);

  // Only fetch notifications when authenticated
  useEffect(() => {
    if (authService.isAuthenticated()) {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // Poll for new notifications every 30 seconds (only when authenticated)
  useEffect(() => {
    const interval = setInterval(() => {
      if (authService.isAuthenticated()) {
        fetchNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
