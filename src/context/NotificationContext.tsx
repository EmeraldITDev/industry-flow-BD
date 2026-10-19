import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Notification } from '@/types/notifications';
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

/** How many notifications the bell loads; older ones stay on the server. */
const NOTIFICATION_PAGE_SIZE = 50;
const POLL_INTERVAL_MS = 30_000;
/**
 * Above this many new notifications in one poll, show a single summary toast.
 * Sonner keeps every toast mounted and re-measures all of them per toast, so a
 * burst of hundreds freezes the main thread for seconds.
 */
const MAX_INDIVIDUAL_ALERTS = 3;

/** Cheap fingerprint so an unchanged poll does not re-render consumers. */
const signatureOf = (items: Notification[]) =>
  items.map((n) => `${n.id}:${n.read ? 1 : 0}`).join(',');

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [serverUnreadCount, setServerUnreadCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenIdsRef = useRef<Set<number>>(new Set());
  // False until the first successful fetch for the signed-in user: the backlog
  // that already exists at sign-in is summarised, not replayed as new alerts.
  const initialisedRef = useRef(false);
  const signatureRef = useRef('');
  const notificationsRef = useRef<Notification[]>([]);
  notificationsRef.current = notifications;
  const { showNotification: showDesktopNotification } = useDesktopNotifications();
  // Kept in a ref so permission changes do not recreate fetchNotifications and restart polling.
  const showDesktopRef = useRef(showDesktopNotification);
  showDesktopRef.current = showDesktopNotification;

  const localUnreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const unreadCount = serverUnreadCount ?? localUnreadCount;

  const resetState = useCallback(() => {
    seenIdsRef.current = new Set();
    initialisedRef.current = false;
    signatureRef.current = '';
    setNotifications([]);
    setServerUnreadCount(null);
    setError(null);
  }, []);

  const announce = useCallback((fresh: Notification[], isInitial: boolean, totalUnread: number) => {
    if (isInitial) {
      if (totalUnread > 0) {
        toast.info(
          totalUnread === 1 ? 'You have 1 unread notification' : `You have ${totalUnread} unread notifications`,
          { description: 'Open the bell to review them.', duration: 5000 }
        );
      }
      return;
    }

    if (fresh.length === 0) return;

    if (fresh.length <= MAX_INDIVIDUAL_ALERTS) {
      fresh.forEach((notification) => {
        showDesktopRef.current(notification);
        toast.info(notification.title, {
          description: notification.message,
          duration: 5000,
        });
      });
      return;
    }

    // Burst: one desktop alert for the newest item and one summary toast.
    showDesktopRef.current(fresh[0]);
    toast.info(`${fresh.length} new notifications`, {
      description: 'Open the bell to review them.',
      duration: 5000,
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!authService.isAuthenticated()) {
      resetState();
      return;
    }

    const isInitial = !initialisedRef.current;
    try {
      if (isInitial) setLoading(true);
      const { notifications: data, unreadCount: serverCount } =
        await notificationsService.getRecent(NOTIFICATION_PAGE_SIZE);

      const fresh = data.filter((n) => !n.read && !seenIdsRef.current.has(n.id));
      data.forEach((n) => seenIdsRef.current.add(n.id));
      initialisedRef.current = true;

      const totalUnread = serverCount ?? data.filter((n) => !n.read).length;
      announce(fresh, isInitial, totalUnread);

      setServerUnreadCount(serverCount);
      const signature = signatureOf(data);
      if (signature !== signatureRef.current) {
        signatureRef.current = signature;
        setNotifications(data);
      }
      setError(null);
    } catch (err: any) {
      const status = err.response?.status;
      // Never surface notification failures in the UI; keep what is already shown.
      if (status === 401) {
        resetState();
      } else if (import.meta.env.DEV) {
        console.log('[NotificationContext] Notifications unavailable:', status ?? err?.message);
      }
      setError(null);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [announce, resetState]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await notificationsService.markAsRead(id);
      const wasUnread = notificationsRef.current.some(n => n.id === id && !n.read);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      if (wasUnread) {
        setServerUnreadCount(c => (c == null ? c : Math.max(0, c - 1)));
      }
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
      setServerUnreadCount(c => (c == null ? c : 0));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      toast.error('Failed to mark all as read');
    }
  }, []);

  const clearNotification = useCallback(async (id: number) => {
    try {
      await notificationsService.delete(id);
      const wasUnread = notificationsRef.current.some(n => n.id === id && !n.read);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) {
        setServerUnreadCount(c => (c == null ? c : Math.max(0, c - 1)));
      }
    } catch (err) {
      console.error('Failed to clear notification:', err);
      toast.error('Failed to clear notification');
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await notificationsService.clearAll();
      setNotifications([]);
      setServerUnreadCount(c => (c == null ? c : 0));
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

  // Poll for new notifications while the tab is visible; catch up when it becomes visible again.
  useEffect(() => {
    const poll = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (authService.isAuthenticated()) {
        fetchNotifications();
      } else if (initialisedRef.current) {
        resetState();
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchNotifications, resetState]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAll,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAll,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
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
