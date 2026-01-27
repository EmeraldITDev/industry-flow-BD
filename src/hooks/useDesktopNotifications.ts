import { useEffect, useCallback, useState } from 'react';
import { Notification } from '@/types/notifications';

export interface DesktopNotificationPermission {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
}

export function useDesktopNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  );

  const [enabled, setEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('desktopNotificationsEnabled');
    return stored ? JSON.parse(stored) : permission === 'granted';
  });

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setEnabled(true);
        localStorage.setItem('desktopNotificationsEnabled', 'true');
      }
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  const showNotification = useCallback(
    (notification: Notification) => {
      if (!isSupported || permission !== 'granted' || !enabled) {
        return;
      }

      try {
        const notificationOptions: NotificationOptions = {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `notification-${notification.id}`,
          requireInteraction: false,
          silent: false,
          data: {
            notificationId: notification.id,
            projectId: notification.projectId,
            taskId: notification.taskId,
            type: notification.type,
          },
        };

        const desktopNotification = new Notification(notification.title, notificationOptions);

        desktopNotification.onclick = () => {
          window.focus();
          desktopNotification.close();
          
          // Navigate to relevant page if needed
          if (notification.projectId) {
            window.location.href = `/projects/${notification.projectId}`;
          } else if (notification.taskId && notification.projectId) {
            window.location.href = `/projects/${notification.projectId}`;
          }
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          desktopNotification.close();
        }, 5000);
      } catch (error) {
        console.error('Error showing desktop notification:', error);
      }
    },
    [isSupported, permission, enabled]
  );

  const toggleEnabled = useCallback((value: boolean) => {
    if (value && permission !== 'granted') {
      requestPermission();
      return;
    }
    setEnabled(value);
    localStorage.setItem('desktopNotificationsEnabled', JSON.stringify(value));
  }, [permission, requestPermission]);

  // Update permission state when it changes externally
  useEffect(() => {
    if (!isSupported) return;

    const checkPermission = () => {
      setPermission(Notification.permission);
    };

    // Check permission on mount
    checkPermission();

    // Listen for permission changes (some browsers support this)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then((result) => {
        setPermission(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'default');
        result.onchange = () => {
          setPermission(result.state === 'granted' ? 'granted' : result.state === 'denied' ? 'denied' : 'default');
        };
      }).catch(() => {
        // Fallback if permissions API is not fully supported
      });
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    enabled,
    requestPermission,
    showNotification,
    toggleEnabled,
  };
}
