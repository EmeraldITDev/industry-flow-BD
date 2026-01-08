import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Notification, NotificationType } from '@/types/notifications';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Start with empty notifications
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show toast for new notifications
    const toastConfig: Record<NotificationType, { icon: string; variant: 'default' | 'destructive' }> = {
      task_assigned: { icon: '📋', variant: 'default' },
      status_change: { icon: '🔄', variant: 'default' },
      deadline_approaching: { icon: '⏰', variant: 'default' },
      deadline_overdue: { icon: '🚨', variant: 'destructive' },
      comment: { icon: '💬', variant: 'default' },
      stage_change: { icon: '➡️', variant: 'default' },
      inactivity_reminder: { icon: '⚠️', variant: 'default' },
    };

    const config = toastConfig[notification.type];
    
    if (notification.type === 'deadline_overdue') {
      toast.error(notification.title, {
        description: notification.message,
      });
    } else {
      toast(notification.title, {
        description: notification.message,
        icon: config.icon,
      });
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);


  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
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
