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

// Initial mock notifications
const initialNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: 'You have been assigned to "Equipment Installation" in Offshore Drilling Platform',
    projectId: 'proj-3',
    taskId: 'task-proj-3-1',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
  },
  {
    id: 'notif-2',
    type: 'deadline_approaching',
    title: 'Deadline Approaching',
    message: 'Task "Safety Inspection" is due in 2 days',
    projectId: 'proj-1',
    taskId: 'task-proj-1-2',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
  },
  {
    id: 'notif-3',
    type: 'status_change',
    title: 'Task Status Updated',
    message: 'Task "Route Planning" moved to In Progress',
    projectId: 'proj-4',
    taskId: 'task-proj-4-1',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'notif-4',
    type: 'deadline_overdue',
    title: 'Task Overdue',
    message: 'Task "Sensor Calibration" deadline has passed',
    projectId: 'proj-7',
    taskId: 'task-proj-7-1',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
  },
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

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

  // Simulate real-time notifications (every 30-60 seconds)
  useEffect(() => {
    const simulateNotification = () => {
      const mockNotifications = [
        {
          type: 'task_assigned' as NotificationType,
          title: 'New Task Assigned',
          message: 'You have been assigned to "Quality Review" in Solar Farm Installation',
          projectId: 'proj-2',
        },
        {
          type: 'status_change' as NotificationType,
          title: 'Task Completed',
          message: 'Task "Initial Assessment" has been marked as completed',
          projectId: 'proj-5',
        },
        {
          type: 'deadline_approaching' as NotificationType,
          title: 'Deadline Tomorrow',
          message: 'Task "Final Inspection" is due tomorrow',
          projectId: 'proj-6',
        },
      ];

      const randomNotification = mockNotifications[Math.floor(Math.random() * mockNotifications.length)];
      addNotification(randomNotification);
    };

    // Random interval between 45-90 seconds
    const scheduleNext = () => {
      const delay = 45000 + Math.random() * 45000;
      return setTimeout(() => {
        simulateNotification();
        scheduleNext();
      }, delay);
    };

    const timeoutId = scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [addNotification]);

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
